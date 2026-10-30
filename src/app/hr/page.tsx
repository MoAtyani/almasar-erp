'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import {
  Employee,
  BiometricDevice,
  AttendanceLog,
  EmployeeAdvance,
  AdvanceInstallment,
  DisciplinaryRecord,
  ResignationRecord,
  Payslip
} from '@/lib/types'
import { ROLE_LABELS, formatCurrency, formatDate } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

type HRTab =
  | 'employees'
  | 'active_employees'
  | 'biometric'
  | 'advances'
  | 'social_security'
  | 'payroll'
  | 'certificates'
  | 'disciplinary'
  | 'points'

export default function HRPage() {
  const { lang, isRtl } = useLanguage()

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<HRTab>('employees')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('2026-10')

  // Primary Data Collections
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeEmployeesData, setActiveEmployeesData] = useState<{ list: Employee[]; summary: any }>({
    list: [],
    summary: { total_active: 0, total_payroll: 0, dept_counts: {} }
  })
  const [biometricDevices, setBiometricDevices] = useState<BiometricDevice[]>([])
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([])
  const [socialSecurityData, setSocialSecurityData] = useState<{ list: any[]; summary: any }>({
    list: [],
    summary: { total_employees: 0, total_subject_salary: 0, total_employee_deductions: 0, total_company_liability: 0, grand_total_remitted: 0 }
  })
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<DisciplinaryRecord[]>([])
  const [resignationRecords, setResignationRecords] = useState<ResignationRecord[]>([])

  // Modal Dialog States
  // 1. Employee Card Modal (Feature 2)
  const [showEmployeeCardModal, setShowEmployeeCardModal] = useState(false)
  const [selectedEmployeeForCard, setSelectedEmployeeForCard] = useState<Employee | null>(null)
  const [showAddEditEmployeeModal, setShowAddEditEmployeeModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)

  // 2. Biometric live sync modal (Feature 1)
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null)

  // 3. Advances & Installment Schedule Modal (Feature 3)
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false)
  const [selectedAdvanceForSchedule, setSelectedAdvanceForSchedule] = useState<EmployeeAdvance | null>(null)

  // 4. Payslip Breakdown Modal & Run Payroll (Feature 6)
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const [pointConversionRate, setPointConversionRate] = useState(1.50)

  // 5. HR Certificates Generator (Feature 7)
  const [certType, setCertType] = useState<'salary_continuation' | 'experience'>('salary_continuation')
  const [certEmployeeId, setCertEmployeeId] = useState<string>('')
  const [certRecipient, setCertRecipient] = useState('إلى من يهمه الأمر / البنك المعني')
  const [certNotes, setCertNotes] = useState('تشهد الشركة بأن الموظف المذكور أعلاه ما زال على رأس عمله ويتقاضى مستحقاته بانتظام.')
  const [showPrintCertModal, setShowPrintCertModal] = useState(false)

  // 6. Disciplinary & Resignations Modals (Feature 8)
  const [showAddDisciplinaryModal, setShowAddDisciplinaryModal] = useState(false)
  const [showAddResignationModal, setShowAddResignationModal] = useState(false)

  // Forms State
  const [employeeForm, setEmployeeForm] = useState({
    full_name: '',
    full_name_ar: '',
    department: 'Panel Fabrication',
    role: 'technician',
    email: '',
    phone: '',
    national_id: '',
    effective_date: '2026-10-01',
    basic_salary: 4200,
    housing_allowance: 840,
    transport_allowance: 420,
    other_allowances: 0,
    education_level: 'بكالوريوس هندسة كهربائية',
    social_security_number: '',
    social_security_rate_employee: 7.50,
    social_security_rate_company: 14.25,
    is_social_security_active: true,
    bank_name: 'مصرف الراجحي - Al Rajhi Bank',
    bank_iban: '',
    biometric_pin: '1050',
    status: 'active'
  })

  const [advanceForm, setAdvanceForm] = useState({
    employee_id: '',
    amount: 5000,
    repayment_months: 5,
    deduction_start_month: '2026-11',
    purpose: 'سلفة شخصية طارئة'
  })

  const [disciplinaryForm, setDisciplinaryForm] = useState({
    employee_id: '',
    action_type: 'first_warning' as DisciplinaryRecord['action_type'],
    action_date: new Date().toISOString().split('T')[0],
    reason: '',
    deduction_days: 0,
    deduction_month: '2026-10',
    decision_maker: 'م. يوسف بصبوص - المدير العام'
  })

  const [resignationForm, setResignationForm] = useState({
    employee_id: '',
    submission_date: new Date().toISOString().split('T')[0],
    last_working_day: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
    notice_period_days: 30,
    reason: 'ظروف عائلية خاصة ورغبة في الانتقال'
  })

  // Initial Data Load
  useEffect(() => {
    loadAllHRData()
  }, [])

  // Auto reload when month changes for month-based views
  useEffect(() => {
    if (activeTab === 'social_security' || activeTab === 'payroll') {
      loadSocialSecurityData(selectedMonth)
      loadPayslipsData(selectedMonth)
    }
  }, [selectedMonth, activeTab])

  async function loadAllHRData() {
    setLoading(true)
    try {
      await Promise.all([
        loadEmployees(),
        loadActiveEmployees(),
        loadBiometricDevices(),
        loadAttendanceLogs(),
        loadAdvances(),
        loadSocialSecurityData(selectedMonth),
        loadPayslipsData(selectedMonth),
        loadDisciplinaryRecords(),
        loadResignations()
      ])
    } catch (err) {
      console.error('Error loading comprehensive HR data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadEmployees() {
    const res = await fetch('/api/hr?view=employees')
    const json = await res.json()
    if (json.success) {
      setEmployees(json.data)
      if (json.data.length > 0 && !certEmployeeId) {
        setCertEmployeeId(json.data[0].id)
      }
    }
  }

  async function loadActiveEmployees() {
    const res = await fetch('/api/hr?view=active_employees')
    const json = await res.json()
    if (json.success) {
      setActiveEmployeesData({ list: json.data, summary: json.summary })
    }
  }

  async function loadBiometricDevices() {
    const res = await fetch('/api/hr?view=biometric_devices')
    const json = await res.json()
    if (json.success) setBiometricDevices(json.data)
  }

  async function loadAttendanceLogs() {
    const res = await fetch('/api/hr?view=attendance')
    const json = await res.json()
    if (json.success) setAttendanceLogs(json.data)
  }

  async function loadAdvances() {
    const res = await fetch('/api/hr?view=advances')
    const json = await res.json()
    if (json.success) setAdvances(json.data)
  }

  async function loadSocialSecurityData(m: string) {
    const res = await fetch(`/api/hr?view=social_security&month=${m}`)
    const json = await res.json()
    if (json.success) {
      setSocialSecurityData({ list: json.data, summary: json.summary })
    }
  }

  async function loadPayslipsData(m: string) {
    const res = await fetch(`/api/hr?view=payslips&month=${m}`)
    const json = await res.json()
    if (json.success) setPayslips(json.data)
  }

  async function loadDisciplinaryRecords() {
    const res = await fetch('/api/hr?view=disciplinary')
    const json = await res.json()
    if (json.success) setDisciplinaryRecords(json.data)
  }

  async function loadResignations() {
    const res = await fetch('/api/hr?view=resignations')
    const json = await res.json()
    if (json.success) setResignationRecords(json.data)
  }

  // ── FEATURE 1: Biometric live sync action ──
  async function handleSyncBiometric(deviceId: string) {
    setSyncingDeviceId(deviceId)
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_biometric_device', device_id: deviceId })
      })
      const json = await res.json()
      if (json.success) {
        alert(isRtl ? 'تمت مزامنة جهاز البصمة واحتساب ساعات العمل الإضافي وخصومات التأخير بنجاح!' : 'Biometric device synced successfully! Overtime and tardiness recalculated.')
        loadBiometricDevices()
        loadAttendanceLogs()
      } else {
        alert(json.error || 'Sync failed')
      }
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncingDeviceId(null)
    }
  }

  // ── FEATURE 2: Save Employee Profile Card ──
  function openAddEmployeeModal() {
    setEditingEmployee(null)
    setEmployeeForm({
      full_name: '',
      full_name_ar: '',
      department: 'Panel Fabrication',
      role: 'technician',
      email: '',
      phone: '',
      national_id: `10${Math.floor(10000000 + Math.random() * 90000000)}`,
      effective_date: new Date().toISOString().split('T')[0],
      basic_salary: 4500,
      housing_allowance: 900,
      transport_allowance: 450,
      other_allowances: 0,
      education_level: 'بكالوريوس هندسة كهربائية',
      social_security_number: `SS-${Math.floor(1000000 + Math.random() * 9000000)}`,
      social_security_rate_employee: 7.50,
      social_security_rate_company: 14.25,
      is_social_security_active: true,
      bank_name: 'مصرف الراجحي - Al Rajhi Bank',
      bank_iban: `SA4480000${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      biometric_pin: Math.floor(1000 + Math.random() * 9000).toString(),
      status: 'active'
    })
    setShowAddEditEmployeeModal(true)
  }

  function openEditEmployeeModal(emp: Employee) {
    setEditingEmployee(emp)
    setEmployeeForm({
      full_name: emp.full_name || '',
      full_name_ar: emp.full_name_ar || '',
      department: emp.department || 'Panel Fabrication',
      role: emp.role || 'technician',
      email: emp.email || '',
      phone: emp.phone || '',
      national_id: emp.national_id || '',
      effective_date: emp.effective_date ? emp.effective_date.split('T')[0] : '2026-10-01',
      basic_salary: parseFloat(emp.basic_salary as any) || 4000,
      housing_allowance: parseFloat(emp.housing_allowance as any) || 800,
      transport_allowance: parseFloat(emp.transport_allowance as any) || 400,
      other_allowances: parseFloat(emp.other_allowances as any) || 0,
      education_level: emp.education_level || 'بكالوريوس هندسة كهربائية',
      social_security_number: emp.social_security_number || '',
      social_security_rate_employee: parseFloat(emp.social_security_rate_employee as any) || 7.50,
      social_security_rate_company: parseFloat(emp.social_security_rate_company as any) || 14.25,
      is_social_security_active: emp.is_social_security_active !== false,
      bank_name: emp.bank_name || 'مصرف الراجحي - Al Rajhi Bank',
      bank_iban: emp.bank_iban || '',
      biometric_pin: emp.biometric_pin || '',
      status: emp.employment_status || emp.status || 'active'
    })
    setShowAddEditEmployeeModal(true)
  }

  async function handleSaveEmployeeCard(e: React.FormEvent) {
    e.preventDefault()
    try {
      const payload = {
        action: 'save_employee_card',
        id: editingEmployee ? editingEmployee.id : undefined,
        ...employeeForm
      }
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (json.success) {
        setShowAddEditEmployeeModal(false)
        loadEmployees()
        loadActiveEmployees()
        alert(isRtl ? 'تم حفظ بطاقة الموظف وتحديث بيانات الراتب والضمان بنجاح' : 'Employee profile card and salary parameters saved successfully!')
      } else {
        alert(json.error || 'Failed to save employee card')
      }
    } catch (err) {
      console.error('Error saving employee:', err)
    }
  }

  // ── FEATURE 3: Create Advance & Installment Schedule ──
  async function handleCreateAdvance(e: React.FormEvent) {
    e.preventDefault()
    if (!advanceForm.employee_id) {
      alert(isRtl ? 'يرجى اختيار الموظف أولاً' : 'Please select an employee')
      return
    }
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_advance',
          ...advanceForm
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowAddAdvanceModal(false)
        loadAdvances()
        alert(isRtl ? 'تم تسجيل السلفة وإنشاء جدول الأقساط الشهرية بنجاح!' : 'Advance created and monthly installment schedule generated successfully!')
      } else {
        alert(json.error || 'Failed to create advance')
      }
    } catch (err) {
      console.error('Advance creation error:', err)
    }
  }

  // ── FEATURE 6: Run Comprehensive Monthly Payroll ──
  async function handleExecutePayrollBatch() {
    setLoading(true)
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_monthly_payroll',
          month: selectedMonth,
          point_conversion_rate: pointConversionRate
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowRunPayrollModal(false)
        loadPayslipsData(selectedMonth)
        setActiveTab('payroll')
        alert(isRtl ? 'تم احتساب وتشغيل مسير الرواتب وخصم الأقساط والإضافي بنجاح!' : 'Monthly payroll batch executed and payslips computed successfully!')
      } else {
        alert(json.error || 'Failed to execute payroll batch')
      }
    } catch (err) {
      console.error('Payroll batch run error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── FEATURE 8: Create Disciplinary Action ──
  async function handleCreateDisciplinary(e: React.FormEvent) {
    e.preventDefault()
    if (!disciplinaryForm.employee_id || !disciplinaryForm.reason) {
      alert(isRtl ? 'يرجى اختيار الموظف وتحديد سبب العقوبة' : 'Please select employee and provide violation reason')
      return
    }
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_disciplinary',
          ...disciplinaryForm
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowAddDisciplinaryModal(false)
        loadDisciplinaryRecords()
        alert(isRtl ? 'تم إصدار وتسجيل القرار الإداري / العقوبة بنجاح' : 'Disciplinary penalty recorded successfully')
      } else {
        alert(json.error || 'Failed to record disciplinary action')
      }
    } catch (err) {
      console.error('Disciplinary error:', err)
    }
  }

  // ── FEATURE 8: Submit Resignation ──
  async function handleCreateResignation(e: React.FormEvent) {
    e.preventDefault()
    if (!resignationForm.employee_id || !resignationForm.reason) {
      alert(isRtl ? 'يرجى اختيار الموظف وتحديد سبب الاستقالة' : 'Please select employee and state reason')
      return
    }
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_resignation',
          ...resignationForm
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowAddResignationModal(false)
        loadResignations()
        alert(isRtl ? 'تم تسجيل طلب الاستقالة واحتساب مكافأة نهاية الخدمة التقديرية' : 'Resignation request submitted and end-of-service gratuity estimated')
      } else {
        alert(json.error || 'Failed to submit resignation')
      }
    } catch (err) {
      console.error('Resignation error:', err)
    }
  }

  // Delete employee
  async function handleDeleteEmployee() {
    if (!deletingEmployee) return
    try {
      const res = await fetch(`/api/hr?id=${deletingEmployee.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setDeletingEmployee(null)
        loadEmployees()
        loadActiveEmployees()
      } else {
        alert(json.error || 'Failed to delete')
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const certEmp = employees.find(e => e.id === certEmployeeId) || employees[0]

  const deptTranslations: Record<string, string> = {
    'Panel Fabrication': 'تجميع وهياكل اللوحات',
    'Busbar & Wiring': 'تشكيل البسبار والأسلاك',
    'Quality Assurance': 'ضبط الجودة وفحص FAT',
    'Engineering & Estimation': 'الهندسة والتسعير الفني',
    'Production Management': 'إدارة وتخطيط الإنتاج',
    'Engineering & Design': 'الهندسة والتصميم'
  }

  return (
    <AppLayout
      title="HR, Factory Workforce & Comprehensive Payroll"
      titleAr="إدارة الموارد البشرية، كادر المصنع ومسير الرواتب المتقدم"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRunPayrollModal(true)}>
            ⚡ {isRtl ? 'تشغيل مسير الرواتب الشهري' : 'Run Monthly Payroll'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddEmployeeModal}>
            {isRtl ? '+ تعريف بطاقة موظف جديدة' : '+ New Employee Profile Card'}
          </button>
        </div>
      }
    >
      {/* Top HR KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent" onClick={() => setActiveTab('active_employees')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon accent-bg">👥</div>
          <div className="kpi-value">{activeEmployeesData.summary.total_active || employees.length}</div>
          <div className="kpi-label">{isRtl ? 'الموظفون الفعالون على رأس العمل' : 'Active Duty Employees'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'كادر المصنع المسجل والمباشر للعمليات' : 'Active factory technicians & engineers'}
          </div>
        </div>

        <div className="kpi-card purple" onClick={() => setActiveTab('biometric')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon purple-bg">⏱️</div>
          <div className="kpi-value">{biometricDevices.filter(d => d.status === 'online').length} / {biometricDevices.length}</div>
          <div className="kpi-label">{isRtl ? 'أجهزة البصمة المتصلة والمزامنة' : 'Biometric Devices Online'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'بوابات المصنع وصالات التصنيع والمستودع' : 'ZKTeco & Hikvision fingerprint terminals'}
          </div>
        </div>

        <div className="kpi-card warning" onClick={() => setActiveTab('advances')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon warning-bg">💳</div>
          <div className="kpi-value">{advances.length} {isRtl ? 'سلف' : 'advances'}</div>
          <div className="kpi-label">{isRtl ? 'سلف وأقساط العاملين النشطة' : 'Employee Advances & Loans'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'مع جدولة وتواريخ الخصم الشهري التلقائي' : 'Scheduled automatic monthly payroll deduction'}
          </div>
        </div>

        <div className="kpi-card success" onClick={() => setActiveTab('social_security')} style={{ cursor: 'pointer' }}>
          <div className="kpi-icon success-bg">🛡️</div>
          <div className="kpi-value">{formatCurrency(socialSecurityData.summary.total_company_liability)}</div>
          <div className="kpi-label">{isRtl ? 'إقتطاع الشركة للضمان الاجتماعي' : 'Company Social Security Share'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'مساهمة المنشأة الشهرية (14.25%) لكافة العاملين' : 'Monthly employer contribution (14.25%)'}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          <button
            className={`btn btn-sm ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('employees')}
          >
            👷 {isRtl ? `بطاقة ودليل الموظفين (${employees.length})` : `Employee Directory (${employees.length})`}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'active_employees' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('active_employees')}
          >
            ✅ {isRtl ? `الموظفون الفعالون (${activeEmployeesData.summary.total_active})` : `Active Staff (${activeEmployeesData.summary.total_active})`}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'biometric' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('biometric')}
          >
            ⏱️ {isRtl ? 'جهاز البصمة واحتساب الإضافي' : 'Biometric & Overtime Engine'}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'advances' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('advances')}
          >
            💳 {isRtl ? `الأقساط والسلف (${advances.length})` : `Advances & Loans (${advances.length})`}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'social_security' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('social_security')}
          >
            🛡️ {isRtl ? 'كشف إقتطاع الضمان للشركة' : 'Company Social Security'}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('payroll')}
          >
            💵 {isRtl ? `سلب ومسير الرواتب (${payslips.length})` : `Detailed Payslips (${payslips.length})`}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'certificates' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('certificates')}
          >
            📜 {isRtl ? 'شهادات استمرارية الراتب والخبرة' : 'HR Certificates & Experience'}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'disciplinary' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('disciplinary')}
          >
            ⚖️ {isRtl ? `العقوبات والاستقالات (${disciplinaryRecords.length + resignationRecords.length})` : `Penalties & Resignations`}
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'points' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('points')}
          >
            🌟 {isRtl ? 'لوحة الشرف' : 'Leaderboard'}
          </button>
        </div>

        {/* Global Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 12 }}>
          <input
            type="text"
            placeholder={isRtl ? '...بحث بالاسم، الرقم الوطني، أو القسم' : 'Search by name, National ID, department...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={{ width: 320 }}
          />

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'شهر الاستحقاق:' : 'Month:'}</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="input"
              style={{ width: 170, padding: '4px 8px' }}
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: EMPLOYEES DIRECTORY & PROFILE CARD (Feature 2)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'employees' && (
          <div className="table-container" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'الرقم الوظيفي' : 'BADGE ID'}</th>
                  <th>{isRtl ? 'الرقم الوطني / الهوية' : 'NATIONAL ID'}</th>
                  <th>{isRtl ? 'اسم الموظف' : 'EMPLOYEE NAME'}</th>
                  <th>{isRtl ? 'القسم والمسمى' : 'DEPARTMENT & TITLE'}</th>
                  <th>{isRtl ? 'الراتب الأساسي' : 'BASIC SALARY'}</th>
                  <th>{isRtl ? 'المؤهل العلمي' : 'QUALIFICATION'}</th>
                  <th>{isRtl ? 'تاريخ السريان' : 'EFFECTIVE DATE'}</th>
                  <th>{isRtl ? 'اقتطاع الضمان' : 'SOCIAL SECURITY'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody>
                {employees
                  .filter(e => {
                    if (!search) return true
                    const q = search.toLowerCase()
                    return (
                      (e.full_name || '').toLowerCase().includes(q) ||
                      (e.full_name_ar || '').includes(q) ||
                      (e.national_id || '').includes(q) ||
                      (e.employee_code || '').toLowerCase().includes(q)
                    )
                  })
                  .map(emp => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{emp.employee_code || emp.employee_id}</td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.national_id || '—'}</span>
                      </td>
                      <td>
                        <div><strong>{isRtl ? (emp.full_name_ar || emp.full_name) : emp.full_name}</strong></div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{emp.phone || emp.email}</div>
                      </td>
                      <td>
                        <div>{isRtl ? (deptTranslations[emp.department] || emp.department) : emp.department}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{emp.role}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(emp.basic_salary)}</td>
                      <td style={{ fontSize: 12 }}>{emp.education_level || 'دبلوم تقني'}</td>
                      <td style={{ fontSize: 12 }}>{emp.effective_date ? emp.effective_date.split('T')[0] : emp.hire_date}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: emp.is_social_security_active !== false ? '#22c55e22' : '#94a3b822', color: emp.is_social_security_active !== false ? '#22c55e' : '#94a3b8' }}>
                          {emp.is_social_security_active !== false ? `${isRtl ? 'مشمول' : 'Active'} (${emp.social_security_rate_employee || 7.5}%)` : (isRtl ? 'معفى' : 'Exempt')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() => {
                              setSelectedEmployeeForCard(emp)
                              setShowEmployeeCardModal(true)
                            }}
                            title="View Employee Card"
                          >
                            🪪 {isRtl ? 'بطاقة موظف' : 'Profile Card'}
                          </button>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => openEditEmployeeModal(emp)}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={() => setDeletingEmployee(emp)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: ACTIVE EMPLOYEES LIST / REPORT (Feature 4)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'active_employees' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div className="badge badge-primary" style={{ padding: '8px 12px', fontSize: 13 }}>
                  👥 {isRtl ? 'إجمالي الموظفين الفعالين:' : 'Total Active Personnel:'} <strong>{activeEmployeesData.list.length}</strong>
                </div>
                <div className="badge badge-success" style={{ padding: '8px 12px', fontSize: 13 }}>
                  💵 {isRtl ? 'إجمالي الرواتب الشهرية للفعالين:' : 'Total Active Payroll:'} <strong>{formatCurrency(activeEmployeesData.summary.total_payroll)}</strong>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                🖨️ {isRtl ? 'طباعة تقرير الموظفين الفعالين' : 'Print Active Roster Report'}
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{isRtl ? 'الرقم الوظيفي' : 'BADGE'}</th>
                    <th>{isRtl ? 'الرقم الوطني' : 'NATIONAL ID'}</th>
                    <th>{isRtl ? 'الاسم الكامل' : 'NAME'}</th>
                    <th>{isRtl ? 'القسم' : 'DEPARTMENT'}</th>
                    <th>{isRtl ? 'المسمى الوظيفي' : 'ROLE / TITLE'}</th>
                    <th>{isRtl ? 'الراتب الأساسي' : 'BASIC SALARY'}</th>
                    <th>{isRtl ? 'رقم البصمة' : 'BIO PIN'}</th>
                    <th>{isRtl ? 'تاريخ السريان' : 'EFFECTIVE DATE'}</th>
                    <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployeesData.list
                    .filter(e => {
                      if (!search) return true
                      const q = search.toLowerCase()
                      return (e.full_name || '').toLowerCase().includes(q) || (e.full_name_ar || '').includes(q) || (e.national_id || '').includes(q)
                    })
                    .map((emp, idx) => (
                      <tr key={emp.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{emp.employee_code || emp.employee_id}</td>
                        <td style={{ fontFamily: 'monospace' }}>{emp.national_id || '—'}</td>
                        <td>
                          <strong>{isRtl ? (emp.full_name_ar || emp.full_name) : emp.full_name}</strong>
                        </td>
                        <td>{isRtl ? (deptTranslations[emp.department] || emp.department) : emp.department}</td>
                        <td>{emp.job_title || emp.role}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(emp.basic_salary)}</td>
                        <td>
                          <span className="badge badge-subtle">{emp.biometric_pin || '—'}</span>
                        </td>
                        <td>{emp.effective_date ? emp.effective_date.split('T')[0] : emp.hire_date}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                            {isRtl ? 'على رأس العمل' : 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: BIOMETRIC DEVICE INTEGRATION & OVERTIME ENGINE (Feature 1)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'biometric' && (
          <div style={{ marginTop: 16 }}>
            {/* Connected Biometric Devices */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span>🔌 {isRtl ? 'أجهزة البصمة المتصلة بالنظام (ZKTeco / Hikvision Terminals)' : 'Connected Biometric Terminals'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {isRtl ? 'الاحتساب التلقائي للإضافي والخصم حسب الراتب وسعر الساعة' : 'Automatic overtime & deductions calculated from salary'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                {biometricDevices.map(dev => (
                  <div key={dev.id} className="card" style={{ padding: 16, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{dev.device_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{dev.device_model}</div>
                      </div>
                      <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                        ● {isRtl ? 'متصل' : 'ONLINE'}
                      </span>
                    </div>

                    <div style={{ marginTop: 12, fontSize: 13, display: 'grid', gap: 4 }}>
                      <div>🌐 <strong>IP Address:</strong> {dev.ip_address}:{dev.port}</div>
                      <div>📍 <strong>{isRtl ? 'الموقع:' : 'Location:'}</strong> {dev.location}</div>
                      <div>🔄 <strong>{isRtl ? 'آخر مزامنة:' : 'Last Sync:'}</strong> {dev.last_sync ? new Date(dev.last_sync).toLocaleTimeString() : '—'}</div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ width: '100%' }}
                        disabled={syncingDeviceId === dev.id}
                        onClick={() => handleSyncBiometric(dev.id)}
                      >
                        {syncingDeviceId === dev.id
                          ? (isRtl ? 'جاري الاتصال وسحب البصمات...' : 'Syncing punches...')
                          : `⚡ ${isRtl ? 'مزامنة فورية واحتساب الإضافي والخصومات' : 'Live Sync & Calculate'}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Logs & Calculations */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                📋 {isRtl ? 'سجل الحضور والبصمات واحتساب ساعات العمل الإضافي والتأخير' : 'Attendance Punch Records & Real-Time Computations'}
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{isRtl ? 'التاريخ' : 'DATE'}</th>
                      <th>{isRtl ? 'الموظف' : 'EMPLOYEE'}</th>
                      <th>{isRtl ? 'القسم' : 'DEPARTMENT'}</th>
                      <th>{isRtl ? 'وقت الدخول' : 'CHECK IN'}</th>
                      <th>{isRtl ? 'وقت الخروج' : 'CHECK OUT'}</th>
                      <th>{isRtl ? 'ساعات الإضافي' : 'OVERTIME HOURS'}</th>
                      <th>{isRtl ? 'بدل الإضافي ($)' : 'OVERTIME PAY'}</th>
                      <th>{isRtl ? 'التأخير (دقيقة)' : 'LATE MINS'}</th>
                      <th>{isRtl ? 'خصم التأخير ($)' : 'LATE DEDUCTION'}</th>
                      <th>{isRtl ? 'خصم الغياب ($)' : 'ABSENCE DED'}</th>
                      <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs.map(att => (
                      <tr key={att.id}>
                        <td>{att.log_date ? att.log_date.split('T')[0] : '—'}</td>
                        <td>
                          <strong>{isRtl ? (att.employee_name_ar || att.employee_name) : att.employee_name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{att.employee_code}</div>
                        </td>
                        <td>{isRtl ? (deptTranslations[att.department || ''] || att.department) : att.department}</td>
                        <td style={{ color: '#22c55e', fontWeight: 600 }}>
                          {att.check_in ? new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ color: '#0ea5e9', fontWeight: 600 }}>
                          {att.check_out ? new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td>
                          {att.overtime_hours > 0 ? (
                            <span style={{ color: '#f59e0b', fontWeight: 700 }}>+{att.overtime_hours} hrs</span>
                          ) : '0'}
                        </td>
                        <td style={{ color: '#f59e0b', fontWeight: 700 }}>
                          {att.overtime_amount > 0 ? `+${formatCurrency(att.overtime_amount)}` : '$0.00'}
                        </td>
                        <td>
                          {att.late_minutes > 0 ? (
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>{att.late_minutes} min</span>
                          ) : '0'}
                        </td>
                        <td style={{ color: '#ef4444', fontWeight: 700 }}>
                          {att.lateness_deduction > 0 ? `-${formatCurrency(att.lateness_deduction)}` : '$0.00'}
                        </td>
                        <td style={{ color: '#ef4444' }}>
                          {att.daily_deduction > 0 ? `-${formatCurrency(att.daily_deduction)}` : '$0.00'}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: att.status === 'present' ? '#22c55e22' : att.status === 'late' ? '#f59e0b22' : '#ef444422',
                              color: att.status === 'present' ? '#22c55e' : att.status === 'late' ? '#f59e0b' : '#ef4444'
                            }}
                          >
                            {att.status?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 4: INSTALLMENTS & ADVANCES SCREEN (Feature 3)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'advances' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                💳 {isRtl ? 'سجل السلف وقروض العاملين مع جدول الأقساط وتواريخ الخصم' : 'Employee Advances & Scheduled Installment Deductions'}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddAdvanceModal(true)}>
                + {isRtl ? 'منح سلفة جديدة للموظف' : 'Grant New Employee Advance'}
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{isRtl ? 'الموظف' : 'EMPLOYEE'}</th>
                    <th>{isRtl ? 'تاريخ المنح' : 'DATE'}</th>
                    <th>{isRtl ? 'مبلغ السلفة الإجمالي' : 'ADVANCE AMOUNT'}</th>
                    <th>{isRtl ? 'عدد الأقساط' : 'MONTHS'}</th>
                    <th>{isRtl ? 'قيمة القسط الشهري' : 'MONTHLY INSTALLMENT'}</th>
                    <th>{isRtl ? 'المبلغ المسدد' : 'REPAID'}</th>
                    <th>{isRtl ? 'المتبقي ذمة' : 'BALANCE'}</th>
                    <th>{isRtl ? 'بدء الخصم' : 'START MONTH'}</th>
                    <th>{isRtl ? 'الغرض' : 'PURPOSE'}</th>
                    <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                    <th>{isRtl ? 'جدول الأقساط' : 'SCHEDULE'}</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map(adv => (
                    <tr key={adv.id}>
                      <td>
                        <strong>{isRtl ? (adv.employee_name_ar || adv.employee_name) : adv.employee_name}</strong>
                      </td>
                      <td>{adv.request_date ? adv.request_date.split('T')[0] : '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(adv.amount)}</td>
                      <td>{adv.repayment_months} {isRtl ? 'شهر' : 'mos'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(adv.monthly_installment)}</td>
                      <td style={{ color: '#22c55e' }}>{formatCurrency(adv.repaid_amount)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>{formatCurrency(adv.balance)}</td>
                      <td>{adv.deduction_start_month || '2026-10'}</td>
                      <td style={{ fontSize: 12 }}>{adv.purpose || adv.notes || 'سلفة موظف'}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                          {adv.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => setSelectedAdvanceForSchedule(adv)}
                        >
                          📅 {isRtl ? 'عرض الجدول' : 'View Schedule'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 5: COMPANY SOCIAL SECURITY DEDUCTION REPORT (Feature 5)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'social_security' && (
          <div style={{ marginTop: 16 }}>
            {/* Summary Cards */}
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card accent">
                <div className="kpi-icon accent-bg">👥</div>
                <div className="kpi-value">{socialSecurityData.summary.total_employees}</div>
                <div className="kpi-label">{isRtl ? 'الموظفون المسجلون بالضمان' : 'Enrolled Staff'}</div>
              </div>

              <div className="kpi-card purple">
                <div className="kpi-icon purple-bg">📊</div>
                <div className="kpi-value">{formatCurrency(socialSecurityData.summary.total_subject_salary)}</div>
                <div className="kpi-label">{isRtl ? 'إجمالي الأجور الخاضعة للضمان' : 'Total Subject Wages'}</div>
              </div>

              <div className="kpi-card warning">
                <div className="kpi-icon warning-bg">👤</div>
                <div className="kpi-value">{formatCurrency(socialSecurityData.summary.total_employee_deductions)}</div>
                <div className="kpi-label">{isRtl ? 'إجمالي اقتطاع الموظفين (7.5%)' : 'Employee Share (7.5%)'}</div>
              </div>

              <div className="kpi-card success">
                <div className="kpi-icon success-bg">🏢</div>
                <div className="kpi-value">{formatCurrency(socialSecurityData.summary.total_company_liability)}</div>
                <div className="kpi-label">{isRtl ? 'إجمالي مساهمة الشركة (14.25%)' : 'Company Share (14.25%)'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                🛡️ {isRtl ? `كشف اشتراكات واقتطاعات الضمان الاجتماعي لشهر ${selectedMonth}` : `Social Security Remittance Breakdown for ${selectedMonth}`}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                🖨️ {isRtl ? 'طباعة كشف الضمان الرسمي' : 'Print Social Security Statement'}
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{isRtl ? 'الرقم الوظيفي' : 'BADGE'}</th>
                    <th>{isRtl ? 'الرقم الوطني' : 'NATIONAL ID'}</th>
                    <th>{isRtl ? 'رقم الضمان' : 'SS NUMBER'}</th>
                    <th>{isRtl ? 'اسم الموظف' : 'EMPLOYEE NAME'}</th>
                    <th>{isRtl ? 'القسم' : 'DEPARTMENT'}</th>
                    <th>{isRtl ? 'الأجر الخاضع' : 'SUBJECT WAGE'}</th>
                    <th>{isRtl ? 'اقتطاع الموظف (7.5%)' : 'EMP DEDUCTION'}</th>
                    <th>{isRtl ? 'مساهمة الشركة (14.25%)' : 'COMPANY SHARE'}</th>
                    <th>{isRtl ? 'إجمالي التحويل' : 'TOTAL REMITTANCE'}</th>
                  </tr>
                </thead>
                <tbody>
                  {socialSecurityData.list.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{row.employee_code}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.national_id}</td>
                      <td style={{ fontFamily: 'monospace', color: '#f59e0b' }}>{row.social_security_number}</td>
                      <td>
                        <strong>{isRtl ? (row.full_name_ar || row.full_name) : row.full_name}</strong>
                      </td>
                      <td>{isRtl ? (deptTranslations[row.department] || row.department) : row.department}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(row.subject_salary)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(row.employee_deduction)}</td>
                      <td style={{ color: '#0ea5e9', fontWeight: 700 }}>{formatCurrency(row.company_share)}</td>
                      <td style={{ color: '#22c55e', fontWeight: 800 }}>{formatCurrency(row.total_contribution)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 6: PAYSLIP BREAKDOWN & PAYROLL RUN (Feature 6)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'payroll' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                📜 {isRtl ? `مسير وقسائم الرواتب المفصلة (راتب + إضافي - تأخير - سلف - ضمان)` : 'Itemized Payslips (Salary + Overtime - Lateness - Advances - Social Security)'}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRunPayrollModal(true)}>
                ⚡ {isRtl ? 'تشغيل واحتساب مسير الرواتب للشهر' : 'Recalculate & Run Payroll Batch'}
              </button>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>{isRtl ? 'رقم القسيمة' : 'SLIP REF'}</th>
                    <th>{isRtl ? 'اسم الموظف' : 'EMPLOYEE'}</th>
                    <th>{isRtl ? 'الراتب الأساسي' : 'BASIC'}</th>
                    <th>{isRtl ? 'الإضافي (+)' : 'OVERTIME (+)'}</th>
                    <th>{isRtl ? 'خصم التأخير (-)' : 'LATENESS (-)'}</th>
                    <th>{isRtl ? 'خصم الغياب (-)' : 'ABSENCE (-)'}</th>
                    <th>{isRtl ? 'اقتطاع الضمان (-)' : 'SOCIAL SEC (-)'}</th>
                    <th>{isRtl ? 'قسط السلفة (-)' : 'ADVANCE (-)'}</th>
                    <th>{isRtl ? 'صافي الراتب المستحق' : 'NET SALARY'}</th>
                    <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(slip => (
                    <tr key={slip.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPayslip(slip)}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{slip.reference}</td>
                      <td>
                        <strong>{slip.employee_name}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{slip.department}</div>
                      </td>
                      <td>{formatCurrency(slip.basic_salary)}</td>
                      <td style={{ color: '#22c55e', fontWeight: 600 }}>
                        {slip.overtime_amount ? `+${formatCurrency(slip.overtime_amount)}` : '+0.00'}
                      </td>
                      <td style={{ color: '#ef4444' }}>
                        {slip.lateness_deduction ? `-${formatCurrency(slip.lateness_deduction)}` : '-0.00'}
                      </td>
                      <td style={{ color: '#ef4444' }}>
                        {slip.absence_deduction ? `-${formatCurrency(slip.absence_deduction)}` : '-0.00'}
                      </td>
                      <td style={{ color: '#f59e0b' }}>
                        {slip.social_security_employee ? `-${formatCurrency(slip.social_security_employee)}` : '-0.00'}
                      </td>
                      <td style={{ color: '#8b5cf6' }}>
                        {slip.advance_deduction ? `-${formatCurrency(slip.advance_deduction)}` : '-0.00'}
                      </td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 15 }}>
                        {formatCurrency(slip.net_salary)}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => setSelectedPayslip(slip)}
                        >
                          👁️ {isRtl ? 'عرض القسيمة' : 'View Slip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 7: HR CERTIFICATES & EXPERIENCE LETTERS (Feature 7)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'certificates' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 24, alignItems: 'flex-start' }}>
              {/* Form Config */}
              <div className="card" style={{ padding: 20, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                  🖨️ {isRtl ? 'إعداد وطباعة الخطابات والشهادات الإدارية' : 'Certificate Generator Parameters'}
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'نوع الشهادة / الخطاب' : 'Certificate Type'}</label>
                    <select
                      className="input"
                      value={certType}
                      onChange={e => setCertType(e.target.value as any)}
                    >
                      <option value="salary_continuation">
                        📄 {isRtl ? 'شهادة استمرارية وتثبيت راتب (Salary Continuation)' : 'Salary Continuation Certificate'}
                      </option>
                      <option value="experience">
                        📜 {isRtl ? 'شهادة خبرة وخدمة عمل (Letter of Experience)' : 'Employee Experience Certificate'}
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="label">{isRtl ? 'الموظف المعني' : 'Select Employee'}</label>
                    <select
                      className="input"
                      value={certEmployeeId}
                      onChange={e => setCertEmployeeId(e.target.value)}
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} — {emp.job_title || emp.role} ({emp.employee_code || emp.employee_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">{isRtl ? 'موجهة إلى' : 'Addressed To'}</label>
                    <input
                      type="text"
                      className="input"
                      value={certRecipient}
                      onChange={e => setCertRecipient(e.target.value)}
                      placeholder="مثال: إلى من يهمه الأمر / بنك الراجحي"
                    />
                  </div>

                  <div>
                    <label className="label">{isRtl ? 'نص الخطاب / ملاحظات إضافية' : 'Letter Content & Commendations'}</label>
                    <textarea
                      rows={4}
                      className="input"
                      value={certNotes}
                      onChange={e => setCertNotes(e.target.value)}
                    />
                  </div>

                  <button className="btn btn-primary" onClick={() => window.print()}>
                    🖨️ {isRtl ? 'طباعة الشهادة الرسمية فوراً' : 'Print Official Certificate'}
                  </button>
                </div>
              </div>

              {/* Live Preview on Official Letterhead */}
              <div className="printable-document" style={{ background: '#ffffff', color: '#111827', borderRadius: 8, padding: 36, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', minHeight: 550 }}>
                {/* Letterhead Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0284c7', paddingBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0369a1' }}>شركة مصنع المسار للوحات الكهربائية</div>
                    <div style={{ fontSize: 13, color: '#475569' }}>AL-MASAR SWITCHGEAR FACTORY CO.</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>سجل تجاري: 1010894521 • الرياض، المملكة العربية السعودية</div>
                  </div>
                  <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                    <div style={{ fontSize: 28 }}>⚡🏢</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      الرقم المرجعي: MS/HR/{new Date().getFullYear()}/{Math.floor(100 + Math.random() * 900)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      التاريخ: {new Date().toLocaleDateString('ar-SA')}
                    </div>
                  </div>
                </div>

                {/* Certificate Title */}
                <div style={{ textAlign: 'center', margin: '30px 0 20px 0' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textDecoration: 'underline', textUnderlineOffset: 8 }}>
                    {certType === 'salary_continuation'
                      ? (isRtl ? 'شهادة استمرارية وتثبيت راتب' : 'CERTIFICATE OF SALARY CONTINUATION')
                      : (isRtl ? 'شهادة خبرة وخدمة عمل' : 'CERTIFICATE OF EXPERIENCE & SERVICE')}
                  </h2>
                </div>

                {/* Addressed To */}
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
                  {certRecipient}
                </div>

                {/* Body Content */}
                <div style={{ fontSize: 14, lineHeight: 2, color: '#1e293b' }}>
                  {certType === 'salary_continuation' ? (
                    <>
                      تشهد شركة مصنع المسار لتصنيع اللوحات الكهربائية بأن الموظف الموضح بياناته أدناه:
                      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 6, margin: '14px 0', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div><strong>اسم الموظف:</strong> {certEmp?.full_name_ar || certEmp?.full_name}</div>
                        <div><strong>الرقم الوطني / الإقامة:</strong> {certEmp?.national_id || '—'}</div>
                        <div><strong>الرقم الوظيفي:</strong> {certEmp?.employee_code || certEmp?.employee_id}</div>
                        <div><strong>المسمى الوظيفي:</strong> {certEmp?.job_title || certEmp?.role}</div>
                        <div><strong>القسم:</strong> {deptTranslations[certEmp?.department || ''] || certEmp?.department}</div>
                        <div><strong>تاريخ المباشرة:</strong> {certEmp?.effective_date ? certEmp.effective_date.split('T')[0] : certEmp?.hire_date}</div>
                        <div><strong>الراتب الأساسي:</strong> {formatCurrency(certEmp?.basic_salary || 0)}</div>
                        <div><strong>إجمالي البدلات:</strong> {formatCurrency((certEmp?.housing_allowance || 0) + (certEmp?.transport_allowance || 0))}</div>
                      </div>
                      يعمل لدينا حتى تاريخه وهو على رأس عمله ويتقاضى راتبه بانتظام. وقد أعطيت له هذه الشهادة بناءً على طلبه لتقديمها إلى الجهة المذكورة دون أدنى مسؤولية أو التزام مالي على الشركة تجاه الغير.
                    </>
                  ) : (
                    <>
                      تشهد شركة مصنع المسار لتصنيع اللوحات الكهربائية بأن السيد / <strong>{certEmp?.full_name_ar || certEmp?.full_name}</strong>، الحامل للرقم الوطني / الإقامة رقم (<strong>{certEmp?.national_id || '—'}</strong>)، قد عمل لدينا بمسمى وظيفي <strong>{certEmp?.job_title || certEmp?.role}</strong> بقسم <strong>{deptTranslations[certEmp?.department || ''] || certEmp?.department}</strong>، اعتباراً من تاريخ <strong>{certEmp?.effective_date ? certEmp.effective_date.split('T')[0] : certEmp?.hire_date}</strong> وحتى تاريخه.
                      <div style={{ margin: '16px 0' }}>
                        وخلال فترة عمله كان مثالاً للموظف المتفاني، الملتزم بمعايير الجودة والسلامة المهنية وحسن السيرة والسلوك.
                      </div>
                      وقد مُنح هذه الشهادة بناءً على رغبته، متمنين له دوام التوفيق والنجاح المهني.
                    </>
                  )}
                </div>

                {/* Signatures & Seal */}
                <div style={{ marginTop: 45, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>مدير الموارد البشرية</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 30 }}>أ. عبد الله خدام الجامع</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>التوقيع: _______________</div>
                  </div>

                  <div style={{ textAlign: 'center', border: '2px dashed #0284c7', borderRadius: '50%', width: 110, height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#0284c7' }}>مصنع المسار</div>
                    <div style={{ fontSize: 18 }}>★ SEAL ★</div>
                    <div style={{ fontSize: 8, color: '#64748b' }}>ختم الشركة الرسمي</div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>المدير العام والتحكم الكامل</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 30 }}>م. يوسف بصبوص</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>التوقيع: _______________</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 8: DISCIPLINARY ACTIONS & RESIGNATIONS (Feature 8)
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'disciplinary' && (
          <div style={{ marginTop: 16 }}>
            {/* Disciplinary Section */}
            <div style={{ marginBottom: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  ⚖️ {isRtl ? 'نظام الجزاءات والعقوبات الإدارية (تنبيه، إنذار أول، إنذار ثاني، خصم يوم، فصل)' : 'Disciplinary & Penalties System'}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => setShowAddDisciplinaryModal(true)}>
                  + {isRtl ? 'إصدار عقوبة / إنذار إداري' : 'Issue Disciplinary Action'}
                </button>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{isRtl ? 'التاريخ' : 'DATE'}</th>
                      <th>{isRtl ? 'الموظف' : 'EMPLOYEE'}</th>
                      <th>{isRtl ? 'نوع العقوبة' : 'PENALTY TYPE'}</th>
                      <th>{isRtl ? 'سبب المخالفة' : 'REASON'}</th>
                      <th>{isRtl ? 'الأيام المخصومة' : 'DAYS DEDUCTED'}</th>
                      <th>{isRtl ? 'قيمة الخصم المالية' : 'DEDUCTION AMOUNT'}</th>
                      <th>{isRtl ? 'صاحب القرار' : 'DECISION MAKER'}</th>
                      <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplinaryRecords.map(dr => {
                      const badgeMap: Record<string, { label: string; bg: string; color: string }> = {
                        verbal_warning: { label: isRtl ? 'تنبيه شفهي' : 'Verbal Warning', bg: '#f59e0b22', color: '#f59e0b' },
                        first_warning: { label: isRtl ? 'إنذار خطي أول' : 'First Written Warning', bg: '#f9731622', color: '#f97316' },
                        second_warning: { label: isRtl ? 'إنذار خطي ثانٍ' : 'Second Warning', bg: '#ef444422', color: '#ef4444' },
                        day_deduction: { label: isRtl ? 'خصم أجر يوم' : 'One-Day Deduction', bg: '#ef444433', color: '#ef4444' },
                        multi_day_deduction: { label: isRtl ? 'خصم عدة أيام' : 'Multi-Day Deduction', bg: '#dc262633', color: '#dc2626' },
                        termination: { label: isRtl ? 'فصل من العمل' : 'Dismissal', bg: '#991b1b44', color: '#f87171' }
                      }
                      const b = badgeMap[dr.action_type] || { label: dr.action_type, bg: '#94a3b822', color: '#94a3b8' }

                      return (
                        <tr key={dr.id}>
                          <td>{dr.action_date ? dr.action_date.split('T')[0] : '—'}</td>
                          <td>
                            <strong>{isRtl ? (dr.employee_name_ar || dr.employee_name) : dr.employee_name}</strong>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: b.bg, color: b.color, fontWeight: 700 }}>
                              {b.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 13, maxWidth: 300 }}>{dr.reason}</td>
                          <td>{dr.deduction_days > 0 ? `${dr.deduction_days} ${isRtl ? 'يوم' : 'days'}` : '0'}</td>
                          <td style={{ color: dr.deduction_amount > 0 ? '#ef4444' : 'inherit', fontWeight: 700 }}>
                            {dr.deduction_amount > 0 ? `-${formatCurrency(dr.deduction_amount)}` : '$0.00'}
                          </td>
                          <td style={{ fontSize: 12 }}>{dr.decision_maker}</td>
                          <td>
                            <span className="badge badge-subtle">{dr.status}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resignations Section */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  🚪 {isRtl ? 'إدارة الاستقالات وبراءة الذمة ومكافأة نهاية الخدمة' : 'Resignations & Clearance Management'}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddResignationModal(true)}>
                  + {isRtl ? 'تسجيل طلب استقالة' : 'Submit Resignation Request'}
                </button>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{isRtl ? 'تاريخ التقديم' : 'SUBMITTED'}</th>
                      <th>{isRtl ? 'الموظف' : 'EMPLOYEE'}</th>
                      <th>{isRtl ? 'آخر يوم عمل' : 'LAST WORKING DAY'}</th>
                      <th>{isRtl ? 'فترة الإشعار' : 'NOTICE PERIOD'}</th>
                      <th>{isRtl ? 'سبب الاستقالة' : 'REASON'}</th>
                      <th>{isRtl ? 'مكافأة نهاية الخدمة' : 'EOS BENEFIT'}</th>
                      <th>{isRtl ? 'حالة براءة الذمة' : 'CLEARANCE'}</th>
                      <th>{isRtl ? 'حالة الطلب' : 'STATUS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resignationRecords.map(r => (
                      <tr key={r.id}>
                        <td>{r.submission_date ? r.submission_date.split('T')[0] : '—'}</td>
                        <td>
                          <strong>{isRtl ? (r.employee_name_ar || r.employee_name) : r.employee_name}</strong>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.department}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.last_working_day ? r.last_working_day.split('T')[0] : '—'}</td>
                        <td>{r.notice_period_days} {isRtl ? 'يوم' : 'days'}</td>
                        <td style={{ fontSize: 13, maxWidth: 280 }}>{r.reason}</td>
                        <td style={{ fontWeight: 700, color: '#22c55e' }}>{formatCurrency(r.end_of_service_benefits)}</td>
                        <td>
                          <span className="badge" style={{ backgroundColor: r.clearance_status === 'cleared' ? '#22c55e22' : '#f59e0b22', color: r.clearance_status === 'cleared' ? '#22c55e' : '#f59e0b' }}>
                            {r.clearance_status === 'cleared' ? (isRtl ? 'مكتملة' : 'CLEARED') : (isRtl ? 'قيد المتابعة' : 'IN PROGRESS')}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-subtle">{r.status?.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 9: POINTS LEADERBOARD
            ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'points' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[...employees]
                .sort((a, b) => (b.reward_points || 0) - (a.reward_points || 0))
                .map((emp, rank) => (
                  <div key={emp.id} className="card" style={{ padding: 18, border: rank < 3 ? '1px solid #f59e0b66' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 22 }}>
                        {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>
                        ⭐ {emp.reward_points}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>
                      {isRtl ? (emp.full_name_ar || emp.full_name) : emp.full_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {emp.department} • {(ROLE_LABELS as any)[emp.role]?.[lang] || emp.role}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                      {isRtl ? 'القيمة المالية للمكافأة:' : 'Bonus Payout Value:'} {formatCurrency((emp.reward_points || 0) * pointConversionRate)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL: OFFICIAL EMPLOYEE PROFILE CARD VIEW (Feature 2)
          ═══════════════════════════════════════════════════════════ */}
      {showEmployeeCardModal && selectedEmployeeForCard && (
        <div className="modal-backdrop" onClick={() => setShowEmployeeCardModal(false)}>
          <div className="modal-content" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>🪪 {isRtl ? 'بطاقة تعريف موظف رسمية (Employee Profile Card)' : 'Official Employee Profile Card'}</h3>
              <button className="btn btn-secondary" onClick={() => setShowEmployeeCardModal(false)}>✕</button>
            </div>

            <div className="printable-document" style={{ padding: 24, background: '#ffffff', color: '#0f172a', borderRadius: 8, margin: 16, border: '2px solid #0284c7' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0369a1' }}>مصنع المسار للوحات الكهربائية</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>بطاقة كادر المصنع • FACTORY ID CARD</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e', fontSize: 12 }}>
                    ● {selectedEmployeeForCard.employment_status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
              </div>

              {/* Employee ID Details */}
              <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
                <div style={{ width: 90, height: 110, background: '#e2e8f0', borderRadius: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 36, border: '1px solid #cbd5e1' }}>
                  👤
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                  <div><strong>الاسم بالعربية:</strong> {selectedEmployeeForCard.full_name_ar || selectedEmployeeForCard.full_name}</div>
                  <div><strong>Full Name:</strong> {selectedEmployeeForCard.full_name}</div>
                  <div><strong>الرقم الوطني / الهوية:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedEmployeeForCard.national_id || '—'}</span></div>
                  <div><strong>الرقم الوظيفي:</strong> <span style={{ color: '#0284c7', fontWeight: 700 }}>{selectedEmployeeForCard.employee_code || selectedEmployeeForCard.employee_id}</span></div>
                  <div><strong>القسم:</strong> {deptTranslations[selectedEmployeeForCard.department] || selectedEmployeeForCard.department}</div>
                  <div><strong>المسمى الوظيفي:</strong> {selectedEmployeeForCard.job_title || selectedEmployeeForCard.role}</div>
                  <div><strong>المؤهل العلمي:</strong> {selectedEmployeeForCard.education_level || 'دبلوم تقني'}</div>
                  <div><strong>تاريخ السريان:</strong> {selectedEmployeeForCard.effective_date ? selectedEmployeeForCard.effective_date.split('T')[0] : selectedEmployeeForCard.hire_date}</div>
                </div>
              </div>

              {/* Financial & Social Security Parameters */}
              <div style={{ marginTop: 20, borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>
                  💰 بيانات الراتب والضمان الاجتماعي (Salary & Social Security):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>الراتب الأساسي</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{formatCurrency(selectedEmployeeForCard.basic_salary)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>اقتطاع الضمان (العامل)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>
                      {selectedEmployeeForCard.social_security_rate_employee || 7.5}% ({formatCurrency((selectedEmployeeForCard.basic_salary * (selectedEmployeeForCard.social_security_rate_employee || 7.5)) / 100)})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>مساهمة الضمان (الشركة)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0ea5e9' }}>
                      {selectedEmployeeForCard.social_security_rate_company || 14.25}% ({formatCurrency((selectedEmployeeForCard.basic_salary * (selectedEmployeeForCard.social_security_rate_company || 14.25)) / 100)})
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
                  <span><strong>رقم اشتراك الضمان:</strong> {selectedEmployeeForCard.social_security_number || '—'}</span>
                  <span><strong>رقم البصمة بالجهاز:</strong> {selectedEmployeeForCard.biometric_pin || '—'}</span>
                  <span><strong>الحساب البنكي:</strong> {selectedEmployeeForCard.bank_name || 'مصرف الراجحي'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ {isRtl ? 'طباعة بطاقة الموظف' : 'Print Card'}
              </button>
              <button className="btn btn-primary" onClick={() => {
                setShowEmployeeCardModal(false)
                openEditEmployeeModal(selectedEmployeeForCard)
              }}>
                ✏️ {isRtl ? 'تعديل البيانات' : 'Edit Parameters'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ADD / EDIT EMPLOYEE PROFILE CARD (Feature 2)
          ═══════════════════════════════════════════════════════════ */}
      {showAddEditEmployeeModal && (
        <div className="modal-backdrop" onClick={() => setShowAddEditEmployeeModal(false)}>
          <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveEmployeeCard}>
              <div className="modal-header">
                <h3>{editingEmployee ? (isRtl ? 'تعديل بطاقة موظف' : 'Edit Employee Card') : (isRtl ? 'تعريف بطاقة موظف جديدة' : 'Define New Employee Card')}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditEmployeeModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
                {/* 1. Basic Info */}
                <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                  👤 {isRtl ? 'البيانات الشخصية والرقم الوطني' : 'Personal & National ID'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالإنجليزية' : 'Full Name (English)'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={employeeForm.full_name}
                      onChange={e => setEmployeeForm({ ...employeeForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالعربية' : 'Full Name (Arabic)'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={employeeForm.full_name_ar}
                      onChange={e => setEmployeeForm({ ...employeeForm, full_name_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الرقم الوطني / رقم الهوية الوطنية' : 'National ID / Iqama'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={employeeForm.national_id}
                      onChange={e => setEmployeeForm({ ...employeeForm, national_id: e.target.value })}
                      placeholder="10XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'المؤهل العلمي / التعليم' : 'Education / Qualification'}</label>
                    <input
                      type="text"
                      className="input"
                      value={employeeForm.education_level}
                      onChange={e => setEmployeeForm({ ...employeeForm, education_level: e.target.value })}
                      placeholder="بكالوريوس هندسة كهربائية / دبلوم..."
                    />
                  </div>
                </div>

                {/* 2. Position & Dates */}
                <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 8 }}>
                  🏭 {isRtl ? 'القسم وتاريخ السريان والبصمة' : 'Department & Dates'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم' : 'Department'}</label>
                    <select
                      className="input"
                      value={employeeForm.department}
                      onChange={e => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    >
                      <option value="Panel Fabrication">{isRtl ? 'تجميع وهياكل اللوحات' : 'Panel Fabrication'}</option>
                      <option value="Busbar & Wiring">{isRtl ? 'تشكيل البسبار والأسلاك' : 'Busbar & Wiring'}</option>
                      <option value="Quality Assurance">{isRtl ? 'ضبط الجودة وفحص FAT' : 'Quality Assurance'}</option>
                      <option value="Engineering & Estimation">{isRtl ? 'الهندسة والتسعير الفني' : 'Engineering & Estimation'}</option>
                      <option value="Production Management">{isRtl ? 'إدارة وتخطيط الإنتاج' : 'Production Management'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ السريان / المباشرة' : 'Effective Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={employeeForm.effective_date}
                      onChange={e => setEmployeeForm({ ...employeeForm, effective_date: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'رقم البصمة على جهاز الحضور' : 'Biometric Machine PIN'}</label>
                    <input
                      type="text"
                      className="input"
                      value={employeeForm.biometric_pin}
                      onChange={e => setEmployeeForm({ ...employeeForm, biometric_pin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الحالة الوظيفية' : 'Employment Status'}</label>
                    <select
                      className="input"
                      value={employeeForm.status}
                      onChange={e => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                    >
                      <option value="active">{isRtl ? 'نشط وعلى رأس العمل' : 'Active'}</option>
                      <option value="on_leave">{isRtl ? 'إجازة' : 'On Leave'}</option>
                      <option value="terminated">{isRtl ? 'منتهي الخدمة' : 'Terminated'}</option>
                    </select>
                  </div>
                </div>

                {/* 3. Salary & Social Security */}
                <div style={{ fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 4, marginTop: 8 }}>
                  💵 {isRtl ? 'الراتب والضمان الاجتماعي' : 'Salary & Social Security'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الراتب الأساسي ($)' : 'Basic Salary ($)'}</label>
                    <input
                      required
                      type="number"
                      className="input"
                      value={employeeForm.basic_salary}
                      onChange={e => setEmployeeForm({ ...employeeForm, basic_salary: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'بدل السكن ($)' : 'Housing ($)'}</label>
                    <input
                      type="number"
                      className="input"
                      value={employeeForm.housing_allowance}
                      onChange={e => setEmployeeForm({ ...employeeForm, housing_allowance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'بدل المواصلات ($)' : 'Transport ($)'}</label>
                    <input
                      type="number"
                      className="input"
                      value={employeeForm.transport_allowance}
                      onChange={e => setEmployeeForm({ ...employeeForm, transport_allowance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'رقم اشتراك الضمان' : 'Social Security #'}</label>
                    <input
                      type="text"
                      className="input"
                      value={employeeForm.social_security_number}
                      onChange={e => setEmployeeForm({ ...employeeForm, social_security_number: e.target.value })}
                      placeholder="SS-XXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'نسبة اقتطاع الموظف (%)' : 'Employee SS %'}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={employeeForm.social_security_rate_employee}
                      onChange={e => setEmployeeForm({ ...employeeForm, social_security_rate_employee: parseFloat(e.target.value) || 7.5 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'نسبة مساهمة الشركة (%)' : 'Company SS %'}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={employeeForm.social_security_rate_company}
                      onChange={e => setEmployeeForm({ ...employeeForm, social_security_rate_company: parseFloat(e.target.value) || 14.25 })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditEmployeeModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployee ? (isRtl ? 'حفظ تعديلات بطاقة الموظف' : 'Save Changes') : (isRtl ? 'إنشاء وتفعيل بطاقة الموظف' : 'Create Profile Card')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: VIEW ADVANCE INSTALLMENT SCHEDULE (Feature 3)
          ═══════════════════════════════════════════════════════════ */}
      {selectedAdvanceForSchedule && (
        <div className="modal-backdrop" onClick={() => setSelectedAdvanceForSchedule(null)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📅 {isRtl ? 'جدول وتواريخ خصم أقساط السلفة' : 'Advance Installment Deduction Schedule'}</h3>
              <button className="btn btn-secondary" onClick={() => setSelectedAdvanceForSchedule(null)}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedAdvanceForSchedule.employee_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {isRtl ? 'المبلغ الإجمالي:' : 'Total Amount:'} {formatCurrency(selectedAdvanceForSchedule.amount)} • {isRtl ? 'المسدد:' : 'Repaid:'} {formatCurrency(selectedAdvanceForSchedule.repaid_amount)} • {isRtl ? 'المتبقي:' : 'Balance:'} {formatCurrency(selectedAdvanceForSchedule.balance)}
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{isRtl ? 'القسط #' : 'INST #'}</th>
                      <th>{isRtl ? 'شهر الخصم' : 'DEDUCTION MONTH'}</th>
                      <th>{isRtl ? 'تاريخ الاستحقاق' : 'DUE DATE'}</th>
                      <th>{isRtl ? 'قيمة القسط' : 'AMOUNT'}</th>
                      <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedAdvanceForSchedule.installments || []).map(inst => (
                      <tr key={inst.id}>
                        <td>#{inst.installment_number}</td>
                        <td style={{ fontWeight: 600 }}>{inst.deduction_month}</td>
                        <td>{inst.due_date}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(inst.amount)}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: inst.status === 'deducted' ? '#22c55e22' : '#f59e0b22',
                              color: inst.status === 'deducted' ? '#22c55e' : '#f59e0b'
                            }}
                          >
                            {inst.status === 'deducted' ? (isRtl ? 'تم الخصم بالمسير' : 'DEDUCTED') : (isRtl ? 'معلق / مجدول' : 'PENDING')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedAdvanceForSchedule(null)}>
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: NEW ADVANCE (Feature 3)
          ═══════════════════════════════════════════════════════════ */}
      {showAddAdvanceModal && (
        <div className="modal-backdrop" onClick={() => setShowAddAdvanceModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateAdvance}>
              <div className="modal-header">
                <h3>💳 {isRtl ? 'منح سلفة جديدة للموظف وجدولة الأقساط' : 'Grant Advance & Schedule Installments'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAdvanceModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'الموظف المستفيد' : 'Employee'}</label>
                  <select
                    required
                    className="input"
                    value={advanceForm.employee_id}
                    onChange={e => setAdvanceForm({ ...advanceForm, employee_id: e.target.value })}
                  >
                    <option value="">{isRtl ? '-- اختر الموظف --' : '-- Select Employee --'}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({formatCurrency(e.basic_salary)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'مبلغ السلفة الإجمالي ($)' : 'Advance Amount ($)'}</label>
                    <input
                      required
                      type="number"
                      className="input"
                      value={advanceForm.amount}
                      onChange={e => setAdvanceForm({ ...advanceForm, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'عدد شهور السداد (الأقساط)' : 'Repayment Months'}</label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={24}
                      className="input"
                      value={advanceForm.repayment_months}
                      onChange={e => setAdvanceForm({ ...advanceForm, repayment_months: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'شهر بدء أول خصم' : 'Deduction Start Month'}</label>
                  <input
                    type="month"
                    className="input"
                    value={advanceForm.deduction_start_month}
                    onChange={e => setAdvanceForm({ ...advanceForm, deduction_start_month: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'الغرض من السلفة / ملاحظات' : 'Purpose / Notes'}</label>
                  <input
                    type="text"
                    className="input"
                    value={advanceForm.purpose}
                    onChange={e => setAdvanceForm({ ...advanceForm, purpose: e.target.value })}
                    placeholder="مثال: سلفة إيجار سكن سنوي"
                  />
                </div>

                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 6, fontSize: 13 }}>
                  <div>{isRtl ? 'قيمة القسط الشهري المحسوبة:' : 'Calculated Monthly Installment:'} <strong>{formatCurrency(advanceForm.amount / (advanceForm.repayment_months || 1))}</strong></div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAdvanceModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'اعتماد ومنح السلفة وجدولة الأقساط' : 'Grant & Generate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: DETAILED OFFICIAL PAYSLIP BREAKDOWN (Feature 6)
          ═══════════════════════════════════════════════════════════ */}
      {selectedPayslip && (
        <div className="modal-backdrop" onClick={() => setSelectedPayslip(null)}>
          <div className="modal-content" style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18 }}>🧾 {isRtl ? 'سلب وقسيمة راتب تفصيلية رسمية' : 'Itemized Official Payslip Statement'}</h3>
              <button className="btn btn-secondary" onClick={() => setSelectedPayslip(null)}>✕</button>
            </div>

            <div className="printable-document" style={{ padding: 24, background: '#ffffff', color: '#0f172a', borderRadius: 8, margin: 16, border: '2px solid #0284c7' }}>
              {/* Slip Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0284c7', paddingBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0369a1' }}>شركة مصنع المسار للوحات الكهربائية</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>قسيمة راتب وبدل إضافي • SALARY PAYSLIP</div>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <div style={{ fontWeight: 700, color: '#0ea5e9' }}>{selectedPayslip.reference}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>شهر الاستحقاق: {selectedPayslip.month}</div>
                </div>
              </div>

              {/* Employee Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0', fontSize: 13, background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                <div><strong>الموظف:</strong> {selectedPayslip.employee_name_ar || selectedPayslip.employee_name}</div>
                <div><strong>الرقم الوطني:</strong> {selectedPayslip.national_id || '—'}</div>
                <div><strong>القسم:</strong> {deptTranslations[selectedPayslip.department || ''] || selectedPayslip.department}</div>
                <div><strong>المسمى الوظيفي:</strong> {selectedPayslip.job_title || 'Technician'}</div>
              </div>

              {/* Two Column Earnings vs Deductions Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                {/* Column 1: Earnings (الاستحقاقات) */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: 6, padding: 12, background: '#f0fdf4' }}>
                  <div style={{ fontWeight: 700, color: '#166534', borderBottom: '1px solid #bbf7d0', paddingBottom: 6, marginBottom: 8 }}>
                    ➕ الاستحقاقات (Earnings)
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>الراتب الأساسي:</span>
                      <strong>{formatCurrency(selectedPayslip.basic_salary)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>بدل السكن والمواصلات:</span>
                      <strong>{formatCurrency(selectedPayslip.allowances)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                      <span>ساعات العمل الإضافي ({selectedPayslip.overtime_hours || 0}h):</span>
                      <strong>+{formatCurrency(selectedPayslip.overtime_amount || 0)}</strong>
                    </div>
                    {selectedPayslip.points_bonus > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309' }}>
                        <span>حافز نقاط الجودة:</span>
                        <strong>+{formatCurrency(selectedPayslip.points_bonus)}</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #bbf7d0', paddingTop: 6, fontWeight: 800 }}>
                      <span>إجمالي المستحقات:</span>
                      <span>{formatCurrency(selectedPayslip.gross_salary || (selectedPayslip.basic_salary + selectedPayslip.allowances))}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Deductions (الاستقطاعات) */}
                <div style={{ border: '1px solid #fecaca', borderRadius: 6, padding: 12, background: '#fef2f2' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b', borderBottom: '1px solid #fecaca', paddingBottom: 6, marginBottom: 8 }}>
                    ➖ الاستقطاعات (Deductions)
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                      <span>خصم التأخير الصباحي:</span>
                      <strong>-{formatCurrency(selectedPayslip.lateness_deduction || 0)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                      <span>خصم الغياب غير المبرر:</span>
                      <strong>-{formatCurrency(selectedPayslip.absence_deduction || 0)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>اقتطاع الضمان الاجتماعي (7.5%):</span>
                      <strong>-{formatCurrency(selectedPayslip.social_security_employee || 0)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed' }}>
                      <span>خصم قسط السلفة لهذا الشهر:</span>
                      <strong>-{formatCurrency(selectedPayslip.advance_deduction || 0)}</strong>
                    </div>
                    {selectedPayslip.penalty_deduction ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                        <span>خصم عقوبات وجزاءات:</span>
                        <strong>-{formatCurrency(selectedPayslip.penalty_deduction)}</strong>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #fecaca', paddingTop: 6, fontWeight: 800, color: '#991b1b' }}>
                      <span>إجمالي الاستقطاعات:</span>
                      <span>-{formatCurrency(selectedPayslip.total_deductions || selectedPayslip.deductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div style={{ marginTop: 20, background: '#0284c7', color: '#ffffff', padding: 14, borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>صافي الراتب المحول للحساب البنكي (Net Salary Payable):</span>
                <span style={{ fontSize: 22, fontWeight: 900 }}>{formatCurrency(selectedPayslip.net_salary)}</span>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, fontSize: 12, color: '#64748b' }}>
                <div>إعداد: قسم الموارد البشرية</div>
                <div>تدقيق: الإدارة المالية</div>
                <div>توقيع واستلام الموظف: ________________</div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ {isRtl ? 'طباعة القسيمة' : 'Print Payslip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: RUN MONTHLY PAYROLL BATCH (Feature 6)
          ═══════════════════════════════════════════════════════════ */}
      {showRunPayrollModal && (
        <div className="modal-backdrop" onClick={() => setShowRunPayrollModal(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚡ {isRtl ? 'تشغيل دفعة مسير الرواتب الشهرية' : 'Execute Monthly Payroll Batch'}</h3>
              <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(false)}>✕</button>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <div>
                <label className="label">{isRtl ? 'شهر الاستحقاق' : 'Payroll Month'}</label>
                <input
                  type="month"
                  className="input"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                />
              </div>

              <div>
                <label className="label">{isRtl ? 'سعر احتساب نقطة الجودة ($ / نقطة)' : 'Quality Point Bonus Rate ($/pt)'}</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={pointConversionRate}
                  onChange={e => setPointConversionRate(parseFloat(e.target.value) || 1)}
                />
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 12, borderRadius: 6 }}>
                💡 {isRtl
                  ? `يقوم النظام تلقائياً بسحب ساعات الإضافي من البصمة، احتساب التأخير، استقطاع أقساط السلف المجدولة لهذا الشهر، وخصم 7.5% للضمان الاجتماعي.`
                  : 'The system automatically pulls biometric overtime punches, applies lateness deductions, claims scheduled advance loan installments, and applies social security deductions.'}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(false)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={handleExecutePayrollBatch}>
                {isRtl ? 'تنفيذ واعتماد مسير الرواتب' : 'Execute Batch Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: ISSUE DISCIPLINARY PENALTY (Feature 8)
          ═══════════════════════════════════════════════════════════ */}
      {showAddDisciplinaryModal && (
        <div className="modal-backdrop" onClick={() => setShowAddDisciplinaryModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateDisciplinary}>
              <div className="modal-header">
                <h3>⚖️ {isRtl ? 'إصدار قرار إداري / عقوبة على موظف' : 'Issue Disciplinary Action'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDisciplinaryModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'الموظف المخالف' : 'Employee'}</label>
                  <select
                    required
                    className="input"
                    value={disciplinaryForm.employee_id}
                    onChange={e => setDisciplinaryForm({ ...disciplinaryForm, employee_id: e.target.value })}
                  >
                    <option value="">{isRtl ? '-- اختر الموظف --' : '-- Select Employee --'}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} — {e.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'نوع العقوبة والجزاء' : 'Penalty Type'}</label>
                  <select
                    className="input"
                    value={disciplinaryForm.action_type}
                    onChange={e => setDisciplinaryForm({ ...disciplinaryForm, action_type: e.target.value as any })}
                  >
                    <option value="verbal_warning">{isRtl ? 'تنبيه شفهي (Verbal Warning)' : 'Verbal Warning'}</option>
                    <option value="first_warning">{isRtl ? 'إنذار خطي أول (First Warning)' : 'First Written Warning'}</option>
                    <option value="second_warning">{isRtl ? 'إنذار خطي ثانٍ (Second Warning)' : 'Second Written Warning'}</option>
                    <option value="day_deduction">{isRtl ? 'خصم أجر يوم كامل (One-Day Salary Deduction)' : 'One-Day Salary Deduction'}</option>
                    <option value="multi_day_deduction">{isRtl ? 'خصم أجر عدة أيام (Multi-Day Deduction)' : 'Multi-Day Salary Deduction'}</option>
                    <option value="termination">{isRtl ? 'فصل وإنهاء خدمة (Termination)' : 'Termination / Dismissal'}</option>
                  </select>
                </div>

                {(disciplinaryForm.action_type === 'day_deduction' || disciplinaryForm.action_type === 'multi_day_deduction') && (
                  <div>
                    <label className="label">{isRtl ? 'عدد الأيام المخصومة من الراتب' : 'Deduction Days Count'}</label>
                    <input
                      type="number"
                      step="0.5"
                      min={0.5}
                      className="input"
                      value={disciplinaryForm.deduction_days}
                      onChange={e => setDisciplinaryForm({ ...disciplinaryForm, deduction_days: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                )}

                <div>
                  <label className="label">{isRtl ? 'تاريخ المخالفة' : 'Date'}</label>
                  <input
                    type="date"
                    className="input"
                    value={disciplinaryForm.action_date}
                    onChange={e => setDisciplinaryForm({ ...disciplinaryForm, action_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'سبب المخالفة والقرار الإداري' : 'Violation Reason'}</label>
                  <textarea
                    required
                    rows={3}
                    className="input"
                    value={disciplinaryForm.reason}
                    onChange={e => setDisciplinaryForm({ ...disciplinaryForm, reason: e.target.value })}
                    placeholder="تفاصيل المخالفة..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDisciplinaryModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-danger">
                  {isRtl ? 'إصدار القرار الإداري' : 'Issue Penalty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          MODAL: SUBMIT RESIGNATION (Feature 8)
          ═══════════════════════════════════════════════════════════ */}
      {showAddResignationModal && (
        <div className="modal-backdrop" onClick={() => setShowAddResignationModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateResignation}>
              <div className="modal-header">
                <h3>🚪 {isRtl ? 'تسجيل طلب استقالة موظف' : 'Submit Resignation Request'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddResignationModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'الموظف المستقيل' : 'Employee'}</label>
                  <select
                    required
                    className="input"
                    value={resignationForm.employee_id}
                    onChange={e => setResignationForm({ ...resignationForm, employee_id: e.target.value })}
                  >
                    <option value="">{isRtl ? '-- اختر الموظف --' : '-- Select Employee --'}</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} — {e.department}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ التقديم' : 'Submission Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={resignationForm.submission_date}
                      onChange={e => setResignationForm({ ...resignationForm, submission_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'آخر يوم عمل (نهاية الإشعار)' : 'Last Working Day'}</label>
                    <input
                      type="date"
                      className="input"
                      value={resignationForm.last_working_day}
                      onChange={e => setResignationForm({ ...resignationForm, last_working_day: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'فترة الإشعار (أيام)' : 'Notice Period (Days)'}</label>
                  <input
                    type="number"
                    className="input"
                    value={resignationForm.notice_period_days}
                    onChange={e => setResignationForm({ ...resignationForm, notice_period_days: parseInt(e.target.value) || 30 })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'أسباب الاستقالة' : 'Resignation Reason'}</label>
                  <textarea
                    required
                    rows={3}
                    className="input"
                    value={resignationForm.reason}
                    onChange={e => setResignationForm({ ...resignationForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddResignationModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'تسجيل الطلب وبدء إجراءات براءة الذمة' : 'Submit & Start Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deletingEmployee && (
        <div className="modal-backdrop" onClick={() => setDeletingEmployee(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد الحذف' : 'Confirm Delete'}</h3>
              <button className="btn btn-secondary" onClick={() => setDeletingEmployee(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف الموظف "${deletingEmployee.full_name}"؟` : `Are you sure you want to delete ${deletingEmployee.full_name}?`}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeletingEmployee(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-danger" onClick={handleDeleteEmployee}>
                {isRtl ? 'تأكيد الحذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
