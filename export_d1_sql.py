import psycopg2
import json

conn = psycopg2.connect("postgres://openpg:openpgpwd@localhost:5432/almasar_erp_db")
cur = conn.cursor()

# SQLite D1 DDL
ddl = """
-- Cloudflare D1 Schema for Almasar ERP

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS system_notifications;
DROP TABLE IF EXISTS project_drawings;
DROP TABLE IF EXISTS production_order_history;
DROP TABLE IF EXISTS production_orders;
DROP TABLE IF EXISTS factory_b_batches;
DROP TABLE IF EXISTS panel_catalogue;
DROP TABLE IF EXISTS qc_inspections;
DROP TABLE IF EXISTS time_logs;
DROP TABLE IF EXISTS technician_tasks;
DROP TABLE IF EXISTS field_assignments;
DROP TABLE IF EXISTS financial_transactions;
DROP TABLE IF EXISTS employee_advances;
DROP TABLE IF EXISTS employee_salaries;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS purchase_order_lines;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS purchase_requests;
DROP TABLE IF EXISTS project_material_requests;
DROP TABLE IF EXISTS attendance_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS recruitment_candidates;
DROP TABLE IF EXISTS recruitment_vacancies;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS delivery_notes;
DROP TABLE IF EXISTS crm_leads;
DROP TABLE IF EXISTS panel_projects;
DROP TABLE IF EXISTS profiles;

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  reward_points INTEGER DEFAULT 0,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE panel_projects (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  location TEXT,
  project_manager_id TEXT REFERENCES profiles(id),
  date_start TEXT,
  date_delivery TEXT,
  description TEXT,
  quotation_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  priority TEXT DEFAULT 'medium',
  state TEXT DEFAULT 'new',
  job_order_number TEXT,
  monday_link TEXT,
  boq_link TEXT,
  overall_progress REAL DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_drawings (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES panel_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version TEXT DEFAULT 'v1.0',
  file_url TEXT,
  file_type TEXT,
  approved_by TEXT REFERENCES profiles(id),
  approved_at TEXT,
  status TEXT DEFAULT 'pending',
  revision_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE panel_catalogue (
  id TEXT PRIMARY KEY,
  panel_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  width_mm REAL NOT NULL,
  height_mm REAL NOT NULL,
  depth_mm REAL NOT NULL,
  thickness_mm REAL NOT NULL,
  material TEXT NOT NULL,
  uom TEXT DEFAULT 'unit',
  standard_specifications TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE production_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  project_id TEXT NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  assigned_team TEXT,
  item_description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  requires_painting INTEGER DEFAULT 1,
  paint_color TEXT,
  paint_bypassed INTEGER DEFAULT 0,
  paint_bypass_reason TEXT,
  current_stage TEXT NOT NULL DEFAULT 'draft',
  planned_start TEXT,
  deadline TEXT,
  actual_start TEXT,
  actual_completion TEXT,
  assigned_employees TEXT,
  delay_reason TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE production_order_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  changed_by TEXT REFERENCES profiles(id),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE factory_b_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT UNIQUE NOT NULL,
  panel_type_id TEXT REFERENCES panel_catalogue(id),
  project_id TEXT REFERENCES panel_projects(id),
  planned_qty INTEGER NOT NULL,
  actual_qty INTEGER DEFAULT 0,
  rejected_qty INTEGER DEFAULT 0,
  rework_qty INTEGER DEFAULT 0,
  in_production_qty INTEGER DEFAULT 0,
  painted_qty INTEGER DEFAULT 0,
  assembled_qty INTEGER DEFAULT 0,
  packed_qty INTEGER DEFAULT 0,
  stage TEXT DEFAULT 'created',
  skip_painting INTEGER DEFAULT 0,
  skip_painting_reason TEXT,
  scheduled_completion TEXT,
  expected_dispatch TEXT,
  assigned_team TEXT,
  responsible_id TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qc_inspections (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  stage_inspected TEXT NOT NULL,
  order_id TEXT REFERENCES production_orders(id),
  batch_id TEXT REFERENCES factory_b_batches(id),
  project_id TEXT REFERENCES panel_projects(id),
  inspector_id TEXT REFERENCES profiles(id),
  status TEXT DEFAULT 'pending',
  result TEXT DEFAULT 'pending',
  defect_category TEXT,
  defect_severity TEXT,
  rejection_notes TEXT,
  corrective_actions TEXT,
  reinspection_result TEXT,
  fat_passed INTEGER DEFAULT 0,
  inspected_at TEXT,
  reinspected_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE technician_tasks (
  id TEXT PRIMARY KEY,
  task_number TEXT UNIQUE NOT NULL,
  project_id TEXT REFERENCES panel_projects(id),
  production_order_id TEXT REFERENCES production_orders(id),
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  deliverables TEXT,
  priority TEXT DEFAULT 'medium',
  estimated_hours REAL DEFAULT 0,
  due_date TEXT,
  assigned_to TEXT REFERENCES profiles(id),
  assigned_team TEXT,
  status TEXT DEFAULT 'assigned',
  actual_start TEXT,
  actual_finish TEXT,
  completion_notes TEXT,
  supervisor_approved INTEGER DEFAULT 0,
  approved_by TEXT REFERENCES profiles(id),
  approved_at TEXT,
  points_awarded INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE time_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES technician_tasks(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL REFERENCES profiles(id),
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_corrected INTEGER DEFAULT 0,
  original_start_time TEXT,
  original_end_time TEXT,
  corrected_by TEXT REFERENCES profiles(id),
  correction_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE field_assignments (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  project_id TEXT REFERENCES panel_projects(id),
  site_location TEXT NOT NULL,
  site_address TEXT,
  visit_date TEXT NOT NULL,
  assigned_technicians TEXT,
  electrical_department_involved INTEGER DEFAULT 1,
  requirements TEXT,
  work_description TEXT,
  expected_hours REAL DEFAULT 0,
  status TEXT DEFAULT 'scheduled',
  actual_arrival TEXT,
  actual_departure TEXT,
  work_completed TEXT,
  issues_found TEXT,
  materials_used TEXT,
  recommendations TEXT,
  follow_up_required INTEGER DEFAULT 0,
  follow_up_notes TEXT,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_transactions (
  id TEXT PRIMARY KEY,
  transaction_ref TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'SAR',
  tax_amount REAL DEFAULT 0,
  supplier_name TEXT,
  employee_id TEXT REFERENCES profiles(id),
  project_id TEXT REFERENCES panel_projects(id),
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_status TEXT DEFAULT 'pending',
  entered_by TEXT REFERENCES profiles(id),
  approved_by TEXT REFERENCES profiles(id),
  approved_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_salaries (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES profiles(id),
  period_month TEXT NOT NULL,
  basic_salary REAL NOT NULL,
  allowances REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  net_salary REAL NOT NULL,
  status TEXT DEFAULT 'draft',
  payment_date TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES profiles(id),
  amount REAL NOT NULL,
  request_date TEXT NOT NULL,
  repayment_terms TEXT,
  repaid_amount REAL DEFAULT 0,
  remaining_balance REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  profile_id TEXT REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  manager_id TEXT REFERENCES profiles(id),
  employment_status TEXT DEFAULT 'active',
  start_date TEXT,
  end_date TEXT,
  employment_type TEXT DEFAULT 'full_time',
  skills TEXT,
  annual_leave_balance REAL DEFAULT 21.0,
  basic_salary REAL DEFAULT 0,
  bank_account TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_days REAL NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT REFERENCES profiles(id),
  reviewed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_logs (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  log_date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  shift_name TEXT DEFAULT 'Standard',
  total_hours REAL DEFAULT 0,
  status TEXT DEFAULT 'present',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recruitment_vacancies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  open_positions INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recruitment_candidates (
  id TEXT PRIMARY KEY,
  vacancy_id TEXT REFERENCES recruitment_vacancies(id),
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  stage TEXT DEFAULT 'screening',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  uom TEXT DEFAULT 'pcs',
  specifications TEXT,
  supplier_name TEXT,
  warehouse_location TEXT DEFAULT 'Main Warehouse',
  qty_on_hand REAL DEFAULT 0,
  qty_reserved REAL DEFAULT 0,
  qty_available REAL DEFAULT 0,
  reorder_threshold REAL DEFAULT 0,
  reorder_qty REAL DEFAULT 0,
  purchase_cost REAL DEFAULT 0,
  batch_number TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES inventory_items(id),
  transaction_type TEXT NOT NULL,
  quantity REAL NOT NULL,
  balance_after REAL NOT NULL,
  project_id TEXT REFERENCES panel_projects(id),
  production_order_id TEXT REFERENCES production_orders(id),
  reference TEXT,
  notes TEXT,
  performed_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_requests (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  origin_type TEXT NOT NULL,
  project_id TEXT REFERENCES panel_projects(id),
  department TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_by TEXT REFERENCES profiles(id),
  required_by_date TEXT,
  justification TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  request_id TEXT REFERENCES purchase_requests(id),
  project_id TEXT REFERENCES panel_projects(id),
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  status TEXT DEFAULT 'draft',
  order_date TEXT DEFAULT CURRENT_TIMESTAMP,
  expected_delivery TEXT,
  total_amount REAL DEFAULT 0,
  created_by TEXT REFERENCES profiles(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase_order_lines (
  id TEXT PRIMARY KEY,
  po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES inventory_items(id),
  description TEXT NOT NULL,
  qty_ordered REAL NOT NULL,
  qty_received REAL DEFAULT 0,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL
);

CREATE TABLE crm_leads (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  estimated_value REAL DEFAULT 0,
  stage TEXT DEFAULT 'lead',
  assigned_to TEXT REFERENCES profiles(id),
  phone TEXT,
  email TEXT,
  notes TEXT,
  converted_project_id TEXT REFERENCES panel_projects(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE delivery_notes (
  id TEXT PRIMARY KEY,
  delivery_number TEXT UNIQUE NOT NULL,
  project_id TEXT NOT NULL REFERENCES panel_projects(id),
  recipient_name TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  dispatched_at TEXT,
  status TEXT DEFAULT 'ready',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT REFERENCES profiles(id),
  target_role TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  link_url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values TEXT,
  new_values TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""

with open("d:/almasar-erp/cloudflare_d1_schema.sql", "w", encoding="utf-8") as f:
    f.write(ddl)

print("Created cloudflare_d1_schema.sql")

# Now export data from postgres tables into INSERT statements
tables = [
    'profiles', 'panel_projects', 'panel_catalogue', 'production_orders',
    'technician_tasks', 'employees', 'inventory_items', 'crm_leads', 'purchase_orders'
]

inserts = []
for table in tables:
    cur.execute(f"SELECT * FROM {table}")
    rows = cur.fetchall()
    colnames = [desc[0] for desc in cur.description]
    for row in rows:
        vals = []
        for v in row:
            if v is None:
                vals.append("NULL")
            elif isinstance(v, (int, float)):
                vals.append(str(v))
            elif isinstance(v, bool):
                vals.append("1" if v else "0")
            elif isinstance(v, dict) or isinstance(v, list):
                s = json.dumps(v).replace("'", "''")
                vals.append(f"'{s}'")
            else:
                s = str(v).replace("'", "''")
                vals.append(f"'{s}'")
        col_str = ", ".join(colnames)
        val_str = ", ".join(vals)
        inserts.append(f"INSERT INTO {table} ({col_str}) VALUES ({val_str});")

with open("d:/almasar-erp/cloudflare_d1_seed.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(inserts))

print(f"Created cloudflare_d1_seed.sql with {len(inserts)} rows")
cur.close()
conn.close()
