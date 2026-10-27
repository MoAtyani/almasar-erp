'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

type MainTab = 'tasks' | 'production' | 'casting' | 'laser' | 'painting'

export default function TasksPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<MainTab>('tasks')
  const [tasks, setTasks] = useState<any[]>([])
  const [productionOrders, setProductionOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<any | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Modals for tasks & standard orders
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [deletingTask, setDeletingTask] = useState<any | null>(null)

  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<any | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<any | null>(null)

  // Department-specific modals
  const [showCastingModal, setShowCastingModal] = useState(false)
  const [showLaserModal, setShowLaserModal] = useState(false)
  const [showPaintingModal, setShowPaintingModal] = useState(false)

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

  // 1. Casting Form (قسم الصب)
  const [castingForm, setCastingForm] = useState({
    project_id: '',
    item_description: '',
    cover_type: 'standard', // 'standard' = جاهز في عادي, 'glass_cover' = زجاج غطاء
    receipt_status: 'receiving', // 'receiving' = قيد الاستلام, 'completed' = انتهى بالتصنيع
    deadline: '',
    notes: '',
    quantity: 1
  })

  // 2. Laser Form (قسم الليزر)
  const [laserForm, setLaserForm] = useState({
    project_id: '',
    item_description: '',
    is_new_type: false, // نوع جديد
    quantity: 1, // العدد المطلوب
    fixed_measurements: '', // تفاصيل قياسات ثابتة
    required_measurement: '', // القياس المطلوب
    cable_tray_bend: '', // قياس تكسير كابل تري تكسير
    deadline: '', // موعد التسليم
    notes: '', // تفاصيل وملاحظاته
    stage: 'awaiting_materials' // 'awaiting_materials' = في انتظار المواد, 'material_inspection' = فحص جودة المواد, 'ready_for_delivery' = جاهز للتسليم
  })

  // 3. Painting Form (قسم الطلاء)
  const [paintingForm, setPaintingForm] = useState({
    project_id: '',
    item_description: '',
    deadline: '', // موعد تسليمه
    receipt_status: 'receiving', // 'receiving' = قيد الاستلام, 'showroom_notified' = إشعار المعرض, 'ready_for_delivery' = جاهز للتسليم
    notes: '', // تفاصيله وملاحظاته
    quantity: 1
  })

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
        const defPrj = pRes.data[0].id
        setTaskForm(f => ({ ...f, project_id: f.project_id || defPrj }))
        setOrderForm(f => ({ ...f, project_id: f.project_id || defPrj }))
        setCastingForm(f => ({ ...f, project_id: f.project_id || defPrj }))
        setLaserForm(f => ({ ...f, project_id: f.project_id || defPrj }))
        setPaintingForm(f => ({ ...f, project_id: f.project_id || defPrj }))
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
        setTasks(data.data || [])
      }
    } catch (err) {
      console.error('Error loading tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProductionOrders() {
    try {
      const res = await fetch('/api/production/orders')
      const data = await res.json()
      if (data.success) {
        setProductionOrders(data.data || [])
      }
    } catch (err) {
      console.error('Error loading production orders:', err)
    }
  }

  // --- Department Specific Creation Handlers ---
  async function handleCreateCastingOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: castingForm.project_id || projects[0]?.id,
          department: 'casting',
          item_description: castingForm.item_description,
          quantity: castingForm.quantity,
          cover_type: castingForm.cover_type,
          receipt_status: castingForm.receipt_status,
          deadline: castingForm.deadline,
          details_notes: castingForm.notes,
          notes: castingForm.notes
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowCastingModal(false)
        setCastingForm({
          project_id: projects[0]?.id || '',
          item_description: '',
          cover_type: 'standard',
          receipt_status: 'receiving',
          deadline: '',
          notes: '',
          quantity: 1
        })
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to create casting order')
      }
    } catch (err) {
      console.error('Create casting error:', err)
    }
  }

  async function handleCreateLaserOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: laserForm.project_id || projects[0]?.id,
          department: 'laser',
          item_description: laserForm.item_description,
          is_new_type: laserForm.is_new_type,
          quantity: laserForm.quantity,
          fixed_measurements: laserForm.fixed_measurements,
          required_measurement: laserForm.required_measurement,
          cable_tray_bend: laserForm.cable_tray_bend,
          deadline: laserForm.deadline,
          details_notes: laserForm.notes,
          notes: laserForm.notes,
          stage: laserForm.stage
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowLaserModal(false)
        setLaserForm({
          project_id: projects[0]?.id || '',
          item_description: '',
          is_new_type: false,
          quantity: 1,
          fixed_measurements: '',
          required_measurement: '',
          cable_tray_bend: '',
          deadline: '',
          notes: '',
          stage: 'awaiting_materials'
        })
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to create laser order')
      }
    } catch (err) {
      console.error('Create laser error:', err)
    }
  }

  async function handleCreatePaintingOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: paintingForm.project_id || projects[0]?.id,
          department: 'painting',
          item_description: paintingForm.item_description,
          quantity: paintingForm.quantity,
          receipt_status: paintingForm.receipt_status,
          deadline: paintingForm.deadline,
          details_notes: paintingForm.notes,
          notes: paintingForm.notes
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowPaintingModal(false)
        setPaintingForm({
          project_id: projects[0]?.id || '',
          item_description: '',
          deadline: '',
          receipt_status: 'receiving',
          notes: '',
          quantity: 1
        })
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to create painting order')
      }
    } catch (err) {
      console.error('Create painting error:', err)
    }
  }

  // Quick Action Handler for department stages
  async function handleDepartmentAction(id: string, action: string, extra: any = {}) {
    try {
      const res = await fetch('/api/production/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...extra })
      })
      const data = await res.json()
      if (data.success) {
        loadProductionOrders()
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (err) {
      console.error('Department action error:', err)
    }
  }

  // Time tracking & task actions
  async function handleTimerAction(action: 'start' | 'pause' | 'stop', taskId?: string) {
    try {
      const res = await fetch('/api/time-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, task_id: taskId || activeTimer?.task_id })
      })
      const data = await res.json()
      if (data.success) {
        if (action === 'start') {
          setActiveTimer({ task_id: taskId, start_time: new Date().toISOString() })
        } else {
          setActiveTimer(null)
        }
        loadTasks()
      }
    } catch (err) {
      console.error('Timer action error:', err)
    }
  }

  async function handleTaskWorkflow(id: string, nextStatus: string) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'advance_status', status: nextStatus })
      })
      const data = await res.json()
      if (data.success) loadTasks()
    } catch (err) {
      console.error('Task workflow error:', err)
    }
  }

  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Department Filters
  const castingOrders = productionOrders.filter(o => o.department === 'casting')
  const laserOrders = productionOrders.filter(o => o.department === 'laser')
  const paintingOrders = productionOrders.filter(o => o.department === 'painting')

  return (
    <AppLayout
      title="Tasks & Production"
      titleAr="المهام والإنتاج"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {activeTab === 'tasks' && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowTaskModal(true) }}>
              {isRtl ? '+ إسناد مهمة فنية' : '+ Assign Task'}
            </button>
          )}
          {activeTab === 'production' && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingOrder(null); setShowOrderModal(true) }}>
              {isRtl ? '+ أمر تصنيع عام' : '+ New Production Order'}
            </button>
          )}
          {activeTab === 'casting' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowCastingModal(true)}>
              {isRtl ? '+ أمر صب جديد' : '+ New Casting Order'}
            </button>
          )}
          {activeTab === 'laser' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowLaserModal(true)}>
              {isRtl ? '+ أمر قص وتكسير ليزر جديد' : '+ New Laser Order'}
            </button>
          )}
          {activeTab === 'painting' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowPaintingModal(true)}>
              {isRtl ? '+ أمر طلاء ودهان جديد' : '+ New Painting Order'}
            </button>
          )}
        </div>
      }
    >
      {/* Tab Switcher - Page 2 Handwritten Sections */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', background: 'var(--bg-card)', padding: 6, borderRadius: 10, border: '1px solid var(--border)' }}>
        <button
          className={`btn btn-sm ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('tasks')}
        >
          🔧 {isRtl ? 'مهام الفنيين ومسار العمل' : 'Technician Tasks'} ({tasks.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'production' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('production')}
        >
          🏭 {isRtl ? 'أوامر التصنيع العامة' : 'General Orders'} ({productionOrders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'casting' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderColor: activeTab === 'casting' ? '#f59e0b' : 'transparent' }}
          onClick={() => setActiveTab('casting')}
        >
          🧪 {isRtl ? 'قسم الصب (Casting)' : 'Casting Dept'} ({castingOrders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'laser' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderColor: activeTab === 'laser' ? '#38bdf8' : 'transparent' }}
          onClick={() => setActiveTab('laser')}
        >
          ⚡ {isRtl ? 'قسم الليزر والتكسير (Laser)' : 'Laser Dept'} ({laserOrders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'painting' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderColor: activeTab === 'painting' ? '#a855f7' : 'transparent' }}
          onClick={() => setActiveTab('painting')}
        >
          🎨 {isRtl ? 'قسم الطلاء (Painting)' : 'Painting Dept'} ({paintingOrders.length})
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

      {/* ========================================================================= */}
      {/* SECTION 1: قسم الصب (Casting / Molding Department) */}
      {/* ========================================================================= */}
      {activeTab === 'casting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                  🧪 {isRtl ? 'قسم الصب (Casting / Molding Department)' : 'Casting Department'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'متابعة قوالب الصب، استلام القوالب، تجهيز العادي والزجاج الغطاء، وتأكيد انتهاء التصنيع' : 'Molding & casting management, standard/glass cover options, receiving and completion'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCastingModal(true)}>
                + {isRtl ? 'أمر صب جديد' : 'New Casting Order'}
              </button>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الأمر' : 'Order #'}</th>
                  <th>{isRtl ? 'اسم المشروع' : 'Project Name'}</th>
                  <th>{isRtl ? 'تفاصيله وملاحظاته' : 'Details & Notes'}</th>
                  <th>{isRtl ? 'تجهيز الغطاء' : 'Cover Spec'}</th>
                  <th>{isRtl ? 'موعد تسليمه' : 'Delivery Deadline'}</th>
                  <th>{isRtl ? 'استلام ومرحلة التصنيع' : 'Receipt Status'}</th>
                  <th>{isRtl ? 'إجراء المسار' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {castingOrders.map(ord => {
                  const isDone = ord.receipt_status === 'completed' || ord.stage === 'completed' || ord.stage === 'manufacturing_complete'
                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{ord.order_number}</td>
                      <td>
                        <strong>{ord.project_name || ord.project_reference || 'مشروع الصب'}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.customer_name}</div>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div><strong>{ord.item_description}</strong></div>
                        {ord.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ord.notes}</div>}
                      </td>
                      <td>
                        {ord.cover_type === 'glass_cover' ? (
                          <span className="badge" style={{ background: '#38bdf822', color: '#38bdf8', border: '1px solid #38bdf844' }}>
                            🔍 {isRtl ? 'زجاج غطاء' : 'Glass Cover'}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            📦 {isRtl ? 'جاهز في عادي' : 'Standard Ready'}
                          </span>
                        )}
                      </td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        {isDone ? (
                          <span className="badge badge-done">
                            ✓ {isRtl ? 'انتهى بالتصنيع' : 'Manufacturing Completed'}
                          </span>
                        ) : (
                          <span className="badge badge-prog">
                            ⏳ {isRtl ? 'استلام: قيد الاستلام' : 'In Receiving'}
                          </span>
                        )}
                      </td>
                      <td>
                        {!isDone ? (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_casting_status', { receipt_status: 'completed' })}
                          >
                            ✓ {isRtl ? 'تأكيد: انتهى بالتصنيع' : 'Complete Mfg'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11 }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_casting_status', { receipt_status: 'receiving' })}
                          >
                            ↻ {isRtl ? 'إعادة لقيد الاستلام' : 'Revert to Receiving'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {castingOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر مسجلة بقسم الصب حالياً' : 'No casting orders registered'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: قسم الليزر (Laser Department) */}
      {/* ========================================================================= */}
      {activeTab === 'laser' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>
                  ⚡ {isRtl ? 'قسم الليزر والتكسير (Laser Department)' : 'Laser & Bending Department'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'متابعة قياسات تكسير كابل تري، قياسات ثابتة ومطلوبة، فحص جودة المواد، والجاهزية للتسليم' : 'Laser cutting, cable tray bending measurements, material quality inspection, and dispatch'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowLaserModal(true)}>
                + {isRtl ? 'أمر قص وتكسير ليزر جديد' : 'New Laser Order'}
              </button>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الأمر' : 'Order #'}</th>
                  <th>{isRtl ? 'اسم المشروع / النوع' : 'Project / Type'}</th>
                  <th>{isRtl ? 'العدد المطلوب' : 'Required Qty'}</th>
                  <th>{isRtl ? 'القياس المطلوب والثابت' : 'Measurements'}</th>
                  <th>{isRtl ? 'قياس تكسير كابل تري' : 'Cable Tray Bend'}</th>
                  <th>{isRtl ? 'موعد التسليم' : 'Deadline'}</th>
                  <th>{isRtl ? 'مرحلة المسار' : 'Workflow Stage'}</th>
                  <th>{isRtl ? 'إجراء المسار' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {laserOrders.map(ord => {
                  const isAwaiting = ord.stage === 'awaiting_materials' || !ord.stage
                  const isInspection = ord.stage === 'material_inspection'
                  const isReady = ord.stage === 'ready_for_delivery' || ord.stage === 'completed'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{ord.order_number}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong>{ord.project_name || ord.project_reference || 'مشروع الليزر'}</strong>
                          {ord.is_new_type && (
                            <span className="badge" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55', fontSize: 10 }}>
                              ★ {isRtl ? 'نوع جديد' : 'New Type'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.item_description}</div>
                        {ord.notes && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{ord.notes}</div>}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 14 }}>
                        {ord.quantity} {isRtl ? 'قطعة' : 'pcs'}
                      </td>
                      <td>
                        {ord.required_measurement && (
                          <div><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isRtl ? 'مطلوب:' : 'Req:'}</span> <strong>{ord.required_measurement}</strong></div>
                        )}
                        {ord.fixed_measurements && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <span>{isRtl ? 'ثابت:' : 'Fixed:'}</span> {ord.fixed_measurements}
                          </div>
                        )}
                      </td>
                      <td>
                        {ord.cable_tray_bend ? (
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>📐 {ord.cable_tray_bend}</span>
                        ) : '—'}
                      </td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        {isAwaiting && (
                          <span className="badge" style={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444' }}>
                            ⏳ {isRtl ? 'في انتظار المواد' : 'Awaiting Materials'}
                          </span>
                        )}
                        {isInspection && (
                          <span className="badge badge-prog">
                            🔍 {isRtl ? 'فحص جودة المواد' : 'Quality Inspection'}
                          </span>
                        )}
                        {isReady && (
                          <span className="badge badge-done">
                            ✅ {isRtl ? 'جاهز للتسليم' : 'Ready for Delivery'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isAwaiting && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11, borderColor: '#38bdf8', color: '#38bdf8' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_laser_status', { stage: 'material_inspection' })}
                          >
                            {isRtl ? 'فحص جودة المواد ➔' : 'Inspect Quality ➔'}
                          </button>
                        )}
                        {isInspection && (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_laser_status', { stage: 'ready_for_delivery' })}
                          >
                            ✓ {isRtl ? 'جاهز للتسليم' : 'Ready Delivery'}
                          </button>
                        )}
                        {isReady && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'جاهز' : 'Ready'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {laserOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر مسجلة بقسم الليزر حالياً' : 'No laser orders registered'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: قسم الطلاء (Painting / Coating Department) */}
      {/* ========================================================================= */}
      {activeTab === 'painting' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#a855f7' }}>
                  🎨 {isRtl ? 'قسم الطلاء والدهان الحراري (Painting Department)' : 'Painting Department'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'استلام هياكل اللوحات والكابل تري، إشعار المعرض بالجاهزية، والفحص النهائي قبل التسليم' : 'Coating workflow: Receiving, showroom notification, and ready for delivery confirmation'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowPaintingModal(true)}>
                + {isRtl ? 'أمر طلاء جديد' : 'New Painting Order'}
              </button>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الأمر' : 'Order #'}</th>
                  <th>{isRtl ? 'اسم المشروع' : 'Project Name'}</th>
                  <th>{isRtl ? 'تفاصيله وملاحظاته' : 'Details & Notes'}</th>
                  <th>{isRtl ? 'الكمية' : 'Quantity'}</th>
                  <th>{isRtl ? 'موعد تسليمه' : 'Delivery Deadline'}</th>
                  <th>{isRtl ? 'حالة المسار والإشعار' : 'Workflow Stage'}</th>
                  <th>{isRtl ? 'إجراء المسار' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {paintingOrders.map(ord => {
                  const isReceiving = ord.receipt_status === 'receiving' || !ord.receipt_status
                  const isShowroom = ord.receipt_status === 'showroom_notified'
                  const isReady = ord.receipt_status === 'ready_for_delivery' || ord.stage === 'ready_for_delivery'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{ord.order_number}</td>
                      <td>
                        <strong>{ord.project_name || ord.project_reference || 'مشروع الطلاء'}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.customer_name}</div>
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <div><strong>{ord.item_description}</strong></div>
                        {ord.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ord.notes}</div>}
                      </td>
                      <td style={{ fontWeight: 700 }}>{ord.quantity} {isRtl ? 'قطعة' : 'pcs'}</td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        {isReceiving && (
                          <span className="badge badge-prog">
                            ⏳ {isRtl ? 'استلام: قيد الاستلام' : 'In Receiving'}
                          </span>
                        )}
                        {isShowroom && (
                          <span className="badge" style={{ background: '#a855f722', color: '#a855f7', border: '1px solid #a855f744' }}>
                            🔔 {isRtl ? 'إشعار المعرض' : 'Showroom Notified'}
                          </span>
                        )}
                        {isReady && (
                          <span className="badge badge-done">
                            ✅ {isRtl ? 'جاهز للتسليم' : 'Ready for Delivery'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isReceiving && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11, borderColor: '#a855f7', color: '#a855f7' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_painting_status', { receipt_status: 'showroom_notified' })}
                          >
                            🔔 {isRtl ? 'إرسال إشعار للمعرَض' : 'Notify Showroom'}
                          </button>
                        )}
                        {isShowroom && (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_painting_status', { receipt_status: 'ready_for_delivery' })}
                          >
                            ✓ {isRtl ? 'جاهز للتسليم' : 'Ready Delivery'}
                          </button>
                        )}
                        {isReady && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'جاهز للتسليم' : 'Ready'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paintingOrders.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر مسجلة بقسم الطلاء حالياً' : 'No painting orders registered'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXISTING TAB 1: Tasks */}
      {/* ========================================================================= */}
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
                      <span>👤 {isRtl ? 'الفني:' : 'Technician:'} <strong>{t.assigned_employee_name || 'فني المصنع'}</strong></span>
                      <span>⏱️ {isRtl ? 'المقدر:' : 'Est:'} <strong>{t.estimated_hours}h</strong></span>
                      <span>⚡ {isRtl ? 'الأولوية:' : 'Priority:'} <strong>{t.priority}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {t.status === 'assigned' && (
                        <button className="btn btn-xs btn-primary" onClick={() => handleTaskWorkflow(t.id, 'in_progress')}>
                          ▶ {isRtl ? 'بدء العمل' : 'Start'}
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button className="btn btn-xs btn-success" onClick={() => handleTaskWorkflow(t.id, 'completed')}>
                          ✓ {isRtl ? 'إكمال المهمة' : 'Complete'}
                        </button>
                      )}
                      <button className="btn btn-xs btn-secondary" onClick={() => { setEditingTask(t); setShowTaskModal(true) }}>
                        ✏️ {isRtl ? 'تعديل' : 'Edit'}
                      </button>
                      <button className="btn btn-xs btn-danger" onClick={() => setDeletingTask(t)}>
                        🗑️ {isRtl ? 'حذف' : 'Del'}
                      </button>
                    </div>

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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXISTING TAB 2: General Production Orders */}
      {/* ========================================================================= */}
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
                    {ord.item_description || ord.description || ord.order_number}
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>🔢 {isRtl ? 'الكمية:' : 'Qty:'} <strong>{ord.quantity} pcs</strong></span>
                    {ord.requires_painting && <span>🎨 {isRtl ? 'يتطلب دهان حراري' : 'Powder Coating Required'}</span>}
                    {ord.deadline && <span>📅 {isRtl ? 'تاريخ الانتهاء:' : 'Deadline:'} {formatDate(ord.deadline)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="btn btn-xs btn-danger" onClick={() => setDeletingOrder(ord)}>
                    🗑️ {isRtl ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: قسم الصب (New Casting Order Modal) */}
      {/* ========================================================================= */}
      {showCastingModal && (
        <div className="modal-backdrop" onClick={() => setShowCastingModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateCastingOrder}>
              <div className="modal-header">
                <h3>🧪 {isRtl ? 'إضافة أمر جديد - قسم الصب' : 'New Casting & Molding Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCastingModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المشروع المرتبط (اسم المشروع) *' : 'Project Name *'}</label>
                  <select
                    className="input"
                    value={castingForm.project_id}
                    onChange={e => setCastingForm({ ...castingForm, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'اسم القطعة وتفاصيل الصب *' : 'Item & Casting Details *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: صب هيكل عازل لقاعدة لوحة توزيع رئيسية' : 'e.g. Base casting enclosure'}
                    value={castingForm.item_description}
                    onChange={e => setCastingForm({ ...castingForm, item_description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'تجهيز الغطاء (عادي / زجاج غطاء) *' : 'Cover Spec *'}</label>
                    <select
                      className="input"
                      value={castingForm.cover_type}
                      onChange={e => setCastingForm({ ...castingForm, cover_type: e.target.value })}
                    >
                      <option value="standard">{isRtl ? 'جاهز في عادي (Standard)' : 'Ready in Standard'}</option>
                      <option value="glass_cover">{isRtl ? 'زجاج غطاء (Cover glass / Glass lid)' : 'Glass Cover Lid'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الاستلام والمرحلة *' : 'Receipt Status *'}</label>
                    <select
                      className="input"
                      value={castingForm.receipt_status}
                      onChange={e => setCastingForm({ ...castingForm, receipt_status: e.target.value })}
                    >
                      <option value="receiving">{isRtl ? 'استلام: قيد الاستلام' : 'In Progress of Receiving'}</option>
                      <option value="completed">{isRtl ? 'انتهى بالتصنيع' : 'Manufacturing Completed'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'العدد المطلوب' : 'Quantity'}</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={castingForm.quantity}
                      onChange={e => setCastingForm({ ...castingForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'موعد تسليمه' : 'Delivery Deadline'}</label>
                    <input
                      type="date"
                      className="input"
                      value={castingForm.deadline}
                      onChange={e => setCastingForm({ ...castingForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'تفاصيله وملاحظاته' : 'Details and Notes'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder={isRtl ? 'أدخل أي ملاحظات فنية حول الصب والعزل...' : 'Enter molding instructions...'}
                    value={castingForm.notes}
                    onChange={e => setCastingForm({ ...castingForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCastingModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ أمر الصب' : 'Save Casting Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: قسم الليزر (New Laser Order Modal) */}
      {/* ========================================================================= */}
      {showLaserModal && (
        <div className="modal-backdrop" onClick={() => setShowLaserModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateLaserOrder}>
              <div className="modal-header">
                <h3>⚡ {isRtl ? 'إضافة أمر جديد - قسم الليزر والتكسير' : 'New Laser Cutting Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLaserModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم المشروع *' : 'Project Name *'}</label>
                    <select
                      className="input"
                      value={laserForm.project_id}
                      onChange={e => setLaserForm({ ...laserForm, project_id: e.target.value })}
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تصنيف الصنف' : 'Type Classification'}</label>
                    <div style={{ display: 'flex', alignItems: 'center', height: 42, gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={laserForm.is_new_type}
                          onChange={e => setLaserForm({ ...laserForm, is_new_type: e.target.checked })}
                        />
                        <strong style={{ color: laserForm.is_new_type ? '#f59e0b' : 'inherit' }}>
                          ★ {isRtl ? 'نوع جديد' : 'New Type'}
                        </strong>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف القطعة / اللوحة المطلوب قصها *' : 'Part / Sheet Description *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: صاج مجلفن سماكة 2 مم لكابل تري مع ثنيات...' : 'e.g. 2mm sheet for cable tray...'}
                    value={laserForm.item_description}
                    onChange={e => setLaserForm({ ...laserForm, item_description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'العدد المطلوب *' : 'Required Qty *'}</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="input"
                      value={laserForm.quantity}
                      onChange={e => setLaserForm({ ...laserForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'القياس المطلوب' : 'Required Measurement'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="3000x1200 mm"
                      value={laserForm.required_measurement}
                      onChange={e => setLaserForm({ ...laserForm, required_measurement: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تفاصيل قياسات ثابتة' : 'Fixed Measurements'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="عرض 300 مم ثقب 9 مم"
                      value={laserForm.fixed_measurements}
                      onChange={e => setLaserForm({ ...laserForm, fixed_measurements: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'قياس تكسير كابل تري (تكسير / ثني)' : 'Cable Tray Bending Measurement'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="ثني 90 درجة شفة 25 مم"
                      value={laserForm.cable_tray_bend}
                      onChange={e => setLaserForm({ ...laserForm, cable_tray_bend: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'موعد التسليم' : 'Delivery Deadline'}</label>
                    <input
                      type="date"
                      className="input"
                      value={laserForm.deadline}
                      onChange={e => setLaserForm({ ...laserForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'مرحلة المسار (الحالة) *' : 'Workflow Stage *'}</label>
                    <select
                      className="input"
                      value={laserForm.stage}
                      onChange={e => setLaserForm({ ...laserForm, stage: e.target.value })}
                    >
                      <option value="awaiting_materials">{isRtl ? 'في انتظار المواد (Awaiting materials)' : 'Awaiting Materials'}</option>
                      <option value="material_inspection">{isRtl ? 'فحص جودة المواد (Quality inspection)' : 'Material Quality Inspection'}</option>
                      <option value="ready_for_delivery">{isRtl ? 'جاهز للتسليم (Ready for delivery)' : 'Ready for Delivery'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'تفاصيل وملاحظاته' : 'Details and Notes'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'أدخل تعليمات القص والبرمجة وملاحظات الفني...' : 'Enter laser notes...'}
                    value={laserForm.notes}
                    onChange={e => setLaserForm({ ...laserForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLaserModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ أمر الليزر' : 'Save Laser Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: قسم الطلاء (New Painting Order Modal) */}
      {/* ========================================================================= */}
      {showPaintingModal && (
        <div className="modal-backdrop" onClick={() => setShowPaintingModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreatePaintingOrder}>
              <div className="modal-header">
                <h3>🎨 {isRtl ? 'إضافة أمر جديد - قسم الطلاء والدهان' : 'New Painting Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaintingModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'اسم المشروع *' : 'Project Name *'}</label>
                  <select
                    className="input"
                    value={paintingForm.project_id}
                    onChange={e => setPaintingForm({ ...paintingForm, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف القطع المطلوب طلاؤها *' : 'Items Description *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: هياكل وأبواب لوحات توزيع بودرة رمادي RAL 7035' : 'e.g. Enclosure powder coating'}
                    value={paintingForm.item_description}
                    onChange={e => setPaintingForm({ ...paintingForm, item_description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'حالة الاستلام والمسار *' : 'Workflow Stage *'}</label>
                    <select
                      className="input"
                      value={paintingForm.receipt_status}
                      onChange={e => setPaintingForm({ ...paintingForm, receipt_status: e.target.value })}
                    >
                      <option value="receiving">{isRtl ? 'استلام: قيد الاستلام' : 'In Progress of Receiving'}</option>
                      <option value="showroom_notified">{isRtl ? 'إشعار المعرض' : 'Showroom Notification'}</option>
                      <option value="ready_for_delivery">{isRtl ? 'جاهز للتسليم' : 'Ready for Delivery'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'العدد / الكمية' : 'Quantity'}</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={paintingForm.quantity}
                      onChange={e => setPaintingForm({ ...paintingForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'موعد تسليمه' : 'Delivery Deadline'}</label>
                  <input
                    type="date"
                    className="input"
                    value={paintingForm.deadline}
                    onChange={e => setPaintingForm({ ...paintingForm, deadline: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'تفاصيله وملاحظاته' : 'Details and Notes'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder={isRtl ? 'كود اللون، سماكة الدهان، متطلبات الفرن الحراري...' : 'RAL code, micron thickness...'}
                    value={paintingForm.notes}
                    onChange={e => setPaintingForm({ ...paintingForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaintingModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ أمر الطلاء' : 'Save Painting Order'}
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
              <h3 style={{ color: '#ef4444' }}>⚠️ {isRtl ? 'تأكيد حذف المهمة' : 'Confirm Delete Task'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingTask(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف المهمة "${deletingTask.title}"؟` : `Are you sure you want to delete task "${deletingTask.title}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingTask(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                await fetch(`/api/tasks?id=${deletingTask.id}`, { method: 'DELETE' })
                setDeletingTask(null)
                loadTasks()
              }}>
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
              <h3 style={{ color: '#ef4444' }}>⚠️ {isRtl ? 'تأكيد حذف أمر التصنيع' : 'Confirm Delete Order'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingOrder(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف أمر التصنيع "${deletingOrder.order_number}"؟` : `Are you sure you want to delete order "${deletingOrder.order_number}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingOrder(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                await fetch(`/api/production/orders?id=${deletingOrder.id}`, { method: 'DELETE' })
                setDeletingOrder(null)
                loadProductionOrders()
              }}>
                {isRtl ? 'حذف أمر التصنيع' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
