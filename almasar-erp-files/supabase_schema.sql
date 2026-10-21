-- ============================================================
-- Al-Masar Switchgear ERP — Supabase Database Schema
-- Run this in the Supabase SQL editor to set up the database
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'general_manager', 'production_supervisor', 'qc_technician',
  'design_engineer', 'sales', 'technician'
);

CREATE TYPE project_state AS ENUM (
  'draft', 'estimation', 'design', 'procurement',
  'warehouse', 'production', 'qc', 'accounting', 'logistics', 'done'
);

CREATE TYPE task_state AS ENUM ('pending', 'in_progress', 'done');
CREATE TYPE task_color AS ENUM ('green', 'red');
CREATE TYPE lead_state AS ENUM ('new', 'qualified', 'proposition', 'won', 'lost');
CREATE TYPE po_state AS ENUM ('draft', 'sent', 'confirmed', 'received', 'cancelled');
CREATE TYPE transfer_type AS ENUM ('incoming', 'internal', 'outgoing');
CREATE TYPE transfer_state AS ENUM ('draft', 'ready', 'done', 'cancelled');
CREATE TYPE mrp_state AS ENUM ('draft', 'confirmed', 'in_progress', 'done', 'cancelled');
CREATE TYPE qc_result AS ENUM ('pending', 'passed', 'failed');

CREATE TYPE stage_type AS ENUM (
  'sheet_metal', 'layout', 'power_wires', 'power_busbar', 'control', 'final_test'
);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  full_name_ar TEXT,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'technician',
  department TEXT,
  reward_points INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PANEL PROJECTS
-- ============================================================

CREATE TABLE panel_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL DEFAULT 'New',
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  location TEXT,
  date_start DATE NOT NULL DEFAULT CURRENT_DATE,
  date_delivery DATE,
  description TEXT,
  state project_state NOT NULL DEFAULT 'draft',
  job_order_number TEXT,
  monday_link TEXT,
  boq_link TEXT,
  -- Stage timestamps for KPIs
  date_estimation_end TIMESTAMPTZ,
  date_design_end TIMESTAMPTZ,
  date_procurement_end TIMESTAMPTZ,
  date_warehouse_end TIMESTAMPTZ,
  date_production_end TIMESTAMPTZ,
  date_qc_end TIMESTAMPTZ,
  date_accounting_end TIMESTAMPTZ,
  date_logistics_end TIMESTAMPTZ,
  -- Computed KPIs (updated via triggers)
  estimation_duration_days NUMERIC(10,2) DEFAULT 0,
  procurement_delay_days NUMERIC(10,2) DEFAULT 0,
  delivery_time_days NUMERIC(10,2) DEFAULT 0,
  overall_progress NUMERIC(5,2) DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY TEMPLATES (bilingual, hierarchical)
-- ============================================================

CREATE TABLE activity_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  stage_type stage_type NOT NULL,
  parent_id UUID REFERENCES activity_templates(id) ON DELETE SET NULL,
  sequence INTEGER NOT NULL DEFAULT 10,
  default_points INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PANEL TASKS
-- ============================================================

CREATE TABLE panel_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES panel_projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES activity_templates(id),
  stage_type stage_type,
  name TEXT,
  technician_id UUID REFERENCES profiles(id),
  state task_state NOT NULL DEFAULT 'pending',
  color_indicator task_color NOT NULL DEFAULT 'green',
  qc_notes TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  all_activities_done BOOLEAN NOT NULL DEFAULT FALSE,
  sequence INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LINES (checklist items per task)
-- ============================================================

CREATE TABLE activity_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES panel_tasks(id) ON DELETE CASCADE,
  template_id UUID REFERENCES activity_templates(id),
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 10,
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CRM LEADS
-- ============================================================

CREATE TABLE crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL DEFAULT 'New',
  name TEXT NOT NULL,           -- Opportunity name / project title
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  company TEXT,
  expected_revenue NUMERIC(14,2) DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  state lead_state NOT NULL DEFAULT 'new',
  description TEXT,
  date_closed DATE,
  salesperson_id UUID REFERENCES profiles(id),
  panel_project_id UUID REFERENCES panel_projects(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PURCHASE ORDERS (Procurement)
-- ============================================================

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL DEFAULT 'New',
  project_id UUID REFERENCES panel_projects(id),
  supplier_name TEXT NOT NULL,
  supplier_email TEXT,
  state po_state NOT NULL DEFAULT 'draft',
  order_date DATE DEFAULT CURRENT_DATE,
  expected_date DATE,
  total_amount NUMERIC(14,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
-- STOCK TRANSFERS (Warehouse)
-- ============================================================

CREATE TABLE stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL DEFAULT 'New',
  project_id UUID REFERENCES panel_projects(id),
  transfer_type transfer_type NOT NULL,
  state transfer_state NOT NULL DEFAULT 'draft',
  origin TEXT,
  destination TEXT,
  scheduled_date DATE,
  done_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity_demand NUMERIC(10,3) NOT NULL DEFAULT 1,
  quantity_done NUMERIC(10,3) DEFAULT 0,
  unit TEXT DEFAULT 'pcs'
);

-- ============================================================
-- MRP ORDERS (Manufacturing)
-- ============================================================

CREATE TABLE mrp_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL DEFAULT 'New',
  project_id UUID REFERENCES panel_projects(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  state mrp_state NOT NULL DEFAULT 'draft',
  scheduled_date DATE,
  date_started TIMESTAMPTZ,
  date_finished TIMESTAMPTZ,
  responsible_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bom_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mrp_id UUID NOT NULL REFERENCES mrp_orders(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'pcs',
  available BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- QC CHECKS
-- ============================================================

CREATE TABLE qc_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference TEXT UNIQUE NOT NULL DEFAULT 'New',
  project_id UUID REFERENCES panel_projects(id),
  mrp_id UUID REFERENCES mrp_orders(id),
  inspector_id UUID REFERENCES profiles(id),
  result qc_result NOT NULL DEFAULT 'pending',
  inspection_date DATE,
  fat_passed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEQUENCES (for auto-references)
-- ============================================================

CREATE SEQUENCE project_seq START 1;
CREATE SEQUENCE lead_seq START 1;
CREATE SEQUENCE po_seq START 1;
CREATE SEQUENCE transfer_seq START 1;
CREATE SEQUENCE mrp_seq START 1;
CREATE SEQUENCE qc_seq START 1;

-- Functions to generate references
CREATE OR REPLACE FUNCTION generate_project_ref() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference = 'New' THEN
    NEW.reference := 'EPF-' || LPAD(nextval('project_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_lead_ref() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference = 'New' THEN
    NEW.reference := 'CRM-' || LPAD(nextval('lead_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_po_ref() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference = 'New' THEN
    NEW.reference := 'PO-' || LPAD(nextval('po_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_transfer_ref() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference = 'New' THEN
    NEW.reference := 'WH-' || LPAD(nextval('transfer_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_mrp_ref() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference = 'New' THEN
    NEW.reference := 'MO-' || LPAD(nextval('mrp_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_qc_ref() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference = 'New' THEN
    NEW.reference := 'QC-' || LPAD(nextval('qc_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_ref BEFORE INSERT ON panel_projects FOR EACH ROW EXECUTE FUNCTION generate_project_ref();
CREATE TRIGGER trg_lead_ref BEFORE INSERT ON crm_leads FOR EACH ROW EXECUTE FUNCTION generate_lead_ref();
CREATE TRIGGER trg_po_ref BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION generate_po_ref();
CREATE TRIGGER trg_transfer_ref BEFORE INSERT ON stock_transfers FOR EACH ROW EXECUTE FUNCTION generate_transfer_ref();
CREATE TRIGGER trg_mrp_ref BEFORE INSERT ON mrp_orders FOR EACH ROW EXECUTE FUNCTION generate_mrp_ref();
CREATE TRIGGER trg_qc_ref BEFORE INSERT ON qc_checks FOR EACH ROW EXECUTE FUNCTION generate_qc_ref();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'technician')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED: Activity Templates (bilingual)
-- ============================================================

INSERT INTO activity_templates (name_en, name_ar, stage_type, sequence, default_points) VALUES
-- Sheet Metal
('Measure and mark enclosure panels', 'قياس وتحديد ألواح التغليف', 'sheet_metal', 1, 3),
('Cut sheet metal panels', 'قطع ألواح الصاج', 'sheet_metal', 2, 5),
('Drill cable gland holes', 'حفر ثقوب مدخل الكابلات', 'sheet_metal', 3, 4),
('Apply powder coating / paint', 'تطبيق الطلاء البودري', 'sheet_metal', 4, 4),
('Install enclosure frame', 'تركيب هيكل اللوحة', 'sheet_metal', 5, 5),
-- Layout
('Mark DIN rail positions', 'تحديد مواضع القضبان DIN', 'layout', 1, 3),
('Install DIN rails', 'تركيب قضبان DIN', 'layout', 2, 4),
('Mount circuit breakers on rails', 'تثبيت قواطع الدائرة على القضبان', 'layout', 3, 5),
('Install contactors and relays', 'تركيب الكونتاكتورات والريليات', 'layout', 4, 5),
('Label all components', 'تسمية جميع المكونات', 'layout', 5, 3),
-- Power Wires
('Cut and strip power cables', 'قطع وتقشير كابلات القدرة', 'power_wires', 1, 4),
('Connect main power supply', 'توصيل مصدر الطاقة الرئيسي', 'power_wires', 2, 6),
('Wire circuit breakers', 'توصيل قواطع الدائرة', 'power_wires', 3, 6),
('Connect output terminals', 'توصيل الأطراف الخارجية', 'power_wires', 4, 5),
-- Power Busbar
('Install main busbar', 'تركيب البسبار الرئيسي', 'power_busbar', 1, 6),
('Connect phase busbars', 'توصيل بسبارات الأطوار', 'power_busbar', 2, 6),
('Install neutral and earth busbars', 'تركيب بسبار المحايد والأرضي', 'power_busbar', 3, 5),
('Torque all busbar connections', 'ربط جميع وصلات البسبار بالعزم المطلوب', 'power_busbar', 4, 4),
-- Control
('Install control transformer', 'تركيب محول التحكم', 'control', 1, 5),
('Wire PLC/controller inputs', 'توصيل مدخلات PLC/وحدة التحكم', 'control', 2, 7),
('Wire PLC/controller outputs', 'توصيل مخرجات PLC/وحدة التحكم', 'control', 3, 7),
('Connect HMI panel', 'توصيل لوحة HMI', 'control', 4, 6),
('Label control wires', 'تسمية أسلاك التحكم', 'control', 5, 3),
-- Final Test
('Visual inspection', 'الفحص البصري', 'final_test', 1, 3),
('Insulation resistance test (Megger)', 'اختبار مقاومة العزل (ميجر)', 'final_test', 2, 6),
('High voltage dielectric test', 'اختبار الجهد العالي', 'final_test', 3, 7),
('Functional test of all circuits', 'الاختبار الوظيفي لجميع الدوائر', 'final_test', 4, 8),
('FAT (Factory Acceptance Test)', 'اختبار القبول المصنعي FAT', 'final_test', 5, 10);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_checks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read everything
CREATE POLICY "authenticated_read_all" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_projects" ON panel_projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_tasks" ON panel_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_templates" ON activity_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_lines" ON activity_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_leads" ON crm_leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_po" ON purchase_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_po_lines" ON purchase_order_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_transfers" ON stock_transfers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_transfer_lines" ON stock_transfer_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_mrp" ON mrp_orders FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_bom" ON bom_lines FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_qc" ON qc_checks FOR SELECT USING (auth.role() = 'authenticated');

-- Write: all authenticated for now (app-level role checks handle this)
CREATE POLICY "authenticated_write_all" ON panel_projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_tasks" ON panel_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_lines" ON activity_lines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_leads" ON crm_leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_po" ON purchase_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_po_lines" ON purchase_order_lines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_transfers" ON stock_transfers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_transfer_lines" ON stock_transfer_lines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_mrp" ON mrp_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_bom" ON bom_lines FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_qc" ON qc_checks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write_templates" ON activity_templates FOR ALL USING (auth.role() = 'authenticated');
