PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS time_logs;

DROP TABLE IF EXISTS technician_tasks;

DROP TABLE IF EXISTS system_notifications;

DROP TABLE IF EXISTS stock_ledger;

DROP TABLE IF EXISTS recruitment_vacancies;

DROP TABLE IF EXISTS recruitment_candidates;

DROP TABLE IF EXISTS qc_queue;

DROP TABLE IF EXISTS purchase_requests;

DROP TABLE IF EXISTS purchase_request_lines;

DROP TABLE IF EXISTS purchase_orders;

DROP TABLE IF EXISTS purchase_order_lines;

DROP TABLE IF EXISTS project_drawings;

DROP TABLE IF EXISTS profiles;

DROP TABLE IF EXISTS production_orders;

DROP TABLE IF EXISTS production_order_history;

DROP TABLE IF EXISTS production_batches;

DROP TABLE IF EXISTS panel_projects;

DROP TABLE IF EXISTS panel_catalogue;

DROP TABLE IF EXISTS material_requests;

DROP TABLE IF EXISTS material_request_lines;

DROP TABLE IF EXISTS leave_requests;

DROP TABLE IF EXISTS inventory_items;

DROP TABLE IF EXISTS financial_expenses;

DROP TABLE IF EXISTS field_assignments;

DROP TABLE IF EXISTS employees;

DROP TABLE IF EXISTS employee_salaries;

DROP TABLE IF EXISTS employee_advances;

DROP TABLE IF EXISTS delivery_notes;

DROP TABLE IF EXISTS customers;

DROP TABLE IF EXISTS crm_leads;

DROP TABLE IF EXISTS audit_logs;

DROP TABLE IF EXISTS attendance_logs;

CREATE TABLE attendance_logs (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  log_date TEXT,
  check_in TEXT,
  check_out TEXT,
  shift_hours REAL,
  actual_hours REAL,
  status TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  created_at TEXT
);

CREATE TABLE crm_leads (
  id TEXT PRIMARY KEY,
  reference TEXT,
  name TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  company TEXT,
  expected_revenue REAL,
  currency TEXT,
  probability REAL,
  state TEXT,
  description TEXT,
  salesperson_id TEXT,
  project_id TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  customer_code TEXT,
  name TEXT,
  name_ar TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  tax_number TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE delivery_notes (
  id TEXT PRIMARY KEY,
  dn_number TEXT,
  project_id TEXT,
  scheduled_date TEXT,
  dispatch_time TEXT,
  delivery_time TEXT,
  status TEXT,
  items_summary TEXT,
  recipient_name TEXT,
  delivery_notes TEXT,
  proof_of_delivery_url TEXT,
  dispatched_by TEXT,
  created_at TEXT
);

CREATE TABLE employee_advances (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  request_date TEXT,
  amount REAL,
  repayment_months INTEGER,
  repaid_amount REAL,
  balance REAL,
  status TEXT,
  notes TEXT,
  approved_by TEXT,
  created_at TEXT
);

CREATE TABLE employee_salaries (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  period_month TEXT,
  basic_amount REAL,
  allowances REAL,
  advances_deducted REAL,
  other_deductions REAL,
  bonus REAL,
  net_amount REAL,
  payment_status TEXT,
  payment_date TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  employee_code TEXT,
  full_name TEXT,
  full_name_ar TEXT,
  department TEXT,
  job_title TEXT,
  manager_id TEXT,
  employment_status TEXT,
  hire_date TEXT,
  end_date TEXT,
  employment_type TEXT,
  skills TEXT,
  qualifications TEXT,
  certifications TEXT,
  annual_leave_balance REAL,
  sick_leave_balance REAL,
  created_at TEXT
);

CREATE TABLE field_assignments (
  id TEXT PRIMARY KEY,
  assignment_ref TEXT,
  client_name TEXT,
  project_id TEXT,
  site_location TEXT,
  address TEXT,
  visit_date TEXT,
  planned_time TEXT,
  assigned_personnel TEXT,
  electrical_department_involved INTEGER,
  job_requirements TEXT,
  work_description TEXT,
  expected_duration_hours REAL,
  required_equipment TEXT,
  status TEXT,
  actual_arrival TEXT,
  actual_departure TEXT,
  work_completed TEXT,
  issues_found TEXT,
  materials_used TEXT,
  recommendations TEXT,
  follow_up_actions TEXT,
  attachments TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE financial_expenses (
  id TEXT PRIMARY KEY,
  transaction_ref TEXT,
  category TEXT,
  description TEXT,
  transaction_date TEXT,
  amount REAL,
  currency TEXT,
  tax_amount REAL,
  supplier_or_employee TEXT,
  project_id TEXT,
  po_id TEXT,
  department TEXT,
  payment_method TEXT,
  payment_status TEXT,
  receipt_url TEXT,
  entered_by TEXT,
  approved_by TEXT,
  created_at TEXT,
  approved_at TEXT
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  sku TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT,
  uom TEXT,
  specifications TEXT,
  dimensions TEXT,
  supplier_name TEXT,
  warehouse_location TEXT,
  qty_on_hand REAL,
  qty_reserved REAL,
  qty_available REAL,
  reorder_threshold REAL,
  reorder_qty REAL,
  purchase_cost REAL,
  batch_serial_number TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  leave_type TEXT,
  start_date TEXT,
  end_date TEXT,
  days_count REAL,
  reason TEXT,
  status TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT
);

CREATE TABLE material_request_lines (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  item_id TEXT,
  requested_qty REAL,
  reserved_qty REAL,
  missing_qty REAL,
  ordered_qty REAL,
  received_qty REAL,
  issued_qty REAL
);

CREATE TABLE material_requests (
  id TEXT PRIMARY KEY,
  request_code TEXT,
  project_id TEXT,
  status TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE panel_catalogue (
  id TEXT PRIMARY KEY,
  panel_code TEXT,
  name TEXT,
  name_ar TEXT,
  width_mm REAL,
  height_mm REAL,
  thickness_mm REAL,
  material TEXT,
  technical_specs TEXT,
  standard_uom TEXT,
  production_settings TEXT,
  is_active INTEGER,
  created_at TEXT
);

CREATE TABLE panel_projects (
  id TEXT PRIMARY KEY,
  reference TEXT,
  name TEXT,
  customer_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  location TEXT,
  project_manager_id TEXT,
  date_start TEXT,
  date_delivery TEXT,
  description TEXT,
  quotation_amount REAL,
  currency TEXT,
  priority TEXT,
  state TEXT,
  job_order_number TEXT,
  monday_link TEXT,
  boq_link TEXT,
  overall_progress REAL,
  total_points INTEGER,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE production_batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT,
  panel_id TEXT,
  planned_quantity REAL,
  actual_quantity REAL,
  rejected_quantity REAL,
  rework_quantity REAL,
  in_production_qty REAL,
  painted_qty REAL,
  assembled_qty REAL,
  packed_qty REAL,
  dispatched_qty REAL,
  skip_painting INTEGER,
  skip_painting_reason TEXT,
  start_date TEXT,
  scheduled_completion TEXT,
  expected_delivery TEXT,
  linked_project_id TEXT,
  is_stock_replenishment INTEGER,
  assigned_team TEXT,
  responsible_employee_id TEXT,
  stage TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE production_order_history (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  from_stage TEXT,
  to_stage TEXT,
  changed_by TEXT,
  comment TEXT,
  created_at TEXT
);

CREATE TABLE production_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT,
  project_id TEXT,
  department TEXT,
  assigned_team TEXT,
  assigned_employee_id TEXT,
  item_description TEXT,
  quantity REAL,
  approved_drawings TEXT,
  requires_painting INTEGER,
  paint_status TEXT,
  created_at TEXT,
  accepted_at TEXT,
  accepted_by TEXT,
  planned_start TEXT,
  deadline TEXT,
  actual_start TEXT,
  actual_completion TEXT,
  stage TEXT,
  delay_reason TEXT,
  notes TEXT,
  attachments TEXT,
  created_by TEXT,
  updated_at TEXT
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_code TEXT,
  full_name TEXT,
  full_name_ar TEXT,
  email TEXT,
  password_hash TEXT,
  role TEXT,
  department TEXT,
  phone TEXT,
  reward_points INTEGER,
  avatar_url TEXT,
  is_active INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE project_drawings (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  drawing_number TEXT,
  revision_number TEXT,
  title TEXT,
  file_url TEXT,
  status TEXT,
  approved_by TEXT,
  approved_at TEXT,
  affected_departments TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT
);

CREATE TABLE purchase_order_lines (
  id TEXT PRIMARY KEY,
  po_id TEXT,
  item_id TEXT,
  item_description TEXT,
  quantity REAL,
  received_quantity REAL,
  unit_price REAL,
  total_price REAL
);

CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT,
  pr_id TEXT,
  project_id TEXT,
  supplier_name TEXT,
  supplier_contact TEXT,
  status TEXT,
  order_date TEXT,
  expected_delivery_date TEXT,
  total_amount REAL,
  currency TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE purchase_request_lines (
  id TEXT PRIMARY KEY,
  pr_id TEXT,
  item_id TEXT,
  item_description TEXT,
  specifications TEXT,
  quantity REAL,
  uom TEXT
);

CREATE TABLE purchase_requests (
  id TEXT PRIMARY KEY,
  pr_number TEXT,
  origin TEXT,
  project_id TEXT,
  department TEXT,
  justification TEXT,
  priority TEXT,
  required_by_date TEXT,
  status TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_by TEXT,
  created_at TEXT
);

CREATE TABLE qc_queue (
  id TEXT PRIMARY KEY,
  inspection_number TEXT,
  department TEXT,
  order_id TEXT,
  batch_id TEXT,
  project_id TEXT,
  assigned_inspector_id TEXT,
  status TEXT,
  defect_category TEXT,
  defect_severity TEXT,
  evidence_attachments TEXT,
  checklists TEXT,
  test_results TEXT,
  notes TEXT,
  corrective_actions TEXT,
  inspected_by TEXT,
  inspected_at TEXT,
  reinspected_by TEXT,
  reinspected_at TEXT,
  wait_time_seconds INTEGER,
  created_at TEXT
);

CREATE TABLE recruitment_candidates (
  id TEXT PRIMARY KEY,
  vacancy_id TEXT,
  candidate_name TEXT,
  email TEXT,
  phone TEXT,
  stage TEXT,
  notes TEXT,
  resume_url TEXT,
  interview_date TEXT,
  decision TEXT,
  created_at TEXT
);

CREATE TABLE recruitment_vacancies (
  id TEXT PRIMARY KEY,
  title TEXT,
  department TEXT,
  positions_count INTEGER,
  requirements TEXT,
  status TEXT,
  created_at TEXT
);

CREATE TABLE stock_ledger (
  id TEXT PRIMARY KEY,
  item_id TEXT,
  transaction_type TEXT,
  quantity_change REAL,
  balance_before REAL,
  balance_after REAL,
  project_id TEXT,
  reference_document TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT
);

CREATE TABLE system_notifications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT,
  target_role TEXT,
  title TEXT,
  title_ar TEXT,
  message TEXT,
  message_ar TEXT,
  category TEXT,
  link_url TEXT,
  is_read INTEGER,
  created_at TEXT
);

CREATE TABLE technician_tasks (
  id TEXT PRIMARY KEY,
  task_code TEXT,
  project_id TEXT,
  order_id TEXT,
  department TEXT,
  title TEXT,
  description TEXT,
  required_deliverables TEXT,
  priority TEXT,
  estimated_hours REAL,
  due_date TEXT,
  dependencies TEXT,
  required_skills TEXT,
  assigned_employee_id TEXT,
  assigned_team TEXT,
  assigned_at TEXT,
  accepted_at TEXT,
  actual_start TEXT,
  actual_finish TEXT,
  status TEXT,
  completion_notes TEXT,
  supporting_evidence TEXT,
  supervisor_approved INTEGER,
  supervisor_id TEXT,
  supervisor_approved_at TEXT,
  points_awarded INTEGER,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE time_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  employee_id TEXT,
  start_time TEXT,
  end_time TEXT,
  duration_seconds INTEGER,
  state TEXT,
  is_correction INTEGER,
  correction_reason TEXT,
  corrected_by TEXT,
  original_start_time TEXT,
  original_end_time TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS biometric_devices (
  id TEXT PRIMARY KEY,
  device_name TEXT,
  device_model TEXT,
  ip_address TEXT,
  port INTEGER,
  location TEXT,
  status TEXT,
  last_sync TEXT,
  auto_sync INTEGER,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS attendance_punches (
  id TEXT PRIMARY KEY,
  device_id TEXT,
  employee_id TEXT,
  biometric_pin TEXT,
  punch_time TEXT,
  punch_type TEXT,
  source TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS advance_installments (
  id TEXT PRIMARY KEY,
  advance_id TEXT,
  installment_number INTEGER,
  deduction_month TEXT,
  due_date TEXT,
  amount REAL,
  status TEXT,
  paid_at TEXT,
  payslip_ref TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS disciplinary_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  action_type TEXT,
  action_date TEXT,
  reason TEXT,
  deduction_days REAL,
  deduction_amount REAL,
  deduction_month TEXT,
  status TEXT,
  decision_maker TEXT,
  notes TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS resignation_records (
  id TEXT PRIMARY KEY,
  employee_id TEXT,
  submission_date TEXT,
  last_working_day TEXT,
  reason TEXT,
  notice_period_days INTEGER,
  status TEXT,
  clearance_status TEXT,
  end_of_service_benefits REAL,
  settlement_notes TEXT,
  reviewed_by TEXT,
  created_at TEXT
);