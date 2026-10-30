import psycopg2
import sys
sys.stdout.reconfigure(encoding='utf-8')

def run_migration():
    conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
    conn.autocommit = True
    cur = conn.cursor()

    print("--- 1. Altering employees table ---")
    emp_columns = [
        ("national_id", "TEXT"),
        ("effective_date", "DATE DEFAULT CURRENT_DATE"),
        ("basic_salary", "NUMERIC(12,2) DEFAULT 2500.00"),
        ("housing_allowance", "NUMERIC(12,2) DEFAULT 500.00"),
        ("transport_allowance", "NUMERIC(12,2) DEFAULT 250.00"),
        ("other_allowances", "NUMERIC(12,2) DEFAULT 0.00"),
        ("social_security_number", "TEXT"),
        ("social_security_rate_employee", "NUMERIC(5,2) DEFAULT 7.50"),
        ("social_security_rate_company", "NUMERIC(5,2) DEFAULT 14.25"),
        ("is_social_security_active", "BOOLEAN DEFAULT true"),
        ("education_level", "TEXT DEFAULT 'Bachelor of Engineering'"),
        ("bank_name", "TEXT DEFAULT 'Al-Rajhi Bank'"),
        ("bank_iban", "TEXT"),
        ("biometric_pin", "TEXT")
    ]
    for col, col_type in emp_columns:
        try:
            cur.execute(f"ALTER TABLE employees ADD COLUMN IF NOT EXISTS {col} {col_type};")
            print(f"Added column {col} to employees")
        except Exception as e:
            print(f"Column {col} notice:", e)

    print("\n--- 2. Creating biometric_devices table ---")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS biometric_devices (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        device_name TEXT NOT NULL,
        device_model TEXT DEFAULT 'ZKTeco uFace 800 Plus',
        ip_address TEXT NOT NULL,
        port INTEGER DEFAULT 4370,
        location TEXT DEFAULT 'Main Factory Entrance Gate 1',
        status TEXT DEFAULT 'online',
        last_sync TIMESTAMPTZ DEFAULT NOW(),
        auto_sync BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("\n--- 3. Creating attendance_punches table ---")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS attendance_punches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        device_id UUID REFERENCES biometric_devices(id) ON DELETE SET NULL,
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        biometric_pin TEXT,
        punch_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        punch_type TEXT DEFAULT 'check_in', -- check_in, check_out
        source TEXT DEFAULT 'biometric_device', -- biometric_device, manual, csv
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("\n--- 4. Altering attendance_logs table ---")
    att_columns = [
        ("overtime_hours", "NUMERIC(5,2) DEFAULT 0"),
        ("overtime_rate", "NUMERIC(10,2) DEFAULT 0"),
        ("overtime_amount", "NUMERIC(10,2) DEFAULT 0"),
        ("late_minutes", "INTEGER DEFAULT 0"),
        ("lateness_deduction", "NUMERIC(10,2) DEFAULT 0"),
        ("daily_deduction", "NUMERIC(10,2) DEFAULT 0"),
        ("device_id", "UUID")
    ]
    for col, col_type in att_columns:
        try:
            cur.execute(f"ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS {col} {col_type};")
            print(f"Added column {col} to attendance_logs")
        except Exception as e:
            print(f"Column {col} notice:", e)

    print("\n--- 5. Altering employee_advances table ---")
    try:
        cur.execute("ALTER TABLE employee_advances DROP CONSTRAINT IF EXISTS employee_advances_employee_id_fkey;")
        cur.execute("ALTER TABLE employee_salaries DROP CONSTRAINT IF EXISTS employee_salaries_employee_id_fkey;")
    except Exception as e:
        print("Drop constraint notice:", e)

    adv_columns = [
        ("monthly_installment", "NUMERIC(12,2) DEFAULT 0"),
        ("deduction_start_month", "TEXT DEFAULT '2026-11'"),
        ("purpose", "TEXT")
    ]
    for col, col_type in adv_columns:
        try:
            cur.execute(f"ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS {col} {col_type};")
            print(f"Added column {col} to employee_advances")
        except Exception as e:
            print(f"Column {col} notice:", e)

    print("\n--- 6. Creating advance_installments table ---")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS advance_installments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        advance_id UUID NOT NULL REFERENCES employee_advances(id) ON DELETE CASCADE,
        installment_number INTEGER NOT NULL,
        deduction_month TEXT NOT NULL,
        due_date DATE NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, deducted, paid_manually
        paid_at TIMESTAMPTZ,
        payslip_ref TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("\n--- 7. Creating disciplinary_records table ---")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS disciplinary_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        action_type TEXT NOT NULL, -- verbal_warning, first_warning, second_warning, day_deduction, multi_day_deduction, termination
        action_date DATE NOT NULL DEFAULT CURRENT_DATE,
        reason TEXT NOT NULL,
        deduction_days NUMERIC(4,1) DEFAULT 0,
        deduction_amount NUMERIC(12,2) DEFAULT 0,
        deduction_month TEXT,
        status TEXT DEFAULT 'issued', -- draft, issued, acknowledged, appeal, cancelled
        decision_maker TEXT DEFAULT 'General Manager',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("\n--- 8. Creating resignation_records table ---")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS resignation_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
        last_working_day DATE NOT NULL,
        reason TEXT NOT NULL,
        notice_period_days INTEGER DEFAULT 30,
        status TEXT DEFAULT 'pending', -- pending, approved, rejected, withdrawn, completed
        clearance_status TEXT DEFAULT 'in_progress', -- pending, in_progress, cleared
        end_of_service_benefits NUMERIC(12,2) DEFAULT 0,
        settlement_notes TEXT,
        reviewed_by TEXT DEFAULT 'HR & General Management',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("\n--- 9. Altering employee_salaries table ---")
    sal_columns = [
        ("reference", "TEXT"),
        ("overtime_hours", "NUMERIC(6,2) DEFAULT 0"),
        ("overtime_rate", "NUMERIC(10,2) DEFAULT 0"),
        ("overtime_amount", "NUMERIC(12,2) DEFAULT 0"),
        ("late_minutes", "INTEGER DEFAULT 0"),
        ("lateness_deduction", "NUMERIC(12,2) DEFAULT 0"),
        ("absence_days", "NUMERIC(4,1) DEFAULT 0"),
        ("absence_deduction", "NUMERIC(12,2) DEFAULT 0"),
        ("daily_rate", "NUMERIC(10,2) DEFAULT 0"),
        ("hourly_rate", "NUMERIC(10,2) DEFAULT 0"),
        ("social_security_employee", "NUMERIC(12,2) DEFAULT 0"),
        ("social_security_company", "NUMERIC(12,2) DEFAULT 0"),
        ("advance_deduction", "NUMERIC(12,2) DEFAULT 0"),
        ("penalty_deduction", "NUMERIC(12,2) DEFAULT 0"),
        ("housing_allowance", "NUMERIC(12,2) DEFAULT 0"),
        ("transport_allowance", "NUMERIC(12,2) DEFAULT 0"),
        ("gross_salary", "NUMERIC(12,2) DEFAULT 0"),
        ("total_deductions", "NUMERIC(12,2) DEFAULT 0")
    ]
    for col, col_type in sal_columns:
        try:
            cur.execute(f"ALTER TABLE employee_salaries ADD COLUMN IF NOT EXISTS {col} {col_type};")
            print(f"Added column {col} to employee_salaries")
        except Exception as e:
            print(f"Column {col} notice:", e)

    print("\nSchema migration completed successfully!")
    conn.close()

if __name__ == '__main__':
    run_migration()
