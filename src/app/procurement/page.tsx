'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { PO_STATE_LABELS, formatDate, formatCurrency } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

export default function ProcurementPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<'orders' | 'project_costs'>('orders')
  const [pos, setPos] = useState<any[]>([])
  const [projectCosts, setProjectCosts] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deletingPo, setDeletingPo] = useState<any | null>(null)
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // New PO form with multi-line support
  const [form, setForm] = useState({
    project_id: '',
    supplier_name: '',
    supplier_contact: '',
    expected_delivery_date: '',
    notes: '',
    lines: [
      { item_description: '', quantity: 1, unit_price: 100 }
    ]
  })

  useEffect(() => {
    loadAll()
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects').then(r => r.json())
      if (res.success && res.data?.length > 0) {
        setProjects(res.data)
        setForm(f => ({ ...f, project_id: f.project_id || res.data[0].id }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function loadAll() {
    setLoading(true)
    try {
      const [oRes, cRes] = await Promise.all([
        fetch('/api/procurement?view=orders').then(r => r.json()),
        fetch('/api/procurement?view=project_costs').then(r => r.json())
      ])
      if (oRes.success && oRes.data) {
        setPos(oRes.data)
      }
      if (cRes.success && cRes.data) {
        setProjectCosts(cRes.data)
      }
    } catch (err) {
      console.error('Error loading procurement:', err)
    } finally {
      setLoading(false)
    }
  }

  function addLineItem() {
    setForm({
      ...form,
      lines: [...form.lines, { item_description: '', quantity: 1, unit_price: 0 }]
    })
  }

  function removeLineItem(index: number) {
    if (form.lines.length <= 1) return
    const updated = form.lines.filter((_, i) => i !== index)
    setForm({ ...form, lines: updated })
  }

  function updateLineItem(index: number, field: string, val: any) {
    const updated = [...form.lines]
    updated[index] = { ...updated[index], [field]: val }
    setForm({ ...form, lines: updated })
  }

  async function handleCreatePo(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_po',
          project_id: form.project_id || projects[0]?.id,
          supplier_name: form.supplier_name,
          supplier_contact: form.supplier_contact,
          expected_delivery_date: form.expected_delivery_date,
          lines: form.lines
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        setForm({
          project_id: projects[0]?.id || '',
          supplier_name: '',
          supplier_contact: '',
          expected_delivery_date: '',
          notes: '',
          lines: [{ item_description: '', quantity: 1, unit_price: 100 }]
        })
        loadAll()
      } else {
        alert(data.error || 'Failed to create PO')
      }
    } catch (err) {
      console.error(err)
    }
  }

  async function handleDeletePo() {
    if (!deletingPo) return
    try {
      const res = await fetch(`/api/procurement?id=${deletingPo.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingPo(null)
        loadAll()
      } else {
        alert(data.error || 'Failed to delete PO')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = pos.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.reference || '').toLowerCase().includes(q) ||
      (p.supplier_name || '').toLowerCase().includes(q) ||
      (p.project_reference || '').toLowerCase().includes(q) ||
      (p.project_name || '').toLowerCase().includes(q)
    )
  })

  const totalValue = pos.reduce((s, p) => s + (parseFloat(p.total_amount) || 0), 0)
  const confirmedCount = pos.filter(p => p.state === 'confirmed' || p.status === 'confirmed').length
  const receivedCount = pos.filter(p => p.state === 'fully_received' || p.status === 'fully_received').length

  const calculatedFormTotal = form.lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price)), 0)

  return (
    <AppLayout
      title="Procurement & Project Materials Purchasing"
      titleAr="المشتريات والتوريد وحساب تكاليف المشاريع"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ أمر شراء جديد (PO)' : '+ New Purchase Order'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🛒</div>
          <div className="kpi-value">{pos.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي أوامر الشراء' : 'Total Purchase Orders'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💰</div>
          <div className="kpi-value">{formatCurrency(totalValue)}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي قيمة المشتريات' : 'Total Procurement Value'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">📝</div>
          <div className="kpi-value">{confirmedCount}</div>
          <div className="kpi-label">{isRtl ? 'أوامر جارية ومؤكدة' : 'Confirmed Orders'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">📦</div>
          <div className="kpi-value">{receivedCount}</div>
          <div className="kpi-label">{isRtl ? 'المستلم في المستودع' : 'Received into Stock'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('orders')}
        >
          📜 {isRtl ? 'سجل أوامر الشراء والموردين' : 'Purchase Orders Registry'} ({pos.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'project_costs' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('project_costs')}
        >
          📊 {isRtl ? 'تكاليف المشتريات لكل مشروع' : 'Project Procurement Costs'} ({projectCosts.length})
        </button>
      </div>

      {/* TAB 1: Orders Registry */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {isRtl ? 'قائمة أوامر شراء المكونات والمواد' : 'Purchase Orders & Products Bought'}
            </div>
            <input
              type="text"
              className="input"
              style={{ width: 300 }}
              placeholder={isRtl ? '...بحث برقم الأمر، المورد، المشروع' : 'Search reference, supplier, project...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الأمر' : 'PO NUMBER'}</th>
                  <th>{isRtl ? 'المورد' : 'SUPPLIER'}</th>
                  <th>{isRtl ? 'المشروع المرتبط' : 'PROJECT'}</th>
                  <th>{isRtl ? 'القيمة الإجمالية' : 'TOTAL AMOUNT'}</th>
                  <th>{isRtl ? 'تاريخ التوريد' : 'EXPECTED DATE'}</th>
                  <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                  <th>{isRtl ? 'المنتجات المشتراة' : 'ITEMS'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(po => {
                  const isExpanded = expandedPoId === po.id
                  const lines = Array.isArray(po.lines) ? po.lines : []
                  return (
                    <>
                      <tr key={po.id}>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{po.reference || po.po_number}</td>
                        <td style={{ fontWeight: 600 }}>{po.supplier_name}</td>
                        <td>
                          {po.project_reference ? (
                            <span className="badge badge-subtle">{po.project_reference} - {po.project_name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>General Factory</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(po.total_amount)}</td>
                        <td>{formatDate(po.expected_delivery_date || po.expected_date)}</td>
                        <td>
                          <span className="badge badge-subtle" style={{ textTransform: 'uppercase' }}>
                            {po.status || po.state}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                          >
                            📦 {lines.length} {isRtl ? 'أصناف' : 'items'} {isExpanded ? '▲' : '▼'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={() => setDeletingPo(po)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${po.id}-lines`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <td colSpan={8} style={{ padding: '12px 24px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-secondary)' }}>
                              {isRtl ? 'تفاصيل المنتجات والمواد المشتراة في هذا الأمر:' : 'Products & Materials Purchased in this Order:'}
                            </div>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                  <th style={{ textAlign: isRtl ? 'right' : 'left', padding: '6px 0' }}>{isRtl ? 'الصنف / الوصف' : 'Description'}</th>
                                  <th style={{ textAlign: 'center', padding: '6px 0' }}>{isRtl ? 'الكمية' : 'Quantity'}</th>
                                  <th style={{ textAlign: 'right', padding: '6px 0' }}>{isRtl ? 'سعر الوحدة' : 'Unit Price'}</th>
                                  <th style={{ textAlign: 'right', padding: '6px 0' }}>{isRtl ? 'الإجمالي' : 'Total'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lines.map((l: any, idx: number) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '6px 0' }}>{l.item_description}</td>
                                    <td style={{ textAlign: 'center', padding: '6px 0' }}>{l.quantity}</td>
                                    <td style={{ textAlign: 'right', padding: '6px 0' }}>{formatCurrency(l.unit_price)}</td>
                                    <td style={{ textAlign: 'right', padding: '6px 0', fontWeight: 600 }}>{formatCurrency(l.total_price || (l.quantity * l.unit_price))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Project Procurement Costs */}
      {activeTab === 'project_costs' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {isRtl ? 'تحليل تكاليف المشتريات والمواد لكل مشروع' : 'Project Material Procurement Cost & Budget Analysis'}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'المشروع' : 'PROJECT'}</th>
                  <th>{isRtl ? 'العميل' : 'CUSTOMER'}</th>
                  <th>{isRtl ? 'قيمة العرض المالي' : 'QUOTATION BUDGET'}</th>
                  <th>{isRtl ? 'إجمالي تكلفة المشتريات' : 'PROCUREMENT COST'}</th>
                  <th>{isRtl ? 'نسبة المشتريات من العرض' : 'COST RATIO'}</th>
                  <th>{isRtl ? 'عدد أوامر الشراء' : 'PO COUNT'}</th>
                </tr>
              </thead>
              <tbody>
                {projectCosts.map(pc => {
                  const quote = parseFloat(pc.quotation_amount) || 0
                  const cost = parseFloat(pc.total_procurement_cost) || 0
                  const ratio = quote > 0 ? ((cost / quote) * 100).toFixed(1) : '0'

                  return (
                    <tr key={pc.project_id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {pc.project_reference} - {pc.project_name}
                      </td>
                      <td>{pc.customer_name}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(quote)}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(cost)}</td>
                      <td>
                        <span className="state-pill" style={{
                          background: Number(ratio) > 70 ? '#ef444422' : '#10b98122',
                          color: Number(ratio) > 70 ? '#ef4444' : '#10b981',
                        }}>
                          {ratio}%
                        </span>
                      </td>
                      <td>{pc.po_count} {isRtl ? 'أمر شراء' : 'POs'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 650 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreatePo}>
              <div className="modal-header">
                <h3>{isRtl ? 'إنشاء أمر شراء مواد وربطه بمشروع' : 'Create Purchase Order for Project'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المشروع المستفيد' : 'Assign to Project'}</label>
                  <select
                    className="input"
                    value={form.project_id}
                    onChange={e => setForm({ ...form, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.reference} - {p.customer_name} ({p.name})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم المورد / الشركة' : 'Supplier / Vendor'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'شنايدر إلكتريك / ABB' : 'Schneider Electric / ABB'}
                      value={form.supplier_name}
                      onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ التوريد المتوقع' : 'Expected Delivery'}</label>
                    <input
                      type="date"
                      className="input"
                      value={form.expected_delivery_date}
                      onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="label" style={{ margin: 0 }}>{isRtl ? 'أصناف المنتجات والمواد المشتراة' : 'Products & Line Items'}</label>
                    <button type="button" className="btn btn-xs btn-secondary" onClick={addLineItem}>
                      + {isRtl ? 'إضافة بند' : 'Add Item'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {form.lines.map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          required
                          type="text"
                          className="input"
                          style={{ flex: 3 }}
                          placeholder={isRtl ? 'وصف الصنف (مثلاً: قاطع 1600A Compact NSX)' : 'Product description...'}
                          value={line.item_description}
                          onChange={e => updateLineItem(idx, 'item_description', e.target.value)}
                        />
                        <input
                          required
                          type="number"
                          min="1"
                          className="input"
                          style={{ width: 70 }}
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                        />
                        <input
                          required
                          type="number"
                          step="0.01"
                          className="input"
                          style={{ width: 100 }}
                          placeholder="Price"
                          value={line.unit_price}
                          onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn-xs btn-danger"
                          onClick={() => removeLineItem(idx)}
                          disabled={form.lines.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                    {isRtl ? 'المجموع الإجمالي:' : 'Total PO Amount:'} {formatCurrency(calculatedFormTotal)}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ وإصدار أمر الشراء' : 'Save & Issue PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingPo && (
        <div className="modal-backdrop" onClick={() => setDeletingPo(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد حذف أمر الشراء' : 'Confirm Delete PO'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingPo(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف أمر الشراء "${deletingPo.reference || deletingPo.po_number}"؟` : `Are you sure you want to delete PO "${deletingPo.reference || deletingPo.po_number}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingPo(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeletePo}>
                {isRtl ? 'تأكيد الحذف' : 'Delete PO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
