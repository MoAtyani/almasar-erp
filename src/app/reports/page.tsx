'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/constants'

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']

const PROJECT_PROFITABILITY_DATA = [
  { project: 'PJ-2026-001 (SEC Substation)', revenue: 212750, cost: 135000, margin: 77750, marginPct: '36.5%' },
  { project: 'PJ-2026-002 (Al-Bawani MCC)', revenue: 108100, cost: 68000, margin: 40100, marginPct: '37.1%' },
  { project: 'PJ-2026-003 (Binladin Hospital)', revenue: 165000, cost: 110000, margin: 55000, marginPct: '33.3%' },
  { project: 'PJ-2026-004 (Nesma Infrastructure)', revenue: 92000, cost: 58000, margin: 34000, marginPct: '37.0%' },
  { project: 'PJ-2026-005 (Diriyah Gate SMDB)', revenue: 140000, cost: 89000, margin: 51000, marginPct: '36.4%' },
]

const STAGE_EFFICIENCY_DATA = [
  { stage: 'Sheet Metal', plannedDays: 5, actualDays: 4.2, passRate: 98 },
  { stage: 'Component Layout', plannedDays: 4, actualDays: 3.8, passRate: 96 },
  { stage: 'Busbar Fabrication', plannedDays: 7, actualDays: 6.5, passRate: 94 },
  { stage: 'Control Wiring', plannedDays: 6, actualDays: 5.9, passRate: 92 },
  { stage: 'Final FAT Testing', plannedDays: 3, actualDays: 2.7, passRate: 99 },
]

const TECHNICIAN_AUDIT_DATA = [
  { name: 'Mohammed Salem (محمد سالم)', tasksDone: 18, points: 640, bonus: 960, qcPassRate: '98.5%' },
  { name: 'Bilal Khan (بلال خان)', tasksDone: 16, points: 590, bonus: 885, qcPassRate: '97.2%' },
  { name: 'Tariq Al-Harbi (طارق الحربي)', tasksDone: 14, points: 520, bonus: 780, qcPassRate: '99.0%' },
  { name: 'Hassan Al-Otaibi (حسن العتيبي)', tasksDone: 12, points: 410, bonus: 615, qcPassRate: '100%' },
  { name: 'Eng. Ahmed Al-Mansoor (أحمد المنصور)', tasksDone: 10, points: 380, bonus: 570, qcPassRate: '100%' },
]

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'profitability' | 'stages' | 'technicians' | 'qc'>('profitability')
  const [dateRange, setDateRange] = useState('2026-Q3-Q4')

  function exportToCSV() {
    let rows: string[][] = []
    let filename = `AlMasar_Report_${reportType}.csv`

    if (reportType === 'profitability') {
      rows = [
        ['Project Reference', 'Revenue ($)', 'Fabrication Cost ($)', 'Gross Margin ($)', 'Margin (%)'],
        ...PROJECT_PROFITABILITY_DATA.map(d => [d.project, d.revenue.toString(), d.cost.toString(), d.margin.toString(), d.marginPct])
      ]
    } else if (reportType === 'technicians') {
      rows = [
        ['Technician Name', 'Completed Tasks', 'Reward Points', 'Bonus Paid ($)', 'QC Pass Rate'],
        ...TECHNICIAN_AUDIT_DATA.map(d => [d.name, d.tasksDone.toString(), d.points.toString(), d.bonus.toString(), d.qcPassRate])
      ]
    } else {
      rows = [
        ['Stage', 'Planned Days', 'Actual Days', 'QC First-Pass Yield (%)'],
        ...STAGE_EFFICIENCY_DATA.map(d => [d.stage, d.plannedDays.toString(), d.actualDays.toString(), d.passRate.toString()])
      ]
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalRevenue = PROJECT_PROFITABILITY_DATA.reduce((s, p) => s + p.revenue, 0)
  const totalCost = PROJECT_PROFITABILITY_DATA.reduce((s, p) => s + p.cost, 0)
  const totalGrossMargin = totalRevenue - totalCost
  const avgMarginPct = ((totalGrossMargin / totalRevenue) * 100).toFixed(1)

  return (
    <AppLayout
      title="Reporting & Business Intelligence"
      titleAr="محرك التقارير وتحليلات الأعمال"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ Print Report
          </button>
          <button className="btn btn-primary" onClick={exportToCSV}>
            📥 Export CSV Data
          </button>
        </div>
      }
    >
      {/* High-level Summary Metrics */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">💰</div>
          <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
          <div className="kpi-label">Total Invoiced Factory Orders</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Across all completed panel projects</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚙️</div>
          <div className="kpi-value">{formatCurrency(totalCost)}</div>
          <div className="kpi-label">Direct Material & Labor Costs</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Copper busbar, switchgear, sheet metal & labor</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">📈</div>
          <div className="kpi-value">{formatCurrency(totalGrossMargin)}</div>
          <div className="kpi-label">Gross Margin ({avgMarginPct}%)</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Overall factory manufacturing profit</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">🎯</div>
          <div className="kpi-value">96.8%</div>
          <div className="kpi-label">Average First-Pass Yield (QC)</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Passed initial testing with zero re-work</div>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`btn ${reportType === 'profitability' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('profitability')}
            >
              📊 Project Cost & Profitability
            </button>
            <button
              className={`btn ${reportType === 'stages' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('stages')}
            >
              ⏱️ Stage Velocity & First-Pass Yield
            </button>
            <button
              className={`btn ${reportType === 'technicians' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setReportType('technicians')}
            >
              ⭐ Technician Performance & Rewards
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Period:</label>
            <select
              className="input"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              style={{ width: 170 }}
            >
              <option value="2026-Q3-Q4">FY 2026 Q3 - Q4</option>
              <option value="2026-Q1-Q2">FY 2026 Q1 - Q2</option>
              <option value="2025-ALL">Full Year 2025</option>
            </select>
          </div>
        </div>

        {/* Report 1: Project Cost & Profitability */}
        {reportType === 'profitability' && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 15, marginBottom: 12 }}>Panel Project Financial Performance & Margin Analysis</h4>

            <div style={{ height: 300, width: '100%', marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PROJECT_PROFITABILITY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="project" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Contract Revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Fabrication Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="margin" name="Gross Margin" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Project Reference</th>
                    <th>Customer Revenue</th>
                    <th>Bill of Materials & Labor</th>
                    <th>Gross Profit Margin</th>
                    <th>Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {PROJECT_PROFITABILITY_DATA.map((row, idx) => (
                    <tr key={idx}>
                      <td><strong>{row.project}</strong></td>
                      <td>{formatCurrency(row.revenue)}</td>
                      <td style={{ color: 'var(--danger)' }}>{formatCurrency(row.cost)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(row.margin)}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                          {row.marginPct}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report 2: Stage Velocity & QC Yield */}
        {reportType === 'stages' && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 15, marginBottom: 12 }}>Assembly Stage Duration & Quality Inspection Yield</h4>

            <div style={{ height: 300, width: '100%', marginBottom: 24 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={STAGE_EFFICIENCY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="stage" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <Legend />
                  <Bar dataKey="plannedDays" name="Planned Duration (Days)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actualDays" name="Actual Duration (Days)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Assembly Stage</th>
                    <th>Planned Duration</th>
                    <th>Actual Avg. Duration</th>
                    <th>Variance</th>
                    <th>QC First-Pass Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {STAGE_EFFICIENCY_DATA.map((stg, idx) => {
                    const variance = (stg.actualDays - stg.plannedDays).toFixed(1)
                    return (
                      <tr key={idx}>
                        <td><strong>{stg.stage}</strong></td>
                        <td>{stg.plannedDays} days</td>
                        <td>{stg.actualDays} days</td>
                        <td style={{ color: Number(variance) <= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {Number(variance) <= 0 ? `${variance} days (Faster)` : `+${variance} days (Delay)`}
                        </td>
                        <td>
                          <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                            {stg.passRate}% Passed
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report 3: Technician Performance & Rewards */}
        {reportType === 'technicians' && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontSize: 15, marginBottom: 12 }}>Technician Point Accumulation & Incentive Payroll Audit</h4>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Technician Name</th>
                    <th>Completed Work Orders</th>
                    <th>Reward Points Earned</th>
                    <th>Conversion Rate</th>
                    <th>Total Cash Incentive Paid</th>
                    <th>Quality Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {TECHNICIAN_AUDIT_DATA.map((tech, idx) => (
                    <tr key={idx}>
                      <td><strong>{tech.name}</strong></td>
                      <td>{tech.tasksDone} orders</td>
                      <td style={{ color: '#f59e0b', fontWeight: 700 }}>⭐ {tech.points} pts</td>
                      <td>$1.50 / pt</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(tech.bonus)}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                          {tech.qcPassRate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
