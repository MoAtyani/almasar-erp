'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { Employee, Payslip } from '@/lib/types'
import { ROLE_LABELS, formatCurrency, formatDate } from '@/lib/constants'

const SEED_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    employee_id: 'MS-101',
    full_name: 'Eng. Ahmed Al-Mansoor',
    full_name_ar: 'م. أحمد المنصور',
    department: 'Engineering & Estimation',
    role: 'design_engineer',
    email: 'ahmed.m@almasar-switchgear.com',
    phone: '+966 50 123 4567',
    hire_date: '2022-03-15',
    basic_salary: 4500,
    reward_points: 380,
    bank_account: 'SA44 1000 0001 2345 6789 0001',
    status: 'active',
  },
  {
    id: 'emp-2',
    employee_id: 'MS-102',
    full_name: 'Tariq Al-Harbi',
    full_name_ar: 'طارق الحربي',
    department: 'Production & Assembly',
    role: 'production_supervisor',
    email: 'tariq.h@almasar-switchgear.com',
    phone: '+966 54 987 6543',
    hire_date: '2021-06-01',
    basic_salary: 3800,
    reward_points: 520,
    bank_account: 'SA44 1000 0001 2345 6789 0002',
    status: 'active',
  },
  {
    id: 'emp-3',
    employee_id: 'MS-103',
    full_name: 'Mohammed Salem',
    full_name_ar: 'محمد سالم',
    department: 'Panel Fabrication',
    role: 'technician',
    email: 'mohammed.s@almasar-switchgear.com',
    phone: '+966 55 456 7890',
    hire_date: '2023-01-10',
    basic_salary: 2200,
    reward_points: 640,
    bank_account: 'SA44 1000 0001 2345 6789 0003',
    status: 'active',
  },
  {
    id: 'emp-4',
    employee_id: 'MS-104',
    full_name: 'Hassan Al-Otaibi',
    full_name_ar: 'حسن العتيبي',
    department: 'Quality Assurance',
    role: 'qc_technician',
    email: 'hassan.o@almasar-switchgear.com',
    phone: '+966 56 321 0987',
    hire_date: '2022-11-20',
    basic_salary: 2800,
    reward_points: 410,
    bank_account: 'SA44 1000 0001 2345 6789 0004',
    status: 'active',
  },
  {
    id: 'emp-5',
    employee_id: 'MS-105',
    full_name: 'Bilal Khan',
    full_name_ar: 'بلال خان',
    department: 'Busbar & Wiring',
    role: 'technician',
    email: 'bilal.k@almasar-switchgear.com',
    phone: '+966 53 777 8899',
    hire_date: '2023-05-18',
    basic_salary: 2100,
    reward_points: 590,
    bank_account: 'SA44 1000 0001 2345 6789 0005',
    status: 'active',
  },
]

const SEED_PAYSLIPS: Payslip[] = [
  {
    id: 'ps-1',
    reference: 'PAY/2026-10/01',
    employee_id: 'emp-3',
    employee_name: 'Mohammed Salem (محمد سالم)',
    month: 'October 2026',
    basic_salary: 2200,
    points_bonus: 640 * 1.5, // $960 bonus from 640 earned factory points
    allowances: 300,
    deductions: 50,
    net_salary: 2200 + 960 + 300 - 50,
    status: 'approved',
    payment_date: '2026-10-30',
  },
  {
    id: 'ps-2',
    reference: 'PAY/2026-10/02',
    employee_id: 'emp-5',
    employee_name: 'Bilal Khan (بلال خان)',
    month: 'October 2026',
    basic_salary: 2100,
    points_bonus: 590 * 1.5,
    allowances: 250,
    deductions: 0,
    net_salary: 2100 + 885 + 250,
    status: 'draft',
  },
]

export default function HrPayrollPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>(SEED_EMPLOYEES)
  const [payslips, setPayslips] = useState<Payslip[]>(SEED_PAYSLIPS)
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'points'>('employees')
  const [search, setSearch] = useState('')
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const [showAddEmpModal, setShowAddEmpModal] = useState(false)
  const [showRunPayrollModal, setShowRunPayrollModal] = useState(false)

  // New Employee Form
  const [empForm, setEmpForm] = useState({
    full_name: '',
    full_name_ar: '',
    employee_id: '',
    department: 'Panel Fabrication',
    role: 'technician' as const,
    email: '',
    phone: '',
    basic_salary: 2200,
    bank_account: '',
  })

  // Payroll Run Form
  const [payrollMonth, setPayrollMonth] = useState('October 2026')
  const [pointConversionRate, setPointConversionRate] = useState(1.5) // $1.5 per point

  const totalMonthlyPayroll = payslips.reduce((s, p) => s + p.net_salary, 0)
  const totalPointsAwarded = employees.reduce((s, e) => s + e.reward_points, 0)

  const filteredEmployees = employees.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.full_name.toLowerCase().includes(q) ||
      e.full_name_ar.includes(q) ||
      e.employee_id.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    )
  })

  function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault()
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      employee_id: empForm.employee_id || `MS-${100 + employees.length + 1}`,
      full_name: empForm.full_name,
      full_name_ar: empForm.full_name_ar,
      department: empForm.department,
      role: empForm.role,
      email: empForm.email,
      phone: empForm.phone,
      hire_date: new Date().toISOString().split('T')[0],
      basic_salary: Number(empForm.basic_salary),
      reward_points: 0,
      bank_account: empForm.bank_account,
      status: 'active',
    }
    setEmployees([...employees, newEmp])
    setShowAddEmpModal(false)
    setEmpForm({
      full_name: '',
      full_name_ar: '',
      employee_id: '',
      department: 'Panel Fabrication',
      role: 'technician',
      email: '',
      phone: '',
      basic_salary: 2200,
      bank_account: '',
    })
  }

  function handleRunPayroll() {
    const generated: Payslip[] = employees.map((emp, idx) => {
      const bonus = (emp.reward_points || 0) * pointConversionRate
      const allowances = 200
      const deductions = 0
      const net = emp.basic_salary + bonus + allowances - deductions
      return {
        id: `ps-${Date.now()}-${idx}`,
        reference: `PAY/${payrollMonth.replace(' ', '-')}/${idx + 1 < 10 ? '0' : ''}${idx + 1}`,
        employee_id: emp.id,
        employee_name: `${emp.full_name} (${emp.full_name_ar})`,
        month: payrollMonth,
        basic_salary: emp.basic_salary,
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

  return (
    <AppLayout
      title="HR & Payroll Management"
      titleAr="الموارد البشرية ونظام الرواتب والمكافآت"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(true)}>
            ⚡ Run Monthly Payroll
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddEmpModal(true)}>
            + Add Employee
          </button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">👥</div>
          <div className="kpi-value">{employees.length}</div>
          <div className="kpi-label">Active Factory Personnel</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Engineers, supervisors & panel technicians
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">⭐</div>
          <div className="kpi-value">{totalPointsAwarded} pts</div>
          <div className="kpi-label">Technician Reward Points</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Awarded for rapid assembly & zero QC defects
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💵</div>
          <div className="kpi-value">{formatCurrency(totalMonthlyPayroll)}</div>
          <div className="kpi-label">Current Payroll Commitment</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Base salaries + technician performance bonuses
          </div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">🏆</div>
          <div className="kpi-value">$1.50 / pt</div>
          <div className="kpi-label">Point Incentive Rate</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Direct conversion rate to monthly bonus pay
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
              👷 Employee Directory ({employees.length})
            </button>
            <button
              className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('payroll')}
            >
              📜 Payroll & Payslips ({payslips.length})
            </button>
            <button
              className={`btn ${activeTab === 'points' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('points')}
            >
              🌟 Technician Points Leaderboard
            </button>
          </div>

          {activeTab === 'employees' && (
            <input
              type="text"
              placeholder="Search employee by name, ID or role..."
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
            <table className="table">
              <thead>
                <tr>
                  <th>Badge ID</th>
                  <th>Full Name (English / Arabic)</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Basic Salary</th>
                  <th>Earned Points</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{emp.employee_id}</span>
                    </td>
                    <td>
                      <div><strong>{emp.full_name}</strong></div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.full_name_ar}</div>
                    </td>
                    <td>{emp.department}</td>
                    <td>
                      <span className="badge badge-subtle">
                        {ROLE_LABELS[emp.role]?.en || emp.role}
                      </span>
                    </td>
                    <td>{formatCurrency(emp.basic_salary)}</td>
                    <td>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                        ⭐ {emp.reward_points} pts
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Payroll & Payslips */}
        {activeTab === 'payroll' && (
          <div className="table-container" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Slip Ref</th>
                  <th>Employee</th>
                  <th>Payroll Month</th>
                  <th>Basic Salary</th>
                  <th>Points Bonus</th>
                  <th>Allowances</th>
                  <th>Net Payout</th>
                  <th>Status</th>
                  <th>Actions</th>
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
                        {slip.status.toUpperCase()}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {slip.status === 'draft' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleApprovePayslip(slip.id)}
                          >
                            Approve
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedPayslip(slip)}
                        >
                          View Slip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Points Leaderboard */}
        {activeTab === 'points' && (
          <div style={{ marginTop: 16 }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
              ⚡ <strong>Technician Reward System:</strong> Points are earned upon completing electrical assembly stages (Sheet Metal, Layout, Power Busbars, Control Wiring) with zero defects during initial QC inspection. Points translate into monthly cash bonuses.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {employees
                .filter(e => e.role === 'technician' || e.role === 'qc_technician')
                .sort((a, b) => b.reward_points - a.reward_points)
                .map((tech, rank) => (
                  <div key={tech.id} className="card" style={{ padding: 18, border: rank === 0 ? '1px solid #f59e0b' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: rank === 0 ? '#f59e0b' : rank === 1 ? '#94a3b8' : '#78350f',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, color: '#fff'
                        }}>
                          #{rank + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{tech.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tech.full_name_ar}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>
                          ⭐ {tech.reward_points}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          ≈ {formatCurrency(tech.reward_points * 1.5)} bonus
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* View Payslip Modal */}
      {selectedPayslip && (
        <div className="modal-backdrop" onClick={() => setSelectedPayslip(null)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18 }}>Official Salary Statement</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Al-Masar Switchgear Factory Co. — {selectedPayslip.reference}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedPayslip(null)}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Employee:</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedPayslip.employee_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Period: {selectedPayslip.month}</div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Basic Salary:</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(selectedPayslip.basic_salary)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                  <span>Technician Performance Bonus (Points):</span>
                  <span style={{ fontWeight: 600 }}>+{formatCurrency(selectedPayslip.points_bonus)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Housing & Transport Allowances:</span>
                  <span style={{ fontWeight: 600 }}>+{formatCurrency(selectedPayslip.allowances)}</span>
                </div>
                {selectedPayslip.deductions > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                    <span>Deductions:</span>
                    <span style={{ fontWeight: 600 }}>-{formatCurrency(selectedPayslip.deductions)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--border)', paddingTop: 12, fontSize: 18, fontWeight: 800 }}>
                  <span>Net Salary Credited:</span>
                  <span style={{ color: 'var(--success)' }}>{formatCurrency(selectedPayslip.net_salary)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ Print Payslip
              </button>
              {selectedPayslip.status === 'draft' && (
                <button className="btn btn-success" onClick={() => handleApprovePayslip(selectedPayslip.id)}>
                  ✓ Approve & Dispatch
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddEmpModal && (
        <div className="modal-backdrop" onClick={() => setShowAddEmpModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleAddEmployee}>
              <div className="modal-header">
                <h3>Add New Factory Personnel</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEmpModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Full Name (English)</label>
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
                    <label className="label">Full Name (Arabic)</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="e.g. سامي الغامدي"
                      value={empForm.full_name_ar}
                      onChange={e => setEmpForm({ ...empForm, full_name_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Department</label>
                    <select
                      className="input"
                      value={empForm.department}
                      onChange={e => setEmpForm({ ...empForm, department: e.target.value })}
                    >
                      <option value="Panel Fabrication">Panel Fabrication (تجميع اللوحات)</option>
                      <option value="Busbar & Wiring">Busbar & Wiring (البسبار والأسلاك)</option>
                      <option value="Quality Assurance">Quality Assurance (ضبط الجودة)</option>
                      <option value="Engineering & Estimation">Engineering & Estimation (الهندسة)</option>
                      <option value="Production Management">Production Management (إدارة الإنتاج)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select
                      className="input"
                      value={empForm.role}
                      onChange={e => setEmpForm({ ...empForm, role: e.target.value as any })}
                    >
                      <option value="technician">Technician (فني)</option>
                      <option value="qc_technician">QC Technician (فني جودة)</option>
                      <option value="design_engineer">Design Engineer (مهندس تصميم)</option>
                      <option value="production_supervisor">Production Supervisor (مشرف إنتاج)</option>
                      <option value="sales">Sales (مبيعات)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Basic Salary ($)</label>
                    <input
                      required
                      type="number"
                      className="input"
                      value={empForm.basic_salary}
                      onChange={e => setEmpForm({ ...empForm, basic_salary: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="+966 50 000 0000"
                      value={empForm.phone}
                      onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="emp@almasar-switchgear.com"
                    value={empForm.email}
                    onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEmpModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Payroll Modal */}
      {showRunPayrollModal && (
        <div className="modal-backdrop" onClick={() => setShowRunPayrollModal(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Monthly Payroll Batch</h3>
              <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(false)}>✕</button>
            </div>

            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <div>
                <label className="label">Payroll Month</label>
                <input
                  type="text"
                  className="input"
                  value={payrollMonth}
                  onChange={e => setPayrollMonth(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Reward Point Payout Rate ($ / point)</label>
                <input
                  type="number"
                  step="0.1"
                  className="input"
                  value={pointConversionRate}
                  onChange={e => setPointConversionRate(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                This will automatically compute net pay for all {employees.length} active employees including points bonus.
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRunPayrollModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleRunPayroll}>Execute Batch Run</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
