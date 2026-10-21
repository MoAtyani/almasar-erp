'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { PanelProject, ProjectState } from '@/lib/types'
import { PROJECT_STATE_LABELS, formatDate, projectStateFlow } from '@/lib/constants'

export default function ProjectsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<PanelProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState<ProjectState | 'all'>('all')
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    location: '', date_delivery: '', description: '', job_order_number: '',
    monday_link: '', boq_link: '',
  })

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    const { data } = await supabase.from('panel_projects').select('*').order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function createProject() {
    const { error } = await supabase.from('panel_projects').insert({ ...form })
    if (!error) { setShowModal(false); loadProjects() }
  }

  async function advanceState(proj: PanelProject) {
    const next = projectStateFlow(proj.state)
    if (!next) return
    const updates: any = { state: next }
    const now = new Date().toISOString()
    if (next === 'design') updates.date_estimation_end = now
    if (next === 'procurement') updates.date_design_end = now
    if (next === 'warehouse') updates.date_procurement_end = now
    if (next === 'production') updates.date_warehouse_end = now
    if (next === 'qc') updates.date_production_end = now
    if (next === 'accounting') updates.date_qc_end = now
    if (next === 'logistics') updates.date_accounting_end = now
    if (next === 'done') updates.date_logistics_end = now
    await supabase.from('panel_projects').update(updates).eq('id', proj.id)
    loadProjects()
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.job_order_number || '').toLowerCase().includes(search.toLowerCase())
    const matchState = filterState === 'all' || p.state === filterState
    return matchSearch && matchState
  })

  const STATES = Object.keys(PROJECT_STATE_LABELS) as ProjectState[]

  return (
    <AppLayout
      title="Panel Projects"
      titleAr="مشاريع اللوحات الكهربائية"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Project</button>}
    >
      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
          <input className="search-input" placeholder="Search by reference, customer, job order..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 200, marginBottom: 0 }} value={filterState} onChange={e => setFilterState(e.target.value as any)}>
          <option value="all">All Stages</option>
          {STATES.map(s => <option key={s} value={s}>{PROJECT_STATE_LABELS[s].en}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ fontSize: 32 }}>🗂</div>
          <div className="empty-state-title">No Projects Yet</div>
          <div className="empty-state-desc">Create your first electrical panel project to get started.</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(proj => {
            const stateInfo = PROJECT_STATE_LABELS[proj.state]
            const nextState = projectStateFlow(proj.state)
            return (
              <div key={proj.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{proj.reference}</span>
                      {proj.job_order_number && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 100 }}>{proj.job_order_number}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>🏢 {proj.customer_name}</div>
                    {proj.location && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {proj.location}</div>}
                  </div>

                  {/* State */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className="state-pill" style={{ background: stateInfo.color + '20', color: stateInfo.color, border: `1px solid ${stateInfo.color}40` }}>
                      <span className="badge-dot" />
                      {stateInfo.en}
                    </span>
                    {proj.date_delivery && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 Due: {formatDate(proj.date_delivery)}</div>}
                  </div>

                  {/* KPIs */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{proj.overall_progress?.toFixed(0)}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Progress</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning)' }}>{proj.estimation_duration_days?.toFixed(1)}d</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Est. Duration</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{proj.total_points}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Points</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {nextState && (
                      <button className="btn btn-primary btn-sm" onClick={() => advanceState(proj)}>
                        → {PROJECT_STATE_LABELS[nextState].en}
                      </button>
                    )}
                    {proj.monday_link && <a href={proj.monday_link} target="_blank" className="btn btn-secondary btn-sm">Monday</a>}
                    {proj.boq_link && <a href={proj.boq_link} target="_blank" className="btn btn-secondary btn-sm">BOQ</a>}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Workflow Progress</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{proj.overall_progress?.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar" style={{ width: `${proj.overall_progress || 0}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Panel Project</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input className="form-control" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} placeholder="Customer / Company name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Email</label>
                  <input className="form-control" type="email" value={form.customer_email} onChange={e => setForm({...form, customer_email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Phone</label>
                  <input className="form-control" value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location / City</label>
                  <input className="form-control" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Delivery Date</label>
                  <input className="form-control" type="date" value={form.date_delivery} onChange={e => setForm({...form, date_delivery: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Job Order Number</label>
                  <input className="form-control" value={form.job_order_number} onChange={e => setForm({...form, job_order_number: e.target.value})} placeholder="e.g. SO-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Monday.com Link</label>
                  <input className="form-control" value={form.monday_link} onChange={e => setForm({...form, monday_link: e.target.value})} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label className="form-label">BOQ / Specs Link</label>
                  <input className="form-control" value={form.boq_link} onChange={e => setForm({...form, boq_link: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Project Description</label>
                <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Project scope, special requirements..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createProject} disabled={!form.customer_name}>Create Project</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
