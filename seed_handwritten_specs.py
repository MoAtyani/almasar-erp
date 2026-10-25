import psycopg2
import json

conn = psycopg2.connect('postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db')
cur = conn.cursor()

# 1. Seed Templates
templates = [
    (
        'tpl-elec-01',
        'Standard Main Distribution Board (MDB)',
        'نموذج لوحة توزيع رئيسية MDB معيارية',
        'electrical_panels',
        'لوحات كهربائية رئيسية وفرعية متوافقة مع مواصفات شركة الكهرباء السعودية',
        json.dumps({'busbar': 'Copper 99.9%', 'ip_rating': 'IP54', 'default_stage': 'under_manufacturing'}),
        45000
    ),
    (
        'tpl-tray-02',
        'Standard Perforated Cable Tray & Enclosure',
        'نموذج مسارات كابل تري وخزنة حماية معدنية',
        'cable_tray_enclosure',
        'مسارات كابل تري مجلفنة على الساخن مع خزنة تحكم وتكسير دقيق',
        json.dumps({'thickness': '2.0mm', 'finish': 'Hot-dip galvanized', 'bend_spec': 'Standard 90 deg'}),
        18500
    ),
    (
        'tpl-parts-03',
        'Electrical Components and Spare Parts Kit',
        'نموذج مواد وقطع غيار ومكونات لوحات',
        'materials_parts',
        'مجموعة قواطع كهربائية، محولات تيار، عوازل نحاسية، وإكسسوارات التجميع',
        json.dumps({'brand': 'Schneider / ABB', 'warranty': '2 Years'}),
        12000
    )
]

for t in templates:
    cur.execute('''
        INSERT INTO project_templates (id, template_name, template_name_ar, category, description, specs, estimated_cost)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            template_name = EXCLUDED.template_name,
            template_name_ar = EXCLUDED.template_name_ar,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            specs = EXCLUDED.specs,
            estimated_cost = EXCLUDED.estimated_cost;
    ''', t)

# 2. Update existing crm_leads or seed sales items with the handwritten specifications
cur.execute("SELECT id, name FROM crm_leads LIMIT 10")
existing_leads = cur.fetchall()

categories = ['electrical_panels', 'cable_tray_enclosure', 'materials_parts']
statuses = ['under_manufacturing', 'ready_for_delivery', 'delivered']
outcomes = ['won', 'won', 'in_progress']

for i, (lid, name) in enumerate(existing_leads):
    cat = categories[i % 3]
    st = statuses[i % 3]
    out = outcomes[i % 3]
    cur.execute('''
        UPDATE crm_leads 
        SET product_category = %s, sales_status = %s, outcome = %s
        WHERE id = %s
    ''', (cat, st, out, lid))

# 3. Seed specific orders for the 3 factory departments if not present
# Casting Department
cur.execute("SELECT id FROM panel_projects LIMIT 3")
pids = [r[0] for r in cur.fetchall()]
p1 = pids[0] if len(pids) > 0 else 'prj-001'
p2 = pids[1] if len(pids) > 1 else p1
p3 = pids[2] if len(pids) > 2 else p1

casting_orders = [
    (
        'ORD-CAST-2026-001', p1, 'casting', 'قالب صب هيكل لوحة توزيع مقاومة للعوامل الجوية',
        10, 'standard', 'receiving', 'مشروع مجمع الرياض السكني - صب عازل وقواعد تثبيت', '2026-11-05'
    ),
    (
        'ORD-CAST-2026-002', p2, 'casting', 'صب إطارات إحكام مع واجهة زجاج غطاء معزول',
        5, 'glass_cover', 'completed', 'مشروع مستشفى الملك فيصل - زجاج غطاء مقاوم للحرارة', '2026-10-30'
    )
]

for ord_num, prj, dept, desc, qty, cov, rec, notes, dline in casting_orders:
    cur.execute('''
        INSERT INTO production_orders (
            order_number, project_id, department, item_description, quantity,
            cover_type, receipt_status, notes, deadline, stage
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (order_number) DO UPDATE SET
            cover_type = EXCLUDED.cover_type,
            receipt_status = EXCLUDED.receipt_status,
            notes = EXCLUDED.notes;
    ''', (ord_num, prj, dept, desc, qty, cov, rec, notes, dline, 'in_progress' if rec == 'receiving' else 'completed'))

# Laser Department
laser_orders = [
    (
        'ORD-LAS-2026-001', p1, 'laser', 'قص وتشكيل صفائح مجلفنة لكابل تري مع تفاصيل تكسير',
        150, True, '300x100mm', 'طول 3000 مم - سماكة 2 مم ثابتة', 'تكسير 90 درجة مع شفة تثبيت 20 مم',
        'awaiting_materials', 'كابل تري خط إنتاج رئيسي - قياسات ثابتة ومحددة بدقة', '2026-11-10'
    ),
    (
        'ORD-LAS-2026-002', p2, 'laser', 'قص ليزر لألواح الواجهة والأبواب للوحات التوزيع',
        40, False, '2000x800mm', 'فتحات تهوية وقواطع قياسية', 'تكسير حواف الأبواب 4 ثنيات متطابقة',
        'material_inspection', 'نوع جديد - فتحات مخصصة لمقاييس ومفاتيح شنايدر', '2026-11-02'
    ),
    (
        'ORD-LAS-2026-003', p3, 'laser', 'تخريم وتشكيل حوامل كابلات مسبقة الثني',
        85, False, '500x150mm', 'قياسات عرضية ثابتة للمسار', 'تكسير كابل تري مزدوج',
        'ready_for_delivery', 'جاهز للتسليم لقسم التجميع', '2026-10-28'
    )
]

for ord_num, prj, dept, desc, qty, is_new, req_m, fix_m, bend, stg, notes, dline in laser_orders:
    cur.execute('''
        INSERT INTO production_orders (
            order_number, project_id, department, item_description, quantity,
            is_new_type, required_measurement, fixed_measurements, cable_tray_bend,
            stage, notes, deadline
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (order_number) DO UPDATE SET
            is_new_type = EXCLUDED.is_new_type,
            required_measurement = EXCLUDED.required_measurement,
            fixed_measurements = EXCLUDED.fixed_measurements,
            cable_tray_bend = EXCLUDED.cable_tray_bend,
            stage = EXCLUDED.stage,
            notes = EXCLUDED.notes;
    ''', (ord_num, prj, dept, desc, qty, is_new, req_m, fix_m, bend, stg, notes, dline))

# Painting Department
paint_orders = [
    (
        'ORD-PNT-2026-001', p1, 'painting', 'طلاء إلكتروستاتيكي حراري للوحات كهربائية وخزن كابل تري',
        25, 'receiving', 'مشروع محطة توليد الطاقة - بودرة دهان رمادي RAL 7035 مع فحص سماكة 80 ميكرون', '2026-11-08'
    ),
    (
        'ORD-PNT-2026-002', p2, 'painting', 'طلاء حراري لأبواب وهياكل لوحات العرض والمشروع',
        18, 'showroom_notified', 'إشعار المعرض بجاهزية العينات للمطابقة والاعتماد النهائي', '2026-11-01'
    ),
    (
        'ORD-PNT-2026-003', p3, 'painting', 'طلاء مسارات كابل تري وخزن الحماية الخارجية',
        60, 'ready_for_delivery', 'جاهز للتسليم والنقل إلى مستودع التسليم النهائي', '2026-10-27'
    )
]

for ord_num, prj, dept, desc, qty, rec, notes, dline in paint_orders:
    cur.execute('''
        INSERT INTO production_orders (
            order_number, project_id, department, item_description, quantity,
            receipt_status, notes, deadline, stage
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (order_number) DO UPDATE SET
            receipt_status = EXCLUDED.receipt_status,
            notes = EXCLUDED.notes;
    ''', (ord_num, prj, dept, desc, qty, rec, notes, dline, rec))

conn.commit()
print("Successfully seeded templates, sales data, and department orders in PostgreSQL!")
