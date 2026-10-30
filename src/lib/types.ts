export type UserRole = 
  | 'general_manager'
  | 'production_supervisor'
  | 'qc_technician'
  | 'design_engineer'
  | 'sales'
  | 'technician'
  | 'system_admin'
  | 'admin'
  | 'sales_officer'
  | 'production_manager'
  | 'warehouse_officer'
  | 'qc_inspector'
  | 'company_owner'

export type ProjectState = 
  | 'new' | 'planning' | 'draft' | 'estimation' | 'design' | 'procurement'
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
  name?: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  location?: string
  quotation_amount?: number
  currency?: string
  priority?: string
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
  project?: Partial<PanelProject> | any
  technician?: Partial<Profile> | any
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
  project?: Partial<PanelProject> & { reference?: string }
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
  project?: Partial<PanelProject> & { reference?: string }
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
  project?: Partial<PanelProject> & { reference?: string }
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
  project?: Partial<PanelProject> & { reference?: string }
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
  project?: Partial<PanelProject> & { reference?: string }
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
  profile_id?: string
  full_name: string
  full_name_ar: string
  employee_id: string
  employee_code?: string
  department: string
  job_title?: string
  role: UserRole
  email: string
  phone: string
  hire_date: string
  effective_date?: string
  national_id?: string
  basic_salary: number
  housing_allowance?: number
  transport_allowance?: number
  other_allowances?: number
  social_security_number?: string
  social_security_rate_employee?: number
  social_security_rate_company?: number
  is_social_security_active?: boolean
  education_level?: string
  bank_name?: string
  bank_iban?: string
  bank_account?: string
  biometric_pin?: string
  reward_points: number
  status: 'active' | 'on_leave' | 'terminated'
  employment_status?: string
}

export interface BiometricDevice {
  id: string
  device_name: string
  device_model: string
  ip_address: string
  port: number
  location: string
  status: 'online' | 'offline' | 'syncing'
  last_sync: string
  auto_sync: boolean
  created_at: string
}

export interface AttendancePunch {
  id: string
  device_id?: string
  employee_id: string
  biometric_pin?: string
  punch_time: string
  punch_type: 'check_in' | 'check_out'
  source: string
  employee_name?: string
}

export interface AttendanceLog {
  id: string
  employee_id: string
  employee_name?: string
  employee_name_ar?: string
  employee_code?: string
  department?: string
  log_date: string
  check_in?: string
  check_out?: string
  shift_hours: number
  actual_hours: number
  status: 'present' | 'absent' | 'late' | 'excused'
  overtime_hours: number
  overtime_rate: number
  overtime_amount: number
  late_minutes: number
  lateness_deduction: number
  daily_deduction: number
  device_id?: string
  notes?: string
}

export interface AdvanceInstallment {
  id: string
  advance_id: string
  installment_number: number
  deduction_month: string
  due_date: string
  amount: number
  status: 'pending' | 'deducted' | 'paid_manually'
  paid_at?: string
  payslip_ref?: string
  notes?: string
}

export interface EmployeeAdvance {
  id: string
  employee_id: string
  employee_name?: string
  employee_name_ar?: string
  request_date: string
  amount: number
  repayment_months: number
  monthly_installment: number
  repaid_amount: number
  balance: number
  deduction_start_month: string
  status: 'pending' | 'approved' | 'active' | 'repaid' | 'cancelled'
  purpose?: string
  notes?: string
  installments?: AdvanceInstallment[]
}

export interface DisciplinaryRecord {
  id: string
  employee_id: string
  employee_name?: string
  employee_name_ar?: string
  department?: string
  action_type: 'verbal_warning' | 'first_warning' | 'second_warning' | 'day_deduction' | 'multi_day_deduction' | 'termination'
  action_date: string
  reason: string
  deduction_days: number
  deduction_amount: number
  deduction_month?: string
  status: 'draft' | 'issued' | 'acknowledged' | 'appeal' | 'cancelled'
  decision_maker: string
  notes?: string
}

export interface ResignationRecord {
  id: string
  employee_id: string
  employee_name?: string
  employee_name_ar?: string
  department?: string
  job_title?: string
  submission_date: string
  last_working_day: string
  reason: string
  notice_period_days: number
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed'
  clearance_status: 'pending' | 'in_progress' | 'cleared'
  end_of_service_benefits: number
  settlement_notes?: string
  reviewed_by: string
}

export interface Payslip {
  id: string
  reference: string
  employee_id: string
  employee_name: string
  employee_name_ar?: string
  employee_code?: string
  national_id?: string
  department?: string
  job_title?: string
  month: string
  basic_salary: number
  housing_allowance?: number
  transport_allowance?: number
  allowances: number
  points_bonus: number
  overtime_hours?: number
  overtime_rate?: number
  overtime_amount?: number
  late_minutes?: number
  lateness_deduction?: number
  absence_days?: number
  absence_deduction?: number
  daily_rate?: number
  hourly_rate?: number
  social_security_employee?: number
  social_security_company?: number
  advance_deduction?: number
  penalty_deduction?: number
  other_deductions?: number
  gross_salary?: number
  total_deductions?: number
  deductions: number
  net_salary: number
  status: 'draft' | 'approved' | 'paid'
  payment_date?: string
  notes?: string
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
  subject_ar?: string
  customer_name: string
  customer_name_ar?: string
  project_id?: string
  project_reference?: string
  priority: TicketPriority
  state: TicketState
  assigned_to?: string
  assigned_to_ar?: string
  panel_serial_number?: string
  description: string
  description_ar?: string
  resolution_notes?: string
  resolution_notes_ar?: string
  created_at: string
  updated_at: string
}

