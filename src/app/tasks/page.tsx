'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

export default function TasksPage() {
  const { lang, isRtl } = useLanguage()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<any | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  const [form, setForm] = useState({
    project_id: '',
    department: 'electrical',
    title: '',
    description: '',
    required_deliverables: '',
    estimated_hours: 4,
    priority: 'medium',
    assigned_employee_id: ''
  })

  // Current logged in user (mocked fallback or stored profile)
  const currentUser = typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('almasar_user') || '{"id":"usr-admin","role":"company_owner"}') : 
    { id: 'usr-admin', role: 'company_owner' }

  useEffect(() => {
    loadTasks()
    loadAuxData()
  }, [])

  // Timer ticker
  useEffect(() => {
    let interval: any = null
    if (activeTimer) {
      interval = setInterval(() => {
        const start = new Date(activeTimer.start_time).getTime()
        const diff = Math.floor((Date.now() - start) / 1000)
        setElapsedSeconds(diff)
      }, 1000)
    } else {
      setElapsedSeconds(0)
    }
    return () => clearInterval(interval)
  }, [activeTimer])

  async function loadAuxData() {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/hr?view=employees').then(r => r.json())
      ])
      if (pRes.success && pRes.data?.length > 0) {
        setProjects(pRes.data)
        setForm(f => ({ ...f, project_id: f.project_id || pRes.data[0].id }))
      }
      if (eRes.success && eRes.data?.length > 0) {
        setEmployees(eRes.data)
        setForm(f => ({ ...f, assigned_employee_id: f.assigned_employee_id || eRes.data[0].profile_id || eRes.data[0].id }))
      }
    } catch (err) {
      console.error('Error loading aux data:', err)
    }
  }

  async function loadTasks() {
    setLoading(true)
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (data.success) {
        setTasks(data.data)
      }

      // Also check active timer for first employee or user
      const empId = employees[0]?.id || currentUser?.id
      if (empId) {
        const timeRes = await fetch(`/api/time-tracking?employee_id=${empId}`).then(r => r.json())
        if (timeRes.success && timeRes.activeTimer) {
          setActiveTimer(timeRes.activeTimer)
        }
      }
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleTimerAction(action: 'start' | 'pause' | 'stop', taskId?: string) {
    const empId = employees[0]?.id || currentUser?.id
    try {
      const res = await fetch('/api/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          task_id: taskId,
          employee_id: empId
        })
      })
      const data = await res.json()
      if (data.success) {
        if (action === 'start') {
          setActiveTimer(data.timer)
        } else {
          setActiveTimer(null)
          setElapsedSeconds(0)
        }
        loadTasks()
      } else {
        alert(data.error || 'Timer operation failed')
      }
    } catch (err) {
      console.error('Timer action error:', err)
    }
  }

  async function handleTaskAction(id: string, action: string, extra: any = {}) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...extra })
      })
      const data = await res.json()
      if (data.success) {
        loadTasks()
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (err) {
      console.error('Task action error:', err)
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: form.project_id || projects[0]?.id,
          department: form.department,
          title: form.title,
          description: form.description,
          required_deliverables: form.required_deliverables,
          estimated_hours: parseFloat(form.estimated_hours as any) || 4,
          priority: form.priority,
          assigned_employee_id: form.assigned_employee_id || employees[0]?.id
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowCreateModal(false)
        setForm({
          project_id: '',
          department: 'electrical',
          title: '',
          description: '',
          required_deliverables: '',
          estimated_hours: 4,
          priority: 'medium',
          assigned_employee_id: ''
        })
        loadTasks()
      } else {
        alert(data.error || 'Failed to create task')
      }
    } catch (err) {
      console.error('Create task error:', err)
    }
  }

  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <AppLayout
      title="Technician & Engineer Tasks & Time Tracking"
      titleAr="إدارة مهام الفنيين والمهندسين وتتبع الوقت الفعلي (Server-side Timers)"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
          {isRtl ? '+ إسناد مهمة جديدة' : '+ Assign New Task'}
        </button>
      }
    >
      {/* Active Stopwatch Banner (Workflow 2.2) */}
      {activeTimer && (
        <div className="card" style={{ padding: '16px 24px', marginBottom: 20, background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(59,130,246,0.15))', border: '1px solid #06b6d488' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ⏱️ {isRtl ? 'المؤقت الزمني الفعلي النشط (مسجل بالخادم):' : 'Active Server-Side Timer Running:'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                {activeTimer.task_code || 'Task'}: {activeTimer.task_title || 'Panel Activity'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: '#06b6d4' }}>
                {formatDuration(elapsedSeconds)}
              </div>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => handleTimerAction('pause')}
              >
                ⏸ {isRtl ? 'إيقاف مؤقت' : 'Pause'}
              </button>
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleTimerAction('stop')}
              >
                ⏹ {isRtl ? 'إنهاء وحفظ الوقت' : 'Stop & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{isRtl ? 'جاري تحميل المهام...' : 'Loading tasks...'}</div>}

        {!loading && tasks.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {isRtl ? 'لا توجد مهام مسندة حالياً.' : 'No tasks assigned yet.'}
          </div>
        )}

        {tasks.map(t => {
          const isTimerRunning = activeTimer && activeTimer.task_id === t.id
          return (
            <div key={t.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{t.task_code}</span>
                    <span className="badge badge-subtle">{t.department}</span>
                    <span className="badge badge-subtle" style={{ color: 'var(--accent)' }}>{t.project_reference}</span>
                    <span
                      className="state-pill"
                      style={{
                        background: t.status === 'completed' || t.status === 'verified' ? '#10b98122' : '#3b82f622',
                        color: t.status === 'completed' || t.status === 'verified' ? '#10b981' : '#3b82f6'
                      }}
                    >
                      {t.status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {t.title}
                  </div>

                  {t.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {t.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>👤 {isRtl ? 'الفني المسند إليه:' : 'Assigned to:'} <strong>{t.assigned_employee_name || 'Unassigned'}</strong></span>
                    <span>⏱️ {isRtl ? 'الوقت المقدر:' : 'Estimated:'} {t.estimated_hours}h</span>
                    {t.actual_start && <span>▶ {isRtl ? 'تاريخ البدء:' : 'Started:'} {formatDate(t.actual_start)}</span>}
                    {t.supervisor_approved && <span style={{ color: '#10b981' }}>✓ {isRtl ? 'معتمد من المشرف' : 'Supervisor Approved'}</span>}
                  </div>
                </div>

                {/* Timer & Completion Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160, alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                  {t.status !== 'completed' && t.status !== 'verified' && (
                    <>
                      {isTimerRunning ? (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleTimerAction('pause')}
                        >
                          ⏸ {isRtl ? 'إيقاف المؤقت' : 'Pause Timer'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-accent"
                          onClick={() => handleTimerAction('start', t.id)}
                        >
                          ▶ {isRtl ? 'بدء العمل والمؤقت' : 'Start Timer'}
                        </button>
                      )}

                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleTaskAction(t.id, 'complete', { completion_notes: 'Completed by technician' })}
                      >
                        ✓ {isRtl ? 'تسليم وإكمال المهمة' : 'Submit Task'}
                      </button>
                    </>
                  )}

                  {t.status === 'completed' && !t.supervisor_approved && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleTaskAction(t.id, 'supervisor_approve', { points_awarded: 25 })}
                    >
                      ⭐ {isRtl ? 'اعتماد المشرف وصرف النقاط' : 'Approve & Award Points'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateTask}>
              <div className="modal-header">
                <h3>{isRtl ? 'إسناد مهمة إنتاجية جديدة لفني / مهندس' : 'Assign New Production Task'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المشروع المرتبط' : 'Project'}</label>
                  <select
                    className="input"
                    value={form.project_id}
                    onChange={e => setForm({ ...form, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم' : 'Department'}</label>
                    <select
                      className="input"
                      value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })}
                    >
                      <option value="sheet_metal">{isRtl ? 'أعمال الصاج والهيكل' : 'Sheet Metal'}</option>
                      <option value="layout">{isRtl ? 'تثبيت المكونات (Layout)' : 'Layout'}</option>
                      <option value="power_busbar">{isRtl ? 'دوائر القدرة - بسبار نحاس' : 'Power Busbar'}</option>
                      <option value="power_wires">{isRtl ? 'دوائر القدرة - كابلات وأسلاك' : 'Power Wires'}</option>
                      <option value="control">{isRtl ? 'دوائر التحكم والـ PLC' : 'Control Circuits'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الفني المسند إليه' : 'Assignee'}</label>
                    <select
                      className="input"
                      value={form.assigned_employee_id}
                      onChange={e => setForm({ ...form, assigned_employee_id: e.target.value })}
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.profile_id || e.id}>{e.full_name} ({e.job_title})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'عنوان المهمة والمطلوب تنفيذه' : 'Task Title & Deliverables'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'تشكيل وتثبيت بسبار رئيسي 80x10 ملم مع العوازل...' : 'Forming and mounting 80x10mm main busbar...'}
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'الوقت المقدر (ساعات)' : 'Estimated Hours'}</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input"
                      value={form.estimated_hours}
                      onChange={e => setForm({ ...form, estimated_hours: e.target.value as any })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الأولوية' : 'Priority'}</label>
                    <select
                      className="input"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="low">{isRtl ? 'منخفضة' : 'Low'}</option>
                      <option value="medium">{isRtl ? 'متوسطة' : 'Medium'}</option>
                      <option value="high">{isRtl ? 'عالية' : 'High'}</option>
                      <option value="urgent">{isRtl ? 'عاجلة جداً' : 'Urgent'}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'إسناد المهمة' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
