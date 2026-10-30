import psycopg2
import sys
import random
from datetime import datetime, date, timedelta
sys.stdout.reconfigure(encoding='utf-8')

conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
conn.autocommit = True
cur = conn.cursor()

print("--- 1. Updating Employees with HR profile details ---")
cur.execute("SELECT id, employee_code, full_name, job_title, department FROM employees")
employees = cur.fetchall()

educations = [
    'بكالوريوس هندسة كهربائية وقوى',
    'بكالوريوس هندسة ميكانيكية وإنتاج',
    'دبلوم فني تحكم آلي وبسبار',
    'دبلوم إلكترونيات وتجميع لوحات',
    'بكالوريوس إدارة أعمال وموارد بشرية',
    'بكالوريوس محاسبة ومالية',
    'شهادة فنية مهنية معتمدة'
]

salaries_by_dept = {
    'Engineering & Design': (8500, 14000),
    'Production Management': (9000, 15000),
    'Panel Fabrication': (3800, 6500),
    'Busbar & Wiring': (4000, 6800),
    'Quality Assurance': (5500, 9500),
    'Procurement & Inventory': (4500, 7500),
}

emp_ids = []
for i, emp in enumerate(employees):
    emp_id, code, name, job, dept = emp
    emp_ids.append(emp_id)
    min_sal, max_sal = salaries_by_dept.get(dept, (4000, 7000))
    basic_sal = round(random.randint(min_sal, max_sal) / 100) * 100
    housing = round(basic_sal * 0.20 / 50) * 50
    transport = round(basic_sal * 0.10 / 50) * 50
    nat_id = f"10{random.randint(10000000, 99999999)}"
    soc_sec = f"SS-{random.randint(1000000, 9999999)}"
    bio_pin = str(1000 + i)
    edu = random.choice(educations)
    join_year = random.choice([2021, 2022, 2023, 2024, 2025])
    join_month = random.randint(1, 12)
    join_day = random.randint(1, 28)
    eff_date = f"{join_year}-{join_month:02d}-{join_day:02d}"

    cur.execute("""
        UPDATE employees SET
            national_id = COALESCE(national_id, %s),
            effective_date = COALESCE(effective_date, %s),
            basic_salary = %s,
            housing_allowance = %s,
            transport_allowance = %s,
            other_allowances = 0,
            social_security_number = COALESCE(social_security_number, %s),
            social_security_rate_employee = 7.50,
            social_security_rate_company = 14.25,
            is_social_security_active = true,
            education_level = COALESCE(education_level, %s),
            biometric_pin = COALESCE(biometric_pin, %s),
            bank_iban = COALESCE(bank_iban, %s)
        WHERE id = %s
    """, (nat_id, eff_date, basic_sal, housing, transport, soc_sec, edu, bio_pin, f"SA4480000{random.randint(1000000000, 9999999999)}", emp_id))

print(f"Updated {len(employees)} employees with HR profile fields.")

print("\n--- 2. Seeding Biometric Devices ---")
cur.execute("DELETE FROM biometric_devices")
cur.execute("""
    INSERT INTO biometric_devices (device_name, device_model, ip_address, port, location, status, auto_sync)
    VALUES 
    ('جهاز بصمة البوابة الرئيسية للمصنع (Gate 1)', 'ZKTeco uFace 800 Plus (Face & Fingerprint)', '192.168.1.201', 4370, 'البوابة الرئيسية - صالة الاستقبال وكادر الإدارة', 'online', true),
    ('جهاز بصمة ورشة تجميع اللوحات (Shop Floor)', 'ZKTeco IN01-A (Fingerprint & RFID)', '192.168.1.202', 4370, 'مدخل ورشة التصنيع وقسم البسبار', 'online', true),
    ('جهاز بصمة مستودع المواد والقطع (Warehouse)', 'Hikvision DS-K1T804AMF', '192.168.1.203', 4370, 'بوابة مستودع القطع والمستلزمات', 'online', true)
    RETURNING id;
""")
device_ids = [r[0] for r in cur.fetchall()]
print(f"Seeded {len(device_ids)} biometric devices.")

print("\n--- 3. Seeding Biometric Punches and Attendance Logs ---")
cur.execute("DELETE FROM attendance_punches")
cur.execute("DELETE FROM attendance_logs")

# Let's seed attendance logs for the last 5 days
today = date.today()
for days_ago in range(4, -1, -1):
    log_day = today - timedelta(days=days_ago)
    # Skip weekends if Friday (day 4 in 0-indexed Mon-Sun, or Saturday)
    if log_day.weekday() == 4: # Friday
        continue
    
    for emp in employees[:15]: # Seed active logs for first 15 employees
        emp_id = emp[0]
        # Query basic salary
        cur.execute("SELECT basic_salary, biometric_pin FROM employees WHERE id = %s", (emp_id,))
        bs_row = cur.fetchone()
        bs = float(bs_row[0] or 4000)
        pin = bs_row[1] or "1001"
        hourly_rate = round(bs / (30 * 8), 2)
        daily_rate = round(bs / 30, 2)

        # random scenario: 70% normal, 15% overtime, 10% late, 5% absent
        rand_val = random.random()
        if rand_val < 0.65:
            # Normal on-time
            check_in_time = f"{log_day} 07:55:00+03"
            check_out_time = f"{log_day} 16:05:00+03"
            shift_h = 8.0
            actual_h = 8.1
            ot_h = 0.0
            ot_amt = 0.0
            late_m = 0
            late_ded = 0.0
            day_ded = 0.0
            status = 'present'
        elif rand_val < 0.85:
            # Overtime
            ot_h = random.choice([1.5, 2.0, 2.5, 3.0])
            ot_rate = round(hourly_rate * 1.5, 2)
            ot_amt = round(ot_h * ot_rate, 2)
            check_in_time = f"{log_day} 07:58:00+03"
            check_out_time = f"{log_day} {16 + int(ot_h)}:{int((ot_h % 1)*60):02d}:00+03"
            shift_h = 8.0
            actual_h = 8.0 + ot_h
            late_m = 0
            late_ded = 0.0
            day_ded = 0.0
            status = 'present'
        elif rand_val < 0.95:
            # Late
            late_m = random.choice([25, 45, 60, 90])
            late_ded = round((late_m / 60) * hourly_rate, 2)
            check_in_time = f"{log_day} {8 + (late_m // 60):02d}:{late_m % 60:02d}:00+03"
            check_out_time = f"{log_day} 16:00:00+03"
            shift_h = 8.0
            actual_h = round(8.0 - (late_m / 60), 2)
            ot_h = 0.0
            ot_amt = 0.0
            day_ded = 0.0
            status = 'late'
        else:
            # Absent
            check_in_time = None
            check_out_time = None
            shift_h = 8.0
            actual_h = 0.0
            ot_h = 0.0
            ot_amt = 0.0
            late_m = 0
            late_ded = 0.0
            day_ded = daily_rate
            status = 'absent'

        dev_id = random.choice(device_ids)

        cur.execute("""
            INSERT INTO attendance_logs (
                employee_id, log_date, check_in, check_out, shift_hours, actual_hours,
                status, overtime_hours, overtime_rate, overtime_amount,
                late_minutes, lateness_deduction, daily_deduction, device_id, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            emp_id, log_day, check_in_time, check_out_time, shift_h, actual_h,
            status, ot_h, round(hourly_rate * 1.5, 2) if ot_h > 0 else 0, ot_amt,
            late_m, late_ded, day_ded, dev_id,
            f"Synced from {device_ids[0]}" if check_in_time else "Unexcused absence"
        ))

        # Also add raw punches
        if check_in_time:
            cur.execute("""
                INSERT INTO attendance_punches (device_id, employee_id, biometric_pin, punch_time, punch_type)
                VALUES (%s, %s, %s, %s, 'check_in')
            """, (dev_id, emp_id, pin, check_in_time))
        if check_out_time:
            cur.execute("""
                INSERT INTO attendance_punches (device_id, employee_id, biometric_pin, punch_time, punch_type)
                VALUES (%s, %s, %s, %s, 'check_out')
            """, (dev_id, emp_id, pin, check_out_time))

print("Seeded attendance logs and raw punches.")

print("\n--- 4. Seeding Employee Advances and Installments ---")
cur.execute("DELETE FROM advance_installments")
cur.execute("DELETE FROM employee_advances")

sample_advances = [
    (employees[0][0], 5000.0, 5, "سلفة زواج وتأسيس منزلي", 'approved'),
    (employees[1][0], 3000.0, 3, "سلفة طارئة لمصاريف علاجية", 'approved'),
    (employees[2][0], 6000.0, 6, "سلفة رسوم دراسية للأبناء", 'approved'),
    (employees[3][0], 2000.0, 2, "سلفة صيانة مركبة خاصة", 'pending'),
    (employees[4][0], 4000.0, 4, "سلفة إيجار سكن سنوي", 'approved')
]

for emp_id, amount, months, purpose, st in sample_advances:
    inst_amt = round(amount / months, 2)
    repaid = 0.0
    if st == 'approved':
        # Let's say 1 month is repaid
        repaid = inst_amt
    bal = amount - repaid

    cur.execute("""
        INSERT INTO employee_advances (
            employee_id, request_date, amount, repayment_months, monthly_installment,
            repaid_amount, status, notes, purpose, deduction_start_month
        ) VALUES (%s, CURRENT_DATE - 35, %s, %s, %s, %s, %s, %s, %s, '2026-10')
        RETURNING id;
    """, (emp_id, amount, months, inst_amt, repaid, st, purpose, purpose))
    adv_id = cur.fetchone()[0]

    # Generate Installments Schedule
    for m in range(1, months + 1):
        # Calculate deduction month and due date
        # Month 1 = Oct 2026, Month 2 = Nov 2026, etc.
        due_month = 10 + (m - 1)
        due_year = 2026
        if due_month > 12:
            due_month -= 12
            due_year += 1
        m_str = f"{due_year}-{due_month:02d}"
        due_date_str = f"{due_year}-{due_month:02d}-28"
        inst_st = 'deducted' if (m == 1 and repaid > 0) else 'pending'
        paid_at = f"{due_year}-{due_month:02d}-28 10:00:00+03" if inst_st == 'deducted' else None
        pay_ref = f"PAY/{m_str}/001" if inst_st == 'deducted' else None

        cur.execute("""
            INSERT INTO advance_installments (
                advance_id, installment_number, deduction_month, due_date, amount,
                status, paid_at, payslip_ref, notes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (adv_id, m, m_str, due_date_str, inst_amt, inst_st, paid_at, pay_ref, f"قسط شهر {m_str}"))

print("Seeded employee advances and installment schedules.")

print("\n--- 5. Seeding Disciplinary Actions ---")
cur.execute("DELETE FROM disciplinary_records")

sample_penalties = [
    (employees[0][0], 'verbal_warning', 0, 0, 'تنبيه شفهي بخصوص التأخر الصباحي غير المبرر لأكثر من 30 دقيقة', 'issued'),
    (employees[1][0], 'first_warning', 0, 0, 'إنذار خطي أول لعدم الالتزام بارتداء مهمات السلامة المهنية (PPE) داخل ورشة التجميع', 'acknowledged'),
    (employees[2][0], 'second_warning', 0, 0, 'إنذار خطي ثانٍ لمخالفة تعليمات مناولة النحاس وإهدار في قص البسبار', 'issued'),
    (employees[3][0], 'day_deduction', 1.0, 150.0, 'خصم أجر يوم كامل للغياب دون إشعار مسبق أو عذر مقبول', 'issued'),
    (employees[4][0], 'verbal_warning', 0, 0, 'تنبيه إداري لترك محطة العمل قبل موعد نهاية المناوبة بعشر دقائق', 'acknowledged')
]

for emp_id, a_type, d_days, d_amt, reason, st in sample_penalties:
    cur.execute("""
        INSERT INTO disciplinary_records (
            employee_id, action_type, action_date, reason, deduction_days,
            deduction_amount, deduction_month, status, decision_maker
        ) VALUES (%s, %s, CURRENT_DATE - 10, %s, %s, %s, '2026-10', %s, 'م. يوسف بصبوص - المدير العام')
    """, (emp_id, a_type, reason, d_days, d_amt, st))

print("Seeded disciplinary actions.")

print("\n--- 6. Seeding Resignation Records ---")
cur.execute("DELETE FROM resignation_records")

sample_resignations = [
    (employees[5][0], 'الحصول على فرصة عمل خارج الدولة ورغبة في الانتقال العائلي', 30, 'under_review', 'in_progress', 8500.0),
    (employees[6][0], 'أسباب صحية خاصة تتطلب الراحة والعلاج المستمر', 30, 'approved', 'cleared', 12400.0)
]

for emp_id, reason, notice, st, clear_st, eos in sample_resignations:
    cur.execute("""
        INSERT INTO resignation_records (
            employee_id, submission_date, last_working_day, reason, notice_period_days,
            status, clearance_status, end_of_service_benefits, settlement_notes
        ) VALUES (%s, CURRENT_DATE - 15, CURRENT_DATE + 15, %s, %s, %s, %s, %s, 'تم مراجعة رصيد الإجازات ومستحقات نهاية الخدمة وفقاً لنظام العمل')
    """, (emp_id, reason, notice, st, clear_st, eos))

print("Seeded resignation records.")

print("\n--- 7. Seeding Detailed Employee Payslips Breakdown ---")
cur.execute("DELETE FROM employee_salaries")

for idx, emp in enumerate(employees[:20]):
    emp_id = emp[0]
    cur.execute("""
        SELECT basic_salary, housing_allowance, transport_allowance,
               social_security_rate_employee, social_security_rate_company
        FROM employees WHERE id = %s
    """, (emp_id,))
    row = cur.fetchone()
    bs = float(row[0] or 4000)
    housing = float(row[1] or 800)
    transport = float(row[2] or 400)
    ss_emp_rate = float(row[3] or 7.5) / 100
    ss_co_rate = float(row[4] or 14.25) / 100

    daily_r = round(bs / 30, 2)
    hourly_r = round(bs / 240, 2)

    ot_h = random.choice([0, 5, 8, 12, 16])
    ot_rate = round(hourly_r * 1.5, 2)
    ot_amt = round(ot_h * ot_rate, 2)

    late_m = random.choice([0, 0, 30, 45, 60])
    late_ded = round((late_m / 60) * hourly_r, 2)

    abs_d = random.choice([0, 0, 0, 1])
    abs_ded = round(abs_d * daily_r, 2)

    # Check if has active installment
    cur.execute("""
        SELECT ai.amount FROM advance_installments ai
        JOIN employee_advances ea ON ai.advance_id = ea.id
        WHERE ea.employee_id = %s AND ai.deduction_month = '2026-10'
        LIMIT 1
    """, (emp_id,))
    adv_row = cur.fetchone()
    adv_ded = float(adv_row[0]) if adv_row else 0.0

    # Check penalty
    cur.execute("""
        SELECT COALESCE(SUM(deduction_amount), 0) FROM disciplinary_records
        WHERE employee_id = %s AND deduction_month = '2026-10'
    """, (emp_id,))
    pen_ded = float(cur.fetchone()[0] or 0.0)

    # Social Security
    ss_emp = round(bs * ss_emp_rate, 2)
    ss_co = round(bs * ss_co_rate, 2)

    gross = bs + housing + transport + ot_amt
    total_ded = late_ded + abs_ded + ss_emp + adv_ded + pen_ded
    net = round(gross - total_ded, 2)

    ref = f"PAY/2026-10/{idx+1:03d}"

    cur.execute("""
        INSERT INTO employee_salaries (
            employee_id, period_month, reference, basic_amount, allowances,
            housing_allowance, transport_allowance,
            overtime_hours, overtime_rate, overtime_amount,
            late_minutes, lateness_deduction, absence_days, absence_deduction,
            daily_rate, hourly_rate,
            social_security_employee, social_security_company,
            advances_deducted, penalty_deduction, other_deductions,
            gross_salary, total_deductions, net_amount, payment_status, payment_date, notes
        ) VALUES (
            %s, '2026-10', %s, %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s,
            %s, %s,
            %s, %s, 0,
            %s, %s, %s, 'approved', CURRENT_DATE, %s
        )
    """, (
        emp_id, ref, bs, housing + transport,
        housing, transport,
        ot_h, ot_rate, ot_amt,
        late_m, late_ded, abs_d, abs_ded,
        daily_r, hourly_r,
        ss_emp, ss_co,
        adv_ded, pen_ded,
        gross, total_ded, net, 'مسير رواتب شهر أكتوبر 2026 - مصنع المسار للوحات الكهربائية'
    ))

print("Seeded detailed employee payslips breakdown.")
conn.close()
print("HR Features Seed completed successfully!")
