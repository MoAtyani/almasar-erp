import psycopg2
import sys
import uuid
import json

def seed_existing_business_data():
    print("--- Migrating existing business data from factory_db to almasar_erp_db ---")
    
    conn_src = psycopg2.connect(dbname='factory_db', user='openpg', password='openpgpwd', host='localhost', port=5432)
    cur_src = conn_src.cursor()
    
    conn_dst = psycopg2.connect(dbname='almasar_erp_db', user='openpg', password='openpgpwd', host='localhost', port=5432)
    cur_dst = conn_dst.cursor()
    
    # 1. Migrate Users & Staff
    print("1. Migrating Users to profiles & employees...")
    cur_src.execute("""
        SELECT u.id, u.login, p.name, p.email, p.phone
        FROM res_users u
        JOIN res_partner p ON u.partner_id = p.id
        WHERE u.active = true;
    """)
    users = cur_src.fetchall()
    
    user_mapping = {} # src_id -> dst_id
    for u in users:
        src_id, login, name, email, phone = u
        email = email or f"{login}@almasar-switchgear.com"
        
        # Check role based on name or login
        role = 'technician'
        dept = 'Production / Assembly'
        if 'admin' in login or 'tarik' in login:
            role = 'company_owner'
            dept = 'Executive Management'
        elif 'م.' in name or 'engineer' in login or 'turk' in login or 'nadi' in login:
            role = 'engineer'
            dept = 'Engineering & Design'
        elif 'qc' in login or 'saadi' in login:
            role = 'qc_inspector'
            dept = 'Quality Control'
        elif 'zaitoun' in login:
            role = 'sales_officer'
            dept = 'Sales & Marketing'
        elif 'sami' in login or 'abdullah' in login:
            role = 'production_manager'
            dept = 'Production Management'
            
        cur_dst.execute("SELECT id FROM profiles WHERE email = %s;", (email,))
        row = cur_dst.fetchone()
        if not row:
            dst_id = str(uuid.uuid4())
            cur_dst.execute("""
                INSERT INTO profiles (id, user_code, full_name, full_name_ar, email, role, department, phone, reward_points)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 100)
                RETURNING id;
            """, (dst_id, f"EMP-{src_id:03d}", name, name, email, role, dept, phone))
        else:
            dst_id = row[0]
            
        user_mapping[src_id] = dst_id
        
        # Also ensure in employees table
        cur_dst.execute("SELECT id FROM employees WHERE employee_code = %s;", (f"EMP-{src_id:03d}",))
        if not cur_dst.fetchone():
            cur_dst.execute("""
                INSERT INTO employees (profile_id, employee_code, full_name, full_name_ar, department, job_title, hire_date)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_DATE);
            """, (dst_id, f"EMP-{src_id:03d}", name, name, dept, role.replace('_', ' ').title()))

    conn_dst.commit()
    print(f"Migrated {len(users)} staff profiles.")
    
    # 2. Migrate Existing Projects
    print("2. Migrating 15 existing Projects...")
    cur_src.execute("""
        SELECT p.id, p.name, p.description, p.location, p.date_start, p.date_delivery, p.state, p.overall_progress, c.name as customer_name
        FROM electrical_panel_project p
        LEFT JOIN res_partner c ON p.customer_id = c.id;
    """)
    projects = cur_src.fetchall()
    
    owner_id = user_mapping.get(2) or list(user_mapping.values())[0]
    
    for idx, p in enumerate(projects):
        p_id, p_name, p_desc, p_loc, p_start, p_deliv, p_state, p_prog, cust_name = p
        ref = f"PRJ-2026-{idx+1:04d}"
        cust_name = cust_name or "Al-Masar Direct Client"
        
        # Map state
        state_map = {
            'draft': 'new',
            'estimation': 'pricing',
            'design': 'design',
            'procurement': 'planning',
            'warehouse': 'planning',
            'production': 'in_production',
            'qc': 'qc',
            'accounting': 'ready_delivery',
            'logistics': 'dispatched',
            'done': 'done'
        }
        mapped_state = state_map.get(p_state, 'in_production')
        
        cur_dst.execute("SELECT id FROM panel_projects WHERE reference = %s;", (ref,))
        if not cur_dst.fetchone():
            cur_dst.execute("""
                INSERT INTO panel_projects (
                    reference, name, customer_name, location, description, 
                    date_start, date_delivery, state, overall_progress, 
                    quotation_amount, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
            """, (
                ref, p_name, cust_name, p_loc or 'Jordan / KSA', p_desc or 'Panel Project',
                p_start, p_deliv, mapped_state, p_prog or 50.0,
                75000.0 + (idx * 15000.0), owner_id
            ))
            new_proj_id = cur_dst.fetchone()[0]
            
            # Generate separate orders for Factory A, Factory B, and Electrical for projects in production
            if mapped_state in ['in_production', 'qc', 'ready_delivery', 'planning']:
                # Factory A order
                cur_dst.execute("""
                    INSERT INTO production_orders (
                        order_number, project_id, department, item_description, quantity,
                        requires_painting, stage, created_by
                    ) VALUES (%s, %s, 'factory_a', %s, 1, true, 'in_progress', %s);
                """, (f"ORD-FA-2026-{idx+1:03d}", new_proj_id, f"Custom Enclosure Fabrication: {p_name}", owner_id))
                
                # Factory B order
                cur_dst.execute("""
                    INSERT INTO production_orders (
                        order_number, project_id, department, item_description, quantity,
                        requires_painting, stage, created_by
                    ) VALUES (%s, %s, 'factory_b', %s, 4, false, 'in_progress', %s);
                """, (f"ORD-FB-2026-{idx+1:03d}", new_proj_id, f"Standard Panel Chassis Set: {p_name}", owner_id))
                
                # Electrical order
                cur_dst.execute("""
                    INSERT INTO production_orders (
                        order_number, project_id, department, item_description, quantity,
                        requires_painting, stage, created_by
                    ) VALUES (%s, %s, 'electrical', %s, 1, false, 'in_progress', %s);
                """, (f"ORD-EL-2026-{idx+1:03d}", new_proj_id, f"Busbar & Power Wiring Assembly: {p_name}", owner_id))

    conn_dst.commit()
    print(f"Migrated {len(projects)} projects with synchronized production orders.")
    
    # 3. Seed Configurable Panel Catalogue (Workflow 1.4)
    print("3. Seeding Configurable Panel Catalogue for Factory B...")
    catalogue_items = [
        ("PNL-MDB-2000", "Main Distribution Board Enclosure 2000A", "لوحة توزيع رئيسية 2000 أمبير", 1200, 2000, 600, "Electro-galvanized Steel 2.0mm", "Form 4b, IP54, IEC 61439-2"),
        ("PNL-SMDB-800", "Sub-Main Distribution Board 800A", "لوحة توزيع فرعية رئيسية 800 أمبير", 1000, 1800, 400, "Electro-galvanized Steel 1.5mm", "Form 2b, IP54, Wall/Floor Mounted"),
        ("PNL-MCC-1600", "Motor Control Center Panel 1600A", "لوحة التحكم بالمحركات MCC 1600A", 1600, 2200, 800, "Zinc Coated Steel 2.0mm", "Withdrawable Modules, Full SCADA Support"),
        ("PNL-ATS-1250", "Automatic Transfer Switch Panel 1250A", "لوحة التحويل الآلي ATS 1250A", 1000, 1900, 500, "Cold Rolled Steel 2.0mm", "Dual Incomer Power Switching"),
        ("PNL-DB-250", "Final Distribution Board 250A", "لوحة توزيع نهائية 250 أمبير", 600, 1000, 200, "Mild Steel Powder Coated", "IP42 Surface Mounted 36 Way")
    ]
    
    for item in catalogue_items:
        code, name, name_ar, w, h, th, mat, specs = item
        cur_dst.execute("SELECT id FROM panel_catalogue WHERE panel_code = %s;", (code,))
        if not cur_dst.fetchone():
            cur_dst.execute("""
                INSERT INTO panel_catalogue (panel_code, name, name_ar, width_mm, height_mm, thickness_mm, material, technical_specs)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """, (code, name, name_ar, w, h, th, mat, specs))
            
    conn_dst.commit()
    print(f"Seeded {len(catalogue_items)} panel catalogue types.")
    
    # 4. Seed Standard Inventory Items
    print("4. Seeding Initial Inventory Items...")
    items = [
        ("SKU-ACB-3200", "Schneider Masterpact NW32 Air Circuit Breaker 3200A 4P", "قاطع هوائي رئيسي 3200 أمبير", "electrical_components", "pcs", 8, 2, 45000),
        ("SKU-MCCB-630", "ABB Tmax T6N 630A 3P MCCB Breaker", "قاطع مدمج 630 أمبير", "electrical_components", "pcs", 24, 6, 4200),
        ("SKU-CU-BB-8010", "Copper Busbar 80x10mm Tinned 99.9% Purity (3m)", "بسبار نحاسي 80x10 ملم معالج", "raw_materials", "meters", 150, 40, 320),
        ("SKU-STEEL-2MM", "Cold Rolled Steel Sheet 2.0mm (2440x1220mm)", "صاج حديد مدرفل 2.0 ملم", "raw_materials", "sheets", 80, 15, 240),
        ("SKU-PAINT-RAL7035", "Epoxy Polyester Powder Coating RAL 7035 Light Grey", "بودرة دهان حراري رمادي فاتح", "consumables", "kg", 400, 50, 45),
        ("SKU-PLC-S71200", "Siemens S7-1200 CPU 1214C DC/DC/DC PLC", "وحدة تحكم بي إل سي سيمنز S7-1200", "electrical_components", "pcs", 12, 3, 3100)
    ]
    
    for itm in items:
        sku, desc, desc_ar, cat, uom, on_hand, reserved, cost = itm
        cur_dst.execute("SELECT id FROM inventory_items WHERE sku = %s;", (sku,))
        if not cur_dst.fetchone():
            cur_dst.execute("""
                INSERT INTO inventory_items (sku, description, description_ar, category, uom, qty_on_hand, qty_reserved, purchase_cost)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """, (sku, desc, desc_ar, cat, uom, on_hand, reserved, cost))
            
    conn_dst.commit()
    print(f"Seeded {len(items)} inventory items.")
    
    cur_src.close()
    conn_src.close()
    cur_dst.close()
    conn_dst.close()
    print("--- Business data migration complete! ---")
    return True

if __name__ == '__main__':
    success = seed_existing_business_data()
    sys.exit(0 if success else 1)
