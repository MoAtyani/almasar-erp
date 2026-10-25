import psycopg2
import json
import hashlib
import uuid

def hash_pw(pw: str) -> str:
    salt = "almasar_salt_2026"
    return hashlib.sha256(f"{salt}{pw}".encode('utf-8')).hexdigest()

def get_uuid(key: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, key))

def main():
    conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
    cur = conn.cursor()

    print("1. Updating check constraints on profiles table...")
    cur.execute("""
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
            role = ANY (ARRAY[
                'company_owner', 'system_admin', 'general_manager', 'admin', 'manager',
                'production_manager', 'factory_a_manager', 'factory_b_manager', 'electrical_manager',
                'qc_inspector', 'designer', 'project_manager', 'warehouse_officer',
                'procurement_officer', 'sales_officer', 'finance_officer', 'hr_officer',
                'technician', 'engineer', 'viewer'
            ])
        );
    """)

    # Check if permissions column exists in profiles
    cur.execute("""
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_add": true, "can_edit": true, "can_delete": true, "manage_users": true}'::jsonb;
    """)

    manager_permissions = {
        "can_add": True,
        "can_edit": True,
        "can_delete": True,
        "manage_users": True,
        "manage_production": True,
        "manage_sales": True,
        "manage_warehouse": True,
        "manage_finance": True,
        "manage_hr": True,
        "full_access": True
    }

    users_to_seed = [
        {
            "id": "usr-manager-001",
            "user_code": "MGR-0001",
            "full_name": "Eng. Tariq Al-Masar",
            "full_name_ar": "م. طارق المسار (المدير العام)",
            "email": "manager@almasar-switchgear.com",
            "role": "system_admin",
            "department": "Executive Management",
            "phone": "+966 50 123 4567",
            "password": "Almasar@2026",
            "permissions": manager_permissions,
            "job_title": "General Manager & Executive Director",
            "basic_salary": 25000
        },
        {
            "id": "usr-admin-002",
            "user_code": "ADM-0001",
            "full_name": "System Administrator",
            "full_name_ar": "مدير النظام الشامل",
            "email": "admin@almasar-switchgear.com",
            "role": "system_admin",
            "department": "IT & Systems",
            "phone": "+966 50 999 8888",
            "password": "Almasar@2026",
            "permissions": manager_permissions,
            "job_title": "Super Admin",
            "basic_salary": 20000
        },
        {
            "id": "usr-sales-001",
            "user_code": "SLS-0001",
            "full_name": "Ahmad Zaitoun",
            "full_name_ar": "أحمد زيتون (مدير المبيعات)",
            "email": "sales@almasar-switchgear.com",
            "role": "sales_officer",
            "department": "Sales & Marketing",
            "phone": "+966 55 234 5678",
            "password": "Sales@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": False,
                "manage_sales": True, "manage_templates": True
            },
            "job_title": "Senior Sales Engineer",
            "basic_salary": 9500
        },
        {
            "id": "usr-prod-001",
            "user_code": "PRD-0001",
            "full_name": "Abdullah Khaddam",
            "full_name_ar": "عبدالله خدام (مدير الإنتاج والتصنيع)",
            "email": "production@almasar-switchgear.com",
            "role": "production_manager",
            "department": "Production Management",
            "phone": "+966 54 345 6789",
            "password": "Prod@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": True,
                "manage_production": True, "manage_tasks": True,
                "departments": ["casting", "laser", "painting", "assembly"]
            },
            "job_title": "Factory Production Director",
            "basic_salary": 14000
        },
        {
            "id": "usr-tech-001",
            "user_code": "TCH-0001",
            "full_name": "Mahmoud Majid",
            "full_name_ar": "محمود ماجد (فني أول لوحات وتصنيع)",
            "email": "technician@almasar-switchgear.com",
            "role": "technician",
            "department": "Production / Assembly",
            "phone": "+966 56 456 7890",
            "password": "Tech@2026",
            "permissions": {
                "can_add": False, "can_edit": True, "can_delete": False,
                "update_task_progress": True
            },
            "job_title": "Senior Assembly Technician",
            "basic_salary": 4800
        },
        {
            "id": "usr-wh-001",
            "user_code": "WHS-0001",
            "full_name": "Khaled Al-Otaibi",
            "full_name_ar": "خالد العتيبي (أمين المستودع)",
            "email": "warehouse@almasar-switchgear.com",
            "role": "warehouse_officer",
            "department": "Warehouse & Logistics",
            "phone": "+966 53 567 8901",
            "password": "Store@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": False,
                "manage_inventory": True, "issue_materials": True
            },
            "job_title": "Warehouse Logistics Controller",
            "basic_salary": 6500
        },
        {
            "id": "usr-qc-001",
            "user_code": "QCI-0001",
            "full_name": "Ahmad Saadi",
            "full_name_ar": "أحمد سعدي (مفتش الجودة والمطابقة)",
            "email": "qc@almasar-switchgear.com",
            "role": "qc_inspector",
            "department": "Quality Control",
            "phone": "+966 51 678 9012",
            "password": "Qc@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": False,
                "manage_qc": True, "signoff_qc": True
            },
            "job_title": "Lead Quality Assurance Inspector",
            "basic_salary": 7800
        },
        {
            "id": "usr-proc-001",
            "user_code": "PRC-0001",
            "full_name": "Amro Zaitoun",
            "full_name_ar": "عمرو زيتون (مسؤول المشتريات)",
            "email": "procurement@almasar-switchgear.com",
            "role": "procurement_officer",
            "department": "Procurement & Supply Chain",
            "phone": "+966 52 789 0123",
            "password": "Proc@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": False,
                "manage_pos": True, "manage_suppliers": True
            },
            "job_title": "Supply Chain & Procurement Officer",
            "basic_salary": 8200
        },
        {
            "id": "usr-fin-001",
            "user_code": "FIN-0001",
            "full_name": "Rami Al-Khatib",
            "full_name_ar": "رامي الخطيب (المحاسب المالي)",
            "email": "finance@almasar-switchgear.com",
            "role": "finance_officer",
            "department": "Finance & Accounting",
            "phone": "+966 57 890 1234",
            "password": "Fin@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": False,
                "manage_invoices": True, "manage_payments": True
            },
            "job_title": "Senior Financial Accountant",
            "basic_salary": 11000
        },
        {
            "id": "usr-hr-001",
            "user_code": "HRM-0001",
            "full_name": "Laila Mansour",
            "full_name_ar": "ليلى منصور (مسؤولة الموارد البشرية)",
            "email": "hr@almasar-switchgear.com",
            "role": "hr_officer",
            "department": "Human Resources",
            "phone": "+966 58 901 2345",
            "password": "Hr@2026",
            "permissions": {
                "can_add": True, "can_edit": True, "can_delete": True,
                "manage_users": True, "manage_payroll": True
            },
            "job_title": "HR & Payroll Specialist",
            "basic_salary": 8800
        }
    ]

    print(f"2. Seeding {len(users_to_seed)} authentic user profiles across all departments...")

    for u in users_to_seed:
        user_id = get_uuid(u["email"])
        pwd_hash = hash_pw(u["password"])
        perms_json = json.dumps(u["permissions"])
        
        # Upsert profile
        cur.execute("""
            INSERT INTO profiles (
                id, user_code, full_name, full_name_ar, email, role, department,
                phone, password_hash, is_active, permissions
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, %s::jsonb)
            ON CONFLICT (email) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                full_name_ar = EXCLUDED.full_name_ar,
                role = EXCLUDED.role,
                department = EXCLUDED.department,
                phone = EXCLUDED.phone,
                password_hash = EXCLUDED.password_hash,
                is_active = true,
                permissions = EXCLUDED.permissions;
        """, (
            user_id, u["user_code"], u["full_name"], u["full_name_ar"],
            u["email"], u["role"], u["department"], u["phone"],
            pwd_hash, perms_json
        ))

        # Check if employee with this profile_id already exists
        cur.execute("SELECT id FROM employees WHERE profile_id = %s", (user_id,))
        existing_emp = cur.fetchone()
        if not existing_emp:
            cur.execute("""
                INSERT INTO employees (
                    employee_code, profile_id, full_name, full_name_ar, department,
                    job_title, employment_status
                ) VALUES (%s, %s, %s, %s, %s, %s, 'active');
            """, (
                u["user_code"], user_id, u["full_name"], u["full_name_ar"],
                u["department"], u["job_title"]
            ))

    conn.commit()
    print("Successfully seeded all user profiles and roles in PostgreSQL!")
    conn.close()

if __name__ == '__main__':
    main()
