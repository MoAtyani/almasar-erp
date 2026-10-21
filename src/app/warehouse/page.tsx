'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

export default function WarehousePage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<'catalogue' | 'ledger'>('catalogue')
  const [items, setItems] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showItemModal, setShowItemModal] = useState(false)
  const [showAdjustModal, setShowAdjustModal] = useState<any | null>(null)
  
  // New item form
  const [itemForm, setItemForm] = useState({
    sku: '',
    description: '',
    description_ar: '',
    category: 'electrical_components',
    uom: 'pcs',
    qty_on_hand: 10,
    reorder_threshold: 5,
    purchase_cost: 100
  })

  // Adjustment form
  const [adjustQty, setAdjustQty] = useState('1')
  const [adjustType, setAdjustType] = useState('stock_adjustment')
  const [adjustNotes, setAdjustNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [activeTab])

  async function loadData() {
    setLoading(true)
    try {
      if (activeTab === 'catalogue') {
        const res = await fetch('/api/inventory?view=items').then(r => r.json())
        if (res.success) setItems(res.data)
      } else {
        const res = await fetch('/api/inventory?view=ledger').then(r => r.json())
        if (res.success) setLedger(res.data)
      }
    } catch (err) {
      console.error('Failed to load warehouse data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'item',
          ...itemForm
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowItemModal(false)
        loadData()
      } else {
        alert(data.error || 'Failed to create item')
      }
    } catch (err) {
      console.error('Create item error:', err)
    }
  }

  async function handleRecordAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!showAdjustModal) return

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transaction',
          item_id: showAdjustModal.id,
          transaction_type: adjustType,
          quantity_change: parseFloat(adjustQty),
          notes: adjustNotes
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowAdjustModal(null)
        setAdjustQty('1')
        setAdjustNotes('')
        loadData()
      } else {
        alert(data.error || 'Transaction failed')
      }
    } catch (err) {
      console.error('Adjustment error:', err)
    }
  }

  const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
    finished_goods: { en: 'Finished Panels', ar: 'لوحات جاهزة' },
    raw_materials: { en: 'Raw Materials & Copper', ar: 'مواد أولية وبسبار' },
    electrical_components: { en: 'Breakers & Electrical', ar: 'قواطع ومكونات كهربائية' },
    panel_stock: { en: 'Modular Enclosures', ar: 'هياكل صاج نمطية' },
    consumables: { en: 'Powder & Consumables', ar: 'بودرة دهان ومستهلكات' },
    company_supplies: { en: 'Factory Supplies', ar: 'مستلزمات عامة' }
  }

  return (
    <AppLayout
      title="Warehouse & Stock Transaction Ledger"
      titleAr="المستودعات، كتالوج المواد وسجل حركات المخزون (Stock Ledger)"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowItemModal(true)}>
            {isRtl ? '+ إضافة صنف للكتالوج' : '+ Add Inventory Item'}
          </button>
        </div>
      }
    >
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${activeTab === 'catalogue' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('catalogue')}
        >
          📦 {isRtl ? 'كتالوج الأصناف والرصيد الفعلي' : 'Item Catalogue & Balances'}
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ledger')}
        >
          📜 {isRtl ? 'سجل حركات المخزون المالي (Audit Ledger)' : 'Stock Movement Ledger'}
        </button>
      </div>

      {/* Catalogue View */}
      {activeTab === 'catalogue' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'رمز الصنف (SKU)' : 'SKU Code'}</th>
                  <th>{isRtl ? 'الوصف والتفاصيل' : 'Item Description'}</th>
                  <th>{isRtl ? 'التصنيف' : 'Category'}</th>
                  <th>{isRtl ? 'الرصيد الفعلي' : 'On Hand'}</th>
                  <th>{isRtl ? 'المحجوز للمشاريع' : 'Reserved'}</th>
                  <th>{isRtl ? 'المتاح للصرف' : 'Available'}</th>
                  <th>{isRtl ? 'حد إعادة الطلب' : 'Reorder Alert'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(itm => {
                  const cat = CATEGORY_LABELS[itm.category] || { en: itm.category, ar: itm.category }
                  const isLowStock = parseFloat(itm.qty_available) <= parseFloat(itm.reorder_threshold)

                  return (
                    <tr key={itm.id} style={{ background: isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'inherit' }}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{itm.sku}</td>
                      <td>
                        <div><strong>{isRtl && itm.description_ar ? itm.description_ar : itm.description}</strong></div>
                        {itm.specifications && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itm.specifications}</div>}
                      </td>
                      <td>
                        <span className="badge badge-subtle">{isRtl ? cat.ar : cat.en}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{itm.qty_on_hand} {itm.uom}</td>
                      <td style={{ color: '#f59e0b' }}>{itm.qty_reserved || 0} {itm.uom}</td>
                      <td style={{ fontWeight: 700, color: isLowStock ? '#ef4444' : '#10b981' }}>
                        {itm.qty_available} {itm.uom}
                      </td>
                      <td>
                        {isLowStock ? (
                          <span className="state-pill" style={{ background: '#ef444422', color: '#ef4444' }}>
                            ⚠️ {isRtl ? 'تحت الحد الأدنى' : 'Low Stock'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itm.reorder_threshold} {itm.uom}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-xs btn-secondary"
                          onClick={() => setShowAdjustModal(itm)}
                        >
                          ⚡ {isRtl ? 'تسوية / صرف' : 'Adjust / Issue'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Ledger View */}
      {activeTab === 'ledger' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th>{isRtl ? 'الصنف' : 'Item SKU'}</th>
                  <th>{isRtl ? 'نوع الحركة' : 'Transaction Type'}</th>
                  <th>{isRtl ? 'التغير في الكمية' : 'Qty Change'}</th>
                  <th>{isRtl ? 'الرصيد السابق' : 'Before'}</th>
                  <th>{isRtl ? 'الرصيد الجديد' : 'After'}</th>
                  <th>{isRtl ? 'المستند المرجعي' : 'Reference Doc'}</th>
                  <th>{isRtl ? 'الملاحظات' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(l.created_at)}</td>
                    <td style={{ fontWeight: 700 }}>{l.sku}</td>
                    <td>
                      <span className="badge badge-subtle">{l.transaction_type?.replace(/_/g, ' ').toUpperCase()}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: parseFloat(l.quantity_change) > 0 ? '#10b981' : '#ef4444' }}>
                      {parseFloat(l.quantity_change) > 0 ? `+${l.quantity_change}` : l.quantity_change}
                    </td>
                    <td>{l.balance_before}</td>
                    <td style={{ fontWeight: 700 }}>{l.balance_after}</td>
                    <td>{l.reference_document || '-'}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{l.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust / Issue Modal */}
      {showAdjustModal && (
        <div className="modal-backdrop" onClick={() => setShowAdjustModal(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleRecordAdjustment}>
              <div className="modal-header">
                <h3>{isRtl ? 'تسوية أو صرف مخزني للصنف:' : 'Stock Transaction:'} {showAdjustModal.sku}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(null)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'نوع الحركة' : 'Transaction Type'}</label>
                  <select
                    className="input"
                    value={adjustType}
                    onChange={e => setAdjustType(e.target.value)}
                  >
                    <option value="goods_issued">{isRtl ? 'صرف للإنتاج (Goods Issued -)' : 'Goods Issued (-)'}</option>
                    <option value="goods_received">{isRtl ? 'استلام وتوريد (Goods Received +)' : 'Goods Received (+)'}</option>
                    <option value="stock_adjustment">{isRtl ? 'تسوية جردية (Adjustment)' : 'Stock Adjustment'}</option>
                    <option value="damaged">{isRtl ? 'تسجيل تالف (Damaged -)' : 'Damaged Stock (-)'}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'الكمية (موجب للإضافة أو سالب للخصم)' : 'Quantity Change (+ or -)'}</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    className="input"
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات وسند الإخراج' : 'Reason / Reference Notes'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'صرف لتجميع لوحة MDB مشروع محطة الرياض...' : 'Issued for project MDB assembly...'}
                    value={adjustNotes}
                    onChange={e => setAdjustNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjustModal(null)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'تسجيل الحركة في السجل' : 'Commit Ledger Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
