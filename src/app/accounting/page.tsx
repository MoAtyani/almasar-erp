'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { Invoice, InvoiceState, InvoiceType } from '@/lib/types'
import { INVOICE_STATE_LABELS, formatCurrency, formatDate } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

interface LocalInvoice extends Invoice {
  partner_name_ar?: string
}

const SEED_INVOICES: LocalInvoice[] = [
  {
    id: 'inv-1',
    reference: 'INV/2026/0042',
    invoice_type: 'customer',
    partner_name: 'Saudi Electricity Co. (SEC)',
    partner_name_ar: 'الشركة السعودية للكهرباء (SEC)',
    invoice_date: '2026-10-10',
    due_date: '2026-11-10',
    state: 'posted',
    amount_untaxed: 185000,
    tax_amount: 27750,
    total_amount: 212750,
    notes: 'Main MDB Panel project 50% milestone billing',
    lines: [
      { id: 'l1', invoice_id: 'inv-1', description: 'MDB 2500A Form 4b Fabrication Milestone 1', quantity: 1, unit_price: 150000, total: 150000 },
      { id: 'l2', invoice_id: 'inv-1', description: 'Engineering Submittal & Protection Relay Testing', quantity: 1, unit_price: 35000, total: 35000 },
    ],
    created_at: '2026-10-10T10:00:00Z',
  },
  {
    id: 'inv-2',
    reference: 'INV/2026/0039',
    invoice_type: 'customer',
    partner_name: 'Al-Bawani Contracting',
    partner_name_ar: 'شركة البواني للمقاولات',
    invoice_date: '2026-09-25',
    due_date: '2026-10-25',
    state: 'paid',
    amount_untaxed: 94000,
    tax_amount: 14100,
    total_amount: 108100,
    notes: 'Substation SMDB and Capacitor Bank Panels',
    lines: [
      { id: 'l3', invoice_id: 'inv-2', description: 'Automatic Capacitor Bank 400 kVAR', quantity: 2, unit_price: 47000, total: 94000 },
    ],
    created_at: '2026-09-25T08:30:00Z',
  },
  {
    id: 'inv-3',
    reference: 'BILL/2026/0088',
    invoice_type: 'vendor',
    partner_name: 'Schneider Electric KSA',
    partner_name_ar: 'شنايدر إلكتريك السعودية',
    invoice_date: '2026-10-05',
    due_date: '2026-11-05',
    state: 'posted',
    amount_untaxed: 78500,
    tax_amount: 11775,
    total_amount: 90275,
    notes: 'Air Circuit Breakers (ACB) Masterpact MTZ2 3200A',
    lines: [
      { id: 'l4', invoice_id: 'inv-3', description: 'ACB MTZ2 3200A 4P Drawout', quantity: 2, unit_price: 39250, total: 78500 },
    ],
    created_at: '2026-10-05T14:15:00Z',
  },
  {
    id: 'inv-4',
    reference: 'BILL/2026/0091',
    invoice_type: 'vendor',
    partner_name: 'Rittal Enclosures Middle East',
    partner_name_ar: 'ريتال للوحات والهياكل المعدنية',
    invoice_date: '2026-10-18',
    due_date: '2026-11-18',
    state: 'draft',
    amount_untaxed: 32000,
    tax_amount: 4800,
    total_amount: 36800,
    notes: 'TS8 Modular Enclosures 2000x800x600 IP54',
    lines: [
      { id: 'l5', invoice_id: 'inv-4', description: 'TS8 Enclosure Frame with Glazed Door', quantity: 8, unit_price: 4000, total: 32000 },
    ],
    created_at: '2026-10-18T11:20:00Z',
  },
]

export default function AccountingPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [invoices, setInvoices] = useState<LocalInvoice[]>(SEED_INVOICES)
  const [activeTab, setActiveTab] = useState<InvoiceType>('customer')
  const [filterState, setFilterState] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<LocalInvoice | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    partner_name: '',
    invoice_type: 'customer' as InvoiceType,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  })

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    try {
      const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setInvoices(data as LocalInvoice[])
      }
    } catch {
      // Offline fallback to SEED_INVOICES
    }
  }

  const customerInvoices = invoices.filter(inv => inv.invoice_type === 'customer')
  const vendorBills = invoices.filter(inv => inv.invoice_type === 'vendor')

  // Financial Metrics
  const totalReceivables = customerInvoices
    .filter(i => i.state === 'posted')
    .reduce((s, i) => s + (i.total_amount || 0), 0)

  const totalPayables = vendorBills
    .filter(i => i.state === 'posted')
    .reduce((s, i) => s + (i.total_amount || 0), 0)

  const collectedRevenue = customerInvoices
    .filter(i => i.state === 'paid')
    .reduce((s, i) => s + (i.total_amount || 0), 0)

  const netCashFlow = collectedRevenue - vendorBills.filter(i => i.state === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0)

  const displayedList = activeTab === 'customer' ? customerInvoices : vendorBills

  const filtered = displayedList.filter(inv => {
    if (filterState !== 'all' && inv.state !== filterState) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      inv.reference.toLowerCase().includes(q) ||
      inv.partner_name.toLowerCase().includes(q) ||
      (inv.partner_name_ar && inv.partner_name_ar.includes(q))
    )
  })

  async function handleStateChange(id: string, newState: InvoiceState) {
    try {
      await supabase.from('invoices').update({ state: newState }).eq('id', id)
    } catch {}
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, state: newState } : inv))
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(prev => prev ? { ...prev, state: newState } : null)
    }
  }

  function handleAddItem() {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }]
    })
  }

  function handleRemoveItem(idx: number) {
    const next = formData.items.filter((_, i) => i !== idx)
    setFormData({ ...formData, items: next })
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault()
    const untaxed = formData.items.reduce((s, it) => s + (it.quantity * it.unit_price), 0)
    const vat = untaxed * 0.15
    const total = untaxed + vat

    const prefix = formData.invoice_type === 'customer' ? 'INV' : 'BILL'
    const newRef = `${prefix}/2026/00${invoices.length + 50}`

    const newInv: LocalInvoice = {
      id: `inv-${Date.now()}`,
      reference: newRef,
      invoice_type: formData.invoice_type,
      partner_name: formData.partner_name,
      partner_name_ar: formData.partner_name,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      state: 'draft',
      amount_untaxed: untaxed,
      tax_amount: vat,
      total_amount: total,
      notes: formData.notes,
      lines: formData.items.map((it, idx) => ({
        id: `line-${Date.now()}-${idx}`,
        invoice_id: `inv-${Date.now()}`,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: it.quantity * it.unit_price,
      })),
      created_at: new Date().toISOString(),
    }

    try {
      await supabase.from('invoices').insert({
        reference: newInv.reference,
        invoice_type: newInv.invoice_type,
        partner_name: newInv.partner_name,
        invoice_date: newInv.invoice_date,
        due_date: newInv.due_date,
        state: newInv.state,
        amount_untaxed: newInv.amount_untaxed,
        tax_amount: newInv.tax_amount,
        total_amount: newInv.total_amount,
        notes: newInv.notes,
      })
    } catch {}

    setInvoices([newInv, ...invoices])
    setShowCreateModal(false)
    setFormData({
      partner_name: '',
      invoice_type: 'customer',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
    })
  }

  return (
    <AppLayout
      title="Invoicing & Accounting"
      titleAr="الفواتير والمحاسبة"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ {isRtl ? 'طباعة كشف الحساب' : 'Print Statement'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            {isRtl ? '+ فاتورة جديدة / مطالبة' : '+ New Invoice / Bill'}
          </button>
        </div>
      }
    >
      {/* Financial Overview KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">📈</div>
          <div className="kpi-value">{formatCurrency(totalReceivables)}</div>
          <div className="kpi-label">{isRtl ? 'مستحقات وفواتير العملاء' : 'Accounts Receivable (Customers)'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'دفعات مرحلية مستحقة من مشاريع اللوحات' : 'Pending client milestone disbursements'}
          </div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">📉</div>
          <div className="kpi-value">{formatCurrency(totalPayables)}</div>
          <div className="kpi-label">{isRtl ? 'مستحقات الموردين ومشتريات المصنع' : 'Accounts Payable (Suppliers)'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'مستحقات النحاس والقواطع وهياكل الصاج' : 'Raw material & switchgear component dues'}
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">💰</div>
          <div className="kpi-value">{formatCurrency(collectedRevenue)}</div>
          <div className="kpi-label">{isRtl ? 'الإيرادات المحصلة (مدفوعة)' : 'Realized Revenue (Paid)'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'الفواتير المسددة خلال الفترة الحالية' : 'Settled invoices this fiscal period'}
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">⚖️</div>
          <div className="kpi-value">{formatCurrency(netCashFlow)}</div>
          <div className="kpi-label">{isRtl ? 'صافي السيولة النقدية للمصنع' : 'Net Factory Cashflow'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'الفائض التشغيلي بعد سداد الموردين' : 'Operational margin after supplier settlements'}
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${activeTab === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('customer')}
            >
              📄 {isRtl ? `فواتير العملاء (${customerInvoices.length})` : `Customer Invoices (${customerInvoices.length})`}
            </button>
            <button
              className={`btn ${activeTab === 'vendor' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('vendor')}
            >
              🏢 {isRtl ? `فواتير الموردين (${vendorBills.length})` : `Vendor Bills (${vendorBills.length})`}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              type="text"
              placeholder={isRtl ? '...بحث بالرقم أو اسم الشريك' : 'Search reference or company...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: 260 }}
            />
            <select
              value={filterState}
              onChange={e => setFilterState(e.target.value)}
              className="input"
              style={{ width: 140 }}
            >
              <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="draft">{isRtl ? 'مسودة' : 'Draft'}</option>
              <option value="posted">{isRtl ? 'مرحل' : 'Posted'}</option>
              <option value="paid">{isRtl ? 'مدفوع' : 'Paid'}</option>
              <option value="cancelled">{isRtl ? 'ملغى' : 'Cancelled'}</option>
            </select>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="table-container" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'رقم الفاتورة' : 'Reference'}</th>
                <th>{isRtl ? (activeTab === 'customer' ? 'العميل' : 'المورد') : (activeTab === 'customer' ? 'Customer' : 'Supplier')}</th>
                <th>{isRtl ? 'تاريخ الفاتورة' : 'Invoice Date'}</th>
                <th>{isRtl ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                <th>{isRtl ? 'غير شامل الضريبة' : 'Untaxed'}</th>
                <th>{isRtl ? 'ضريبة القيمة المضافة (15%)' : 'VAT (15%)'}</th>
                <th>{isRtl ? 'الإجمالي' : 'Total'}</th>
                <th>{isRtl ? 'الحالة' : 'Status'}</th>
                <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const badgeInfo = INVOICE_STATE_LABELS[inv.state] || { en: inv.state, ar: inv.state, color: '#6b7280' }
                const partnerName = isRtl && inv.partner_name_ar ? inv.partner_name_ar : inv.partner_name
                return (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedInvoice(inv)}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{inv.reference}</span>
                    </td>
                    <td>{partnerName}</td>
                    <td>{formatDate(inv.invoice_date)}</td>
                    <td>{formatDate(inv.due_date)}</td>
                    <td>{formatCurrency(inv.amount_untaxed)}</td>
                    <td>{formatCurrency(inv.tax_amount)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total_amount)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${badgeInfo.color}22`,
                          color: badgeInfo.color,
                          border: `1px solid ${badgeInfo.color}44`,
                        }}
                      >
                        {badgeInfo[lang] || badgeInfo.en}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {inv.state === 'draft' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleStateChange(inv.id, 'posted')}
                          >
                            {isRtl ? 'ترحيل' : 'Post'}
                          </button>
                        )}
                        {inv.state === 'posted' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStateChange(inv.id, 'paid')}
                          >
                            {isRtl ? 'تسجيل دفعة' : 'Register Payment'}
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          {isRtl ? 'عرض' : 'View'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    {isRtl ? 'لا توجد فواتير مطابقة لخيارات البحث.' : 'No records found matching filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View / Print Invoice Modal */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: 750 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 20 }}>{selectedInvoice.reference}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {isRtl ? 'شركة مصنع المسار للوحات الكهربائية — الرقم الضريبي: 31094829100003' : 'Al-Masar Switchgear Factory Co. — Tax ID: 31094829100003'}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>✕</button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {isRtl ? 'فاتورة إلى / الشريك:' : 'Bill To / Partner:'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {isRtl && selectedInvoice.partner_name_ar ? selectedInvoice.partner_name_ar : selectedInvoice.partner_name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {isRtl ? 'النوع:' : 'Type:'} {selectedInvoice.invoice_type === 'customer'
                      ? (isRtl ? 'فاتورة عميل (مستحقات)' : 'Customer Receivable')
                      : (isRtl ? 'فاتورة مورد (مطالبة)' : 'Vendor Bill')}
                  </div>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <div><span style={{ color: 'var(--text-secondary)' }}>{isRtl ? 'التاريخ:' : 'Date:'}</span> {formatDate(selectedInvoice.invoice_date)}</div>
                  <div><span style={{ color: 'var(--text-secondary)' }}>{isRtl ? 'الاستحقاق:' : 'Due:'}</span> {formatDate(selectedInvoice.due_date)}</div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${INVOICE_STATE_LABELS[selectedInvoice.state]?.color}22`,
                        color: INVOICE_STATE_LABELS[selectedInvoice.state]?.color,
                      }}
                    >
                      {isRtl ? 'الحالة:' : 'Status:'} {INVOICE_STATE_LABELS[selectedInvoice.state]?.[lang] || selectedInvoice.state}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>{isRtl ? 'بيان البند والخدمة' : 'Item Description'}</th>
                    <th style={{ width: 80, textAlign: 'center' }}>{isRtl ? 'الكمية' : 'Qty'}</th>
                    <th style={{ width: 120, textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th style={{ width: 120, textAlign: isRtl ? 'left' : 'right' }}>{isRtl ? 'المبلغ' : 'Amount'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.lines || []).map((line, idx) => (
                    <tr key={idx}>
                      <td>{line.description}</td>
                      <td style={{ textAlign: 'center' }}>{line.quantity}</td>
                      <td style={{ textAlign: isRtl ? 'left' : 'right' }}>{formatCurrency(line.unit_price)}</td>
                      <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: 600 }}>{formatCurrency(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: isRtl ? 'flex-start' : 'flex-end', marginTop: 20 }}>
                <div style={{ width: 280, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{isRtl ? 'المجموع قبل الضريبة:' : 'Untaxed Total:'}</span>
                    <span>{formatCurrency(selectedInvoice.amount_untaxed)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{isRtl ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}</span>
                    <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 8, fontWeight: 700, fontSize: 16 }}>
                    <span>{isRtl ? 'المبلغ الإجمالي المستحق:' : 'Total Amount:'}</span>
                    <span style={{ color: 'var(--accent)' }}>{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div style={{ marginTop: 16, padding: 12, backgroundColor: 'var(--bg-surface)', borderRadius: 8, fontSize: 13 }}>
                  <strong>{isRtl ? 'الملاحظات:' : 'Notes:'}</strong> {selectedInvoice.notes}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ {isRtl ? 'طباعة الفاتورة / الإيصال' : 'Print PDF / Receipt'}
              </button>
              {selectedInvoice.state === 'draft' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleStateChange(selectedInvoice.id, 'posted')}
                >
                  ✓ {isRtl ? 'تأكيد وترحيل' : 'Confirm & Post'}
                </button>
              )}
              {selectedInvoice.state === 'posted' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleStateChange(selectedInvoice.id, 'paid')}
                >
                  💵 {isRtl ? 'تسجيل السداد' : 'Mark Paid'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice / Bill Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-header">
                <h3>
                  {isRtl
                    ? (formData.invoice_type === 'customer' ? 'إنشاء فاتورة عميل جديدة' : 'إنشاء فاتورة مورد جديدة')
                    : `Create New ${formData.invoice_type === 'customer' ? 'Customer Invoice' : 'Vendor Bill'}`}
                </h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">{isRtl ? 'نوع المستند المالي' : 'Document Type'}</label>
                    <select
                      className="input"
                      value={formData.invoice_type}
                      onChange={e => setFormData({ ...formData, invoice_type: e.target.value as InvoiceType })}
                    >
                      <option value="customer">{isRtl ? 'فاتورة مبيعات عميل (مستحقات)' : 'Customer Invoice (فاتورة عميل)'}</option>
                      <option value="vendor">{isRtl ? 'فاتورة مشتريات مورد (مطالبة)' : 'Vendor Bill (فاتورة مورد)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      {isRtl
                        ? (formData.invoice_type === 'customer' ? 'اسم العميل' : 'اسم المورد / الشركة')
                        : (formData.invoice_type === 'customer' ? 'Customer Name' : 'Supplier / Vendor')}
                    </label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'مثال: الشركة السعودية للكهرباء' : 'e.g. Saudi Electricity Co.'}
                      value={formData.partner_name}
                      onChange={e => setFormData({ ...formData, partner_name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ الفاتورة' : 'Invoice Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.invoice_date}
                      onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={formData.due_date}
                      onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="label" style={{ marginBottom: 0 }}>
                      {isRtl ? 'بنود التكلفة وجدول الكميات (BoQ)' : 'Itemized Charges / BoQ Lines'}
                    </label>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddItem}>
                      {isRtl ? '+ إضافة بند' : '+ Add Item'}
                    </button>
                  </div>

                  {formData.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr auto', gap: 8, marginBottom: 8 }}>
                      <input
                        required
                        type="text"
                        placeholder={isRtl ? 'الوصف (مثال: تجميع خلية قاطع 1600 أمبير)' : 'Description (e.g. MDB 1600A Assembly)'}
                        className="input"
                        value={item.description}
                        onChange={e => {
                          const items = [...formData.items]
                          items[idx].description = e.target.value
                          setFormData({ ...formData, items })
                        }}
                      />
                      <input
                        required
                        type="number"
                        min="1"
                        placeholder={isRtl ? 'الكمية' : 'Qty'}
                        className="input"
                        value={item.quantity}
                        onChange={e => {
                          const items = [...formData.items]
                          items[idx].quantity = parseFloat(e.target.value) || 0
                          setFormData({ ...formData, items })
                        }}
                      />
                      <input
                        required
                        type="number"
                        min="0"
                        placeholder={isRtl ? 'سعر الوحدة ($)' : 'Unit Price ($)'}
                        className="input"
                        value={item.unit_price}
                        onChange={e => {
                          const items = [...formData.items]
                          items[idx].unit_price = parseFloat(e.target.value) || 0
                          setFormData({ ...formData, items })
                        }}
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات وشروط الدفع' : 'Notes & Payment Terms'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'شروط السداد: تحويل بنكي خلال 30 يوماً من تاريخ الاستلام.' : 'Payment terms: Net 30 days. Bank wire transfer.'}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'إنشاء الفاتورة' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
