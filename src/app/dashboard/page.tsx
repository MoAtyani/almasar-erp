'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from 'recharts'
import { PROJECT_STATE_LABELS } from '@/lib/constants'

const COLORS = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

export default function DashboardPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalLeads: 0,
    wonLeads: 0,
    totalTasks: 0,
    doneTasks: 0,
    totalPoints: 0,
    openPOs: 0,
  })
  const [leadsByState, setLeadsByState] = useState<any[]>([])
  const [projectsByState, setProjectsByState] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [efficiencyData, setEfficiencyData] = useState<any[]>([])
  const [estimationData, setEstimationData] = useState<any[]>([])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { data: projects },
      { data: leads },
      { data: tasks },
      { data: pos },
    ] = await Promise.all([
      supabase.from('panel_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('crm_leads').select('*'),
      supabase.from('panel_tasks').select('*'),
      supabase.from('purchase_orders').select('*').in('state', ['draft', 'sent', 'confirmed']),
    ])

    const p = projects || []
    const l = leads || []
    const t = tasks || []

    // KPIs
    setStats({
      totalProjects: p.length,
      activeProjects: p.filter(x => !['draft', 'done'].includes(x.state)).length,
      totalLeads: l.length,
      wonLeads: l.filter(x => x.state === 'won').length,
      totalTasks: t.length,
      doneTasks: t.filter(x => x.state === 'done').length,
      totalPoints: p.reduce((s: number, x: any) => s + (x.total_points || 0), 0),
      openPOs: (pos || []).length,
    })

    // Sales Win Rate pie
    const leadGroups: Record<string, number> = {}
    l.forEach((lead: any) => {
      leadGroups[lead.state] = (leadGroups[lead.state] || 0) + 1
    })
    setLeadsByState(Object.entries(leadGroups).map(([state, count]) => ({
      name: state.charAt(0).toUpperCase() + state.slice(1),
      value: count,
    })))

    // Projects by state
    const stateGroups: Record<string, number> = {}
    p.forEach((proj: any) => {
      stateGroups[proj.state] = (stateGroups[proj.state] || 0) + 1
    })
    setProjectsByState(Object.entries(stateGroups).map(([state, count]) => ({
      name: PROJECT_STATE_LABELS[state as keyof typeof PROJECT_STATE_LABELS]?.en || state,
      count,
    })))

    // Estimation Duration bar (last 10 projects with data)
    const withEstimation = p
      .filter((x: any) => x.estimation_duration_days > 0)
      .slice(0, 10)
      .map((x: any) => ({ name: x.reference, days: parseFloat(x.estimation_duration_days) }))
    setEstimationData(withEstimation)

    // Production Efficiency line
    const recent = p.slice(0, 10).reverse()
    setEfficiencyData(recent.map((x: any) => ({
      name: x.reference,
      efficiency: parseFloat(x.overall_progress) || 0,
    })))

    setRecentProjects(p.slice(0, 5))
    setLoading(false)
  }

  return (
    <AppLayout title="Dashboard" titleAr="لوحة التحكم">
      {loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card accent">
              <div className="kpi-icon accent-bg">📁</div>
              <div className="kpi-value">{stats.totalProjects}</div>
              <div className="kpi-label">Total Projects</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-icon success-bg">🔧</div>
              <div className="kpi-value">{stats.activeProjects}</div>
              <div className="kpi-label">Active Projects</div>
            </div>
            <div className="kpi-card warning">
              <div className="kpi-icon warning-bg">💼</div>
              <div className="kpi-value">{stats.wonLeads} / {stats.totalLeads}</div>
              <div className="kpi-label">Leads Won / Total</div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-icon purple-bg">✅</div>
              <div className="kpi-value">{stats.doneTasks} / {stats.totalTasks}</div>
              <div className="kpi-label">Tasks Completed</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-icon danger-bg">🛒</div>
              <div className="kpi-value">{stats.openPOs}</div>
              <div className="kpi-label">Open Purchase Orders</div>
            </div>
            <div className="kpi-card accent">
              <div className="kpi-icon accent-bg">⭐</div>
              <div className="kpi-value">{stats.totalPoints}</div>
              <div className="kpi-label">Total Reward Points</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {/* Sales Win Rate — Pie */}
            <div className="chart-card">
              <div className="chart-card-title">Sales Win Rate</div>
              <div className="chart-card-subtitle">CRM leads distribution by stage</div>
              {leadsByState.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={leadsByState} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {leadsByState.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-desc">No leads data yet</div>
              </div>}
            </div>

            {/* Estimation Duration — Bar */}
            <div className="chart-card">
              <div className="chart-card-title">Estimation Duration</div>
              <div className="chart-card-subtitle">Days per project estimation phase</div>
              {estimationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={estimationData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                    <Bar dataKey="days" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-desc">No estimation data yet</div>
              </div>}
            </div>

            {/* Production Efficiency — Line */}
            <div className="chart-card">
              <div className="chart-card-title">Production Efficiency</div>
              <div className="chart-card-subtitle">Task completion % per project</div>
              {efficiencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={efficiencyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} formatter={(v) => [`${v}%`, 'Efficiency']} />
                    <Line type="monotone" dataKey="efficiency" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-desc">No production data yet</div>
              </div>}
            </div>
          </div>

          {/* Projects by Stage + Recent Projects */}
          <div className="grid-2">
            {/* Projects by Stage */}
            <div className="chart-card">
              <div className="chart-card-title">Projects by Stage</div>
              <div className="chart-card-subtitle">Distribution across workflow stages</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projectsByState} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={100} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Projects */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Recent Projects</div>
                  <div className="card-subtitle">Latest panel projects</div>
                </div>
              </div>
              {recentProjects.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state-desc">No projects yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentProjects.map((proj: any) => {
                    const stateInfo = PROJECT_STATE_LABELS[proj.state as keyof typeof PROJECT_STATE_LABELS]
                    return (
                      <div key={proj.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{proj.reference}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{proj.customer_name}</div>
                        </div>
                        <span className="state-pill" style={{ background: stateInfo?.color + '20', color: stateInfo?.color, border: `1px solid ${stateInfo?.color}40` }}>
                          {stateInfo?.en}
                        </span>
                        <div style={{ width: 60, textAlign: 'right' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{proj.overall_progress?.toFixed(0)}%</div>
                          <div className="progress-bar-wrapper">
                            <div className="progress-bar" style={{ width: `${proj.overall_progress || 0}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}
