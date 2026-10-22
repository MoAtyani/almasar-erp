'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

export default function TasksPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<'tasks' | 'production'>('tasks')
  const [tasks, setTasks] = useState<any[]>([])
  const [productionOrders, setProductionOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<any | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [deletingTask, setDeletingTask] = useState<any | null>(null)

  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<any | null>(null)

  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])

  // Task form
  const [taskForm, setTaskForm] = useState({
    project_id: '',
    department: 'electrical',
    title: '',
    description: '',
    required_deliverables: '',
    estimated_hours: 4,
    priority: 'medium',
    assigned_employee_id: '',
    status: 'assigned'
  })

  // Production Order form
  const [orderForm, setOrderForm] = useState({
    project_id: '',
    department: 'factory_a',
    description: '',
    quantity: 1,
    requires_painting: true,
    target_deadline: '',
    stage: 'enclosure_cutting'
  })

  const currentUser = typeof window !== 'undefined' ? 
    JSON.parse(localStorage.getItem('almasar_user') || '{"id":"usr-admin","role":"company_owner"}') : 
    { id: 'usr-admin', role: 'company_owner' }

  useEffect(() => {
    loadAuxData()
    loadTasks()
    loadProductionOrders()
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
        setTaskForm(f => ({ ...f, project_id: f.project_id || pRes.data[0].id }))
        setOrderForm(f => ({ ...f, project_id: f.project_id || pRes.data[0].id }))
      }
      if (eRes.success && eRes.data?.length > 0) {
        setEmployees(eRes.data)
        setTaskForm(f => ({ ...f, assigned_employee_id: f.assigned_employee_id || eRes.data[0].profile_id || eRes.data[0].id }))
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

  async function loadProductionOrders() {
    try {
      const res = await fetch('/api/production/orders')
      const data = await res.json()
      if (data.success) {
        setProductionOrders(data.data)
      }
    } catch (err) {
      console.error('Failed to load orders:', err)
    }
  }

  // --- Task Workflow Actions ---
  async function handleWorkflowAdvance(taskId: string, currentStatus: string) {
    let nextStatus = 'in_progress'
    if (currentStatus === 'assigned') nextStatus = 'in_progress'
    else if (currentStatus === 'in_progress') nextStatus = 'completed'
    else if (currentStatus === 'completed') nextStatus = 'verified'

    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          status: nextStatus
        })
      })
      const data = await res.json()
      if (data.success) {
        loadTasks()
      } else {
        alert(data.error || 'Failed to update task status')
      }
    } catch (err) {
      console.error('Workflow advance error:', err)
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
      }
    } catch (err) {
      console.error('Timer action error:', err)
    }
  }

  function openCreateTaskModal() {
    setEditingTask(null)
    setTaskForm({
      project_id: projects[0]?.id || '',
      department: 'electrical',
      title: '',
      description: '',
      required_deliverables: '',
      estimated_hours: 4,
      priority: 'medium',
      assigned_employee_id: employees[0]?.profile_id || employees[0]?.id || '',
      status: 'assigned'
    })
    setShowTaskModal(true)
  }

  function openEditTaskModal(t: any) {
    setEditingTask(t)
    setTaskForm({
      project_id: t.project_id || '',
      department: t.department || 'electrical',
      title: t.title || '',
      description: t.description || '',
      required_deliverables: t.required_deliverables || '',
      estimated_hours: t.estimated_hours || 4,
      priority: t.priority || 'medium',
      assigned_employee_id: t.assigned_employee_id || '',
      status: t.status || 'assigned'
    })
    setShowTaskModal(true)
  }

  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingTask) {
        const res = await fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTask.id,
            title: taskForm.title,
            description: taskForm.description,
            department: taskForm.department,
            estimated_hours: parseFloat(taskForm.estimated_hours as any) || 4,
            priority: taskForm.priority,
            assigned_employee_id: taskForm.assigned_employee_id,
            status: taskForm.status
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowTaskModal(false)
          setEditingTask(null)
          loadTasks()
        } else {
          alert(data.error || 'Failed to update task')
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: taskForm.project_id || projects[0]?.id,
            department: taskForm.department,
            title: taskForm.title,
            description: taskForm.description,
            required_deliverables: taskForm.required_deliverables,
            estimated_hours: parseFloat(taskForm.estimated_hours as any) || 4,
            priority: taskForm.priority,
            assigned_employee_id: taskForm.assigned_employee_id || employees[0]?.id
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowTaskModal(false)
          loadTasks()
        } else {
          alert(data.error || 'Failed to create task')
        }
      }
    } catch (err) {
      console.error('Save task error:', err)
    }
  }

  async function handleDeleteTask() {
    if (!deletingTask) return
    try {
      const res = await fetch(`/api/tasks?id=${deletingTask.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingTask(null)
        loadTasks()
      } else {
        alert(data.error || 'Failed to delete task')
      }
    } catch (err) {
      console.error('Delete task error:', err)
    }
  }

  // --- Production Orders CRUD ---
  function openCreateOrderModal() {
    setEditingOrder(null)
    setOrderForm({
      project_id: projects[0]?.id || '',
      department: 'factory_a',
      description: '',
      quantity: 1,
      requires_painting: true,
      target_deadline: '',
      stage: 'enclosure_cutting'
    })
    setShowOrderModal(true)
  }

  function openEditOrderModal(o: any) {
    setEditingOrder(o)
    setOrderForm({
      project_id: o.project_id || '',
      department: o.department || 'factory_a',
      description: o.description || '',
      quantity: o.quantity || 1,
      requires_painting: !!o.requires_painting,
      target_deadline: o.target_deadline ? o.target_deadline.substring(0, 10) : '',
      stage: o.stage || 'enclosure_cutting'
    })
    setShowOrderModal(true)
  }

  async function handleSaveOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingOrder) {
        const res = await fetch('/api/production/orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingOrder.id,
            department: orderForm.department,
            stage: orderForm.stage,
            quantity: Number(orderForm.quantity),
            requires_painting: orderForm.requires_painting,
            description: orderForm.description,
            target_deadline: orderForm.target_deadline || null
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowOrderModal(false)
          setEditingOrder(null)
          loadProductionOrders()
        } else {
          alert(data.error || 'Failed to update order')
        }
      } else {
        const res = await fetch('/api/production/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: orderForm.project_id || projects[0]?.id,
            department: orderForm.department,
            description: orderForm.description,
            quantity: Number(orderForm.quantity),
            requires_painting: orderForm.requires_painting,
            target_deadline: orderForm.target_deadline || null,
            stage: orderForm.stage
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowOrderModal(false)
          loadProductionOrders()
        } else {
          alert(data.error || 'Failed to create order')
        }
      }
    } catch (err) {
      console.error('Save order error:', err)
    }
  }

  async function handleDeleteOrder() {
    if (!deletingOrder) return
    try {
      const res = await fetch(`/api/production/orders?id=${deletingOrder.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingOrder(null)
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to delete order')
      }
    } catch (err) {
      console.error('Delete order error:', err)
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
      title="Tasks, Production Orders & Factory Workflow"
      titleAr="إدارة مهام الفنيين وأوامر الإنتاج ومراحل التصنيع"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab === 'tasks' ? (
            <button className="btn btn-primary btn-sm" onClick={openCreateTaskModal}>
              {isRtl ? '+ إسناد مهمة جديدة' : '+ Assign New Task'}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={openCreateOrderModal}>
              {isRtl ? '+ أمر تصنيع جديد' : '+ New Production Order'}
            </button>
          )}
        </div>
      }
    >
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('tasks')}
        >
          🔧 {isRtl ? 'مهام الفنيين وسير العمل' : 'Technician Tasks & Workflow'} ({tasks.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'production' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('production')}
        >
          🏭 {isRtl ? 'أوامر تصنيع المصنع والمراحل' : 'Production Orders & Stages'} ({productionOrders.length})
        </button>
      </div>

      {/* Active Stopwatch Banner */}
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
              <button className="btn btn-sm btn-warning" onClick={() => handleTimerAction('pause')}>
                ⏸ {isRtl ? 'إيقاف مؤقت' : 'Pause'}
              </button>
              <button className="btn btn-sm btn-success" onClick={() => handleTimerAction('stop')}>
                ⏹ {isRtl ? 'إنهاء وحفظ الوقت' : 'Stop & Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Tasks */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{isRtl ? 'جاري تحميل المهام...' : 'Loading tasks...'}</div>}

          {!loading && tasks.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              {isRtl ? 'لا توجد مهام مسندة حالياً.' : 'No tasks assigned yet.'}
            </div>
          )}

          {tasks.map(t => {
            const isTimerRunning = activeTimer && activeTimer.task_id === t.id
            const statusColor = 
              t.status === 'completed' || t.status === 'verified' ? '#10b981' :
              t.status === 'in_progress' ? '#f59e0b' : '#3b82f6'

            return (
              <div key={t.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{t.task_code || 'TSK'}</span>
                      <span className="badge badge-subtle">{t.department}</span>
                      {t.project_reference && <span className="badge badge-subtle" style={{ color: 'var(--accent)' }}>{t.project_reference}</span>}
                      <span
                        className="state-pill"
                        style={{
                          background: statusColor + '22',
                          color: statusColor,
                          border: `1px solid ${statusColor}55`
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
                      <span>👤 {isRtl ? 'الفني:' : 'Assignee:'} <strong>{t.assigned_employee_name || 'Unassigned'}</strong></span>
                      <span>⏱️ {isRtl ? 'الوقت المقدر:' : 'Estimated:'} {t.estimated_hours}h</span>
                      {t.actual_start && <span>▶ {isRtl ? 'بدأ:' : 'Started:'} {formatDate(t.actual_start)}</span>}
                      {t.supervisor_approved && <span style={{ color: '#10b981' }}>✓ {isRtl ? 'معتمد' : 'Supervisor Approved'}</span>}
                    </div>
                  </div>

                  {/* Actions & Workflow Transition Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180, alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* Workflow progression */}
                      {t.status === 'assigned' && (
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => handleWorkflowAdvance(t.id, 'assigned')}
                        >
                          ▶ {isRtl ? 'بدء تنفيذ المهمة' : 'Start Task'}
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button
                          className="btn btn-xs btn-success"
                          onClick={() => handleWorkflowAdvance(t.id, 'in_progress')}
                        >
                          ✓ {isRtl ? 'إكمال المهمة' : 'Finish Task'}
                        </button>
                      )}
                      {t.status === 'completed' && !t.supervisor_approved && (
                        <button
                          className="btn btn-xs btn-accent"
                          onClick={() => handleWorkflowAdvance(t.id, 'completed')}
                        >
                          ⭐ {isRtl ? 'اعتماد المشرف' : 'Verify'}
                        </button>
                      )}

                      {/* Edit & Delete */}
                      <button className="btn btn-xs btn-secondary" onClick={() => openEditTaskModal(t)}>
                        ✏️ {isRtl ? 'تعديل' : 'Edit'}
                      </button>
                      <button className="btn btn-xs btn-danger" onClick={() => setDeletingTask(t)}>
                        🗑️ {isRtl ? 'حذف' : 'Delete'}
                      </button>
                    </div>

                    {/* Timer controls */}
                    {t.status !== 'completed' && t.status !== 'verified' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isTimerRunning ? (
                          <button className="btn btn-xs btn-warning" onClick={() => handleTimerAction('pause')}>
                            ⏸ {isRtl ? 'إيقاف المؤقت' : 'Pause Timer'}
                          </button>
                        ) : (
                          <button className="btn btn-xs btn-secondary" onClick={() => handleTimerAction('start', t.id)}>
                            ⏱️ {isRtl ? 'تشغيل المؤقت' : 'Track Time'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TAB 2: Production Orders */}
      {activeTab === 'production' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {productionOrders.length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              {isRtl ? 'لا توجد أوامر تصنيع حالياً.' : 'No production orders registered.'}
            </div>
          )}

          {productionOrders.map(ord => (
            <div key={ord.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{ord.order_number}</span>
                    <span className="badge badge-subtle">{ord.department?.toUpperCase()}</span>
                    {ord.project_reference && <span className="badge badge-subtle" style={{ color: 'var(--accent)' }}>{ord.project_reference}</span>}
                    <span className="state-pill" style={{ background: '#06b6d422', color: '#06b6d4', border: '1px solid #06b6d455' }}>
                      {ord.stage?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {ord.description || ord.order_number}
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>🔢 {isRtl ? 'الكمية:' : 'Qty:'} <strong>{ord.quantity} pcs</strong></span>
                    {ord.requires_painting && <span>🎨 {isRtl ? 'يتطلب دهان حراري' : 'Powder Coating Required'}</span>}
                    {ord.target_deadline && <span>📅 {isRtl ? 'تاريخ الانتهاء:' : 'Deadline:'} {formatDate(ord.target_deadline)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-xs btn-secondary" onClick={() => openEditOrderModal(ord)}>
                    ✏️ {isRtl ? 'تعديل' : 'Edit'}
                  </button>
                  <button className="btn btn-xs btn-danger" onClick={() => setDeletingOrder(ord)}>
                    🗑️ {isRtl ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Task Modal */}
      {showTaskModal && (
        <div className="modal-backdrop" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveTask}>
              <div className="modal-header">
                <h3>{editingTask ? (isRtl ? 'تعديل المهمة الفنية' : 'Edit Task') : (isRtl ? 'إسناد مهمة إنتاجية جديدة' : 'Assign New Task')}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                {!editingTask && (
                  <div>
                    <label className="label">{isRtl ? 'المشروع المرتبط' : 'Project'}</label>
                    <select
                      className="input"
                      value={taskForm.project_id}
                      onChange={e => setTaskForm({ ...taskForm, project_id: e.target.value })}
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم الفني' : 'Department'}</label>
                    <select
                      className="input"
                      value={taskForm.department}
                      onChange={e => setTaskForm({ ...taskForm, department: e.target.value })}
                    >
                      <option value="sheet_metal">{isRtl ? 'أعمال الصاج والهيكل' : 'Sheet Metal'}</option>
                      <option value="layout">{isRtl ? 'تثبيت المكونات (Layout)' : 'Layout'}</option>
                      <option value="power_busbar">{isRtl ? 'دوائر القدرة - بسبار نحاس' : 'Power Busbar'}</option>
                      <option value="power_wires">{isRtl ? 'دوائر القدرة - كابلات وأسلاك' : 'Power Wires'}</option>
                      <option value="control">{isRtl ? 'دوائر التحكم والـ PLC' : 'Control Circuits'}</option>
                      <option value="electrical">{isRtl ? 'القسم الكهربائي العام' : 'Electrical'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الفني المسند إليه' : 'Assignee'}</label>
                    <select
                      className="input"
                      value={taskForm.assigned_employee_id}
                      onChange={e => setTaskForm({ ...taskForm, assigned_employee_id: e.target.value })}
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.profile_id || e.id}>{e.full_name} ({e.job_title || e.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'عنوان المهمة' : 'Task Title'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'تشكيل وتثبيت بسبار رئيسي 80x10 ملم...' : 'Forming and mounting 80x10mm main busbar...'}
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'الوصف والتفاصيل الفنية' : 'Description & Technical Details'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    value={taskForm.description}
                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'الوقت المقدر (ساعات)' : 'Estimated Hours'}</label>
                    <input
                      type="number"
                      step="0.5"
                      className="input"
                      value={taskForm.estimated_hours}
                      onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value as any })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الأولوية' : 'Priority'}</label>
                    <select
                      className="input"
                      value={taskForm.priority}
                      onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    >
                      <option value="low">{isRtl ? 'منخفضة' : 'Low'}</option>
                      <option value="medium">{isRtl ? 'متوسطة' : 'Medium'}</option>
                      <option value="high">{isRtl ? 'عالية' : 'High'}</option>
                      <option value="urgent">{isRtl ? 'عاجلة جداً' : 'Urgent'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الحالة' : 'Status'}</label>
                    <select
                      className="input"
                      value={taskForm.status}
                      onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                    >
                      <option value="assigned">ASSIGNED</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="completed">COMPLETED</option>
                      <option value="verified">VERIFIED</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTask ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إسناد المهمة' : 'Assign Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Production Order Modal */}
      {showOrderModal && (
        <div className="modal-backdrop" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveOrder}>
              <div className="modal-header">
                <h3>{editingOrder ? (isRtl ? 'تعديل أمر التصنيع' : 'Edit Production Order') : (isRtl ? 'أمر تصنيع جديد' : 'New Production Order')}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                {!editingOrder && (
                  <div>
                    <label className="label">{isRtl ? 'المشروع المرتبط' : 'Project'}</label>
                    <select
                      className="input"
                      value={orderForm.project_id}
                      onChange={e => setOrderForm({ ...orderForm, project_id: e.target.value })}
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'قسم المصنع' : 'Factory Department'}</label>
                    <select
                      className="input"
                      value={orderForm.department}
                      onChange={e => setOrderForm({ ...orderForm, department: e.target.value })}
                    >
                      <option value="factory_a">{isRtl ? 'مصنع أ (الهياكل والصاج)' : 'Factory A (Sheet Metal)'}</option>
                      <option value="factory_b">{isRtl ? 'مصنع ب (الدهان والبودرة)' : 'Factory B (Powder Coating)'}</option>
                      <option value="electrical">{isRtl ? 'القسم الكهربائي والتجميع' : 'Electrical Assembly'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'مرحلة التصنيع' : 'Stage'}</label>
                    <select
                      className="input"
                      value={orderForm.stage}
                      onChange={e => setOrderForm({ ...orderForm, stage: e.target.value })}
                    >
                      <option value="enclosure_cutting">{isRtl ? 'قص وثني الصاج' : 'Enclosure Cutting'}</option>
                      <option value="powder_coating">{isRtl ? 'الدهان والطلاء الحراري' : 'Powder Coating'}</option>
                      <option value="busbar_bending">{isRtl ? 'ثني وتشكيل البسبار' : 'Busbar Bending'}</option>
                      <option value="wiring">{isRtl ? 'التسليك والتوصيل' : 'Wiring'}</option>
                      <option value="testing">{isRtl ? 'الفحص والاختبار' : 'Testing'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف أمر التصنيع' : 'Order Description'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'تصنيع هيكل لوحة رئيسية IP54 مع أبواب مزدوجة...' : 'Fabrication of IP54 enclosure with double doors...'}
                    value={orderForm.description}
                    onChange={e => setOrderForm({ ...orderForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'الكمية' : 'Quantity'}</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value as any })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ التسليم المستهدف' : 'Target Deadline'}</label>
                    <input
                      type="date"
                      className="input"
                      value={orderForm.target_deadline}
                      onChange={e => setOrderForm({ ...orderForm, target_deadline: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingOrder ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إنشاء أمر التصنيع' : 'Create Order')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {deletingTask && (
        <div className="modal-backdrop" onClick={() => setDeletingTask(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد حذف المهمة' : 'Confirm Delete Task'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingTask(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف المهمة "${deletingTask.title}"؟` : `Are you sure you want to delete task "${deletingTask.title}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingTask(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteTask}>
                {isRtl ? 'حذف المهمة' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Confirmation */}
      {deletingOrder && (
        <div className="modal-backdrop" onClick={() => setDeletingOrder(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد حذف أمر التصنيع' : 'Confirm Delete Order'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingOrder(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف أمر التصنيع "${deletingOrder.order_number}"؟` : `Are you sure you want to delete order "${deletingOrder.order_number}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingOrder(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteOrder}>
                {isRtl ? 'حذف أمر التصنيع' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
