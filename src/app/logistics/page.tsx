'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { TRANSFER_STATE_LABELS, formatDate } from '@/lib/constants'
import { TransferState } from '@/lib/types'
import { useLanguage } from '@/context/LanguageContext'

const MOCK_DELIVERIES = [
  {
    id: 'del-1',
    reference: 'DN/2026/0018',
    project: { reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co. (الشركة السعودية للكهرباء)' },
    origin: 'Al-Masar Factory Bay 2 (مصنع المسار - البوابة 2)',
    destination: 'Riyadh Central Substation 132kV Site (موقع محطة الرياض)',
    scheduled_date: '2026-11-20',
    state: 'ready' as TransferState,
    notes: 'Transport via low-bed trailer with hydraulic lifting crane. Rainproof protective shrink wrapping applied.',
  },
  {
    id: 'del-2',
    reference: 'DN/2026/0019',
    project: { reference: 'PJ-2026-003', customer_name: 'Saudi Binladin Group' },
    origin: 'Al-Masar Finished Storage',
    destination: 'Makkah Hospital Substation',
    scheduled_date: '2026-10-18',
    done_date: '2026-10-18',
    state: 'done' as TransferState,
    notes: 'Signed delivery note and client handover certificate received.',
  },
]

export default function LogisticsPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [deliveries, setDeliveries] = useState<any[]>(MOCK_DELIVERIES)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ project_id: '', origin: '', destination: '', scheduled_date: '', notes: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const { data } = await supabase.from('stock_transfers').select('*, project:panel_projects(reference,customer_name)').eq('transfer_type', 'outgoing').order('created_at', { ascending: false })
      if (data && data.length > 0) setDeliveries(data as any)
    } catch {}
  }

  function handleStateChange(id: string, newState: TransferState) {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, state: newState, done_date: newState === 'done' ? new Date().toISOString().split('T')[0] : d.done_date } : d))
  }

  function handleCreateDelivery(e: React.FormEvent) {
    e.preventDefault()
    const newDel = {
      id: `del-${Date.now()}`,
      reference: `DN/2026/00${deliveries.length + 20}`,
      project: { reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co.' },
      origin: form.origin || 'Al-Masar Factory',
      destination: form.destination,
      scheduled_date: form.scheduled_date,
      state: 'ready' as TransferState,
      notes: form.notes,
    }
    setDeliveries([newDel, ...deliveries])
    setShowModal(false)
    setForm({ project_id: '', origin: '', destination: '', scheduled_date: '', notes: '' })
  }

  const packingCount = deliveries.filter(d => d.state === 'draft').length
  const readyCount = deliveries.filter(d => d.state === 'ready').length
  const doneCount = deliveries.filter(d => d.state === 'done').length

  return (
    <AppLayout
      title="Logistics & Dispatch"
      titleAr="اللوجستيات والشحن وتسليم اللوحات"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ إذن تسليم وشحن جديد' : '+ New Delivery'}
        </button>
      }
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🚚</div>
          <div className="kpi-value">{deliveries.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي أذونات الشحن' : 'Total Deliveries'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">📦</div>
          <div className="kpi-value">{packingCount}</div>
          <div className="kpi-label">{isRtl ? 'قيد التغليف والتجهيز' : 'Packing'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">🚛</div>
          <div className="kpi-value">{readyCount}</div>
          <div className="kpi-label">{isRtl ? 'جاهزة للنقل للموقع' : 'Ready to Ship'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✓</div>
          <div className="kpi-value">{doneCount}</div>
          <div className="kpi-label">{isRtl ? 'تم التسليم بالموقع' : 'Delivered & Signed'}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          {isRtl ? 'جدول أذونات التسليم الميداني للوحات' : 'Site Delivery Notes & Handover Log'}
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'إذن التسليم' : 'REFERENCE'}</th>
                <th>{isRtl ? 'العميل / المشروع' : 'CUSTOMER / PROJECT'}</th>
                <th>{isRtl ? 'من (موقع المصنع)' : 'FROM'}</th>
                <th>{isRtl ? 'إلى (موقع التركيب)' : 'TO (SITE)'}</th>
                <th>{isRtl ? 'التاريخ المجدول' : 'SCHEDULED'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(del => {
                const info = TRANSFER_STATE_LABELS[del.state]
                return (
                  <tr key={del.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{del.reference}</td>
                    <td>
                      <div><strong>{del.project?.customer_name}</strong></div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{del.project?.reference}</div>
                    </td>
                    <td>{del.origin}</td>
                    <td><strong>{del.destination}</strong></td>
                    <td>{formatDate(del.scheduled_date)}</td>
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
                      {del.state !== 'done' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStateChange(del.id, 'done')}
                        >
                          ✓ {isRtl ? 'تأكيد التسليم وتوقيع العميل' : 'Confirm Handover'}
                        </button>
                      )}
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
            <form onSubmit={handleCreateDelivery}>
              <div className="modal-header">
                <h3>{isRtl ? 'إنشاء إذن تسليم وشحن لوحة كهربائية' : 'New Dispatch Delivery Note'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'موقع التحميل (المصنع)' : 'Dispatch Origin'}</label>
                  <input
                    type="text"
                    className="input"
                    value={form.origin || 'Al-Masar Factory — Loading Bay 2'}
                    onChange={e => setForm({ ...form, origin: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'وجهة التسليم (موقع العميل والمحطة)' : 'Delivery Destination (Site)'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'محطة الرياض المركزية 132 ك.ف' : 'Riyadh Central Substation Site'}
                    value={form.destination}
                    onChange={e => setForm({ ...form, destination: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'تاريخ الشحن والتسليم المجدول' : 'Scheduled Date'}</label>
                  <input
                    type="date"
                    className="input"
                    value={form.scheduled_date}
                    onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'تعليمات النقل والرافعات' : 'Handling & Crane Instructions'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'نقل عبر شاحنة مسطحة هيدروليكية، عدم إمالة اللوحة، تغليف ضد المطر...' : 'Flatbed crane transport, do not tilt...'}
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
                  {isRtl ? 'إصدار إذن الشحن' : 'Issue Delivery Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
