export type UserRole = 
  | 'general_manager'
  | 'production_supervisor'
  | 'qc_technician'
  | 'design_engineer'
  | 'sales'
  | 'technician'

export type ProjectState = 
  | 'draft' | 'estimation' | 'design' | 'procurement'
  | 'warehouse' | 'production' | 'qc' | 'accounting' | 'logistics' | 'done'

export type TaskState = 'pending' | 'in_progress' | 'done'
export type TaskColor = 'green' | 'red'
export type LeadState = 'new' | 'qualified' | 'proposition' | 'won' | 'lost'
export type PoState = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
export type TransferType = 'incoming' | 'internal' | 'outgoing'
export type TransferState = 'draft' | 'ready' | 'done' | 'cancelled'
export type MrpState = 'draft' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'
export type QcResult = 'pending' | 'passed' | 'failed'
export type StageType = 
  | 'sheet_metal' | 'layout' | 'power_wires' | 'power_busbar' | 'control' | 'final_test'

export interface Profile {
  id: string
  full_name: string
  full_name_ar?: string
  email: string
  role: UserRole
  department?: string
  reward_points: number
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PanelProject {
  id: string
  reference: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  location?: string
  date_start: string
  date_delivery?: string
  description?: string
  state: ProjectState
  job_order_number?: string
  monday_link?: string
  boq_link?: string
  date_estimation_end?: string
  date_design_end?: string
  date_procurement_end?: string
  date_warehouse_end?: string
  date_production_end?: string
  date_qc_end?: string
  date_accounting_end?: string
  date_logistics_end?: string
  estimation_duration_days: number
  procurement_delay_days: number
  delivery_time_days: number
  overall_progress: number
  total_points: number
  created_by?: string
  created_at: string
  updated_at: string
  task_ids?: PanelTask[]
}

export interface ActivityTemplate {
  id: string
  name_en: string
  name_ar: string
  stage_type: StageType
  parent_id?: string
  sequence: number
  default_points: number
  child_ids?: ActivityTemplate[]
}

export interface PanelTask {
  id: string
  project_id: string
  template_id?: string
  stage_type?: StageType
  name?: string
  technician_id?: string
  state: TaskState
  color_indicator: TaskColor
  qc_notes?: string
  points_awarded: number
  all_activities_done: boolean
  sequence: number
  created_at: string
  updated_at: string
  project?: PanelProject
  technician?: Profile
  template?: ActivityTemplate
  checklist?: ActivityLine[]
}

export interface ActivityLine {
  id: string
  task_id: string
  template_id?: string
  name_en: string
  name_ar: string
  sequence: number
  is_done: boolean
  notes?: string
  done_at?: string
  done_by?: string
}

export interface CrmLead {
  id: string
  reference: string
  name: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  company?: string
  expected_revenue: number
  probability: number
  state: LeadState
  description?: string
  date_closed?: string
  salesperson_id?: string
  panel_project_id?: string
  created_at: string
  updated_at: string
  salesperson?: Profile
}

export interface PurchaseOrder {
  id: string
  reference: string
  project_id?: string
  supplier_name: string
  supplier_email?: string
  state: PoState
  order_date: string
  expected_date?: string
  total_amount: number
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  lines?: PurchaseOrderLine[]
  project?: PanelProject
}

export interface PurchaseOrderLine {
  id: string
  po_id: string
  product_name: string
  description?: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface StockTransfer {
  id: string
  reference: string
  project_id?: string
  transfer_type: TransferType
  state: TransferState
  origin?: string
  destination?: string
  scheduled_date?: string
  done_date?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  lines?: StockTransferLine[]
  project?: PanelProject
}

export interface StockTransferLine {
  id: string
  transfer_id: string
  product_name: string
  quantity_demand: number
  quantity_done: number
  unit: string
}

export interface MrpOrder {
  id: string
  reference: string
  project_id?: string
  product_name: string
  quantity: number
  state: MrpState
  scheduled_date?: string
  date_started?: string
  date_finished?: string
  responsible_id?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
  bom_lines?: BomLine[]
  project?: PanelProject
  responsible?: Profile
}

export interface BomLine {
  id: string
  mrp_id: string
  component_name: string
  quantity: number
  unit: string
  available: boolean
}

export interface QcCheck {
  id: string
  reference: string
  project_id?: string
  mrp_id?: string
  inspector_id?: string
  result: QcResult
  inspection_date?: string
  fat_passed: boolean
  notes?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
  project?: PanelProject
  inspector?: Profile
}

// ── Accounting Types ──
export type InvoiceType = 'customer' | 'vendor'
export type InvoiceState = 'draft' | 'posted' | 'paid' | 'cancelled'

export interface InvoiceLine {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: string
  reference: string
  invoice_type: InvoiceType
  partner_name: string
  project_id?: string
  project?: PanelProject
  invoice_date: string
  due_date: string
  state: InvoiceState
  amount_untaxed: number
  tax_amount: number
  total_amount: number
  notes?: string
  lines?: InvoiceLine[]
  created_at: string
}

// ── HR & Payroll Types ──
export interface Employee {
  id: string
  full_name: string
  full_name_ar: string
  employee_id: string
  department: string
  role: UserRole
  email: string
  phone: string
  hire_date: string
  basic_salary: number
  reward_points: number
  bank_account?: string
  status: 'active' | 'on_leave' | 'terminated'
}

export interface Payslip {
  id: string
  reference: string
  employee_id: string
  employee_name: string
  month: string
  basic_salary: number
  points_bonus: number
  allowances: number
  deductions: number
  net_salary: number
  status: 'draft' | 'approved' | 'paid'
  payment_date?: string
}

// ── DMS (Document Management) Types ──
export type DocCategory = 'single_line_diagram' | 'cad_drawing' | 'boq_sheet' | 'fat_certificate' | 'manual' | 'client_approval'

export interface DmsDocument {
  id: string
  title: string
  title_ar: string
  file_name: string
  file_size: string
  file_type: string
  category: DocCategory
  project_id?: string
  project_reference?: string
  version: string
  status: 'draft' | 'pending_review' | 'approved' | 'superseded'
  uploaded_by: string
  upload_date: string
  file_url?: string
}

// ── Helpdesk Types ──
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketState = 'new' | 'in_progress' | 'waiting' | 'resolved' | 'closed'

export interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  customer_name: string
  project_id?: string
  project_reference?: string
  priority: TicketPriority
  state: TicketState
  assigned_to?: string
  panel_serial_number?: string
  description: string
  resolution_notes?: string
  created_at: string
  updated_at: string
}

