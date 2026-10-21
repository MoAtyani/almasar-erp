-- ============================================================
-- AL-MASAR SWITCHGEAR FACTORY ERP — FULL DATABASE SCHEMA
-- Electrical Panel Manufacturing Management System
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. USER PROFILES & ROLES ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('general_manager', 'production_supervisor', 'qc_technician', 'design_engineer', 'sales', 'technician')),
  department TEXT,
  reward_points INTEGER DEFAULT 0,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. PANEL PROJECTS (Core Factory Workflow) ──
CREATE TABLE IF NOT EXISTS panel_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  location TEXT,
  date_start TIMESTAMPTZ DEFAULT NOW(),
  date_delivery TIMESTAMPTZ,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN (
    'draft', 'estimation', 'design', 'procurement',
    'warehouse', 'production', 'qc', 'accounting', 'logistics', 'done'
  )),
  job_order_number TEXT,
  monday_link TEXT,
  boq_link TEXT,
  date_estimation_end TIMESTAMPTZ,
  date_design_end TIMESTAMPTZ,
  date_procurement_end TIMESTAMPTZ,
  date_warehouse_end TIMESTAMPTZ,
  date_production_end TIMESTAMPTZ,
  date_qc_end TIMESTAMPTZ,
  date_accounting_end TIMESTAMPTZ,
  date_logistics_end TIMESTAMPTZ,
  estimation_duration_days NUMERIC(8,2) DEFAULT 0,
  procurement_delay_days NUMERIC(8,2) DEFAULT 0,
  delivery_time_days NUMERIC(8,2) DEFAULT 0,
  overall_progress NUMERIC(5,2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. ACTIVITY TEMPLATES (Predefined Factory Stages) ──
CREATE TABLE IF NOT EXISTS activity_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  stage_type TEXT NOT NULL CHECK (stage_type IN (
    'sheet_metal', 'layout', 'power_wires', 'power_busbar', 'control', 'final_test'
  )),
  parent_id UUID REFERENCES activity_templates(id) ON DELETE CASCADE,
  sequence INTEGER DEFAULT 10,
  default_points INTEGER DEFAULT 20
);

-- ── 4. PANEL TASKS & TECHNICIAN ASSIGNMENTS ──
CREATE TABLE IF NOT EXISTS panel_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES activity_templates(id),
  stage_type TEXT CHECK (stage_type IN ('sheet_metal', 'layout', 'power_wires', 'power_busbar', 'control', 'final_test')),
  name TEXT,
  technician_id UUID REFERENCES profiles(id),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'in_progress', 'done')),
  color_indicator TEXT NOT NULL DEFAULT 'green' CHECK (color_indicator IN ('green', 'red')),
  qc_notes TEXT,
  points_awarded INTEGER DEFAULT 0,
  all_activities_done BOOLEAN DEFAULT FALSE,
  sequence INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. ACTIVITY CHECKLIST LINES ──
CREATE TABLE IF NOT EXISTS activity_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES panel_tasks(id) ON DELETE CASCADE,
  template_id UUID REFERENCES activity_templates(id),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  sequence INTEGER DEFAULT 10,
  is_done BOOLEAN DEFAULT FALSE,
  notes TEXT,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES profiles(id)
);

-- ── 6. SALES CRM LEADS ──
CREATE TABLE IF NOT EXISTS crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  company TEXT,
  expected_revenue NUMERIC(12,2) DEFAULT 0,
  probability NUMERIC(5,2) DEFAULT 50,
  state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'qualified', 'proposition', 'won', 'lost')),
  description TEXT,
  date_closed TIMESTAMPTZ,
  salesperson_id UUID REFERENCES profiles(id),
  panel_project_id UUID REFERENCES panel_projects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. PROCUREMENT & PURCHASE ORDERS ──
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES panel_projects(id),
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'sent', 'confirmed', 'received', 'cancelled')),
  order_date TIMESTAMPTZ DEFAULT NOW(),
  expected_date TIMESTAMPTZ,
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL
);

-- ── 8. WAREHOUSE & STOCK TRANSFERS ──
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES panel_projects(id),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('incoming', 'internal', 'outgoing')),
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'ready', 'done', 'cancelled')),
  origin TEXT,
  destination TEXT,
  scheduled_date TIMESTAMPTZ,
  done_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity_demand NUMERIC(10,2) NOT NULL,
  quantity_done NUMERIC(10,2) DEFAULT 0,
  unit TEXT DEFAULT 'pcs'
);

-- ── 9. PRODUCTION MRP ──
CREATE TABLE IF NOT EXISTS mrp_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES panel_projects(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'confirmed', 'in_progress', 'done', 'cancelled')),
  scheduled_date TIMESTAMPTZ,
  date_started TIMESTAMPTZ,
  date_finished TIMESTAMPTZ,
  responsible_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mrp_id UUID NOT NULL REFERENCES mrp_orders(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit TEXT DEFAULT 'pcs',
  available BOOLEAN DEFAULT TRUE
);

-- ── 10. QUALITY CONTROL & FAT INSPECTION ──
CREATE TABLE IF NOT EXISTS qc_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  project_id UUID REFERENCES panel_projects(id),
  mrp_id UUID REFERENCES mrp_orders(id),
  inspector_id UUID REFERENCES profiles(id),
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending', 'passed', 'failed')),
  inspection_date TIMESTAMPTZ,
  fat_passed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. INVOICING & ACCOUNTING ──
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('customer', 'vendor')),
  partner_name TEXT NOT NULL,
  project_id UUID REFERENCES panel_projects(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'posted', 'paid', 'cancelled')),
  amount_untaxed NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- ── 12. HR & PAYROLL ──
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT NOT NULL,
  department TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hire_date DATE DEFAULT CURRENT_DATE,
  basic_salary NUMERIC(10,2) NOT NULL DEFAULT 2000,
  reward_points INTEGER DEFAULT 0,
  bank_account TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated'))
);

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES employees(id),
  employee_name TEXT NOT NULL,
  month TEXT NOT NULL,
  basic_salary NUMERIC(10,2) NOT NULL,
  points_bonus NUMERIC(10,2) DEFAULT 0,
  allowances NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  net_salary NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  payment_date DATE
);

-- ── 13. DMS (DOCUMENT MANAGEMENT) ──
CREATE TABLE IF NOT EXISTS dms_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_ar TEXT,
  file_name TEXT NOT NULL,
  file_size TEXT,
  file_type TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'single_line_diagram', 'cad_drawing', 'boq_sheet', 'fat_certificate', 'manual', 'client_approval'
  )),
  project_id UUID REFERENCES panel_projects(id),
  project_reference TEXT,
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'superseded')),
  uploaded_by TEXT NOT NULL,
  upload_date DATE DEFAULT CURRENT_DATE,
  file_url TEXT
);

-- ── 14. HELPDESK & AFTER-SALES SUPPORT ──
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  project_id UUID REFERENCES panel_projects(id),
  project_reference TEXT,
  panel_serial_number TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  state TEXT DEFAULT 'new' CHECK (state IN ('new', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to TEXT,
  description TEXT NOT NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 15. AUTOMATIC REWARD POINTS TRIGGER ──
CREATE OR REPLACE FUNCTION update_technician_reward_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'done' AND OLD.state != 'done' AND NEW.technician_id IS NOT NULL THEN
    UPDATE profiles
    SET reward_points = reward_points + COALESCE(NEW.points_awarded, 20)
    WHERE id = NEW.technician_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_panel_task_done ON panel_tasks;
CREATE TRIGGER trigger_panel_task_done
  AFTER UPDATE OF state ON panel_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_technician_reward_points();
