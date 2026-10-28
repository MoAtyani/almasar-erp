'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

type MainTab = 'orders' | 'iron' | 'hangar' | 'electrical'

const HANGAR_FIXED_MEASUREMENTS = [
  '( 70X50X25 )',
  '( 80X60X30 )',
  '( 100X80X30 )',
  '( 120X80X30 )',
  '( 140X100X40 )',
  '( 160X120X40 )',
  '( 180X120X50 )',
  '( 200X120X60 )',
]

export default function TasksPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<MainTab>('orders')
  const [productionOrders, setProductionOrders] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals for the 3 departments
  const [showIronModal, setShowIronModal] = useState(false)
  const [showHangarModal, setShowHangarModal] = useState(false)
  const [showElectricalModal, setShowElectricalModal] = useState(false)

  // 1. Iron Form (قسم الحديد) - No quantity, optional painting
  const [ironForm, setIronForm] = useState({
    project_id: '',
    item_description: '',
    drawings_details: '',
    receipt_date: new Date().toISOString().split('T')[0],
    deadline: '',
    paint_status: 'no_painting_needed', // 'in_painting' | 'no_painting_needed'
    notes: ''
  })

  // 2. Hangar Form (قسم الهنجر) - Fixed Measurements or New Project, mandatory painting & quantity
  const [hangarForm, setHangarForm] = useState({
    project_id: '',
    hangar_type: 'fixed_measurements' as 'fixed_measurements' | 'new_project',
    fixed_measurement: '( 70X50X25 )',
    item_description: '',
    quantity: 1, // العدد المطلوب (إلزامي)
    receipt_date: new Date().toISOString().split('T')[0],
    deadline: '',
    notes: ''
  })

  // 3. Electrical Form (قسم الكهرباء والتجميع) - No quantity, no painting, ready for inspection
  const [electricalForm, setElectricalForm] = useState({
    project_id: '',
    item_description: '',
    drawings_details: '',
    receipt_date: new Date().toISOString().split('T')[0],
    deadline: '',
    notes: ''
  })

  useEffect(() => {
    loadAuxData()
    loadProductionOrders()
  }, [])

  async function loadAuxData() {
    try {
      const res = await fetch('/api/projects').then(r => r.json())
      if (res.success && res.data?.length > 0) {
        setProjects(res.data)
        const defPrj = res.data[0].id
        setIronForm(f => ({ ...f, project_id: f.project_id || defPrj }))
        setHangarForm(f => ({ ...f, project_id: f.project_id || defPrj }))
        setElectricalForm(f => ({ ...f, project_id: f.project_id || defPrj }))
      }
    } catch (err) {
      console.error('Error loading projects:', err)
    }
  }

  async function loadProductionOrders() {
    setLoading(true)
    try {
      const res = await fetch('/api/production/orders')
      const data = await res.json()
      if (data.success) {
        setProductionOrders(data.data || [])
      }
    } catch (err) {
      console.error('Error loading production orders:', err)
    } finally {
      setLoading(false)
    }
  }

  // --- Department Specific Creation Handlers ---
  async function handleCreateIronOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const selectedProj = projects.find(p => p.id === ironForm.project_id)
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: ironForm.project_id || projects[0]?.id,
          department: 'iron',
          item_description: ironForm.item_description || (selectedProj ? `أعمال الحديد لمشروع ${selectedProj.name}` : 'مشروع حديد'),
          details_notes: ironForm.drawings_details || ironForm.notes,
          notes: ironForm.notes,
          planned_start: ironForm.receipt_date,
          deadline: ironForm.deadline,
          quantity: 1,
          requires_painting: ironForm.paint_status === 'in_painting',
          paint_status: ironForm.paint_status,
          receipt_status: 'started'
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowIronModal(false)
        setIronForm({
          project_id: projects[0]?.id || '',
          item_description: '',
          drawings_details: '',
          receipt_date: new Date().toISOString().split('T')[0],
          deadline: '',
          paint_status: 'no_painting_needed',
          notes: ''
        })
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to create iron order')
      }
    } catch (err) {
      console.error('Create iron error:', err)
    }
  }

  async function handleCreateHangarOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const selectedProj = projects.find(p => p.id === hangarForm.project_id)
      const desc = hangarForm.hangar_type === 'fixed_measurements'
        ? `لوحة قياس ثابت ${hangarForm.fixed_measurement} - ${hangarForm.item_description || selectedProj?.name || ''}`
        : (hangarForm.item_description || `مشروع جديد بالهنجر - ${selectedProj?.name || ''}`)

      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: hangarForm.project_id || projects[0]?.id,
          department: 'hangar',
          item_description: desc,
          fixed_measurements: hangarForm.hangar_type === 'fixed_measurements' ? hangarForm.fixed_measurement : '',
          is_new_type: hangarForm.hangar_type === 'new_project',
          quantity: Number(hangarForm.quantity) || 1,
          planned_start: hangarForm.receipt_date,
          deadline: hangarForm.deadline,
          details_notes: hangarForm.notes,
          notes: hangarForm.notes,
          requires_painting: true, // الطلاء إلزامي بالهنجر
          paint_status: 'in_painting',
          receipt_status: 'started'
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowHangarModal(false)
        setHangarForm({
          project_id: projects[0]?.id || '',
          hangar_type: 'fixed_measurements',
          fixed_measurement: '( 70X50X25 )',
          item_description: '',
          quantity: 1,
          receipt_date: new Date().toISOString().split('T')[0],
          deadline: '',
          notes: ''
        })
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to create hangar order')
      }
    } catch (err) {
      console.error('Create hangar error:', err)
    }
  }

  async function handleCreateElectricalOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const selectedProj = projects.find(p => p.id === electricalForm.project_id)
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: electricalForm.project_id || projects[0]?.id,
          department: 'electrical',
          item_description: electricalForm.item_description || (selectedProj ? `أعمال الكهرباء والتجميع لمشروع ${selectedProj.name}` : 'مشروع تجميع كهربائي'),
          details_notes: electricalForm.drawings_details || electricalForm.notes,
          notes: electricalForm.notes,
          planned_start: electricalForm.receipt_date,
          deadline: electricalForm.deadline,
          quantity: 1,
          requires_painting: false, // لا يوجد طلاء في قسم الكهرباء
          receipt_status: 'started'
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowElectricalModal(false)
        setElectricalForm({
          project_id: projects[0]?.id || '',
          item_description: '',
          drawings_details: '',
          receipt_date: new Date().toISOString().split('T')[0],
          deadline: '',
          notes: ''
        })
        loadProductionOrders()
      } else {
        alert(data.error || 'Failed to create electrical order')
      }
    } catch (err) {
      console.error('Create electrical error:', err)
    }
  }

  // Quick Action Handler for department orders
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

  // Send to QC
  async function handleSendToQC(ord: any) {
    try {
      const res = await fetch('/api/qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: ord.project_id,
          order_id: ord.id,
          department: ord.department === 'electrical' || ord.department === 'painting' ? 'electrical' : ord.department === 'hangar' || ord.department === 'laser' ? 'hangar' : 'iron',
          notes: `فحص جودة ${ord.project_name || ord.item_description}`
        })
      })
      const data = await res.json()
      if (data.success) {
        alert(isRtl ? 'تم إرسال اللوحة بنجاح إلى قسم ضبط الجودة (QC)' : 'Order successfully queued to QC')
        handleDepartmentAction(ord.id, 'update_electrical_stage', { stage: 'ready_for_inspection' })
      }
    } catch (e) {
      console.error('Error queuing to QC:', e)
    }
  }

  // Department Filters (with backward-compatibility)
  const ironOrders = productionOrders.filter(o => o.department === 'iron' || o.department === 'casting' || o.department === 'factory_a')
  const hangarOrders = productionOrders.filter(o => o.department === 'hangar' || o.department === 'laser' || o.department === 'factory_b')
  const electricalOrders = productionOrders.filter(o => o.department === 'electrical' || o.department === 'electrical_assembly' || o.department === 'painting')

  return (
    <AppLayout
      title="Tasks & Production"
      titleAr="المهام والإنتاج"
      actions={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Note: In 'orders' tab, new order button is removed as requested */}
          {activeTab === 'iron' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowIronModal(true)}>
              {isRtl ? '+ أمر تصنيع جديد' : '+ New Production Order'}
            </button>
          )}
          {activeTab === 'hangar' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowHangarModal(true)}>
              {isRtl ? '+ أمر تصنيع جديد' : '+ New Production Order'}
            </button>
          )}
          {activeTab === 'electrical' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowElectricalModal(true)}>
              {isRtl ? '+ أمر تصنيع جديد' : '+ New Production Order'}
            </button>
          )}
        </div>
      }
    >
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', background: 'var(--bg-card)', padding: 6, borderRadius: 10, border: '1px solid var(--border)' }}>
        <button
          className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('orders')}
        >
          🏭 {isRtl ? 'أوامر التصنيع القائمة' : 'Active Orders'} ({productionOrders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'iron' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderColor: activeTab === 'iron' ? '#f59e0b' : 'transparent' }}
          onClick={() => setActiveTab('iron')}
        >
          🔩 {isRtl ? 'قسم الحديد' : 'Iron Dept'} ({ironOrders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'hangar' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderColor: activeTab === 'hangar' ? '#06b6d4' : 'transparent' }}
          onClick={() => setActiveTab('hangar')}
        >
          🏭 {isRtl ? 'قسم الهنجر' : 'Hangar Dept'} ({hangarOrders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'electrical' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderColor: activeTab === 'electrical' ? '#8b5cf6' : 'transparent' }}
          onClick={() => setActiveTab('electrical')}
        >
          ⚡ {isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical & Assembly'} ({electricalOrders.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: أوامر التصنيع القائمة (Merged Total Across All Departments) */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                  🏭 {isRtl ? 'أوامر التصنيع القائمة (مجموع أوامر التصنيع في كل الأقسام)' : 'Active Production Orders (All Departments)'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'عرض ومتابعة كافة أوامر التصنيع الجارية عبر قسم الحديد، قسم الهنجر، وقسم الكهرباء والتجميع.' : 'Comprehensive view of all ongoing orders across Iron, Hangar, and Electrical departments.'}
                </p>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--gold)' }}>
                {isRtl ? 'إجمالي الأوامر القائمة:' : 'Total Active Orders:'} {productionOrders.length}
              </div>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم المرجع / الأمر' : 'Ref / Order #'}</th>
                  <th>{isRtl ? 'اسم المشروع' : 'Project Name'}</th>
                  <th>{isRtl ? 'القسم' : 'Department'}</th>
                  <th>{isRtl ? 'مخططات وتفاصيل' : 'Drawings & Details'}</th>
                  <th>{isRtl ? 'تاريخ الاستلام' : 'Receipt Date'}</th>
                  <th>{isRtl ? 'موعد التسليم' : 'Delivery Deadline'}</th>
                  <th>{isRtl ? 'حالة الإنجاز' : 'Status'}</th>
                  <th>{isRtl ? 'إجراء المسار' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {productionOrders.map(ord => {
                  let deptLabel = isRtl ? 'قسم الحديد' : 'Iron'
                  let deptColor = '#f59e0b'
                  if (ord.department === 'hangar' || ord.department === 'laser' || ord.department === 'factory_b') {
                    deptLabel = isRtl ? 'قسم الهنجر' : 'Hangar'
                    deptColor = '#06b6d4'
                  } else if (ord.department === 'electrical' || ord.department === 'painting' || ord.department === 'electrical_assembly') {
                    deptLabel = isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical'
                    deptColor = '#8b5cf6'
                  }

                  const isDone = ord.stage === 'completed' || ord.stage === 'ready_for_delivery' || ord.receipt_status === 'completed'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        {ord.project_reference || ord.order_number}
                      </td>
                      <td>
                        <strong>{ord.project_name || ord.item_description || 'مشروع تصنيع'}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.customer_name}</div>
                      </td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${deptColor}18`, color: deptColor, border: `1px solid ${deptColor}44` }}>
                          {deptLabel}
                        </span>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div>{ord.details_notes || ord.item_description || '—'}</div>
                        {ord.fixed_measurements && <div style={{ fontSize: 11, color: 'var(--accent)' }}>📐 {ord.fixed_measurements}</div>}
                      </td>
                      <td>{ord.planned_start ? formatDate(ord.planned_start) : ord.created_at ? formatDate(ord.created_at) : '—'}</td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        <span className={`badge ${isDone ? 'badge-done' : 'badge-prog'}`}>
                          {isDone ? (isRtl ? '✓ مكتمل' : 'Completed') : (isRtl ? '⏳ قيد التصنيع' : 'In Progress')}
                        </span>
                      </td>
                      <td>
                        {!isDone ? (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_iron_stage', { stage: 'completed' })}
                          >
                            ✓ {isRtl ? 'تأكيد الإنجاز' : 'Complete'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'منجز' : 'Done'}</span>
                        )}
                      </td>
                      {/* Note: Delete button is omitted in active orders as requested */}
                    </tr>
                  )
                })}
                {productionOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر تصنيع قائمة حالياً.' : 'No active production orders registered.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: قسم الحديد (Iron Department) */}
      {/* ========================================================================= */}
      {activeTab === 'iron' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                  🔩 {isRtl ? 'قسم الحديد' : 'Iron Department'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'إدارة تصنيع هياكل الحديد، استلام وبدء التصنيع، مرحلة الطلاء (اختياري)، وتسليم القطع.' : 'Structural iron fabrication, start manufacturing, painting phase (optional), and dispatch.'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowIronModal(true)}>
                + {isRtl ? 'أمر تصنيع جديد' : 'New Production Order'}
              </button>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? '1- رقم المرجع' : '1- Ref #'}</th>
                  <th>{isRtl ? '2- اسم المشروع' : '2- Project Name'}</th>
                  <th>{isRtl ? '3- مخططات وتفاصيل' : '3- Drawings & Details'}</th>
                  <th>{isRtl ? '4- تاريخ الاستلام' : '4- Receipt Date'}</th>
                  <th>{isRtl ? '5- موعد التسليم' : '5- Delivery Deadline'}</th>
                  <th>{isRtl ? '6- استلام وبدأ التصنيع' : '6- Started Mfg'}</th>
                  <th>{isRtl ? '7- مرحلة الطلاء' : '7- Painting Stage'}</th>
                  <th>{isRtl ? '8- إجراء المسار' : '8- Workflow Action'}</th>
                </tr>
              </thead>
              <tbody>
                {ironOrders.map(ord => {
                  const isStarted = ord.stage === 'started' || ord.receipt_status === 'started' || ord.stage === 'in_progress'
                  const isPainting = ord.paint_status === 'in_painting' || ord.stage === 'in_painting'
                  const isNoPaint = ord.paint_status === 'no_painting_needed' || !ord.requires_painting
                  const isDone = ord.stage === 'completed' || ord.receipt_status === 'completed'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        {ord.project_reference || ord.order_number}
                      </td>
                      <td>
                        <strong>{ord.project_name || ord.item_description || 'مشروع الحديد'}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.customer_name}</div>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div>{ord.details_notes || ord.item_description || '—'}</div>
                      </td>
                      <td>{ord.planned_start ? formatDate(ord.planned_start) : ord.created_at ? formatDate(ord.created_at) : '—'}</td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        {isStarted ? (
                          <span className="badge badge-prog">
                            ✓ {isRtl ? 'تم الاستلام وبدأ التصنيع' : 'Started Mfg'}
                          </span>
                        ) : (
                          <span className="badge badge-subtle">
                            {isRtl ? 'قيد الانتظار' : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isPainting ? (
                          <span className="badge" style={{ background: '#a855f722', color: '#a855f7', border: '1px solid #a855f755' }}>
                            🎨 {isRtl ? 'في مرحلة الطلاء' : 'In Painting'}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            🚫 {isRtl ? 'لا يحتاج طلاء' : 'No Painting Needed'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-xs btn-secondary"
                            style={{ fontSize: 10 }}
                            onClick={() => handleDepartmentAction(ord.id, 'toggle_painting', { paint_status: isPainting ? 'no_painting_needed' : 'in_painting' })}
                            title={isRtl ? 'تبديل حالة الطلاء' : 'Toggle Painting'}
                          >
                            🔄 {isRtl ? 'تبديل الطلاء' : 'Toggle Paint'}
                          </button>
                          {!isDone ? (
                            <button
                              className="btn btn-xs btn-primary"
                              style={{ fontSize: 10, background: '#10b981', borderColor: '#10b981' }}
                              onClick={() => handleDepartmentAction(ord.id, 'update_iron_stage', { stage: 'completed' })}
                            >
                              ✓ {isRtl ? 'إنهاء التصنيع' : 'Complete'}
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'مكتمل' : 'Done'}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {ironOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر مسجلة بقسم الحديد حالياً' : 'No iron orders registered'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: قسم الهنجر (Hangar Department) */}
      {/* ========================================================================= */}
      {activeTab === 'hangar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#06b6d4' }}>
                  🏭 {isRtl ? 'قسم الهنجر' : 'Hangar Department'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'لوحات بقياسات ثابتة أو مشاريع جديدة، تحديد العدد المطلوب، مرحلة الطلاء (إلزامي)، وتأكيد الجاهزية للتسليم.' : 'Fixed measurements or new projects, quantity specification, mandatory painting phase, and dispatch.'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowHangarModal(true)}>
                + {isRtl ? 'أمر تصنيع جديد' : 'New Production Order'}
              </button>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? '1- رقم المرجع' : '1- Ref #'}</th>
                  <th>{isRtl ? '2- نوع اللوحة / المشروع' : '2- Panel / Project'}</th>
                  <th>{isRtl ? '3- القياس / التفاصيل' : '3- Measurements / Specs'}</th>
                  <th>{isRtl ? '4- أ- العدد المطلوب' : '4- a- Required Qty'}</th>
                  <th>{isRtl ? 'ب- تاريخ الاستلام' : 'b- Receipt Date'}</th>
                  <th>{isRtl ? 'ج- موعد التسليم' : 'c- Delivery Deadline'}</th>
                  <th>{isRtl ? 'د- استلم وبدأ التصنيع' : 'd- Started Mfg'}</th>
                  <th>{isRtl ? 'ز- في مرحلة الطلاء (إلزامي)' : 'e- In Painting'}</th>
                  <th>{isRtl ? 'و- جاهز للتسليم' : 'f- Ready for Delivery'}</th>
                  <th>{isRtl ? 'إجراء المسار' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {hangarOrders.map(ord => {
                  const isStarted = ord.stage === 'started' || ord.receipt_status === 'started' || ord.stage === 'in_progress'
                  const isPainting = ord.stage === 'in_painting' || ord.paint_status === 'in_painting'
                  const isReady = ord.stage === 'ready_for_delivery' || ord.stage === 'completed'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        {ord.project_reference || ord.order_number}
                      </td>
                      <td>
                        {ord.is_new_type ? (
                          <span className="badge" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55' }}>
                            ★ {isRtl ? 'مشروع جديد' : 'New Project'}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: '#06b6d422', color: '#06b6d4', border: '1px solid #06b6d455' }}>
                            📐 {isRtl ? 'لوحات بقياسات ثابتة' : 'Fixed Measurements'}
                          </span>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {ord.project_name || ord.item_description}
                        </div>
                      </td>
                      <td>
                        {ord.fixed_measurements ? (
                          <strong style={{ color: '#06b6d4' }}>{ord.fixed_measurements}</strong>
                        ) : (
                          <div style={{ fontSize: 12 }}>{ord.details_notes || ord.item_description || 'مخطط مشروع جديد'}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 14 }}>
                        {ord.quantity || 1} {isRtl ? 'لوحة / قطعة' : 'pcs'}
                      </td>
                      <td>{ord.planned_start ? formatDate(ord.planned_start) : ord.created_at ? formatDate(ord.created_at) : '—'}</td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        {isStarted ? (
                          <span className="badge badge-prog">✓ {isRtl ? 'استلم وبدأ' : 'Started'}</span>
                        ) : (
                          <span className="badge badge-subtle">—</span>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{ background: '#a855f722', color: '#a855f7', border: '1px solid #a855f755' }}>
                          🎨 {isRtl ? 'في مرحلة الطلاء (إلزامي)' : 'Painting (Mandatory)'}
                        </span>
                      </td>
                      <td>
                        {isReady ? (
                          <span className="badge badge-done">✅ {isRtl ? 'جاهز للتسليم' : 'Ready'}</span>
                        ) : (
                          <span className="badge badge-subtle">⏳ {isRtl ? 'قيد العمل' : 'In Progress'}</span>
                        )}
                      </td>
                      <td>
                        {!isReady ? (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleDepartmentAction(ord.id, 'update_hangar_stage', { stage: 'ready_for_delivery' })}
                          >
                            ✓ {isRtl ? 'جاهز للتسليم' : 'Mark Ready'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'جاهز للتسليم' : 'Ready'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {hangarOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر مسجلة بقسم الهنجر حالياً' : 'No hangar orders registered'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: قسم الكهرباء والتجميع (Electrical & Assembly Department) */}
      {/* ========================================================================= */}
      {activeTab === 'electrical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>
                  ⚡ {isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical & Assembly Department'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'استلام المخططات والقطع، تجميع اللوحات وتمديد الأسلاك والبسبار، وتأكيد الجاهزية للفحص وضبط الجودة (بدون طلاء).' : 'Electrical assembly, wiring, busbar installation, and marking ready for inspection (no painting).'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowElectricalModal(true)}>
                + {isRtl ? 'أمر تصنيع جديد' : 'New Production Order'}
              </button>
            </div>
          </div>

          <div className="table-container card" style={{ padding: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? '1- رقم المرجع' : '1- Ref #'}</th>
                  <th>{isRtl ? '2- اسم المشروع' : '2- Project Name'}</th>
                  <th>{isRtl ? '3- مخططات وتفاصيل' : '3- Drawings & Details'}</th>
                  <th>{isRtl ? '4- تاريخ الاستلام' : '4- Receipt Date'}</th>
                  <th>{isRtl ? '5- موعد التسليم' : '5- Delivery Deadline'}</th>
                  <th>{isRtl ? '6- استلام وبدأ التصنيع' : '6- Started Mfg'}</th>
                  <th>{isRtl ? '7- جاهز للفحص' : '7- Ready for Inspection'}</th>
                  <th>{isRtl ? '8- إجراء المسار' : '8- Workflow Action'}</th>
                </tr>
              </thead>
              <tbody>
                {electricalOrders.map(ord => {
                  const isStarted = ord.stage === 'started' || ord.receipt_status === 'started' || ord.stage === 'in_progress'
                  const isReadyForQC = ord.stage === 'ready_for_inspection' || ord.stage === 'completed'

                  return (
                    <tr key={ord.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        {ord.project_reference || ord.order_number}
                      </td>
                      <td>
                        <strong>{ord.project_name || ord.item_description || 'مشروع الكهرباء والتجميع'}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ord.customer_name}</div>
                      </td>
                      <td style={{ maxWidth: 260 }}>
                        <div>{ord.details_notes || ord.item_description || '—'}</div>
                      </td>
                      <td>{ord.planned_start ? formatDate(ord.planned_start) : ord.created_at ? formatDate(ord.created_at) : '—'}</td>
                      <td>{ord.deadline ? formatDate(ord.deadline) : '—'}</td>
                      <td>
                        {isStarted ? (
                          <span className="badge badge-prog">
                            ✓ {isRtl ? 'تم الاستلام وبدأ التصنيع' : 'Started Mfg'}
                          </span>
                        ) : (
                          <span className="badge badge-subtle">
                            {isRtl ? 'قيد الانتظار' : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isReadyForQC ? (
                          <span className="badge badge-done">
                            🔍 {isRtl ? 'جاهز للفحص (معتمد)' : 'Ready for QC'}
                          </span>
                        ) : (
                          <span className="badge badge-prog">
                            ⏳ {isRtl ? 'قيد التجميع والأسلاك' : 'Wiring in Progress'}
                          </span>
                        )}
                      </td>
                      <td>
                        {!isReadyForQC ? (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, background: '#8b5cf6', borderColor: '#8b5cf6' }}
                            onClick={() => handleSendToQC(ord)}
                          >
                            🔍 {isRtl ? 'جاهز للفحص (إرسال للجودة)' : 'Send to QC'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'تم الفحص' : 'Inspected'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {electricalOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد أوامر مسجلة بقسم الكهرباء والتجميع حالياً' : 'No electrical orders registered'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: قسم الحديد (New Iron Order Modal) */}
      {/* ========================================================================= */}
      {showIronModal && (
        <div className="modal-backdrop" onClick={() => setShowIronModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateIronOrder}>
              <div className="modal-header">
                <h3>🔩 {isRtl ? 'أمر تصنيع جديد - قسم الحديد' : 'New Iron Production Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowIronModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المشروع المرتبط (رقم المرجع واسم المشروع) *' : 'Project (Ref & Name) *'}</label>
                  <select
                    className="input"
                    value={ironForm.project_id}
                    onChange={e => setIronForm({ ...ironForm, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'اسم القطعة أو هيكل الصاج المطلوب *' : 'Item Description *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: تفصيل هيكل حديد لوحة MDB سماكة 2 ملم' : 'e.g. Iron enclosure frame'}
                    value={ironForm.item_description}
                    onChange={e => setIronForm({ ...ironForm, item_description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ الاستلام *' : 'Receipt Date *'}</label>
                    <input
                      required
                      type="date"
                      className="input"
                      value={ironForm.receipt_date}
                      onChange={e => setIronForm({ ...ironForm, receipt_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'موعد التسليم' : 'Delivery Deadline'}</label>
                    <input
                      type="date"
                      className="input"
                      value={ironForm.deadline}
                      onChange={e => setIronForm({ ...ironForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'مرحلة الطلاء (اختياري)' : 'Painting Phase'}</label>
                  <select
                    className="input"
                    value={ironForm.paint_status}
                    onChange={e => setIronForm({ ...ironForm, paint_status: e.target.value })}
                  >
                    <option value="no_painting_needed">{isRtl ? 'لا يحتاج طلاء' : 'No Painting Needed'}</option>
                    <option value="in_painting">{isRtl ? 'في مرحلة الطلاء' : 'In Painting'}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'مخططات وتفاصيل المشروع' : 'Drawings & Details'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder={isRtl ? 'أدخل أرقام المخططات المعتمدة، القياسات، وتفاصيل تصنيع الحديد...' : 'Approved drawings, dimensions, notes...'}
                    value={ironForm.drawings_details}
                    onChange={e => setIronForm({ ...ironForm, drawings_details: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowIronModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ أمر التصنيع' : 'Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: قسم الهنجر (New Hangar Order Modal) */}
      {/* ========================================================================= */}
      {showHangarModal && (
        <div className="modal-backdrop" onClick={() => setShowHangarModal(false)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateHangarOrder}>
              <div className="modal-header">
                <h3>🏭 {isRtl ? 'أمر تصنيع جديد - قسم الهنجر' : 'New Hangar Production Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowHangarModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? '1- رقم المرجع واسم المشروع *' : '1- Ref & Project *'}</label>
                  <select
                    className="input"
                    value={hangarForm.project_id}
                    onChange={e => setHangarForm({ ...hangarForm, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? '2- نوع اللوحة' : '2- Panel Type'}</label>
                  <div style={{ display: 'flex', gap: 20, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="hangar_type"
                        value="fixed_measurements"
                        checked={hangarForm.hangar_type === 'fixed_measurements'}
                        onChange={() => setHangarForm({ ...hangarForm, hangar_type: 'fixed_measurements' })}
                      />
                      {isRtl ? 'لوحات بقياسات ثابتة' : 'Fixed Measurements Panel'}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="radio"
                        name="hangar_type"
                        value="new_project"
                        checked={hangarForm.hangar_type === 'new_project'}
                        onChange={() => setHangarForm({ ...hangarForm, hangar_type: 'new_project' })}
                      />
                      {isRtl ? 'مشروع جديد' : 'New Project'}
                    </label>
                  </div>
                </div>

                {/* 3- Fixed measurements options */}
                {hangarForm.hangar_type === 'fixed_measurements' ? (
                  <div>
                    <label className="label">{isRtl ? '3- خيارات القياسات الثابتة (اختر القياس) *' : '3- Standard Pre-set Measurement *'}</label>
                    <select
                      className="input"
                      value={hangarForm.fixed_measurement}
                      onChange={e => setHangarForm({ ...hangarForm, fixed_measurement: e.target.value })}
                    >
                      {HANGAR_FIXED_MEASUREMENTS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="label">{isRtl ? '3- تفاصيل ومخططات المشروع الجديد *' : '3- New Project Specs *'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'مثال: لوحة هنجر خاصة بمقاس 250X140X80 مع فواصل' : 'Custom hangar panel specifications'}
                      value={hangarForm.item_description}
                      onChange={e => setHangarForm({ ...hangarForm, item_description: e.target.value })}
                    />
                  </div>
                )}

                {/* 4- Fields: Quantity, Dates, Painting */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'أ- العدد المطلوب *' : 'a- Required Qty *'}</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="input"
                      value={hangarForm.quantity}
                      onChange={e => setHangarForm({ ...hangarForm, quantity: parseInt(e.target.value, 10) || 1 })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'ب- تاريخ الاستلام *' : 'b- Receipt Date *'}</label>
                    <input
                      required
                      type="date"
                      className="input"
                      value={hangarForm.receipt_date}
                      onChange={e => setHangarForm({ ...hangarForm, receipt_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'ج- موعد التسليم' : 'c- Delivery Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={hangarForm.deadline}
                      onChange={e => setHangarForm({ ...hangarForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(168, 85, 247, 0.25)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  🎨 <strong>{isRtl ? 'ملاحظة:' : 'Note:'}</strong> {isRtl ? 'في قسم الهنجر الطلاء إلزامي، ويتم إدراج الأمر مباشرة بمرحلة الطلاء عند الاستلام والبدء.' : 'In Hangar Dept, painting is mandatory.'}
                </div>

                <div>
                  <label className="label">{isRtl ? 'تفاصيل وملاحظات' : 'Details & Notes'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'أي ملاحظات إضافية على اللوحات وتجهيزها...' : 'Additional instructions...'}
                    value={hangarForm.notes}
                    onChange={e => setHangarForm({ ...hangarForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHangarModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ أمر الهنجر' : 'Save Hangar Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: قسم الكهرباء والتجميع (New Electrical Order Modal) */}
      {/* ========================================================================= */}
      {showElectricalModal && (
        <div className="modal-backdrop" onClick={() => setShowElectricalModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateElectricalOrder}>
              <div className="modal-header">
                <h3>⚡ {isRtl ? 'أمر تصنيع جديد - قسم الكهرباء والتجميع' : 'New Electrical & Assembly Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowElectricalModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? '1- رقم المرجع واسم المشروع *' : '1- Project Ref & Name *'}</label>
                  <select
                    className="input"
                    value={electricalForm.project_id}
                    onChange={e => setElectricalForm({ ...electricalForm, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.reference} - {p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? '2- اسم المشروع / اللوحة المطلوب تجميعها *' : '2- Panel / Assembly Title *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: تجميع وتوصيل لوحة تحكم رئيسية MDB 1600A' : 'Main MDB Panel Assembly'}
                    value={electricalForm.item_description}
                    onChange={e => setElectricalForm({ ...electricalForm, item_description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? '4- تاريخ الاستلام *' : '4- Receipt Date *'}</label>
                    <input
                      required
                      type="date"
                      className="input"
                      value={electricalForm.receipt_date}
                      onChange={e => setElectricalForm({ ...electricalForm, receipt_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? '5- موعد التسليم' : '5- Delivery Deadline'}</label>
                    <input
                      type="date"
                      className="input"
                      value={electricalForm.deadline}
                      onChange={e => setElectricalForm({ ...electricalForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? '3- مخططات وتفاصيل التجميع والأسلاك' : '3- Assembly & Wiring Specs'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder={isRtl ? 'تفاصيل المكونات، نوع القواطع، مخططات التوصيل، مواصفات البسبار...' : 'Wiring diagrams, busbar layout, component specs...'}
                    value={electricalForm.drawings_details}
                    onChange={e => setElectricalForm({ ...electricalForm, drawings_details: e.target.value })}
                  />
                </div>

                <div style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(139, 92, 246, 0.25)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  🔍 <strong>{isRtl ? 'ملاحظة:' : 'Note:'}</strong> {isRtl ? 'قسم الكهرباء والتجميع لا يحتاج طلاء؛ بعد انتهاء التصنيع يتم نقله مباشرة إلى "جاهز للفحص" للاعتماد من فريق الجودة.' : 'No painting required. Transferred directly to Ready for QC Inspection.'}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowElectricalModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ أمر التجميع' : 'Save Electrical Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
