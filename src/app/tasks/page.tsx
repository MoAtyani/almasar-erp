'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { PanelTask, TaskState } from '@/lib/types'
import { TASK_STATE_LABELS, STAGE_TYPE_LABELS } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'
import { MOCK_TASKS } from '@/lib/mockData'

interface TaskWithProject extends Omit<PanelTask, 'project' | 'technician'> {
  project?: { reference: string; customer_name: string }
  technician?: { full_name: string }
}

export default function TasksPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [tasks, setTasks] = useState<TaskWithProject[]>(MOCK_TASKS)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    stage_type: 'power_busbar' as const,
    points_awarded: 40,
    project_id: 'proj-1',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const { data } = await supabase
        .from('panel_tasks')
        .select('*, project:panel_projects(reference, customer_name), technician:profiles(full_name), checklist:activity_lines(*)')
        .order('sequence', { ascending: true })

      if (data && data.length > 0) {
        setTasks(data as TaskWithProject[])
      }
    } catch {
      // Keep mock tasks
    }
  }

  function handleStateChange(taskId: string, newState: TaskState) {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          state: newState,
          all_activities_done: newState === 'done',
          checklist: t.checklist ? t.checklist.map(c => ({ ...c, is_done: newState === 'done' ? true : c.is_done })) : []
        }
      }
      return t
    }))
  }

  function toggleChecklist(taskId: string, lineId: string) {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.checklist) {
        return {
          ...t,
          checklist: t.checklist.map(c => c.id === lineId ? { ...c, is_done: !c.is_done } : c)
        }
      }
      return t
    }))
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    const newTask: TaskWithProject = {
      id: `task-${Date.now()}`,
      project_id: form.project_id,
      stage_type: form.stage_type,
      name: form.name,
      state: 'pending',
      color_indicator: 'green',
      points_awarded: Number(form.points_awarded),
      all_activities_done: false,
      sequence: tasks.length * 10 + 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project: { reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co.' },
      technician: { full_name: 'Eng. Tariq Al-Masar' },
      checklist: [
        { id: `c-${Date.now()}-1`, task_id: `task-${Date.now()}`, name_en: 'Initial inspection of components', name_ar: 'الفحص الأولي للمكونات الكهربائية', sequence: 10, is_done: false },
        { id: `c-${Date.now()}-2`, task_id: `task-${Date.now()}`, name_en: 'Execute mounting & torque checks', name_ar: 'تنفيذ التثبيت والتربيط بالعزم المطلوب', sequence: 20, is_done: false },
      ]
    }
    setTasks([newTask, ...tasks])
    setShowModal(false)
    setForm({ name: '', stage_type: 'power_busbar', points_awarded: 40, project_id: 'proj-1' })
  }

  const filtered = tasks.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.project?.reference && t.project.reference.toLowerCase().includes(q)) ||
      (t.technician?.full_name && t.technician.full_name.toLowerCase().includes(q))
    )
  })

  const inProgressCount = tasks.filter(t => t.state === 'in_progress').length
  const doneCount = tasks.filter(t => t.state === 'done').length
  const delayedCount = tasks.filter(t => t.color_indicator === 'red').length

  return (
    <AppLayout
      title="Manufacturing Tasks & Assembly"
      titleAr="مهام التصنيع وتجميع اللوحات"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ إضافة مهمة تصنيع' : '+ New Task'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">📋</div>
          <div className="kpi-value">{tasks.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي مهام المصنع' : 'Total Tasks'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⚙️</div>
          <div className="kpi-value">{inProgressCount}</div>
          <div className="kpi-label">{isRtl ? 'قيد التنفيذ والتجميع' : 'In Progress'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✅</div>
          <div className="kpi-value">{doneCount}</div>
          <div className="kpi-label">{isRtl ? 'المهام المكتملة' : 'Completed Tasks'}</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚠️</div>
          <div className="kpi-value">{delayedCount}</div>
          <div className="kpi-label">{isRtl ? 'مهام متأخرة أو بها ملاحظات' : 'Delayed / Issues'}</div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('all')}
            >
              🏭 {isRtl ? 'جميع مهام المصنع و QC' : 'All Factory Tasks & QC'} ({tasks.length})
            </button>
            <button
              className={`btn ${activeTab === 'my' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('my')}
            >
              👷 {isRtl ? 'مهامي المسندة' : 'My Assigned Tasks'}
            </button>
          </div>

          <input
            type="text"
            className="input"
            style={{ width: 280 }}
            placeholder={isRtl ? '...بحث بالمهام، المشاريع، الفنيين' : 'Search tasks, projects, technicians...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Task Cards List */}
        <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
          {filtered.map(task => {
            const stateInfo = TASK_STATE_LABELS[task.state]
            const stageLabel = task.stage_type ? STAGE_TYPE_LABELS[task.stage_type] : null
            return (
              <div
                key={task.id}
                className="card"
                style={{
                  padding: 18,
                  border: task.state === 'in_progress' ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: 'var(--bg-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{task.color_indicator === 'green' ? '🟢' : '🔴'}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {task.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>📁 {isRtl ? 'المشروع:' : 'Project:'} <strong>{task.project?.reference}</strong> ({task.project?.customer_name})</span>
                      <span>🔧 {isRtl ? 'المرحلة:' : 'Stage:'} <strong>{stageLabel ? (stageLabel[lang] || stageLabel.en) : task.stage_type}</strong></span>
                      <span>👷 {isRtl ? 'الفني:' : 'Technician:'} <strong>{task.technician?.full_name}</strong></span>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>⭐ +{task.points_awarded} {isRtl ? 'نقطة' : 'pts'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${stateInfo.color}22`,
                        color: stateInfo.color,
                        border: `1px solid ${stateInfo.color}44`,
                      }}
                    >
                      {stateInfo[lang] || stateInfo.en}
                    </span>

                    {task.state === 'pending' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleStateChange(task.id, 'in_progress')}
                      >
                        {isRtl ? 'بدء العمل' : 'Start Task'}
                      </button>
                    )}
                    {task.state === 'in_progress' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStateChange(task.id, 'done')}
                      >
                        ✓ {isRtl ? 'اكتمال واعتماد QC' : 'Complete & Pass QC'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-activities checklist */}
                {task.checklist && task.checklist.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {isRtl ? 'قائمة التحقق وخطوات التنفيذ (Checklist):' : 'Assembly Quality Checklist:'}
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {task.checklist.map(item => (
                        <label
                          key={item.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            fontSize: 13,
                            cursor: 'pointer',
                            color: item.is_done ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: item.is_done ? 'line-through' : 'none'
                          }}
                          onClick={() => toggleChecklist(task.id, item.id)}
                        >
                          <input
                            type="checkbox"
                            checked={item.is_done}
                            readOnly
                            style={{ cursor: 'pointer', width: 16, height: 16, accentColor: 'var(--success)' }}
                          />
                          <span>{isRtl ? item.name_ar : item.name_en}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateTask}>
              <div className="modal-header">
                <h3>{isRtl ? 'إضافة مهمة تصنيع وتجميع جديدة' : 'Add Assembly Task'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'اسم المهمة' : 'Task Name'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: تجميع وتربيط قواطع ACB 3200A' : 'e.g. ACB 3200A Assembly & Torque'}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'مرحلة التصنيع' : 'Assembly Stage'}</label>
                    <select
                      className="input"
                      value={form.stage_type}
                      onChange={e => setForm({ ...form, stage_type: e.target.value as any })}
                    >
                      {Object.entries(STAGE_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v[lang] || v.en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'نقاط المكافأة للفني' : 'Reward Points'}</label>
                    <input
                      type="number"
                      className="input"
                      value={form.points_awarded}
                      onChange={e => setForm({ ...form, points_awarded: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ المهمة' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
