import { ProjectState, TaskState, LeadState, PoState, TransferState, MrpState, QcResult, UserRole, StageType } from './types'

// ── Labels ────────────────────────────────────────────────

export const PROJECT_STATE_LABELS: Record<ProjectState, { en: string; ar: string; color: string }> = {
  draft:        { en: 'Draft',                 ar: 'مسودة',             color: '#6b7280' },
  estimation:   { en: 'Estimation',            ar: 'التخمين',           color: '#8b5cf6' },
  design:       { en: 'Engineering / Design',  ar: 'الهندسة / التصميم', color: '#3b82f6' },
  procurement:  { en: 'Procurement',           ar: 'المشتريات',         color: '#f59e0b' },
  warehouse:    { en: 'Warehouse',             ar: 'المستودع',          color: '#06b6d4' },
  production:   { en: 'Production',            ar: 'الإنتاج',           color: '#10b981' },
  qc:           { en: 'Quality Control',       ar: 'ضبط الجودة',        color: '#f97316' },
  accounting:   { en: 'Accounting',            ar: 'المحاسبة',          color: '#ec4899' },
  logistics:    { en: 'Logistics',             ar: 'اللوجستيات',        color: '#14b8a6' },
  done:         { en: 'Delivered',             ar: 'تم التسليم',        color: '#22c55e' },
}

export const TASK_STATE_LABELS: Record<TaskState, { en: string; ar: string; color: string }> = {
  pending:     { en: 'Pending',     ar: 'قيد الانتظار', color: '#6b7280' },
  in_progress: { en: 'In Progress', ar: 'جاري التنفيذ', color: '#3b82f6' },
  done:        { en: 'Done',        ar: 'مكتمل',        color: '#22c55e' },
}

export const LEAD_STATE_LABELS: Record<LeadState, { en: string; ar: string; color: string }> = {
  new:          { en: 'New Lead',         ar: 'عميل محتمل',  color: '#6b7280' },
  qualified:    { en: 'Qualified',        ar: 'مؤهل',        color: '#8b5cf6' },
  proposition:  { en: 'Proposition',     ar: 'عرض سعر',     color: '#3b82f6' },
  won:          { en: 'Won',             ar: 'مكتسب',       color: '#22c55e' },
  lost:         { en: 'Lost',            ar: 'خسارة',       color: '#ef4444' },
}

export const PO_STATE_LABELS: Record<PoState, { en: string; ar: string; color: string }> = {
  draft:      { en: 'Draft',      ar: 'مسودة',        color: '#6b7280' },
  sent:       { en: 'Sent',       ar: 'مرسل',         color: '#3b82f6' },
  confirmed:  { en: 'Confirmed',  ar: 'مؤكد',         color: '#10b981' },
  received:   { en: 'Received',   ar: 'مستلم',        color: '#22c55e' },
  cancelled:  { en: 'Cancelled',  ar: 'ملغى',         color: '#ef4444' },
}

export const TRANSFER_STATE_LABELS: Record<TransferState, { en: string; ar: string; color: string }> = {
  draft:      { en: 'Draft',    ar: 'مسودة',     color: '#6b7280' },
  ready:      { en: 'Ready',    ar: 'جاهز',      color: '#f59e0b' },
  done:       { en: 'Done',     ar: 'مكتمل',     color: '#22c55e' },
  cancelled:  { en: 'Cancelled',ar: 'ملغى',      color: '#ef4444' },
}

export const MRP_STATE_LABELS: Record<MrpState, { en: string; ar: string; color: string }> = {
  draft:       { en: 'Draft',       ar: 'مسودة',          color: '#6b7280' },
  confirmed:   { en: 'Confirmed',   ar: 'مؤكد',           color: '#8b5cf6' },
  in_progress: { en: 'In Progress', ar: 'جاري التنفيذ',   color: '#3b82f6' },
  done:        { en: 'Done',        ar: 'مكتمل',          color: '#22c55e' },
  cancelled:   { en: 'Cancelled',   ar: 'ملغى',           color: '#ef4444' },
}

export const QC_RESULT_LABELS: Record<QcResult, { en: string; ar: string; color: string }> = {
  pending: { en: 'Pending',  ar: 'قيد الانتظار', color: '#f59e0b' },
  passed:  { en: 'Passed',   ar: 'ناجح',          color: '#22c55e' },
  failed:  { en: 'Failed',   ar: 'فاشل',          color: '#ef4444' },
}

export const STAGE_TYPE_LABELS: Record<StageType, { en: string; ar: string }> = {
  sheet_metal:  { en: 'Sheet Metal Works',       ar: 'أعمال الصاج' },
  layout:       { en: 'Layout Implementation',   ar: 'تثبيت المكونات' },
  power_wires:  { en: 'Power Circuits (Wires)',  ar: 'دوائر القدرة - أسلاك' },
  power_busbar: { en: 'Power Circuits (Busbar)', ar: 'دوائر القدرة - بسبار' },
  control:      { en: 'Control Circuits',        ar: 'دوائر التحكم' },
  final_test:   { en: 'Final Testing',           ar: 'الفحص النهائي' },
}

export const ROLE_LABELS: Record<UserRole, { en: string; ar: string }> = {
  general_manager:      { en: 'General Manager',       ar: 'المدير العام' },
  production_supervisor:{ en: 'Production Supervisor', ar: 'مشرف الإنتاج' },
  qc_technician:        { en: 'QC Technician',         ar: 'فني ضبط الجودة' },
  design_engineer:      { en: 'Design Engineer',       ar: 'مهندس التصميم' },
  sales:                { en: 'Sales',                 ar: 'المبيعات' },
  technician:           { en: 'Technician',            ar: 'فني' },
}

export const INVOICE_STATE_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  draft:     { en: 'Draft',     ar: 'مسودة',    color: '#6b7280' },
  posted:    { en: 'Posted',    ar: 'مرحل',     color: '#3b82f6' },
  paid:      { en: 'Paid',      ar: 'مدفوع',    color: '#22c55e' },
  cancelled: { en: 'Cancelled', ar: 'ملغى',     color: '#ef4444' },
}

export const TICKET_PRIORITY_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  low:      { en: 'Low',      ar: 'منخفض', color: '#6b7280' },
  medium:   { en: 'Medium',   ar: 'متوسط',  color: '#3b82f6' },
  high:     { en: 'High',     ar: 'عالي',   color: '#f59e0b' },
  critical: { en: 'Critical', ar: 'حرج',   color: '#ef4444' },
}

export const TICKET_STATE_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  new:         { en: 'New',         ar: 'جديد',           color: '#8b5cf6' },
  in_progress: { en: 'In Progress', ar: 'جاري المعالجة', color: '#3b82f6' },
  waiting:     { en: 'Waiting',     ar: 'في الانتظار',   color: '#f59e0b' },
  resolved:    { en: 'Resolved',    ar: 'تم الحل',        color: '#22c55e' },
  closed:      { en: 'Closed',      ar: 'مغلق',          color: '#6b7280' },
}

export const DOC_CATEGORY_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  single_line_diagram: { en: 'Single Line Diagram (SLD)', ar: 'مخطط أحادي الخط (SLD)', icon: '⚡' },
  cad_drawing:         { en: 'CAD / Schematic Drawing',   ar: 'مخطط كاد / لوحات',      icon: '📐' },
  boq_sheet:           { en: 'Bill of Quantities (BoQ)',  ar: 'جدول الكميات (BoQ)',     icon: '📋' },
  fat_certificate:     { en: 'FAT Test Certificate',      ar: 'شهادة اختبار المصنع',   icon: '📜' },
  manual:              { en: 'Operation Manual & O&M',    ar: 'دليل التشغيل والصيانة',  icon: '📖' },
  client_approval:     { en: 'Client Approval / Sign-off',ar: 'موافقة العميل الرسمية', icon: '✍️' },
}

// ── Helpers ───────────────────────────────────────────────

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
}

export function projectStateFlow(current: ProjectState): ProjectState | null {
  const flow: ProjectState[] = ['draft','estimation','design','procurement','warehouse','production','qc','accounting','logistics','done']
  const idx = flow.indexOf(current)
  return idx < flow.length - 1 ? flow[idx + 1] : null
}

