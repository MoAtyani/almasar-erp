'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { PanelTask, TaskState } from '@/lib/types'
import { TASK_STATE_LABELS, STAGE_TYPE_LABELS, formatDate } from '@/lib/constants'

interface TaskWithProject extends Omit<PanelTask, 'project' | 'technician'> {
  project?: { reference: string; customer_name: string }
  technician?: { full_name: string }
}

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('all')
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null)
  const [search, setSearch] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ project_id: '', template_id: '', technician_id: '', points_awarded: '5' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setCurrentUserId(data.user.id) })
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: p }, { data: tmpl }, { data: tech }] = await Promise.all([
      supabase.from('panel_tasks').select(`*, project:panel_projects(reference,customer_name), technician:profiles(full_name), template:activity_templates(name_en,name_ar,stage_type), checklist:activity_lines(*)`).order('created_at', { ascending: false }),
      supabase.from('panel_projects').select('id,reference,customer_name'),
      supabase.from('activity_templates').select('*').is('parent_id', null),
      supabase.from('profiles').select('id,full_name').eq('is_active', true),
    ])
    setTasks(t || [])
    setProjects(p || [])
    setTemplates(tmpl || [])
    setTechnicians(tech || [])
    setLoading(false)
  }

  async function updateTaskState(taskId: string, state: TaskState) {
    const task = tasks.find(t => t.id === taskId)
    if (state === 'done' && task && !task.all_activities_done) {
      const checklist = task.checklist || []
      if (checklist.length > 0 && !checklist.every((c: any) => c.is_done)) {
        alert('Please complete all checklist items before marking this task as Done!')
        return
      }
    }
    await supabase.from('panel_tasks').update({ state, all_activities_done: state === 'done' }).eq('id', taskId)
    if (state === 'done' && task && task.technician_id && task.points_awarded > 0) {
      try {
        await supabase.rpc('increment_points', { user_id: task.technician_id, pts: task.points_awarded })
      } catch {
        const { data } = await supabase.from('profiles').select('reward_points').eq('id', task.technician_id).single()
        if (data) await supabase.from('profiles').update({ reward_points: (data.reward_points || 0) + task.points_awarded }).eq('id', task.technician_id)
      }
    }
    loadAll()
  }

  async function toggleChecklist(lineId: string, isDone: boolean) {
    await supabase.from('activity_lines').update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null }).eq('id', lineId)
    loadAll()
  }

  async function createTask() {
    const { data: task } = await supabase.from('panel_tasks').insert({
      project_id: createForm.project_id,
      template_id: createForm.template_id || null,
      technician_id: createForm.technician_id || null,
      points_awarded: parseInt(createForm.points_awarded) || 5,
    }).select().single()
    if (task && createForm.template_id) {
      const { data: tmpl } = await supabase.from('activity_templates').select('*, child_ids:activity_templates!parent_id(*)').eq('id', createForm.template_id).single()
      const children = tmpl?.child_ids?.length > 0 ? tmpl.child_ids : [tmpl]
      if (children?.length) {
        await supabase.from('activity_lines').insert(children.map((c: any) => ({
          task_id: task.id, template_id: c.id, name_en: c.name_en, name_ar: c.name_ar, sequence: c.sequence
        })))
      }
    }
    setShowCreateModal(false)
    loadAll()
  }

  const filtered = tasks.filter(t => {
    const matchTab = activeTab === 'all' || t.technician_id === currentUserId
    const matchSearch = (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.project?.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.technician?.full_name || '').toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  return (
    <AppLayout
      title="Tasks & Production"
      titleAr="المهام والإنتاج"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>+ New Task</button>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">📋</div><div className="kpi-value">{tasks.length}</div><div className="kpi-label">Total Tasks</div></div>
        <div className="kpi-card warning"><div className="kpi-icon warning-bg">⏳</div><div className="kpi-value">{tasks.filter(t => t.state === 'in_progress').length}</div><div className="kpi-label">In Progress</div></div>
        <div className="kpi-card success"><div className="kpi-icon success-bg">✅</div><div className="kpi-value">{tasks.filter(t => t.state === 'done').length}</div><div className="kpi-label">Completed</div></div>
        <div className="kpi-card danger"><div className="kpi-icon danger-bg">🔴</div><div className="kpi-value">{tasks.filter(t => t.color_indicator === 'red').length}</div><div className="kpi-label">Delayed / Issues</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Tasks / QC</button>
        <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>My Tasks</button>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input className="search-input" placeholder="Search tasks, projects, technicians..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(task => {
            const stateInfo = TASK_STATE_LABELS[task.state]
            const stageInfo = task.stage_type ? STAGE_TYPE_LABELS[task.stage_type] : null
            const checklist = task.checklist || []
            const doneCount = checklist.filter((c: any) => c.is_done).length
            const isExpanded = selectedTask?.id === task.id

            return (
              <div key={task.id} className="card" style={{ padding: 16, border: task.color_indicator === 'red' ? '1px solid rgba(239,68,68,0.4)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => setSelectedTask(isExpanded ? null : task)}>
                  {/* Color indicator */}
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: task.color_indicator === 'green' ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{task.name || `Task for ${task.project?.reference}`}</span>
                      {stageInfo && <span style={{ fontSize: 11, background: 'var(--bg-elevated)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 100 }}>{stageInfo.en}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {task.project && <span>📁 {task.project.reference}</span>}
                      {task.technician && <span>👤 {task.technician.full_name}</span>}
                      {checklist.length > 0 && <span>📋 {doneCount}/{checklist.length} checklist</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {task.points_awarded > 0 && (
                      <span className="points-badge">⭐ {task.points_awarded}</span>
                    )}
                    <span className="state-pill" style={{ background: stateInfo.color + '20', color: stateInfo.color }}>
                      {stateInfo.en}
                    </span>
                    {/* State actions */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {task.state === 'pending' && <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); updateTaskState(task.id, 'in_progress') }}>▶ Start</button>}
                      {task.state === 'in_progress' && <button className="btn btn-success btn-sm" onClick={e => { e.stopPropagation(); updateTaskState(task.id, 'done') }}>✓ Done</button>}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded Checklist */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                    {checklist.length > 0 ? (
                      <>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                          Checklist ({doneCount}/{checklist.length})
                        </div>
                        <div className="progress-bar-wrapper" style={{ marginBottom: 12 }}>
                          <div className="progress-bar" style={{ width: checklist.length ? `${(doneCount / checklist.length) * 100}%` : '0%' }} />
                        </div>
                        {checklist.map((line: any) => (
                          <div key={line.id} className={`checklist-item ${line.is_done ? 'done' : ''}`}>
                            <div className={`checklist-checkbox ${line.is_done ? 'checked' : ''}`} onClick={() => toggleChecklist(line.id, !line.is_done)}>
                              {line.is_done && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                            </div>
                            <div>
                              <div className={`checklist-label ${line.is_done ? 'done-text' : ''}`}>{line.name_en}</div>
                              {line.name_ar && <div className={`checklist-label ${line.is_done ? 'done-text' : ''}`} style={{ fontSize: 12, fontFamily: 'var(--font-ar)' }}>{line.name_ar}</div>}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No checklist items for this task</div>
                    )}

                    {task.qc_notes && (
                      <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        <strong>QC Notes:</strong> {task.qc_notes}
                      </div>
                    )}

                    {/* Color indicator buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn btn-success btn-sm" onClick={() => supabase.from('panel_tasks').update({ color_indicator: 'green' }).eq('id', task.id).then(loadAll)}>🟢 On Track</button>
                      <button className="btn btn-danger btn-sm" onClick={() => supabase.from('panel_tasks').update({ color_indicator: 'red' }).eq('id', task.id).then(loadAll)}>🔴 Delayed</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ fontSize: 32 }}>✅</div>
              <div className="empty-state-title">No Tasks Found</div>
              <div className="empty-state-desc">Create tasks and assign them to technicians.</div>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Production Task</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Project *</label>
                <select className="form-control" value={createForm.project_id} onChange={e => setCreateForm({...createForm, project_id: e.target.value})}>
                  <option value="">Select project...</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.reference} — {p.customer_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Activity Template</label>
                <select className="form-control" value={createForm.template_id} onChange={e => setCreateForm({...createForm, template_id: e.target.value})}>
                  <option value="">Select template...</option>
                  {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name_en} ({STAGE_TYPE_LABELS[t.stage_type as keyof typeof STAGE_TYPE_LABELS]?.en})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Technician</label>
                <select className="form-control" value={createForm.technician_id} onChange={e => setCreateForm({...createForm, technician_id: e.target.value})}>
                  <option value="">Unassigned</option>
                  {technicians.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reward Points</label>
                <input className="form-control" type="number" min="0" value={createForm.points_awarded} onChange={e => setCreateForm({...createForm, points_awarded: e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createTask} disabled={!createForm.project_id}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
