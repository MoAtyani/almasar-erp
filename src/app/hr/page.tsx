'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { Employee, Payslip } from '@/lib/types'
import { ROLE_LABELS, formatCurrency, formatDate } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

export default function HRPage() {
  const { lang, isRtl } = useLanguage()
  const [employees, setEmployees] = useState<any[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'points'>('employees')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Modals
  const [showAddEmpModal, setShowAddEmpModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<any | null>(null)
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)

  // Payroll run config
  const [payrollMonth, setPayrollMonth] = useState('October 2026')
  const [pointConversionRate, setPointConversionRate] = useState(1.50) // $1.50 per point

  // Add / Edit Employee Form State
  const [empForm, setEmpForm] = useState({
    full_name: '',
    full_name_ar: '',
    department: 'Panel Fabrication',
    role: 'technician',
    email: '',
    phone: '',
    basic_salary: 2500,
    bank_account: '',
    status: 'active'
  })

  useEffect(() => {
    loadHRData()
  }, [])

  async function loadHRData() {
    setLoading(true)
    try {
      const res = await fetch('/api/hr')
      const json = await res.json()
      if (json.success && json.data && json.data.length > 0) {
        const mapped = json.data.map((e: any) => ({
          ...e,
          id: e.profile_id || e.id,
          employee_id: e.employee_id || `MS-${e.id.slice(-4)}`,
          reward_points: e.reward_points || 0,
          role: e.system_role || e.role || 'technician',
          status: e.employment_status || e.status || 'active',
          basic_salary: parseFloat(e.basic_salary) || 2500
        }))
        setEmployees(mapped)
      }
    } catch (err) {
      console.error('Error loading HR data:', err)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingEmployee(null)
    setEmpForm({
      full_name: '',
      full_name_ar: '',
      department: 'Panel Fabrication',
      role: 'technician',
      email: '',
      phone: '',
      basic_salary: 2500,
      bank_account: '',
      status: 'active'
    })
    setShowAddEmpModal(true)
  }

  function openEditModal(emp: any) {
    setEditingEmployee(emp)
    setEmpForm({
      full_name: emp.full_name || '',
      full_name_ar: emp.full_name_ar || '',
      department: emp.department || 'Panel Fabrication',
      role: emp.role || 'technician',
      email: emp.email || '',
      phone: emp.phone || '',
      basic_salary: emp.basic_salary || 2500,
      bank_account: emp.bank_account || '',
      status: emp.status || 'active'
    })
    setShowAddEmpModal(true)
  }

  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingEmployee) {
        // Edit User
        const res = await fetch('/api/hr', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingEmployee.id,
            profile_id: editingEmployee.profile_id || editingEmployee.id,
            full_name: empForm.full_name,
            full_name_ar: empForm.full_name_ar,
            role: empForm.role,
            department: empForm.department,
            basic_salary: empForm.basic_salary,
            phone: empForm.phone,
            status: empForm.status
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowAddEmpModal(false)
          setEditingEmployee(null)
          loadHRData()
        } else {
          alert(data.error || 'Failed to update user')
        }
      } else {
        // Create User
        const res = await fetch('/api/hr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_user',
            full_name: empForm.full_name,
            full_name_ar: empForm.full_name_ar,
            email: empForm.email || `emp${employees.length + 1}@almasar-switchgear.com`,
            role: empForm.role,
            department: empForm.department,
            basic_salary: empForm.basic_salary,
            phone: empForm.phone,
            bank_account: empForm.bank_account
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowAddEmpModal(false)
          loadHRData()
        } else {
          alert(data.error || 'Failed to create user')
        }
      }
    } catch (err) {
      console.error('Save employee error:', err)
    }
  }

  async function handleDeleteEmployee() {
    if (!deletingEmployee) return
    try {
      const res = await fetch(`/api/hr?id=${deletingEmployee.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingEmployee(null)
        loadHRData()
      } else {
        alert(data.error || 'Failed to delete user')
      }
    } catch (err) {
      console.error('Delete employee error:', err)
    }
  }

  function handleRunPayroll() {
    const generated: Payslip[] = employees.map((emp, idx) => {
      const bonus = (emp.reward_points || 0) * pointConversionRate
      const allowances = 200
      const deductions = 0
      const net = (emp.basic_salary || 2500) + bonus + allowances - deductions
      return {
        id: `ps-${Date.now()}-${idx}`,
        reference: `PAY/${payrollMonth.replace(' ', '-')}/${idx + 1 < 10 ? '0' : ''}${idx + 1}`,
        employee_id: emp.id,
        employee_name: isRtl ? (emp.full_name_ar || emp.full_name) : emp.full_name,
        month: payrollMonth,
        basic_salary: emp.basic_salary || 2500,
        points_bonus: bonus,
        allowances,
        deductions,
        net_salary: net,
        status: 'draft',
      }
    })
    setPayslips(generated)
    setShowRunPayrollModal(false)
    setActiveTab('payroll')
  }

  function handleApprovePayslip(id: string) {
    setPayslips(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'approved', payment_date: new Date().toISOString().split('T')[0] } : p))
    )
    if (selectedPayslip && selectedPayslip.id === id) {
      setSelectedPayslip(prev => prev ? { ...prev, status: 'approved' } : null)
    }
  }

  const totalMonthlyPayroll = employees.reduce((s, e) => s + (e.basic_salary || 0), 0) +
    employees.reduce((s, e) => s + ((e.reward_points || 0) * pointConversionRate), 0)

  const totalPointsAwarded = employees.reduce((s, e) => s + (e.reward_points || 0), 0)

  const filteredEmployees = employees.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.full_name_ar && e.full_name_ar.includes(q)) ||
      (e.employee_id || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q)
    )
  })

  const deptTranslations: Record<string, string> = {
    'Panel Fabrication': 'تجميع وهياكل اللوحات',
    'Busbar & Wiring': 'تشكيل البسبار والأسلاك',
    'Quality Assurance': 'ضبط الجودة وفحص FAT',
    'Engineering & Estimation': 'الهندسة والتسعير الفني',
    'Production Management': 'إدارة وتخطيط الإنتاج',
  }

  return (
    <AppLayout
      title="HR, Users & Factory Payroll Management"
      titleAr="إدارة الموارد البشرية، المستخدمين ومسير الرواتب"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowRunPayrollModal(true)}>
            ⚡ {isRtl ? 'تشغيل مسير الرواتب الشهري' : 'Run Monthly Payroll'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            {isRtl ? '+ إضافة مستخدم / موظف جديد' : '+ Add User / Employee'}
          </button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">👥</div>
          <div className="kpi-value">{employees.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي كادر المصنع المسجل' : 'Registered Factory Staff'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'مهندسون ومشرفون وفنيو لوحات كهربائية' : 'Engineers, supervisors & panel technicians'}
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">⭐</div>
          <div className="kpi-value">{totalPointsAwarded} {isRtl ? 'نقطة' : 'pts'}</div>
          <div className="kpi-label">{isRtl ? 'نقاط الجودة المكتسبة للفنيين' : 'Technician Reward Points'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'ممنوحة لسرعة التجميع وانعدام الملاحظات في فحص QC' : 'Awarded for rapid assembly & zero QC defects'}
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💵</div>
          <div className="kpi-value">{formatCurrency(totalMonthlyPayroll)}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي مسير الرواتب والمكافآت' : 'Current Payroll Commitment'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'الرواتب الأساسية + حوافز النقاط المعتمدة' : 'Base salaries + performance bonuses'}
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">🏆</div>
          <div className="kpi-value">$1.50 / {isRtl ? 'نقطة' : 'pt'}</div>
          <div className="kpi-label">{isRtl ? 'سعر صرف نقاط الحافز المالي' : 'Point Incentive Rate'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'التحويل المباشر لنقاط الفنيين إلى مكافأة نقدية بالراتب' : 'Direct conversion rate to bonus pay'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('employees')}
            >
              👷 {isRtl ? `دليل المستخدمين والعاملين (${employees.length})` : `User & Employee Directory (${employees.length})`}
            </button>
            <button
              className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('payroll')}
            >
              📜 {isRtl ? `مسير الرواتب وقسائم الصرف (${payslips.length})` : `Payroll & Payslips (${payslips.length})`}
            </button>
            <button
              className={`btn ${activeTab === 'points' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('points')}
            >
              🌟 {isRtl ? 'لوحة شرف وتنافس الفنيين' : 'Technician Leaderboard'}
            </button>
          </div>

          {activeTab === 'employees' && (
            <input
              type="text"
              placeholder={isRtl ? '...بحث بالاسم، الرقم الوظيفي، أو القسم' : 'Search user by name, badge, role...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: 280 }}
            />
          )}
        </div>

        {/* Tab 1: Employees Table */}
        {activeTab === 'employees' && (
          <div className="table-container" style={{ marginTop: 16 }}>
            {loading && <div style={{ padding: 20, textAlign: 'center' }}>Loading employees...</div>}
            {!loading && (
              <table className="table">
                <thead>
                  <tr>
                    <th>{isRtl ? 'الرقم الوظيفي' : 'BADGE ID'}</th>
                    <th>{isRtl ? 'الاسم' : 'FULL NAME'}</th>
                    <th>{isRtl ? 'القسم' : 'DEPARTMENT'}</th>
                    <th>{isRtl ? 'الدور الوظيفي' : 'ROLE'}</th>
                    <th>{isRtl ? 'الراتب الأساسي' : 'BASIC SALARY'}</th>
                    <th>{isRtl ? 'نقاط المكافأة' : 'POINTS'}</th>
                    <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                    <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{emp.employee_id}</span>
                      </td>
                      <td>
                        <div><strong>{isRtl ? (emp.full_name_ar || emp.full_name) : emp.full_name}</strong></div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {emp.email}
                        </div>
                      </td>
                      <td>{isRtl ? (deptTranslations[emp.department] || emp.department) : emp.department}</td>
                      <td>
                        <span className="badge badge-subtle">
                          {(ROLE_LABELS as any)[emp.role]?.[lang] || emp.role}
                        </span>
                      </td>
                      <td>{formatCurrency(emp.basic_salary)}</td>
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                          ⭐ {emp.reward_points} {isRtl ? 'نقطة' : 'pts'}
                        </span>
                      </td>
                      <td>
                        <span className="badge" style={{ backgroundColor: emp.status === 'active' ? '#22c55e22' : '#f59e0b22', color: emp.status === 'active' ? '#22c55e' : '#f59e0b' }}>
                          {emp.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => openEditModal(emp)}
                            title="Edit User"
                          >
                            ✏️ {isRtl ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={() => setDeletingEmployee(emp)}
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Payroll & Payslips */}
        {activeTab === 'payroll' && (
          <div className="table-container" style={{ marginTop: 16 }}>
            {payslips.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                {isRtl ? 'لم يتم تشغيل مسير الرواتب لهذا الشهر بعد. اضغط على "تشغيل مسير الرواتب الشهري".' : 'No payslips generated for this period yet. Click "Run Monthly Payroll".'}
              </div>
            )}
            {payslips.length > 0 && (
              <table className="table">
                <thead>
                  <tr>
                    <th>{isRtl ? 'رقم الإيصال' : 'Slip Ref'}</th>
                    <th>{isRtl ? 'الموظف / الفني' : 'Employee'}</th>
                    <th>{isRtl ? 'الشهر' : 'Payroll Month'}</th>
                    <th>{isRtl ? 'الراتب الأساسي' : 'Basic Salary'}</th>
                    <th>{isRtl ? 'مكافأة نقاط الجودة' : 'Points Bonus'}</th>
                    <th>{isRtl ? 'البدلات' : 'Allowances'}</th>
                    <th>{isRtl ? 'صافي المستحق' : 'Net Payout'}</th>
                    <th>{isRtl ? 'الحالة' : 'Status'}</th>
                    <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(slip => (
                    <tr key={slip.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPayslip(slip)}>
                      <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{slip.reference}</td>
                      <td>{slip.employee_name}</td>
                      <td>{slip.month}</td>
                      <td>{formatCurrency(slip.basic_salary)}</td>
                      <td style={{ color: '#f59e0b', fontWeight: 600 }}>+{formatCurrency(slip.points_bonus)}</td>
                      <td>+{formatCurrency(slip.allowances)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(slip.net_salary)}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: slip.status === 'approved' ? '#22c55e22' : '#f59e0b22',
                            color: slip.status === 'approved' ? '#22c55e' : '#f59e0b',
                          }}
                        >
                          {slip.status === 'approved' ? (isRtl ? 'معتمد' : 'APPROVED') : (isRtl ? 'مسودة' : 'DRAFT')}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {slip.status === 'draft' && (
                            <button
                              className="btn btn-xs btn-success"
                              onClick={() => handleApprovePayslip(slip.id)}
                            >
                              {isRtl ? 'اعتماد' : 'Approve'}
                            </button>
                          )}
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => setSelectedPayslip(slip)}
                          >
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Points Leaderboard */}
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

      {/* Add / Edit User Modal */}
      {showAddEmpModal && (
        <div className="modal-backdrop" onClick={() => setShowAddEmpModal(false)}>
          <div className="modal-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-header">
                <h3>{editingEmployee ? (isRtl ? 'تعديل بيانات المستخدم / الموظف' : 'Edit User / Employee') : (isRtl ? 'إضافة مستخدم وموظف جديد' : 'New User / Employee')}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEmpModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالإنجليزية' : 'Full Name (English)'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="e.g. Sami Al-Ghamdi"
                      value={empForm.full_name}
                      onChange={e => setEmpForm({ ...empForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالعربية' : 'Full Name (Arabic)'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="مثال: سامي الغامدي"
                      value={empForm.full_name_ar}
                      onChange={e => setEmpForm({ ...empForm, full_name_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم' : 'Department'}</label>
                    <select
                      className="input"
                      value={empForm.department}
                      onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                    >
                      <option value="Panel Fabrication">{isRtl ? 'تجميع وهياكل اللوحات' : 'Panel Fabrication'}</option>
                      <option value="Busbar & Wiring">{isRtl ? 'تشكيل البسبار والأسلاك' : 'Busbar & Wiring'}</option>
                      <option value="Quality Assurance">{isRtl ? 'ضبط الجودة وفحص FAT' : 'Quality Assurance'}</option>
                      <option value="Engineering & Estimation">{isRtl ? 'الهندسة والتسعير الفني' : 'Engineering & Estimation'}</option>
                      <option value="Production Management">{isRtl ? 'إدارة وتخطيط الإنتاج' : 'Production Management'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الدور الوظيفي والصلاحيات' : 'Role & System Permissions'}</label>
                    <select
                      className="input"
                      value={empForm.role}
                      onChange={e => setEmpForm({ ...empForm, role: e.target.value as any })}
                    >
                      <option value="company_owner">{isRtl ? 'مالك الشركة (Admin)' : 'Company Owner'}</option>
                      <option value="production_manager">{isRtl ? 'مدير الإنتاج' : 'Production Manager'}</option>
                      <option value="supervisor">{isRtl ? 'مشرف ورشة' : 'Supervisor'}</option>
                      <option value="design_engineer">{isRtl ? 'مهندس تصميم وتفريد' : 'Design Engineer'}</option>
                      <option value="qc_technician">{isRtl ? 'فني ضبط جودة' : 'QC Inspector'}</option>
                      <option value="technician">{isRtl ? 'فني تجميع' : 'Technician'}</option>
                      <option value="inventory_clerk">{isRtl ? 'أمين مستودع' : 'Inventory Clerk'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="user@almasar-switchgear.com"
                      value={empForm.email}
                      onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="+966 50 000 0000"
                      value={empForm.phone}
                      onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الراتب الأساسي (SAR)' : 'Basic Salary (SAR)'}</label>
                    <input
                      required
                      type="number"
                      className="input"
                      value={empForm.basic_salary}
                      onChange={e => setEmpForm({ ...empForm, basic_salary: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الحالة الوظيفية' : 'Status'}</label>
                    <select
                      className="input"
                      value={empForm.status}
                      onChange={e => setEmpForm({ ...empForm, status: e.target.value })}
                    >
                      <option value="active">{isRtl ? 'نشط وعلى رأس العمل' : 'Active'}</option>
                      <option value="on_leave">{isRtl ? 'إجازة' : 'On Leave'}</option>
                      <option value="terminated">{isRtl ? 'منتهي' : 'Terminated'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEmpModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployee ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إضافة وتفعيل المستخدم' : 'Add User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEmployee && (
        <div className="modal-backdrop" onClick={() => setDeletingEmployee(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد حذف المستخدم' : 'Confirm Delete User'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingEmployee(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف المستخدم "${deletingEmployee.full_name}"؟` : `Are you sure you want to delete user "${deletingEmployee.full_name}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingEmployee(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteEmployee}>
                {isRtl ? 'تأكيد الحذف' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payslip Modal */}
      {selectedPayslip && (
        <div className="modal-backdrop" onClick={() => setSelectedPayslip(null)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18 }}>{isRtl ? 'بيان قسيمة الراتب والمكافأة الرسمية' : 'Official Salary Statement'}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {isRtl ? 'شركة مصنع المسار للوحات الكهربائية' : 'Al-Masar Switchgear Factory Co.'} — {selectedPayslip.reference}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedPayslip(null)}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isRtl ? 'اسم الموظف / الفني:' : 'Employee:'}</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedPayslip.employee_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'فترة الصرف:' : 'Period:'} {selectedPayslip.month}</div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isRtl ? 'الراتب الأساسي:' : 'Basic Salary:'}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selectedPayslip.basic_salary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                  <span>{isRtl ? 'مكافأة نقاط التجميع والجودة:' : 'Technician Performance Bonus (Points):'}</span>
                  <span style={{ fontWeight: 600 }}>+{formatCurrency(selectedPayslip.points_bonus)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isRtl ? 'بدلات السكن والانتقال:' : 'Housing & Transport Allowances:'}</span>
                  <span style={{ fontWeight: 600 }}>+{formatCurrency(selectedPayslip.allowances)}</span>
                </div>
                {selectedPayslip.deductions > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>{isRtl ? 'الاستقطاعات:' : 'Deductions:'}</span>
                    <span style={{ fontWeight: 600 }}>-{formatCurrency(selectedPayslip.deductions)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                  <span>{isRtl ? 'صافي الراتب المستحق للإيداع:' : 'Net Salary Credited:'}</span>
                  <span style={{ color: 'var(--success)' }}>{formatCurrency(selectedPayslip.net_salary)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ {isRtl ? 'طباعة القسيمة' : 'Print Payslip'}
              </button>
              {selectedPayslip.status === 'draft' && (
                <button className="btn btn-success" onClick={() => handleApprovePayslip(selectedPayslip.id)}>
                  ✓ {isRtl ? 'اعتماد وإرسال للبنك' : 'Approve & Dispatch'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Run Payroll Modal */}
      {showRunPayrollModal && (
        <div className="modal-backdrop" onClick={() => setShowRunPayrollModal(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isRtl ? 'تشغيل دفعة مسير الرواتب الشهرية' : 'Generate Monthly Payroll Batch'}</h3>
              <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(false)}>✕</button>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <div>
                <label className="label">{isRtl ? 'شهر الاستحقاق' : 'Payroll Month'}</label>
                <input
                  type="text"
                  className="input"
                  value={payrollMonth}
                  onChange={e => setPayrollMonth(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{isRtl ? 'سعر احتساب نقطة الجودة ($ / نقطة)' : 'Reward Point Payout Rate ($ / point)'}</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={pointConversionRate}
                  onChange={e => setPointConversionRate(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {isRtl
                  ? `سيتم احتساب صافي المستحق تلقائياً لكافة العاملين (${employees.length} موظفاً وفنياً) شاملاً مكافآت النقاط المعتمدة.`
                  : `This will automatically compute net pay for all ${employees.length} active employees including points bonus.`}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(false)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button className="btn btn-primary" onClick={handleRunPayroll}>
                {isRtl ? 'تنفيذ واعتماد المسير' : 'Execute Batch Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
