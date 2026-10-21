'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { PROJECT_STATE_LABELS, LEAD_STATE_LABELS } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

const COLORS = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

const FALLBACK_PROJECTS = [
  { id: 'p1', reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co. (SEC)', state: 'production', estimation_duration_days: 4.5, overall_progress: 72, total_points: 340, created_at: '2026-10-10' },
  { id: 'p2', reference: 'PJ-2026-002', customer_name: 'Al-Bawani Contracting', state: 'qc', estimation_duration_days: 3.2, overall_progress: 88, total_points: 280, created_at: '2026-10-12' },
  { id: 'p3', reference: 'PJ-2026-003', customer_name: 'Binladin Group Hospital', state: 'design', estimation_duration_days: 5.0, overall_progress: 35, total_points: 150, created_at: '2026-10-14' },
  { id: 'p4', reference: 'PJ-2026-004', customer_name: 'Nesma Infrastructure', state: 'procurement', estimation_duration_days: 2.8, overall_progress: 45, total_points: 210, created_at: '2026-10-15' },
  { id: 'p5', reference: 'PJ-2026-005', customer_name: 'Diriyah Gate Development', state: 'done', estimation_duration_days: 4.0, overall_progress: 100, total_points: 420, created_at: '2026-10-01' },
]

const FALLBACK_LEADS = [
  { id: 'l1', state: 'won' },
  { id: 'l2', state: 'won' },
  { id: 'l3', state: 'won' },
  { id: 'l4', state: 'won' },
  { id: 'l5', state: 'proposition' },
  { id: 'l6', state: 'proposition' },
  { id: 'l7', state: 'qualified' },
  { id: 'l8', state: 'new' },
]

export default function DashboardPage() {
  const supabase = createClient()
  const { lang, t, isRtl } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProjects: 5,
    activeProjects: 4,
    totalLeads: 8,
    wonLeads: 4,
    totalTasks: 24,
    doneTasks: 18,
    totalPoints: 1400,
    openPOs: 6,
  })
  const [leadsByState, setLeadsByState] = useState<any[]>([])
  const [projectsByState, setProjectsByState] = useState<any[]>([])
  const [recentProjects, setRecentProjects] = useState<any[]>(FALLBACK_PROJECTS)
  const [efficiencyData, setEfficiencyData] = useState<any[]>([])
  const [estimationData, setEstimationData] = useState<any[]>([])

  useEffect(() => {
    loadAll()
  }, [lang])

  async function loadAll() {
    setLoading(true)
    let p = FALLBACK_PROJECTS
    let l = FALLBACK_LEADS
    let tasksCount = 24
    let doneTasksCount = 18
    let posCount = 6

    try {
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

      if (projects && projects.length > 0) p = projects as any
      if (leads && leads.length > 0) l = leads as any
      if (tasks && tasks.length > 0) {
        tasksCount = tasks.length
        doneTasksCount = tasks.filter((x: any) => x.state === 'done').length
      }
      if (pos) posCount = pos.length
    } catch {
      // Use fallback
    }

    // KPIs
    setStats({
      totalProjects: p.length,
      activeProjects: p.filter(x => !['draft', 'done'].includes(x.state)).length,
      totalLeads: l.length,
      wonLeads: l.filter(x => x.state === 'won').length,
      totalTasks: tasksCount,
      doneTasks: doneTasksCount,
      totalPoints: p.reduce((s: number, x: any) => s + (x.total_points || 0), 0),
      openPOs: posCount,
    })

    // Sales Win Rate pie
    const leadGroups: Record<string, number> = {}
    l.forEach((lead: any) => {
      leadGroups[lead.state] = (leadGroups[lead.state] || 0) + 1
    })
    setLeadsByState(Object.entries(leadGroups).map(([state, count]) => ({
      name: LEAD_STATE_LABELS[state as keyof typeof LEAD_STATE_LABELS]?.[lang] || state,
      value: count,
    })))

    // Projects by state
    const stateGroups: Record<string, number> = {}
    p.forEach((proj: any) => {
      stateGroups[proj.state] = (stateGroups[proj.state] || 0) + 1
    })
    setProjectsByState(Object.entries(stateGroups).map(([state, count]) => ({
      name: PROJECT_STATE_LABELS[state as keyof typeof PROJECT_STATE_LABELS]?.[lang] || state,
      count,
    })))

    // Estimation Duration bar
    const withEstimation = p
      .filter((x: any) => x.estimation_duration_days > 0)
      .slice(0, 10)
      .map((x: any) => ({ name: x.reference, days: parseFloat(x.estimation_duration_days) }))
    setEstimationData(withEstimation)

    // Production Efficiency line
    const recent = [...p].reverse()
    setEfficiencyData(recent.map((x: any) => ({
      name: x.reference,
      efficiency: parseFloat(x.overall_progress) || 0,
    })))

    setRecentProjects(p.slice(0, 5))
    setLoading(false)
  }

  return (
    <AppLayout title="Executive Factory Dashboard" titleAr="لوحة التحكم التنفيذية للمصنع">
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
              <div className="kpi-label">{t('dashboard.total_projects')}</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-icon success-bg">🔧</div>
              <div className="kpi-value">{stats.activeProjects}</div>
              <div className="kpi-label">{t('dashboard.active_projects')}</div>
            </div>
            <div className="kpi-card warning">
              <div className="kpi-icon warning-bg">💼</div>
              <div className="kpi-value">{stats.wonLeads} / {stats.totalLeads}</div>
              <div className="kpi-label">{t('dashboard.leads_won')}</div>
            </div>
            <div className="kpi-card purple">
              <div className="kpi-icon purple-bg">✅</div>
              <div className="kpi-value">{stats.doneTasks} / {stats.totalTasks}</div>
              <div className="kpi-label">{t('dashboard.tasks_completed')}</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-icon danger-bg">🛒</div>
              <div className="kpi-value">{stats.openPOs}</div>
              <div className="kpi-label">{t('dashboard.open_pos')}</div>
            </div>
            <div className="kpi-card accent">
              <div className="kpi-icon accent-bg">⭐</div>
              <div className="kpi-value">{stats.totalPoints}</div>
              <div className="kpi-label">{isRtl ? 'نقاط مكافآت الفنيين' : 'Technician Reward Points'}</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid-3" style={{ marginBottom: 24 }}>
            {/* Sales Win Rate — Pie */}
            <div className="chart-card">
              <div className="chart-card-title">{t('dashboard.sales_win_rate')}</div>
              <div className="chart-card-subtitle">{t('dashboard.sales_win_rate_sub')}</div>
              {leadsByState.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={leadsByState} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                      {leadsByState.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-desc">{isRtl ? 'لا توجد بيانات صفقات' : 'No leads data yet'}</div>
                </div>
              )}
            </div>

            {/* Estimation Duration — Bar */}
            <div className="chart-card">
              <div className="chart-card-title">{t('dashboard.estimation_duration')}</div>
              <div className="chart-card-subtitle">{t('dashboard.estimation_duration_sub')}</div>
              {estimationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={estimationData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                    <Bar dataKey="days" fill="#0ea5e9" radius={[4, 4, 0, 0]} name={isRtl ? 'أيام التخمين' : 'Days'} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-desc">{isRtl ? 'لا توجد بيانات تخمين' : 'No estimation data yet'}</div>
                </div>
              )}
            </div>

            {/* Production Efficiency — Line */}
            <div className="chart-card">
              <div className="chart-card-title">{t('dashboard.production_efficiency')}</div>
              <div className="chart-card-subtitle">{t('dashboard.production_efficiency_sub')}</div>
              {efficiencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={efficiencyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} formatter={(v) => [`${v}%`, isRtl ? 'الكفاءة' : 'Efficiency']} />
                    <Line type="monotone" dataKey="efficiency" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} activeDot={{ r: 6 }} name={isRtl ? 'نسبة الإنجاز' : 'Completion'} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-desc">{isRtl ? 'لا توجد بيانات إنتاج' : 'No production data yet'}</div>
                </div>
              )}
            </div>
          </div>

          {/* Projects by Stage + Recent Projects */}
          <div className="grid-2">
            {/* Projects by Stage */}
            <div className="chart-card">
              <div className="chart-card-title">{t('dashboard.projects_by_status')}</div>
              <div className="chart-card-subtitle">{t('dashboard.projects_by_status_sub')}</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projectsByState} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name={isRtl ? 'المشاريع' : 'Projects'} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Projects */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{t('dashboard.recent_projects')}</div>
                  <div className="card-subtitle">{isRtl ? 'أحدث أوامر العمل والتصنيع' : 'Latest panel projects in pipeline'}</div>
                </div>
              </div>
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
                        {stateInfo?.[lang] || stateInfo?.en || proj.state}
                      </span>
                      <div style={{ width: 70, textAlign: isRtl ? 'left' : 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{proj.overall_progress?.toFixed(0)}%</div>
                        <div className="progress-bar-wrapper">
                          <div className="progress-bar" style={{ width: `${proj.overall_progress || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  )
}
