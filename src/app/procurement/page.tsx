'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { PurchaseOrder, PoState } from '@/lib/types'
import { PO_STATE_LABELS, formatDate, formatCurrency } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'
import { MOCK_PURCHASE_ORDERS } from '@/lib/mockData'

export default function ProcurementPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [pos, setPos] = useState<(PurchaseOrder & { project?: { reference: string } })[]>(MOCK_PURCHASE_ORDERS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPo, setSelectedPo] = useState<any>(null)
  const [form, setForm] = useState({
    supplier_name: '', supplier_email: '', total_amount: '',
    expected_date: '', notes: '', project_id: 'proj-1'
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const { data } = await supabase.from('purchase_orders').select('*, project:panel_projects(reference), lines:purchase_order_lines(*)').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setPos(data as any)
      }
    } catch {
      // keep mock
    }
  }

  function handleStateChange(id: string, newState: PoState) {
    setPos(prev => prev.map(p => p.id === id ? { ...p, state: newState } : p))
  }

  function handleCreatePo(e: React.FormEvent) {
    e.preventDefault()
    const newPo = {
      id: `po-${Date.now()}`,
      reference: `PO/2026/0${140 + pos.length + 1}`,
      supplier_name: form.supplier_name,
      supplier_email: form.supplier_email,
      state: 'draft' as PoState,
      order_date: new Date().toISOString().split('T')[0],
      expected_date: form.expected_date,
      total_amount: parseFloat(form.total_amount) || 0,
      notes: form.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      project: { reference: 'PJ-2026-001' },
      lines: [
        { id: `pol-${Date.now()}`, po_id: `po-${Date.now()}`, product_name: 'Raw Materials & Breakers', quantity: 1, unit_price: parseFloat(form.total_amount) || 0, total_price: parseFloat(form.total_amount) || 0 }
      ]
    }
    setPos([newPo, ...pos])
    setShowModal(false)
    setForm({ supplier_name: '', supplier_email: '', total_amount: '', expected_date: '', notes: '', project_id: 'proj-1' })
  }

  const filtered = pos.filter(p =>
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(search.toLowerCase())
  )

  const openValue = pos.filter(p => ['draft', 'sent', 'confirmed'].includes(p.state)).reduce((s, p) => s + p.total_amount, 0)
  const receivedCount = pos.filter(p => p.state === 'received').length
  const draftCount = pos.filter(p => p.state === 'draft').length

  return (
    <AppLayout
      title="Procurement & Supplier POs"
      titleAr="المشتريات والتوريد وأوامر الشراء"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ أمر شراء جديد (PO)' : '+ New PO'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🛒</div>
          <div className="kpi-value">{pos.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي أوامر الشراء' : 'Total Orders'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">📝</div>
          <div className="kpi-value">{draftCount}</div>
          <div className="kpi-label">{isRtl ? 'مسودة أوامر شراء' : 'Draft POs'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">📦</div>
          <div className="kpi-value">{receivedCount}</div>
          <div className="kpi-label">{isRtl ? 'المستلم في المستودع' : 'Received into Stock'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💰</div>
          <div className="kpi-value">{formatCurrency(openValue)}</div>
          <div className="kpi-label">{isRtl ? 'قيمة المشتريات الجارية' : 'Open Commitment Value'}</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {isRtl ? 'سجل أوامر شراء المكونات والقواطع' : 'Purchase Orders Registry'}
          </div>
          <input
            type="text"
            className="input"
            style={{ width: 280 }}
            placeholder={isRtl ? '...بحث برقم الأمر أو المورد' : 'Search by reference or supplier...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'المرجع' : 'REFERENCE'}</th>
                <th>{isRtl ? 'المورد / الشركة المصنعة' : 'SUPPLIER'}</th>
                <th>{isRtl ? 'المشروع' : 'PROJECT'}</th>
                <th>{isRtl ? 'إجمالي القيمة' : 'AMOUNT'}</th>
                <th>{isRtl ? 'تاريخ التوريد المتوقع' : 'EXPECTED'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(po => {
                const info = PO_STATE_LABELS[po.state]
                return (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{po.reference}</td>
                    <td>
                      <div><strong>{po.supplier_name}</strong></div>
                      {po.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{po.notes}</div>}
                    </td>
                    <td>
                      <span className="badge badge-subtle">{po.project?.reference || 'General'}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(po.total_amount)}</td>
                    <td>{formatDate(po.expected_date)}</td>
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
                        {po.state === 'draft' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleStateChange(po.id, 'sent')}
                          >
                            {isRtl ? 'إرسال للمورد' : 'Send to Vendor'}
                          </button>
                        )}
                        {po.state === 'sent' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStateChange(po.id, 'confirmed')}
                          >
                            {isRtl ? 'تأكيد الطلب' : 'Confirm Order'}
                          </button>
                        )}
                        {po.state === 'confirmed' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStateChange(po.id, 'received')}
                          >
                            {isRtl ? 'استلام في المستودع' : 'Receive in WH'}
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
            <form onSubmit={handleCreatePo}>
              <div className="modal-header">
                <h3>{isRtl ? 'إنشاء أمر شراء توريد مكونات جديد' : 'Create Purchase Order (PO)'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'اسم المورد / الشركة' : 'Supplier Name'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: شركة ريتال للهياكل المعدنية' : 'e.g. Schneider Electric KSA'}
                    value={form.supplier_name}
                    onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'إجمالي القيمة ($)' : 'Total Amount ($)'}</label>
                    <input
                      required
                      type="number"
                      className="input"
                      placeholder="45000"
                      value={form.total_amount}
                      onChange={e => setForm({ ...form, total_amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ التوريد المتوقع' : 'Expected Delivery Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={form.expected_date}
                      onChange={e => setForm({ ...form, expected_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'المواصفات والملاحظات' : 'Specification & Notes'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'قواطع هوائية 3200 أمبير مع وحدات حماية رقمية...' : 'Masterpact MTZ2 ACBs with Micrologic...'}
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
                  {isRtl ? 'حفظ أمر الشراء' : 'Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
