'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { MRP_STATE_LABELS, formatDate } from '@/lib/constants'
import { MrpState } from '@/lib/types'
import { useLanguage } from '@/context/LanguageContext'

const MOCK_MRP_ORDERS = [
  {
    id: 'mo-1',
    reference: 'MO/2026/001',
    product_name: 'Main Distribution Board MDB 3200A Form 4b (لوحة توزيع رئيسية)',
    quantity: 1,
    state: 'in_progress' as MrpState,
    scheduled_date: '2026-10-25',
    project: { reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co.' },
    responsible: { full_name: 'Tariq Al-Harbi (طارق الحربي)' },
    notes: '6 columns modular assembly with busbar temperature sensors.',
  },
  {
    id: 'mo-2',
    reference: 'MO/2026/002',
    product_name: 'Motor Control Center MCC 160kW VFD (لوحة تحكم محركات)',
    quantity: 1,
    state: 'confirmed' as MrpState,
    scheduled_date: '2026-11-05',
    project: { reference: 'PJ-2026-002', customer_name: 'Al-Bawani Contracting' },
    responsible: { full_name: 'Eng. Ahmed Al-Mansoor' },
    notes: 'Soft starter drawers with Modbus RTU communication cards.',
  },
  {
    id: 'mo-3',
    reference: 'MO/2026/003',
    product_name: 'Automatic Capacitor Bank 400 kVAR (لوحة تحسين معامل القدرة)',
    quantity: 2,
    state: 'done' as MrpState,
    scheduled_date: '2026-10-18',
    project: { reference: 'PJ-2026-004', customer_name: 'Nesma Infrastructure' },
    responsible: { full_name: 'Mohammed Salem' },
    notes: 'Tested and verified under full harmonic detuning.',
  },
]

export default function ProductionPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [orders, setOrders] = useState<any[]>(MOCK_MRP_ORDERS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ project_id: '', product_name: '', quantity: '1', scheduled_date: '', notes: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const { data } = await supabase.from('mrp_orders').select('*, project:panel_projects(reference), responsible:profiles(full_name)').order('created_at', { ascending: false })
      if (data && data.length > 0) setOrders(data as any)
    } catch {}
  }

  function handleStateChange(id: string, nextState: MrpState) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, state: nextState } : o))
  }

  function handleCreateMO(e: React.FormEvent) {
    e.preventDefault()
    const newMo = {
      id: `mo-${Date.now()}`,
      reference: `MO/2026/00${orders.length + 1}`,
      product_name: form.product_name,
      quantity: parseFloat(form.quantity) || 1,
      state: 'confirmed' as MrpState,
      scheduled_date: form.scheduled_date,
      project: { reference: 'PJ-2026-001' },
      responsible: { full_name: 'Tariq Al-Harbi' },
      notes: form.notes,
    }
    setOrders([newMo, ...orders])
    setShowModal(false)
    setForm({ project_id: '', product_name: '', quantity: '1', scheduled_date: '', notes: '' })
  }

  return (
    <AppLayout
      title="Production (MRP) Orders"
      titleAr="أوامر التصنيع وتجميع اللوحات (MRP)"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ أمر تصنيع جديد (MO)' : '+ New MO'}
        </button>
      }
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">⚙️</div>
          <div className="kpi-value">{orders.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي أوامر التصنيع' : 'Total Orders'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">🔄</div>
          <div className="kpi-value">{orders.filter(o => o.state === 'in_progress').length}</div>
          <div className="kpi-label">{isRtl ? 'قيد التجميع بالورشة' : 'In Production'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✓</div>
          <div className="kpi-value">{orders.filter(o => o.state === 'done').length}</div>
          <div className="kpi-label">{isRtl ? 'أوامر تصنيع جاهزة' : 'Completed MOs'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">📋</div>
          <div className="kpi-value">{orders.filter(o => o.state === 'confirmed').length}</div>
          <div className="kpi-label">{isRtl ? 'أوامر مؤكدة ومجدولة' : 'Confirmed'}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          {isRtl ? 'أوامر تصنيع اللوحات الكهربائية وقوائم المواد (BoM)' : 'Manufacturing Orders & BoM Verification'}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'رقم أمر التصنيع' : 'MO REFERENCE'}</th>
                <th>{isRtl ? 'اللوحة / المنتج الكهربائي' : 'PANEL / PRODUCT'}</th>
                <th>{isRtl ? 'المشروع' : 'PROJECT'}</th>
                <th>{isRtl ? 'الكمية' : 'QTY'}</th>
                <th>{isRtl ? 'المشرف المسؤول' : 'SUPERVISOR'}</th>
                <th>{isRtl ? 'تاريخ الإنجاز المخطط' : 'TARGET DATE'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const info = MRP_STATE_LABELS[order.state]
                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{order.reference}</td>
                    <td>
                      <div><strong>{order.product_name}</strong></div>
                      {order.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.notes}</div>}
                    </td>
                    <td>
                      <span className="badge badge-subtle">{order.project?.reference || 'General'}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{order.quantity}</td>
                    <td>{order.responsible?.full_name || '—'}</td>
                    <td>{formatDate(order.scheduled_date)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${info.color}22`,
                          color: info.color,
                          border: `1px solid ${info.color}44`,
                        }}
                      >
                        {info[lang] || info.en}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {order.state === 'confirmed' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleStateChange(order.id, 'in_progress')}
                          >
                            {isRtl ? 'بدء التصنيع' : 'Start Assembly'}
                          </button>
                        )}
                        {order.state === 'in_progress' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStateChange(order.id, 'done')}
                          >
                            ✓ {isRtl ? 'اكتمال وتوجيه لـ QC' : 'Finish & Trigger QC'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateMO}>
              <div className="modal-header">
                <h3>{isRtl ? 'إنشاء أمر تصنيع لوحة كهربائية (MO)' : 'New Manufacturing Order'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'اسم اللوحة المطلوب تصنيعها' : 'Product / Panel Name'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'لوحة توزيع رئيسية MDB 2500A' : 'Main Distribution Board MDB 2500A'}
                    value={form.product_name}
                    onChange={e => setForm({ ...form, product_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الكمية (خلايا / وحدات)' : 'Quantity'}</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="input"
                      value={form.quantity}
                      onChange={e => setForm({ ...form, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ الإنجاز المخطط' : 'Scheduled Target'}</label>
                    <input
                      type="date"
                      className="input"
                      value={form.scheduled_date}
                      onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات خط الإنتاج وقائمة المواد' : 'BoM & Assembly Notes'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'المكونات: قاطع هوائي 2500 أمبير، قضبان بسبار نحاسي 10x80 ملم...' : 'Components: ACB 2500A, Copper busbar 10x80mm...'}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'تأكيد وإصدار الأمر' : 'Issue MO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
