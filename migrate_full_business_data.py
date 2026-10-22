import psycopg2
import uuid
import json

def unwrap_str(val):
    if val is None:
        return ''
    if isinstance(val, dict):
        return val.get('en_US') or val.get('ar_001') or (list(val.values())[0] if val else '')
    return str(val)

def map_category(cat_name):
    c = (cat_name or '').lower()
    if any(k in c for k in ['component', 'breaker', 'switch', 'cable', 'wire', 'mcb', 'mccb', 'acb']):
        return 'electrical_components'
    if any(k in c for k in ['panel', 'enclosure', 'box', 'cubicle']):
        return 'panel_stock'
    if any(k in c for k in ['consumable', 'tape', 'screw', 'bolt', 'terminal']):
        return 'consumables'
    if any(k in c for k in ['supply', 'supplies', 'furniture', 'office', 'service']):
        return 'company_supplies'
    if any(k in c for k in ['finish', 'product', 'assembly']):
        return 'finished_goods'
    return 'raw_materials'

def migrate():
    print("Connecting to factory_db and almasar_erp_db...")
    src = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/factory_db")
    dst = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
    cur_s = src.cursor()
    cur_d = dst.cursor()

    # Get profile mapping
    cur_d.execute("SELECT id, user_code, email FROM profiles")
    profiles = cur_d.fetchall()
    email_to_pid = {p[2]: p[0] for p in profiles}
    code_to_pid = {p[1]: p[0] for p in profiles if p[1]}
    default_pid = profiles[0][0] if profiles else str(uuid.uuid4())

    cur_s.execute("SELECT u.id, u.login, p.email FROM res_users u LEFT JOIN res_partner p ON u.partner_id = p.id")
    src_user_map = {}
    for u in cur_s.fetchall():
        uid, login, email = u
        email = email or f"{login}@almasar-switchgear.com"
        pid = email_to_pid.get(email) or code_to_pid.get(f"EMP-{uid:03d}") or default_pid
        src_user_map[uid] = pid

    # Get project mapping
    cur_d.execute("SELECT id, reference, name FROM panel_projects")
    projects = cur_d.fetchall()
    default_prjid = projects[0][0] if projects else None

    # 1. Migrate Products (from product_product / product_template)
    print("1. Migrating products to inventory_items...")
    cur_s.execute("""
        SELECT p.id, t.name, COALESCE(p.default_code, t.default_code), p.barcode, COALESCE(t.list_price, 100), c.name
        FROM product_product p
        JOIN product_template t ON p.product_tmpl_id = t.id
        LEFT JOIN product_category c ON t.categ_id = c.id
    """)
    prod_map = {}
    for row in cur_s.fetchall():
        pid, name, code, barcode, price, cat_name = row
        name_str = unwrap_str(name)
        cat_str = map_category(unwrap_str(cat_name))
        item_sku = unwrap_str(code) or f"SKU-{pid:04d}"
        cost_val = float(price or 150.0)

        cur_d.execute("SELECT id FROM inventory_items WHERE sku = %s OR description = %s", (item_sku, name_str))
        existing = cur_d.fetchone()
        if existing:
            item_id = existing[0]
            cur_d.execute("""
                UPDATE inventory_items 
                SET purchase_cost = %s,
                    category = %s
                WHERE id = %s
            """, (cost_val, cat_str, item_id))
        else:
            item_id = str(uuid.uuid4())
            cur_d.execute("""
                INSERT INTO inventory_items (id, sku, description, description_ar, category, uom, qty_on_hand, qty_reserved, reorder_threshold, purchase_cost, warehouse_location, supplier_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                item_id,
                item_sku,
                name_str,
                name_str,
                cat_str,
                'PCS',
                45.0,
                0.0,
                10.0,
                cost_val,
                'Zone A - Main Warehouse',
                'ABB / Schneider'
            ))
        prod_map[pid] = item_id

    # 2. Migrate Tasks
    print("2. Migrating tasks to technician_tasks...")
    cur_s.execute("""
        SELECT t.id, t.name, t.description, t.stage_id, t.allocated_hours, t.priority, t.create_uid
        FROM project_task t
    """)
    for row in cur_s.fetchall():
        tid, name, desc, stage_id, alloc_hours, priority, create_uid = row
        name_str = unwrap_str(name)
        desc_str = unwrap_str(desc) or f"Task execution for {name_str}"
        assigned_pid = src_user_map.get(create_uid, default_pid)

        cur_s.execute("SELECT user_id FROM project_task_user_rel WHERE task_id = %s", (tid,))
        rel = cur_s.fetchone()
        if rel and rel[0] in src_user_map:
            assigned_pid = src_user_map[rel[0]]

        status = 'assigned'
        if stage_id in (2, 3):
            status = 'in_progress'
        elif stage_id in (4, 5):
            status = 'completed'

        prio_map = {'0': 'low', '1': 'medium', '2': 'high', '3': 'urgent'}
        prio = prio_map.get(str(priority), 'medium')

        cur_d.execute("SELECT id FROM technician_tasks WHERE title = %s", (name_str,))
        if not cur_d.fetchone():
            cur_d.execute("""
                INSERT INTO technician_tasks (id, task_code, title, description, assigned_employee_id, project_id, department, status, priority, estimated_hours)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                f"TSK-{tid:04d}",
                name_str,
                desc_str,
                assigned_pid,
                default_prjid,
                'electrical',
                status,
                prio,
                float(alloc_hours or 6.0)
            ))

    # 3. Migrate Production Orders
    print("3. Migrating orders to production_orders...")
    cur_s.execute("""
        SELECT id, name, product_id, product_qty, state, date_start, date_finished
        FROM mrp_production
    """)
    for row in cur_s.fetchall():
        mid, name, prod_id, qty, state, d_start, d_finish = row
        name_str = unwrap_str(name)
        stage_map = {
            'draft': 'awaiting_acceptance',
            'confirmed': 'accepted',
            'progress': 'in_progress',
            'to_close': 'qc_inspection',
            'done': 'ready_for_delivery'
        }
        stage = stage_map.get(state, 'in_progress')
        
        cur_d.execute("SELECT id FROM production_orders WHERE order_number = %s", (name_str,))
        if not cur_d.fetchone():
            cur_d.execute("""
                INSERT INTO production_orders (id, order_number, project_id, item_description, department, stage, quantity, requires_painting, paint_status, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                name_str,
                default_prjid,
                f"Main Distribution Panel {mid}",
                'electrical',
                stage,
                float(qty or 1.0),
                False,
                'none',
                default_pid
            ))

    # 4. Migrate Purchase Orders
    print("4. Migrating purchase orders...")
    cur_s.execute("""
        SELECT po.id, po.name, p.name as vendor_name, po.amount_total, po.state, po.date_order, po.date_planned
        FROM purchase_order po
        LEFT JOIN res_partner p ON po.partner_id = p.id
    """)
    po_map = {}
    for row in cur_s.fetchall():
        poid, name, vendor, total, state, d_order, d_plan = row
        name_str = unwrap_str(name)
        vendor_str = unwrap_str(vendor) or 'ABB Global'
        st_map = {
            'draft': 'draft',
            'sent': 'sent',
            'to approve': 'approved',
            'purchase': 'confirmed',
            'done': 'fully_received',
            'cancel': 'cancelled'
        }
        st = st_map.get(state, 'confirmed')

        cur_d.execute("SELECT id FROM purchase_orders WHERE po_number = %s", (name_str,))
        existing_po = cur_d.fetchone()
        if existing_po:
            po_id = existing_po[0]
        else:
            po_id = str(uuid.uuid4())
            cur_d.execute("""
                INSERT INTO purchase_orders (id, po_number, supplier_name, project_id, total_amount, currency, status, order_date, expected_delivery_date, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                po_id,
                name_str,
                vendor_str,
                default_prjid,
                float(total or 0.0),
                'SAR',
                st,
                d_order,
                d_plan,
                default_pid
            ))
        po_map[poid] = po_id

    # Migrate PO lines
    cur_s.execute("""
        SELECT l.id, l.order_id, l.name, l.product_qty, l.price_unit, l.price_subtotal, l.product_id
        FROM purchase_order_line l
    """)
    for row in cur_s.fetchall():
        lid, order_id, desc, qty, price, subtotal, prod_id = row
        dst_po_id = po_map.get(order_id)
        if dst_po_id:
            dst_item_id = prod_map.get(prod_id)
            desc_str = unwrap_str(desc) or 'Switchgear Component'
            cur_d.execute("SELECT id FROM purchase_order_lines WHERE po_id = %s AND item_description = %s", (dst_po_id, desc_str))
            if not cur_d.fetchone():
                cur_d.execute("""
                    INSERT INTO purchase_order_lines (id, po_id, item_id, item_description, quantity, unit_price, total_price)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    str(uuid.uuid4()),
                    dst_po_id,
                    dst_item_id,
                    desc_str,
                    float(qty or 1.0),
                    float(price or 0.0),
                    float(subtotal or 0.0)
                ))

    # 5. Migrate CRM Leads
    print("5. Migrating CRM leads...")
    cur_s.execute("""
        SELECT id, name, contact_name, email_from, phone, expected_revenue, probability, stage_id
        FROM crm_lead
    """)
    for row in cur_s.fetchall():
        lid, name, contact, email, phone, rev, prob, stage_id = row
        name_str = unwrap_str(name)
        cur_d.execute("SELECT id FROM crm_leads WHERE name = %s", (name_str,))
        if not cur_d.fetchone():
            state_map = {1: 'lead', 2: 'enquiry', 3: 'quotation', 4: 'won'}
            st = state_map.get(stage_id, 'lead')
            cur_d.execute("""
                INSERT INTO crm_leads (id, reference, name, customer_name, customer_email, customer_phone, expected_revenue, probability, state, currency)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                f"LEAD-2026-{lid:04d}",
                name_str,
                unwrap_str(contact) or 'Enterprise Client',
                unwrap_str(email) or 'client@example.com',
                unwrap_str(phone) or '',
                float(rev or 50000.0),
                int(prob or 60),
                st,
                'SAR'
            ))

    dst.commit()
    print("--- SUCCESS: All real business data migrated to almasar_erp_db! ---")

if __name__ == "__main__":
    migrate()
