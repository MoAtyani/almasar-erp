export type Language = 'en' | 'ar'

export const TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  // ── Brand & Navigation ──
  'brand.name': { en: 'Al-Masar', ar: 'المسار' },
  'brand.sub': { en: 'Switchgear ERP', ar: 'نظام إدارة مصنع اللوحات' },
  'nav.overview': { en: 'Overview', ar: 'نظرة عامة' },
  'nav.sales_crm': { en: 'Sales & CRM', ar: 'المبيعات والعملاء' },
  'nav.engineering_production': { en: 'Engineering & Production', ar: 'الهندسة والتصنيع' },
  'nav.finance_hr': { en: 'Finance & HR', ar: 'المالية والموارد البشرية' },
  'nav.documents_support': { en: 'Documents & Support', ar: 'الوثائق والدعم الفني' },
  'nav.settings': { en: 'Settings', ar: 'الإعدادات' },

  'menu.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'menu.projects': { en: 'Panel Projects', ar: 'مشاريع اللوحات' },
  'menu.crm': { en: 'Sales / CRM', ar: 'المبيعات / CRM' },
  'menu.engineering': { en: 'Engineering', ar: 'الهندسة والتصميم' },
  'menu.tasks': { en: 'Tasks & Production', ar: 'المهام والإنتاج' },
  'menu.procurement': { en: 'Procurement', ar: 'المشتريات والتوريد' },
  'menu.warehouse': { en: 'Warehouse', ar: 'المستودع والمخزون' },
  'menu.production': { en: 'Production (MRP)', ar: 'أوامر التصنيع (MRP)' },
  'menu.qc': { en: 'Quality Control', ar: 'ضبط الجودة والفحص (FAT)' },
  'menu.logistics': { en: 'Logistics', ar: 'اللوجستيات والتسليم' },
  'menu.accounting': { en: 'Invoicing & Accounting', ar: 'الفواتير والمحاسبة' },
  'menu.hr': { en: 'HR & Payroll', ar: 'الموارد البشرية والرواتب' },
  'menu.dms': { en: 'DMS Documents', ar: 'إدارة المخططات والوثائق' },
  'menu.helpdesk': { en: 'Helpdesk & Warranty', ar: 'الدعم الفني والضمان' },
  'menu.reports': { en: 'Reporting Engine', ar: 'محرك التقارير' },
  'menu.config': { en: 'Configuration', ar: 'إعدادات المصنع' },

  // ── Common Actions & Headers ──
  'action.search': { en: 'Search...', ar: 'بحث...' },
  'action.create': { en: 'Create New', ar: 'إنشاء جديد' },
  'action.save': { en: 'Save', ar: 'حفظ' },
  'action.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'action.close': { en: 'Close', ar: 'إغلاق' },
  'action.delete': { en: 'Delete', ar: 'حذف' },
  'action.edit': { en: 'Edit', ar: 'تعديل' },
  'action.view': { en: 'View', ar: 'عرض' },
  'action.export_csv': { en: 'Export CSV', ar: 'تصدير كملف CSV' },
  'action.print': { en: 'Print', ar: 'طباعة' },
  'action.all': { en: 'All', ar: 'الكل' },
  'action.status': { en: 'Status', ar: 'الحالة' },
  'action.date': { en: 'Date', ar: 'التاريخ' },
  'action.actions': { en: 'Actions', ar: 'الإجراءات' },
  'action.notes': { en: 'Notes', ar: 'الملاحظات' },
  'action.filter': { en: 'Filter', ar: 'تصفية' },
  'action.logout': { en: 'Logout', ar: 'تسجيل الخروج' },

  // ── Roles ──
  'role.general_manager': { en: 'General Manager', ar: 'المدير العام' },
  'role.production_supervisor': { en: 'Production Supervisor', ar: 'مشرف الإنتاج' },
  'role.qc_technician': { en: 'QC Technician', ar: 'فني ضبط الجودة' },
  'role.design_engineer': { en: 'Design Engineer', ar: 'مهندس التصميم' },
  'role.sales': { en: 'Sales', ar: 'المبيعات' },
  'role.technician': { en: 'Technician', ar: 'فني تجميع' },

  // ── Dashboard ──
  'dashboard.total_projects': { en: 'Total Projects', ar: 'إجمالي المشاريع' },
  'dashboard.active_projects': { en: 'Active Projects', ar: 'المشاريع النشطة' },
  'dashboard.leads_won': { en: 'Leads Won / Total', ar: 'الصفقات المكتسبة / الإجمالي' },
  'dashboard.tasks_completed': { en: 'Tasks Completed', ar: 'المهام المنجزة' },
  'dashboard.open_pos': { en: 'Open Purchase Orders', ar: 'أوامر الشراء المفتوحة' },
  'dashboard.sales_win_rate': { en: 'Sales Win Rate', ar: 'نسبة الفوز بالمبيعات' },
  'dashboard.sales_win_rate_sub': { en: 'CRM leads distribution by stage', ar: 'توزيع الصفقات حسب المرحلة' },
  'dashboard.estimation_duration': { en: 'Estimation Duration', ar: 'مدة إعداد التخمين' },
  'dashboard.estimation_duration_sub': { en: 'Days to complete engineering quote', ar: 'الأيام المستغرقة لإعداد عروض الأسعار الهندسية' },
  'dashboard.production_efficiency': { en: 'Production Efficiency', ar: 'كفاءة خط الإنتاج' },
  'dashboard.production_efficiency_sub': { en: 'Average completion % per project', ar: 'متوسط نسبة إنجاز المشاريع' },
  'dashboard.projects_by_status': { en: 'Projects by Stage', ar: 'المشاريع حسب المرحلة' },
  'dashboard.projects_by_status_sub': { en: 'Current factory pipeline distribution', ar: 'توزيع مراحل التصنيع في المصنع' },
  'dashboard.recent_projects': { en: 'Recent Factory Projects', ar: 'أحدث مشاريع المصنع' },
  'dashboard.reference': { en: 'Reference', ar: 'المرجع' },
  'dashboard.customer': { en: 'Customer', ar: 'العميل' },
  'dashboard.stage': { en: 'Stage', ar: 'المرحلة' },
  'dashboard.delivery_date': { en: 'Delivery Date', ar: 'تاريخ التسليم' },
  'dashboard.progress': { en: 'Progress', ar: 'نسبة الإنجاز' },
  'dashboard.view_all_projects': { en: 'View All Projects →', ar: 'عرض جميع المشاريع ←' },

  // ── CRM ──
  'crm.title': { en: 'Sales Pipeline (CRM)', ar: 'مسار المبيعات والعملاء (CRM)' },
  'crm.expected_revenue': { en: 'Expected Pipeline Revenue', ar: 'إجمالي الإيرادات المتوقعة' },
  'crm.win_rate': { en: 'Average Win Rate', ar: 'متوسط نسبة النجاح' },
  'crm.new_lead': { en: '+ New Opportunity', ar: '+ إضافة فرصة بيع' },
  'crm.lead_name': { en: 'Opportunity Title', ar: 'عنوان الفرصة' },
  'crm.contact': { en: 'Customer / Company', ar: 'العميل / الشركة' },
  'crm.probability': { en: 'Probability', ar: 'الاحتمالية' },
  'crm.convert': { en: 'Convert to Project', ar: 'تحويل لمشروع لوحة' },

  // ── Projects ──
  'projects.title': { en: 'Electrical Panel Projects', ar: 'مشاريع اللوحات الكهربائية' },
  'projects.create': { en: '+ New Panel Project', ar: '+ إنشاء مشروع لوحة جديد' },
  'projects.job_order': { en: 'Job Order #', ar: 'رقم أمر العمل' },
  'projects.advance_stage': { en: 'Advance Stage →', ar: 'نقل للمرحلة التالية ←' },
  'projects.progress': { en: 'Overall Progress', ar: 'التقدم العام' },
  'projects.points': { en: 'Reward Points', ar: 'نقاط المكافأة' },

  // ── Tasks ──
  'tasks.title': { en: 'Manufacturing Tasks & Assembly', ar: 'مهام التصنيع وتجميع اللوحات' },
  'tasks.my_tasks': { en: 'My Assigned Tasks', ar: 'مهامي المسندة إلي' },
  'tasks.all_tasks': { en: 'All Factory Tasks', ar: 'جميع مهام المصنع' },
  'tasks.checklist': { en: 'Assembly Checklist', ar: 'قائمة فحص خطوات التجميع' },
  'tasks.mark_done': { en: 'Mark Completed', ar: 'تأكيد اكتمال المهمة' },
  'tasks.points_earned': { en: 'Points Awarded', ar: 'النقاط المكتسبة' },

  // ── Accounting ──
  'accounting.title': { en: 'Invoicing & Financial Accounting', ar: 'الفواتير والحسابات المالية' },
  'accounting.receivables': { en: 'Accounts Receivable (Clients)', ar: 'مستحقات المصنع (العملاء)' },
  'accounting.payables': { en: 'Accounts Payable (Suppliers)', ar: 'التزامات المصنع (الموردين)' },
  'accounting.realized': { en: 'Realized Revenue', ar: 'الإيرادات المحصلة' },
  'accounting.net_cashflow': { en: 'Net Factory Cashflow', ar: 'صافي التدفق النقدي' },
  'accounting.customer_invoices': { en: 'Customer Invoices', ar: 'فواتير العملاء' },
  'accounting.vendor_bills': { en: 'Vendor Bills', ar: 'فواتير الموردين' },
  'accounting.new_invoice': { en: '+ New Invoice / Bill', ar: '+ إنشاء فاتورة جديدة' },

  // ── HR & Payroll ──
  'hr.title': { en: 'Human Resources & Payroll', ar: 'الموارد البشرية والرواتب' },
  'hr.employees': { en: 'Employee Directory', ar: 'دليل العاملين والفنيين' },
  'hr.payroll': { en: 'Payroll & Salary Slips', ar: 'مسير الرواتب والمكافآت' },
  'hr.leaderboard': { en: 'Technician Leaderboard', ar: 'لوحة شرف الفنيين المتميزين' },
  'hr.basic_salary': { en: 'Basic Salary', ar: 'الراتب الأساسي' },
  'hr.bonus': { en: 'Points Incentive Bonus', ar: 'حافز نقاط الجودة والسرعة' },
  'hr.net_salary': { en: 'Net Salary', ar: 'صافي الراتب' },
  'hr.run_payroll': { en: '⚡ Run Monthly Payroll', ar: '⚡ تشغيل مسير الرواتب الشهري' },

  // ── DMS ──
  'dms.title': { en: 'Document Management System (DMS)', ar: 'إدارة المخططات والوثائق الهندسية' },
  'dms.upload': { en: '📁 Upload Technical File', ar: '📁 رفع وثيقة / مخطط هندسي' },
  'dms.sld': { en: 'Single Line Diagrams (SLD)', ar: 'مخططات أحادية الخط (SLD)' },
  'dms.cad': { en: 'CAD / Schematics', ar: 'مخططات كاد التنفيذية' },
  'dms.boq': { en: 'Bill of Quantities (BoQ)', ar: 'جداول الكميات والمواصفات' },
  'dms.fat': { en: 'FAT Test Certificates', ar: 'شهادات الاختبار المصنعي (FAT)' },

  // ── Helpdesk ──
  'helpdesk.title': { en: 'Helpdesk & Warranty Support', ar: 'الدعم الفني وخدمات الضمان' },
  'helpdesk.open_ticket': { en: '+ Open Support Ticket', ar: '+ فتح تذكرة دعم فني' },
  'helpdesk.active_tickets': { en: 'Active Site Tickets', ar: 'التذاكر الميدانية النشطة' },
  'helpdesk.critical': { en: 'Critical Issues', ar: 'أعطال حرجة' },
  'helpdesk.resolved': { en: 'Resolved Cases', ar: 'البلاغات المنجزة' },

  // ── Reports ──
  'reports.title': { en: 'Reporting & Analytics Engine', ar: 'محرك التقارير والتحليلات المتقدمة' },
  'reports.profitability': { en: 'Project Profitability', ar: 'ربحية المشاريع وتكاليف الصنع' },
  'reports.velocity': { en: 'Stage Velocity & Yield', ar: 'سرعة المراحل ونسبة النجاح' },
  'reports.technician_audit': { en: 'Technician Bonus Audit', ar: 'تدقيق مكافآت ونقاط الفنيين' },
}

export function translate(key: string, lang: Language): string {
  if (TRANSLATIONS[key]) {
    return TRANSLATIONS[key][lang]
  }
  return key
}
