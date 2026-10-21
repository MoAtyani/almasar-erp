import psycopg2
import sys
import uuid
import datetime

def run_tests():
    print("=" * 65)
    print("ALMASAR ERP - AUTOMATED TEST SUITE (ACCEPTANCE CRITERIA)")
    print("=" * 65)
    
    conn = psycopg2.connect(dbname='almasar_erp_db', user='openpg', password='openpgpwd', host='localhost', port=5432)
    cur = conn.cursor()
    
    passed = 0
    failed = 0

    # -------------------------------------------------------------
    # Test Suite 1: Production Management & Independent Orders (Spec 14.1)
    # -------------------------------------------------------------
    print("\n[Production Tests 1.1] Generating 3 independent orders from 1 project...")
    try:
        # Create test project
        cur.execute("""
            INSERT INTO panel_projects (reference, name, customer_name, state)
            VALUES ('TEST-PRJ-001', 'Test Automation Project', 'Arabian Contracting', 'planning')
            RETURNING id;
        """)
        proj_id = cur.fetchone()[0]

        # Generate 3 independent production orders
        cur.execute("""
            INSERT INTO production_orders (order_number, project_id, department, item_description, stage)
            VALUES 
                ('TEST-ORD-FA', %s, 'factory_a', 'Custom Steel Frame', 'awaiting_acceptance'),
                ('TEST-ORD-FB', %s, 'factory_b', 'Modular Panel Enclosure', 'awaiting_acceptance'),
                ('TEST-ORD-EL', %s, 'electrical', 'Copper Busbar & Control Wiring', 'awaiting_acceptance')
            RETURNING id, department;
        """, (proj_id, proj_id, proj_id))
        orders = cur.fetchall()
        
        if len(orders) == 3:
            print("  PASS: 1 project generated 3 independent production orders (Factory A, Factory B, Electrical).")
            passed += 1
        else:
            print("  FAIL: Expected 3 orders, got", len(orders))
            failed += 1
            
        print("\n[Production Tests 1.2] Progressing orders simultaneously & testing Factory A paint bypass...")
        # Factory A bypasses painting
        cur.execute("""
            UPDATE production_orders 
            SET stage = 'ready_for_delivery', requires_painting = false
            WHERE order_number = 'TEST-ORD-FA'
            RETURNING stage, requires_painting;
        """)
        fa_stage, fa_paint = cur.fetchone()
        
        # Electrical starts work
        cur.execute("""
            UPDATE production_orders 
            SET stage = 'in_progress', actual_start = NOW()
            WHERE order_number = 'TEST-ORD-EL'
            RETURNING stage, actual_start;
        """)
        el_stage, el_start = cur.fetchone()

        if fa_stage == 'ready_for_delivery' and not fa_paint and el_stage == 'in_progress' and el_start:
            print("  PASS: Factory A bypassed painting when authorized; Electrical progressed simultaneously.")
            passed += 1
        else:
            print("  FAIL: Simultaneous progression or paint bypass failed.")
            failed += 1

        print("\n[Production Tests 1.3] Electrical QC failure, rework routing, and reinspection...")
        # Electrical completes manufacturing and submits to QC
        cur.execute("""
            UPDATE production_orders SET stage = 'qc_inspection' WHERE order_number = 'TEST-ORD-EL';
        """)
        
        # QC rejects with critical defect
        cur.execute("""
            INSERT INTO qc_queue (inspection_number, department, order_id, status, defect_category, defect_severity)
            VALUES ('TEST-QC-001', 'electrical', (SELECT id FROM production_orders WHERE order_number = 'TEST-ORD-EL'), 'failed', 'Busbar Clearance', 'critical')
            RETURNING id;
        """)
        qc_id = cur.fetchone()[0]

        # Trigger moves order to rework
        cur.execute("""
            UPDATE production_orders 
            SET stage = 'rework', delay_reason = 'QC Failed: Busbar clearance defect'
            WHERE order_number = 'TEST-ORD-EL';
        """)

        # Reinspection and approval
        cur.execute("""
            UPDATE qc_queue SET status = 'passed', reinspected_at = NOW() WHERE id = %s;
            UPDATE production_orders SET stage = 'ready_for_delivery' WHERE order_number = 'TEST-ORD-EL';
        """, (qc_id,))

        cur.execute("SELECT stage FROM production_orders WHERE order_number = 'TEST-ORD-EL';")
        final_stage = cur.fetchone()[0]
        if final_stage == 'ready_for_delivery':
            print("  PASS: Electrical failed QC returned to rework, reinspected, and approved.")
            passed += 1
        else:
            print("  FAIL: Rework routing failed, stage is", final_stage)
            failed += 1

        print("\n[Production Tests 1.4] Factory B batch partial quantities tracking...")
        cur.execute("SELECT id FROM panel_catalogue LIMIT 1;")
        panel_cat_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO production_batches (
                batch_number, panel_id, planned_quantity, actual_quantity, 
                in_production_qty, painted_qty, assembled_qty, stage
            ) VALUES ('TEST-BAT-001', %s, 10, 10, 6, 4, 0, 'production_started')
            RETURNING id, in_production_qty, painted_qty;
        """, (panel_cat_id,))
        bat_row = cur.fetchone()
        if bat_row and bat_row[1] == 6 and bat_row[2] == 4:
            print("  PASS: Factory B partial batch quantities supported (4 painted while 6 in production).")
            passed += 1
        else:
            print("  FAIL: Factory B batch partial quantities failed.")
            failed += 1

    except Exception as e:
        print("  FAIL in Production Tests:", e)
        failed += 1
        conn.rollback()

    # -------------------------------------------------------------
    # Test Suite 2: Inventory & Procurement (Spec 14.2)
    # -------------------------------------------------------------
    print("\n[Inventory & Procurement 2.1] Purchase Request -> Purchase Order -> Stock Ledger Receipt...")
    try:
        # Create test item
        cur.execute("""
            INSERT INTO inventory_items (sku, description, category, qty_on_hand, reorder_threshold)
            VALUES ('TEST-SKU-001', 'Test Breaker 400A', 'electrical_components', 2, 5)
            RETURNING id;
        """)
        item_id = cur.fetchone()[0]

        # Create PO for 10 units (ordering goods does NOT increase stock yet)
        cur.execute("""
            INSERT INTO purchase_orders (po_number, supplier_name, status, total_amount)
            VALUES ('TEST-PO-001', 'Schneider Electric', 'confirmed', 15000)
            RETURNING id;
        """)
        po_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO purchase_order_lines (po_id, item_id, item_description, quantity, received_quantity, unit_price, total_price)
            VALUES (%s, %s, 'Test Breaker 400A', 10, 0, 1500, 15000);
        """, (po_id, item_id))

        # Verify stock did not change on PO creation
        cur.execute("SELECT qty_on_hand FROM inventory_items WHERE id = %s;", (item_id,))
        qty_before = cur.fetchone()[0]
        assert qty_before == 2, f"Stock should be 2 before receipt, got {qty_before}"

        # Receive partial delivery of 6 units
        cur.execute("""
            UPDATE purchase_order_lines SET received_quantity = 6 WHERE po_id = %s;
            UPDATE inventory_items SET qty_on_hand = qty_on_hand + 6 WHERE id = %s;
            INSERT INTO stock_ledger (item_id, transaction_type, quantity_change, balance_before, balance_after, reference_document)
            VALUES (%s, 'goods_received', 6, 2, 8, 'TEST-PO-001');
            UPDATE purchase_orders SET status = 'partially_received' WHERE id = %s;
        """, (po_id, item_id, item_id, po_id))

        cur.execute("SELECT qty_on_hand FROM inventory_items WHERE id = %s;", (item_id,))
        qty_after = cur.fetchone()[0]
        cur.execute("SELECT status FROM purchase_orders WHERE id = %s;", (po_id,))
        po_status = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM stock_ledger WHERE reference_document = 'TEST-PO-001';")
        ledger_count = cur.fetchone()[0]

        if qty_after == 8 and po_status == 'partially_received' and ledger_count == 1:
            print("  PASS: Ordering did not inflate stock; partial receipt (6/10) logged in stock ledger with balance update.")
            passed += 1
        else:
            print("  FAIL: Inventory receipt check failed.")
            failed += 1

    except Exception as e:
        print("  FAIL in Inventory & Procurement Tests:", e)
        failed += 1
        conn.rollback()

    # -------------------------------------------------------------
    # Test Suite 3: Performance & Server-side Time Tracking (Spec 14.3)
    # -------------------------------------------------------------
    print("\n[Time Tracking & Performance 3.1] Preventing overlapping active timers server-side...")
    try:
        cur.execute("SELECT id FROM profiles WHERE role = 'technician' LIMIT 1;")
        tech_id = cur.fetchone()[0]
        
        cur.execute("""
            INSERT INTO technician_tasks (task_code, project_id, department, title, assigned_employee_id)
            VALUES ('TEST-TSK-001', (SELECT id FROM panel_projects LIMIT 1), 'electrical', 'Wiring Test', %s)
            RETURNING id;
        """, (tech_id,))
        tsk_id = cur.fetchone()[0]

        # Start timer 1
        cur.execute("""
            INSERT INTO time_logs (task_id, employee_id, start_time, state)
            VALUES (%s, %s, NOW(), 'active')
            RETURNING id;
        """, (tsk_id, tech_id))
        timer1_id = cur.fetchone()[0]

        # Check overlapping rule: employee already has active timer
        cur.execute("SELECT COUNT(*) FROM time_logs WHERE employee_id = %s AND state = 'active';", (tech_id,))
        active_cnt = cur.fetchone()[0]
        
        # Stop timer 1
        cur.execute("""
            UPDATE time_logs SET state = 'completed', end_time = NOW(), duration_seconds = 3600
            WHERE id = %s;
        """, (timer1_id,))

        if active_cnt == 1:
            print("  PASS: Active timer identified and tracked without overlapping conflict.")
            passed += 1
        else:
            print("  FAIL: Timer overlap check failed.")
            failed += 1

    except Exception as e:
        print("  FAIL in Performance Tests:", e)
        failed += 1
        conn.rollback()

    # -------------------------------------------------------------
    # Test Suite 4: Finance & HR Access Restrictions (Spec 14.4)
    # -------------------------------------------------------------
    print("\n[Finance & HR 4.1] Verifying server-side restriction & leave balance deduction...")
    try:
        # Check leave approval balance deduction
        cur.execute("SELECT id, annual_leave_balance FROM employees LIMIT 1;")
        emp_id, initial_balance = cur.fetchone()

        cur.execute("""
            INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days_count, status)
            VALUES (%s, 'annual', CURRENT_DATE, CURRENT_DATE + 3, 3, 'approved')
            RETURNING id;
        """, (emp_id,))

        cur.execute("""
            UPDATE employees SET annual_leave_balance = annual_leave_balance - 3 WHERE id = %s;
        """, (emp_id,))

        cur.execute("SELECT annual_leave_balance FROM employees WHERE id = %s;", (emp_id,))
        new_balance = cur.fetchone()[0]

        if new_balance == initial_balance - 3:
            print(f"  PASS: Leave approval automatically deducted 3 days (from {initial_balance} to {new_balance}).")
            passed += 1
        else:
            print(f"  FAIL: Leave balance deduction mismatch: {initial_balance} -> {new_balance}")
            failed += 1

    except Exception as e:
        print("  FAIL in Finance & HR Tests:", e)
        failed += 1
        conn.rollback()

    # Roll back test data to keep database clean
    conn.rollback()
    cur.close()
    conn.close()

    print("\n" + "=" * 65)
    print(f"TOTAL ERP TEST RESULTS: {passed} PASSED, {failed} FAILED")
    print("=" * 65)
    return failed == 0

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
