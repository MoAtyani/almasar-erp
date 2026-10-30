-- ============================================================
-- AL-MASAR SWITCHGEAR FACTORY ERP — COMPLETE PRODUCTION SCHEMA
-- Integrated Multi-Department Enterprise System
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES & ROLES (Workflow 12) ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'company_owner', 'system_admin', 'production_manager',
    'factory_a_manager', 'factory_b_manager', 'electrical_manager',
    'qc_inspector', 'designer', 'project_manager', 'warehouse_officer',
    'procurement_officer', 'sales_officer', 'finance_officer', 'hr_officer',
    'technician', 'engineer', 'viewer'
  )),
  department TEXT,
  phone TEXT,
  reward_points INTEGER DEFAULT 0,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. AUDIT LOGS (Workflow 12) ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. NOTIFICATIONS & ESCALATIONS (Workflow 10) ──
CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES profiles(id),
  target_role TEXT,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'order_assigned', 'order_status', 'task_timer', 'deadline_risk',
    'qc_required', 'qc_failed', 'qc_approved', 'ready_dispatch',
    'stock_low', 'purchase_approval', 'supplier_delay', 'field_update',
    'approval_pending', 'general'
  )),
  link_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. CUSTOMERS & CONTACTS (Workflow 8 & 11) ──
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_code TEXT UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  city TEXT,
  tax_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. PANEL PROJECTS (Workflow 1.1) ──
CREATE TABLE IF NOT EXISTS panel_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  location TEXT,
  project_manager_id UUID REFERENCES profiles(id),
  date_start TIMESTAMPTZ DEFAULT NOW(),
  date_delivery TIMESTAMPTZ,
  description TEXT,
  quotation_amount NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN (
    'new', 'pricing', 'design', 'planning', 'in_production', 'qc', 'ready_delivery', 'dispatched', 'done'
  )),
  job_order_number TEXT,
  monday_link TEXT,
  boq_link TEXT,
  overall_progress NUMERIC(5,2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. PROJECT DRAWINGS & REVISIONS (Workflow 1.1) ──
CREATE TABLE IF NOT EXISTS project_drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
  drawing_number TEXT NOT NULL,
  revision_number TEXT NOT NULL DEFAULT 'Rev 0',
  title TEXT NOT NULL,
  file_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'client_approved', 'approved_for_production', 'superseded')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  affected_departments TEXT[],
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. PRODUCTION ORDERS (Workflow 1.2, 1.3, 1.4, 1.5) ──
-- Factory A (Custom Metal), Factory B (Standard Panels), Electrical (Wiring & Assembly)
CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN ('factory_a', 'factory_b', 'electrical')),
  assigned_team TEXT,
  assigned_employee_id UUID REFERENCES profiles(id),
  item_description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  approved_drawings TEXT,
  
  -- Factory A specific
  requires_painting BOOLEAN DEFAULT FALSE,
  paint_status TEXT DEFAULT 'none' CHECK (paint_status IN ('none', 'queued', 'in_painting', 'painted', 'qc_rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES profiles(id),
  planned_start TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_completion TIMESTAMPTZ,
  
  -- Workflow Stage & Status
  stage TEXT NOT NULL DEFAULT 'awaiting_acceptance' CHECK (stage IN (
    'awaiting_acceptance', 'accepted', 'in_progress', 'manufacturing_complete',
    'painting', 'paint_qc', 'assembly', 'qc_inspection', 'rework',
    'ready_for_delivery', 'packed', 'dispatched'
  )),
  delay_reason TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production Order Status History
CREATE TABLE IF NOT EXISTS production_order_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. FACTORY B PANEL CATALOGUE (Workflow 1.4) ──
CREATE TABLE IF NOT EXISTS panel_catalogue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  width_mm NUMERIC(10,2) NOT NULL,
  height_mm NUMERIC(10,2) NOT NULL,
  thickness_mm NUMERIC(10,2) NOT NULL,
  material TEXT NOT NULL,
  technical_specs TEXT,
  standard_uom TEXT DEFAULT 'unit',
  production_settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. FACTORY B PRODUCTION BATCHES (Workflow 1.4) ──
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number TEXT NOT NULL UNIQUE,
  panel_id UUID NOT NULL REFERENCES panel_catalogue(id),
  planned_quantity NUMERIC(10,2) NOT NULL,
  actual_quantity NUMERIC(10,2) DEFAULT 0,
  rejected_quantity NUMERIC(10,2) DEFAULT 0,
  rework_quantity NUMERIC(10,2) DEFAULT 0,
  
  -- Partial batch quantities per stage
  in_production_qty NUMERIC(10,2) DEFAULT 0,
  painted_qty NUMERIC(10,2) DEFAULT 0,
  assembled_qty NUMERIC(10,2) DEFAULT 0,
  packed_qty NUMERIC(10,2) DEFAULT 0,
  dispatched_qty NUMERIC(10,2) DEFAULT 0,

  skip_painting BOOLEAN DEFAULT FALSE,
  skip_painting_reason TEXT,

  start_date DATE DEFAULT CURRENT_DATE,
  scheduled_completion DATE,
  expected_delivery DATE,
  linked_project_id UUID REFERENCES panel_projects(id),
  is_stock_replenishment BOOLEAN DEFAULT FALSE,
  assigned_team TEXT,
  responsible_employee_id UUID REFERENCES profiles(id),
  
  stage TEXT NOT NULL DEFAULT 'batch_created' CHECK (stage IN (
    'batch_created', 'production_scheduled', 'production_started',
    'manufacturing_complete', 'painting', 'paint_qc', 'assembly',
    'final_qc', 'packing', 'ready_for_dispatch', 'dispatched'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. QUALITY CONTROL QUEUE & AUDIT (Workflow 1.5, 1.6) ──
CREATE TABLE IF NOT EXISTS qc_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL CHECK (department IN ('factory_a', 'factory_b', 'electrical', 'painting', 'assembly', 'final_inspection')),
  order_id UUID REFERENCES production_orders(id),
  batch_id UUID REFERENCES production_batches(id),
  project_id UUID REFERENCES panel_projects(id),
  assigned_inspector_id UUID REFERENCES profiles(id),
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'assigned', 'in_inspection', 'passed', 'failed', 'rework_in_progress', 'reinspected'
  )),
  
  defect_category TEXT,
  defect_severity TEXT CHECK (defect_severity IN ('minor', 'major', 'critical')),
  evidence_attachments JSONB DEFAULT '[]',
  checklists JSONB DEFAULT '[]',
  test_results JSONB DEFAULT '{}',
  notes TEXT,
  corrective_actions TEXT,
  
  inspected_by UUID REFERENCES profiles(id),
  inspected_at TIMESTAMPTZ,
  reinspected_by UUID REFERENCES profiles(id),
  reinspected_at TIMESTAMPTZ,
  wait_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. TECHNICIAN & ENGINEER TASKS (Workflow 2.1) ──
CREATE TABLE IF NOT EXISTS technician_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_code TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES panel_projects(id) ON DELETE CASCADE,
  order_id UUID REFERENCES production_orders(id),
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  required_deliverables TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_hours NUMERIC(6,2) DEFAULT 0,
  due_date TIMESTAMPTZ,
  dependencies TEXT,
  required_skills TEXT[],
  
  assigned_employee_id UUID REFERENCES profiles(id),
  assigned_team TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_finish TIMESTAMPTZ,
  
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN (
    'assigned', 'accepted', 'in_progress', 'paused', 'completed', 'verified', 'rework'
  )),
  
  completion_notes TEXT,
  supporting_evidence JSONB DEFAULT '[]',
  supervisor_approved BOOLEAN DEFAULT FALSE,
  supervisor_id UUID REFERENCES profiles(id),
  supervisor_approved_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. SERVER-SIDE TIME LOGS (Workflow 2.2) ──
-- Enforces no overlapping active timers per employee
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES technician_tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'paused', 'completed')),
  is_correction BOOLEAN DEFAULT FALSE,
  correction_reason TEXT,
  corrected_by UUID REFERENCES profiles(id),
  original_start_time TIMESTAMPTZ,
  original_end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 13. EXTERNAL PROJECTS & FIELD ASSIGNMENTS (Workflow 3) ──
CREATE TABLE IF NOT EXISTS field_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_ref TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  project_id UUID REFERENCES panel_projects(id),
  site_location TEXT NOT NULL,
  address TEXT,
  visit_date DATE NOT NULL,
  planned_time TIME,
  assigned_personnel UUID[] DEFAULT '{}',
  electrical_department_involved BOOLEAN DEFAULT TRUE,
  job_requirements TEXT,
  work_description TEXT NOT NULL,
  expected_duration_hours NUMERIC(6,2) DEFAULT 4,
  required_equipment TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'follow_up_required'
  )),
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  work_completed TEXT,
  issues_found TEXT,
  materials_used TEXT,
  recommendations TEXT,
  follow_up_actions TEXT,
  attachments JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. INVENTORY & TRANSACTION LEDGER (Workflow 6) ──
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  description_ar TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'finished_goods', 'raw_materials', 'electrical_components', 'panel_stock', 'consumables', 'company_supplies'
  )),
  uom TEXT NOT NULL DEFAULT 'pcs',
  specifications TEXT,
  dimensions TEXT,
  supplier_name TEXT,
  warehouse_location TEXT,
  qty_on_hand NUMERIC(12,2) DEFAULT 0,
  qty_reserved NUMERIC(12,2) DEFAULT 0,
  qty_available NUMERIC(12,2) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  reorder_threshold NUMERIC(12,2) DEFAULT 10,
  reorder_qty NUMERIC(12,2) DEFAULT 50,
  purchase_cost NUMERIC(12,2) DEFAULT 0,
  batch_serial_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable Inventory Transaction Ledger
CREATE TABLE IF NOT EXISTS stock_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'goods_received', 'goods_issued', 'project_reservation', 'material_consumption',
    'warehouse_transfer', 'stock_adjustment', 'return', 'damaged', 'stocktake'
  )),
  quantity_change NUMERIC(12,2) NOT NULL,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  project_id UUID REFERENCES panel_projects(id),
  reference_document TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Design-to-Warehouse Picking Requests (Workflow 6.3)
CREATE TABLE IF NOT EXISTS material_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_code TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'stock_checked', 'reserved', 'shortage_identified', 'purchase_requested', 'partially_issued', 'issued'
  )),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_request_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  requested_qty NUMERIC(12,2) NOT NULL,
  reserved_qty NUMERIC(12,2) DEFAULT 0,
  missing_qty NUMERIC(12,2) DEFAULT 0,
  ordered_qty NUMERIC(12,2) DEFAULT 0,
  received_qty NUMERIC(12,2) DEFAULT 0,
  issued_qty NUMERIC(12,2) DEFAULT 0
);

-- ── 15. PROCUREMENT (Workflow 7) ──
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_number TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL CHECK (origin IN (
    'warehouse_shortage', 'factory_material', 'electrical_shortage', 'project_manager', 'company_supply'
  )),
  project_id UUID REFERENCES panel_projects(id),
  department TEXT NOT NULL,
  justification TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  required_by_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'po_created', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  item_description TEXT NOT NULL,
  specifications TEXT,
  quantity NUMERIC(12,2) NOT NULL,
  uom TEXT DEFAULT 'pcs'
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  pr_id UUID REFERENCES purchase_requests(id),
  project_id UUID REFERENCES panel_projects(id),
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'sent', 'confirmed', 'partially_received', 'fully_received', 'cancelled'
  )),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  total_amount NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  item_description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  received_quantity NUMERIC(12,2) DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL
);

-- ── 16. SALES & DELIVERIES (Workflow 8) ──
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  company TEXT,
  expected_revenue NUMERIC(14,2) DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  probability NUMERIC(5,2) DEFAULT 50,
  state TEXT NOT NULL DEFAULT 'lead' CHECK (state IN (
    'lead', 'enquiry', 'quotation', 'customer_approval', 'sales_order', 'won', 'lost'
  )),
  description TEXT,
  salesperson_id UUID REFERENCES profiles(id),
  project_id UUID REFERENCES panel_projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dn_number TEXT NOT NULL UNIQUE,
  project_id UUID NOT NULL REFERENCES panel_projects(id),
  scheduled_date DATE,
  dispatch_time TIMESTAMPTZ,
  delivery_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ready_dispatch' CHECK (status IN (
    'ready_dispatch', 'scheduled', 'dispatched', 'delivered', 'partial'
  )),
  items_summary TEXT,
  recipient_name TEXT,
  delivery_notes TEXT,
  proof_of_delivery_url TEXT,
  dispatched_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 17. RESTRICTED FINANCE & EXPENSES (Workflow 4) ──
-- Strictly accessible to company_owner and finance_officer
CREATE TABLE IF NOT EXISTS financial_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_ref TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN (
    'salaries_wages', 'employee_advances', 'vehicle_rentals_transport',
    'purchases_supplier_payments', 'vehicle_fuel', 'electricity', 'water',
    'company_supplies', 'rent_utilities', 'maintenance_repairs', 'other_operational'
  )),
  description TEXT NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  tax_amount NUMERIC(14,2) DEFAULT 0,
  supplier_or_employee TEXT,
  project_id UUID REFERENCES panel_projects(id),
  po_id UUID REFERENCES purchase_orders(id),
  department TEXT,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'disputed')),
  receipt_url TEXT,
  entered_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Restricted Salaries & Advances (Workflow 4.3)
CREATE TABLE IF NOT EXISTS employee_salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id),
  period_month TEXT NOT NULL,
  basic_amount NUMERIC(12,2) NOT NULL,
  allowances NUMERIC(12,2) DEFAULT 0,
  advances_deducted NUMERIC(12,2) DEFAULT 0,
  other_deductions NUMERIC(12,2) DEFAULT 0,
  bonus NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_advances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id),
  request_date DATE DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL,
  repayment_months INTEGER DEFAULT 1,
  repaid_amount NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) GENERATED ALWAYS AS (amount - repaid_amount) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'repaid', 'cancelled')),
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 18. HUMAN RESOURCES (Workflow 5) ──
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  manager_id UUID REFERENCES profiles(id),
  employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'terminated')),
  hire_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  employment_type TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  skills TEXT[],
  qualifications TEXT,
  certifications TEXT,
  annual_leave_balance NUMERIC(5,2) DEFAULT 21,
  sick_leave_balance NUMERIC(5,2) DEFAULT 14,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'personal', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  shift_hours NUMERIC(5,2) DEFAULT 8.0,
  actual_hours NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recruitment_vacancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  positions_count INTEGER DEFAULT 1,
  requirements TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('draft', 'open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recruitment_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_id UUID REFERENCES recruitment_vacancies(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  stage TEXT NOT NULL DEFAULT 'applied' CHECK (stage IN (
    'applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'
  )),
  notes TEXT,
  resume_url TEXT,
  interview_date TIMESTAMPTZ,
  decision TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 19. ADVANCED HR & PAYROLL MODULES ──

-- Biometric Attendance Devices
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

-- Raw Biometric Punch Logs
CREATE TABLE IF NOT EXISTS attendance_punches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES biometric_devices(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  biometric_pin TEXT,
  punch_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  punch_type TEXT DEFAULT 'check_in', -- check_in, check_out
  source TEXT DEFAULT 'biometric_device',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Advance Installment Schedules
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

-- Disciplinary Actions and Penalties
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

-- Resignations & End of Service
CREATE TABLE IF NOT EXISTS resignation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_working_day DATE NOT NULL,
  reason TEXT NOT NULL,
  notice_period_days INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, withdrawn, completed
  clearance_status TEXT DEFAULT 'in_progress',
  end_of_service_benefits NUMERIC(12,2) DEFAULT 0,
  settlement_notes TEXT,
  reviewed_by TEXT DEFAULT 'HR & General Management',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

