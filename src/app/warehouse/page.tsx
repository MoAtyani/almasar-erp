'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { TRANSFER_STATE_LABELS, formatDate } from '@/lib/constants'
import { TransferType, TransferState, StockTransfer } from '@/lib/types'
import { useLanguage } from '@/context/LanguageContext'
import { MOCK_STOCK_TRANSFERS } from '@/lib/mockData'

const TYPE_LABELS: Record<TransferType, { en: string; ar: string; color: string }> = {
  incoming: { en: 'Incoming (Receipt)', ar: 'وارد (استلام من المورد)', color: '#0ea5e9' },
  internal: { en: 'Internal Transfer', ar: 'تحويل داخلي لخط الإنتاج', color: '#8b5cf6' },
  outgoing: { en: 'Outgoing (Delivery)', ar: 'صادر (تسليم لموقع العميل)', color: '#22c55e' },
}

export default function WarehousePage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [transfers, setTransfers] = useState<(StockTransfer & { project?: { reference: string } })[]>(MOCK_STOCK_TRANSFERS)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'internal'>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    transfer_type: 'incoming' as TransferType,
    origin: '',
    destination: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const { data } = await supabase.from('stock_transfers').select('*, project:panel_projects(reference), lines:stock_transfer_lines(*)').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setTransfers(data as any)
      }
    } catch {
      // keep mock
    }
  }

  function handleStateChange(id: string, newState: TransferState) {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, state: newState, done_date: newState === 'done' ? new Date().toISOString().split('T')[0] : t.done_date } : t))
  }

  function handleCreateTransfer(e: React.FormEvent) {
    e.preventDefault()
    const newTr = {
      id: `tr-${Date.now()}`,
      reference: form.transfer_type === 'incoming' ? `WH/IN/2026/00${transfers.length + 95}` : `WH/INT/2026/00${transfers.length + 50}`,
      transfer_type: form.transfer_type,
      state: 'ready' as TransferState,
      origin: form.origin,
      destination: form.destination,
      scheduled_date: form.scheduled_date,
      notes: form.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project: { reference: 'PJ-2026-001' },
      lines: [
        { id: `tl-${Date.now()}`, transfer_id: `tr-${Date.now()}`, product_name: 'Electrical Components Set', quantity_demand: 1, quantity_done: 0, unit: 'set' }
      ]
    }
    setTransfers([newTr, ...transfers])
    setShowModal(false)
    setForm({ transfer_type: 'incoming', origin: '', destination: '', scheduled_date: new Date().toISOString().split('T')[0], notes: '' })
  }

  const filtered = transfers.filter(t => {
    if (activeTab === 'all') return true
    return t.transfer_type === activeTab
  })

  const doneCount = transfers.filter(t => t.state === 'done').length
  const readyCount = transfers.filter(t => t.state === 'ready').length
  const draftCount = transfers.filter(t => t.state === 'draft').length

  return (
    <AppLayout
      title="Warehouse & Inventory Logistics"
      titleAr="المستودع وإدارة المخزون والتحويلات"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ تحويل مخزني جديد' : '+ New Transfer'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🏭</div>
          <div className="kpi-value">{transfers.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي الحركات المخزنية' : 'Total Transfers'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{draftCount}</div>
          <div className="kpi-label">{isRtl ? 'حركات قيد الانتظار' : 'Pending'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">📦</div>
          <div className="kpi-value">{readyCount}</div>
          <div className="kpi-label">{isRtl ? 'جاهزة للصرف أو الاستلام' : 'Ready to Move'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✓</div>
          <div className="kpi-value">{doneCount}</div>
          <div className="kpi-label">{isRtl ? 'حركات مكتملة' : 'Completed (Done)'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('all')}
            >
              📋 {isRtl ? 'جميع الحركات' : 'All Transfers'} ({transfers.length})
            </button>
            <button
              className={`btn ${activeTab === 'incoming' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('incoming')}
            >
              📥 {isRtl ? 'الوارد من الموردين' : 'Incoming Receipts'}
            </button>
            <button
              className={`btn ${activeTab === 'internal' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('internal')}
            >
              🔄 {isRtl ? 'التحويل الداخلي للورشة' : 'Internal Workshop'}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'المرجع' : 'REFERENCE'}</th>
                <th>{isRtl ? 'نوع الحركة' : 'TYPE'}</th>
                <th>{isRtl ? 'المشروع' : 'PROJECT'}</th>
                <th>{isRtl ? 'من مستودع / المصدر' : 'FROM'}</th>
                <th>{isRtl ? 'إلى الوجهة' : 'TO'}</th>
                <th>{isRtl ? 'التاريخ المجدول' : 'SCHEDULED'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tr => {
                const typeInfo = TYPE_LABELS[tr.transfer_type]
                const stateInfo = TRANSFER_STATE_LABELS[tr.state]
                return (
                  <tr key={tr.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{tr.reference}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${typeInfo.color}22`,
                          color: typeInfo.color,
                          border: `1px solid ${typeInfo.color}44`,
                        }}
                      >
                        {typeInfo[lang] || typeInfo.en}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-subtle">{tr.project?.reference || 'General'}</span>
                    </td>
                    <td>{tr.origin || '—'}</td>
                    <td><strong>{tr.destination || '—'}</strong></td>
                    <td>{formatDate(tr.scheduled_date)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${stateInfo.color}22`,
                          color: stateInfo.color,
                        }}
                      >
                        {stateInfo[lang] || stateInfo.en}
                      </span>
                    </td>
                    <td>
                      {tr.state !== 'done' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStateChange(tr.id, 'done')}
                        >
                          ✓ {isRtl ? 'تأكيد التسليم / الصرف' : 'Validate Move'}
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
            <form onSubmit={handleCreateTransfer}>
              <div className="modal-header">
                <h3>{isRtl ? 'إنشاء إذن نقل / استلام مخزني جديد' : 'New Stock Transfer'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'نوع الحركة المخزنية' : 'Transfer Type'}</label>
                  <select
                    className="input"
                    value={form.transfer_type}
                    onChange={e => setForm({ ...form, transfer_type: e.target.value as TransferType })}
                  >
                    <option value="incoming">{isRtl ? 'وارد من المورد (Receipt)' : 'Incoming Receipt'}</option>
                    <option value="internal">{isRtl ? 'تحويل داخلي لخط الإنتاج (Internal)' : 'Internal Move'}</option>
                    <option value="outgoing">{isRtl ? 'صادر للتسليم بموقع العميل (Delivery)' : 'Outgoing Delivery'}</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'المصدر (من)' : 'Source Location'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'مستودع المواد الخام' : 'Raw Materials WH'}
                      value={form.origin}
                      onChange={e => setForm({ ...form, origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الوجهة (إلى)' : 'Destination Location'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'ورشة تجميع البسبار' : 'Busbar Assembly Line'}
                      value={form.destination}
                      onChange={e => setForm({ ...form, destination: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'تاريخ الحركة المجدول' : 'Scheduled Date'}</label>
                  <input
                    type="date"
                    className="input"
                    value={form.scheduled_date}
                    onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'تأكيد وحفظ الإذن' : 'Save Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
