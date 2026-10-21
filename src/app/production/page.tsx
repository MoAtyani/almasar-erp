'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

type DepartmentTab = 'all' | 'factory_a' | 'factory_b' | 'electrical'

export default function ProductionPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<DepartmentTab>('all')
  const [orders, setOrders] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<any | null>(null)
  const [tvMode, setTvMode] = useState(false)

  // Order form
  const [orderForm, setOrderForm] = useState({
    project_id: '',
    department: 'factory_a',
    item_description: '',
    quantity: '1',
    requires_painting: true,
    planned_start: '',
    deadline: ''
  })

  // Projects list for dropdown
  const [projects, setProjects] = useState<any[]>([])
  const [catalogue, setCatalogue] = useState<any[]>([])

  useEffect(() => {
    loadData()
    // Poll every 10 seconds for real-time dashboard updates
    const timer = setInterval(() => {
      loadData(false)
    }, 10000)
    return () => clearInterval(timer)
  }, [activeTab])

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true)
    try {
      const deptParam = activeTab === 'all' ? '' : `&department=${activeTab}`
      const [ordRes, batRes, prjRes, catRes] = await Promise.all([
        fetch(`/api/production/orders?${deptParam}`).then(r => r.json()),
        fetch('/api/production/batches').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/production/catalogue').then(r => r.json())
      ])

      if (ordRes.success) setOrders(ordRes.data)
      if (batRes.success) setBatches(batRes.data)
      if (prjRes.success && prjRes.data?.length > 0) {
        setProjects(prjRes.data)
        setOrderForm(prev => ({ ...prev, project_id: prev.project_id || prjRes.data[0].id }))
      }
      if (catRes.success) setCatalogue(catRes.data)
    } catch (err) {
      console.error('Failed to load production data:', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  async function handleOrderAction(id: string, action: string, extra: any = {}) {
    try {
      const res = await fetch('/api/production/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...extra })
      })
      const data = await res.json()
      if (data.success) {
        loadData(false)
      } else {
        alert(data.error || 'Action failed')
      }
    } catch (err) {
      console.error('Order action error:', err)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: orderForm.project_id || projects[0]?.id,
          department: orderForm.department,
          item_description: orderForm.item_description,
          quantity: parseFloat(orderForm.quantity) || 1,
          requires_painting: orderForm.requires_painting,
          planned_start: orderForm.planned_start,
          deadline: orderForm.deadline
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowOrderModal(false)
        setOrderForm({
          project_id: '',
          department: 'factory_a',
          item_description: '',
          quantity: '1',
          requires_painting: true,
          planned_start: '',
          deadline: ''
        })
        loadData()
      } else {
        alert(data.error || 'Failed to create order')
      }
    } catch (err) {
      console.error('Create order error:', err)
    }
  }

  const STAGE_LABELS: Record<string, { en: string; ar: string; color: string }> = {
    awaiting_acceptance: { en: 'Awaiting Acceptance', ar: 'بانتظار قبول المصنع', color: '#f59e0b' },
    accepted: { en: 'Accepted', ar: 'تم القبول', color: '#3b82f6' },
    in_progress: { en: 'In Progress', ar: 'قيد التصنيع والتنفيذ', color: '#06b6d4' },
    manufacturing_complete: { en: 'Manufacturing Complete', ar: 'اكتمال التصنيع', color: '#10b981' },
    painting: { en: 'Paint Shop', ar: 'قسم الدهان الحراري', color: '#8b5cf6' },
    paint_qc: { en: 'Paint QC Check', ar: 'فحص دهان اللوحات', color: '#ec4899' },
    assembly: { en: 'Assembly', ar: 'التجميع والتركيب', color: '#6366f1' },
    qc_inspection: { en: 'QC Inspection', ar: 'فحص وضبط الجودة', color: '#f97316' },
    rework: { en: 'Rework Required', ar: 'إعادة العمل وتصحيح العيوب', color: '#ef4444' },
    ready_for_delivery: { en: 'Ready for Delivery', ar: 'جاهز للتسليم', color: '#22c55e' },
    packed: { en: 'Packed', ar: 'تم التغليف', color: '#14b8a6' },
    dispatched: { en: 'Dispatched', ar: 'تم الشحن', color: '#64748b' }
  }

  const DEPT_NAMES: Record<string, { en: string; ar: string; badge: string }> = {
    factory_a: { en: 'Factory A (Custom Metal)', ar: 'مصنع أ (أعمال الصاج المخصصة)', badge: 'tag-metal' },
    factory_b: { en: 'Factory B (Standard Panels)', ar: 'مصنع ب (اللوحات النمطية)', badge: 'tag-batch' },
    electrical: { en: 'Electrical (Busbar & Wires)', ar: 'قسم الكهرباء والبسبار والتحكم', badge: 'tag-electrical' }
  }

  return (
    <AppLayout
      title="Production Orders & Live Factory Lines"
      titleAr="أوامر التصنيع وإدارة خطوط المصانع (A, B, Electrical)"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn btn-sm ${tvMode ? 'btn-accent' : 'btn-secondary'}`}
            onClick={() => setTvMode(!tvMode)}
            title={isRtl ? 'وضع العرض على الشاشات الكبيرة' : 'Full Screen TV Mode'}
          >
            📺 {isRtl ? 'عرض الشاشة / TV' : 'TV Display'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowOrderModal(true)}>
            {isRtl ? '+ إصدار أمر تشغيل جديد' : '+ New Production Order'}
          </button>
        </div>
      }
    >
      {/* Department Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
        >
          {isRtl ? 'جميع الأقسام' : 'All Departments'} ({orders.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'factory_a' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('factory_a')}
        >
          🏭 {isRtl ? 'مصنع أ (الصاج المخصص)' : 'Factory A (Custom Metal)'}
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'factory_b' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('factory_b')}
        >
          📦 {isRtl ? 'مصنع ب (اللوحات النمطية والدفعات)' : 'Factory B (Batches)'}
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'electrical' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('electrical')}
        >
          ⚡ {isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical & Wiring'}
        </button>
      </div>

      {/* KPI Overview */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">⚙️</div>
          <div className="kpi-value">{orders.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي الأوامر المفتوحة' : 'Open Orders'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{orders.filter(o => o.stage === 'awaiting_acceptance').length}</div>
          <div className="kpi-label">{isRtl ? 'بانتظار قبول المصنع' : 'Awaiting Acceptance'}</div>
        </div>
        <div className="kpi-card info">
          <div className="kpi-icon info-bg">🎨</div>
          <div className="kpi-value">{orders.filter(o => o.stage === 'painting' || o.stage === 'paint_qc').length}</div>
          <div className="kpi-label">{isRtl ? 'في قسم الدهان' : 'Paint Shop'}</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚠️</div>
          <div className="kpi-value">{orders.filter(o => o.stage === 'rework').length}</div>
          <div className="kpi-label">{isRtl ? 'مطلوب إعادة عمل (QC)' : 'Rework Queue'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">🚚</div>
          <div className="kpi-value">{orders.filter(o => o.stage === 'ready_for_delivery').length}</div>
          <div className="kpi-label">{isRtl ? 'جاهز للتسليم والشحن' : 'Ready for Delivery'}</div>
        </div>
      </div>

      {/* Factory B Batch Tracking Section (when activeTab is factory_b or all) */}
      {(activeTab === 'all' || activeTab === 'factory_b') && batches.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              📦 {isRtl ? 'دفعات الإنتاج النمطية (Factory B Batches)' : 'Standard Panel Production Batches (Factory B)'}
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {batches.length} {isRtl ? 'دفعة مسجلة' : 'active batches'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الدفعة' : 'Batch #'}</th>
                  <th>{isRtl ? 'اللوحة النمطية والمواصفات' : 'Panel Type & Specs'}</th>
                  <th>{isRtl ? 'الكمية المخططة' : 'Planned Qty'}</th>
                  <th>{isRtl ? 'الكميات المرحلية' : 'Stage Breakdown'}</th>
                  <th>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th>{isRtl ? 'المشروع المرتبط' : 'Linked Project'}</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{b.batch_number}</td>
                    <td>
                      <div><strong>{isRtl && b.panel_name_ar ? b.panel_name_ar : b.panel_name}</strong></div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {b.width_mm}x{b.height_mm}x{b.thickness_mm}mm - {b.material}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{b.planned_quantity} {b.standard_uom || 'units'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                        <span className="badge badge-subtle">{isRtl ? 'صاج:' : 'Prod:'} {b.in_production_qty || 0}</span>
                        <span className="badge badge-subtle" style={{ color: '#8b5cf6' }}>{isRtl ? 'دهان:' : 'Paint:'} {b.painted_qty || 0}</span>
                        <span className="badge badge-subtle" style={{ color: '#10b981' }}>{isRtl ? 'تجميع:' : 'Assembled:'} {b.assembled_qty || 0}</span>
                      </div>
                    </td>
                    <td>
                      <span className="state-pill" style={{ background: '#3b82f622', color: '#3b82f6' }}>
                        {b.stage?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td>{b.project_reference || (b.is_stock_replenishment ? (isRtl ? 'مخزون السوق' : 'Market Stock') : '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Orders Live Queue */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{isRtl ? 'جاري تحميل الأوامر...' : 'Loading orders...'}</div>}
        
        {!loading && orders.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {isRtl ? 'لا توجد أوامر تشغيل في هذا القسم حالياً.' : 'No production orders currently in this department.'}
          </div>
        )}

        {orders.map(order => {
          const stageInfo = STAGE_LABELS[order.stage] || { en: order.stage, ar: order.stage, color: '#64748b' }
          const deptInfo = DEPT_NAMES[order.department] || { en: order.department, ar: order.department, badge: '' }

          return (
            <div key={order.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${stageInfo.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{order.order_number}</span>
                    <span
                      className="state-pill"
                      style={{ background: stageInfo.color + '22', color: stageInfo.color, border: `1px solid ${stageInfo.color}44` }}
                    >
                      {isRtl ? stageInfo.ar : stageInfo.en}
                    </span>
                    <span className="badge badge-subtle">{isRtl ? deptInfo.ar : deptInfo.en}</span>
                    {order.project_reference && (
                      <span className="badge badge-subtle" style={{ color: 'var(--accent)' }}>
                        {order.project_reference}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {order.item_description}
                  </div>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>📦 {isRtl ? 'الكمية:' : 'Qty:'} {order.quantity}</span>
                    <span>👤 {isRtl ? 'العميل:' : 'Customer:'} {order.customer_name}</span>
                    {order.deadline && (
                      <span style={{ color: new Date(order.deadline) < new Date() ? 'var(--danger)' : 'inherit' }}>
                        ⏰ {isRtl ? 'الموعد النهائي:' : 'Deadline:'} {formatDate(order.deadline)}
                      </span>
                    )}
                    {order.actual_start && (
                      <span>⏱️ {isRtl ? 'بدء العمل:' : 'Started:'} {formatDate(order.actual_start)}</span>
                    )}
                  </div>

                  {order.delay_reason && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, fontSize: 12, color: '#ef4444' }}>
                      ⚠️ {order.delay_reason}
                    </div>
                  )}
                </div>

                {/* Workflow Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180, alignItems: isRtl ? 'flex-start' : 'flex-end' }}>
                  {order.stage === 'awaiting_acceptance' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOrderAction(order.id, 'accept')}
                    >
                      ✓ {isRtl ? 'قبول أمر التشغيل' : 'Accept Order'}
                    </button>
                  )}

                  {order.stage === 'accepted' && (
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => handleOrderAction(order.id, 'start_work')}
                    >
                      ▶ {isRtl ? 'بدء التصنيع الفعلي' : 'Start Work'}
                    </button>
                  )}

                  {order.stage === 'in_progress' && (
                    <>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleOrderAction(order.id, 'complete_manufacturing')}
                      >
                        ✓ {isRtl ? 'اكتمال التصنيع' : 'Complete Manufacturing'}
                      </button>
                    </>
                  )}

                  {order.stage === 'manufacturing_complete' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {order.requires_painting ? (
                        <>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOrderAction(order.id, 'send_to_paint')}
                          >
                            🎨 {isRtl ? 'إرسال لقسم الدهان' : 'Send to Paint'}
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOrderAction(order.id, 'bypass_painting', { comment: 'Painting bypassed per project spec' })}
                            title={isRtl ? 'تخطي الدهان إذا لم يكن مطلوباً' : 'Bypass painting'}
                          >
                            ⚡ {isRtl ? 'تخطي الدهان' : 'Bypass Paint'}
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOrderAction(order.id, 'send_to_qc')}
                        >
                          🔍 {isRtl ? 'إرسال لفحص الجودة QC' : 'Send to QC'}
                        </button>
                      )}
                    </div>
                  )}

                  {order.stage === 'painting' && (
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => handleOrderAction(order.id, 'send_to_qc')}
                    >
                      🔍 {isRtl ? 'اكتمال الدهان وفحص الجودة' : 'Paint Complete & QC'}
                    </button>
                  )}

                  {order.stage === 'rework' && (
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => handleOrderAction(order.id, 'start_work', { comment: 'Rework started' })}
                    >
                      🔧 {isRtl ? 'بدء التصحيح وإعادة العمل' : 'Start Rework'}
                    </button>
                  )}

                  {order.stage === 'ready_for_delivery' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOrderAction(order.id, 'pack')}
                    >
                      📦 {isRtl ? 'تجهيز وتغليف اللوحة' : 'Pack Panel'}
                    </button>
                  )}

                  {order.stage === 'packed' && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleOrderAction(order.id, 'dispatch')}
                    >
                      🚚 {isRtl ? 'تأكيد الشحن والتسليم' : 'Confirm Dispatch'}
                    </button>
                  )}

                  {/* Audit History link */}
                  <button
                    className="btn btn-xs btn-secondary"
                    onClick={() => setSelectedOrderHistory(order)}
                    style={{ fontSize: 11 }}
                  >
                    📜 {isRtl ? 'سجل المراحل والملاحظات' : 'View History'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* History Modal */}
      {selectedOrderHistory && (
        <div className="modal-backdrop" onClick={() => setSelectedOrderHistory(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isRtl ? 'سجل حالات أمر التشغيل:' : 'Order History:'} {selectedOrderHistory.order_number}</h3>
              <button className="btn btn-secondary" onClick={() => setSelectedOrderHistory(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(selectedOrderHistory.status_history || []).map((h: any, idx: number) => (
                  <div key={idx} style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>{h.from_stage || 'START'} ➔ <strong>{h.to_stage}</strong></span>
                      <span>{formatDate(h.created_at)}</span>
                    </div>
                    {h.comment && <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-primary)' }}>{h.comment}</div>}
                  </div>
                ))}
                {(!selectedOrderHistory.status_history || selectedOrderHistory.status_history.length === 0) && (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{isRtl ? 'لا يوجد سجل سابق' : 'No history records yet'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="modal-backdrop" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-header">
                <h3>{isRtl ? 'إصدار أمر تشغيل وإنتاج جديد' : 'New Production Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المشروع المرتبط' : 'Linked Project'}</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم المستلم' : 'Department'}</label>
                    <select
                      className="input"
                      value={orderForm.department}
                      onChange={e => setOrderForm({ ...orderForm, department: e.target.value })}
                    >
                      <option value="factory_a">{isRtl ? 'مصنع أ (الصاج المخصص)' : 'Factory A (Custom Metal)'}</option>
                      <option value="factory_b">{isRtl ? 'مصنع ب (اللوحات النمطية)' : 'Factory B (Standard Panels)'}</option>
                      <option value="electrical">{isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical & Wiring'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الكمية' : 'Quantity'}</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={orderForm.quantity}
                      onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف القطعة / اللوحة المطلوب تصنيعها' : 'Item Description & Specs'}</label>
                  <textarea
                    required
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'هيكل لوحة صاج 2 ملم مجلفن دهان بودرة RAL 7035...' : 'MDB 2500A Main busbar frame...'}
                    value={orderForm.item_description}
                    onChange={e => setOrderForm({ ...orderForm, item_description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الموعد المخطط للبدء' : 'Planned Start'}</label>
                    <input
                      type="date"
                      className="input"
                      value={orderForm.planned_start}
                      onChange={e => setOrderForm({ ...orderForm, planned_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الموعد النهائي للتسليم' : 'Deadline'}</label>
                    <input
                      type="date"
                      className="input"
                      value={orderForm.deadline}
                      onChange={e => setOrderForm({ ...orderForm, deadline: e.target.value })}
                    />
                  </div>
                </div>

                {orderForm.department === 'factory_a' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="requires_painting"
                      checked={orderForm.requires_painting}
                      onChange={e => setOrderForm({ ...orderForm, requires_painting: e.target.checked })}
                    />
                    <label htmlFor="requires_painting" style={{ fontSize: 13, cursor: 'pointer' }}>
                      {isRtl ? 'يتطلب إرسال لقسم الدهان الحراري' : 'Requires Powder Coating / Painting'}
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'إصدار أمر التشغيل' : 'Issue Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
