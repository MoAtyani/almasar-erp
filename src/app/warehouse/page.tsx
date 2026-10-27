'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate, formatCurrency } from '@/lib/constants'

export default function WarehousePage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<'catalogue' | 'ledger'>('catalogue')
  const [items, setItems] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Modals
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [deletingItem, setDeletingItem] = useState<any | null>(null)
  const [showAssignModal, setShowAssignModal] = useState<any | null>(null)
  const [showAdjustModal, setShowAdjustModal] = useState<any | null>(null)

  // Item form
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

  // Assign to User for Project form
  const [assignForm, setAssignForm] = useState({
    project_id: '',
    assigned_to_user_id: '',
    quantity: 1,
    notes: ''
  })

  // Quick Adjustment form
  const [adjustQty, setAdjustQty] = useState('1')
  const [adjustType, setAdjustType] = useState('stock_adjustment')
  const [adjustNotes, setAdjustNotes] = useState('')

  useEffect(() => {
    loadData()
    loadAuxData()
  }, [activeTab])

  async function loadAuxData() {
    try {
      const [pRes, eRes] = await Promise.all([
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/hr?view=employees').then(r => r.json())
      ])
      if (pRes.success && pRes.data) {
        setProjects(pRes.data)
        setAssignForm(f => ({ ...f, project_id: f.project_id || pRes.data[0]?.id }))
      }
      if (eRes.success && eRes.data) {
        setEmployees(eRes.data)
        setAssignForm(f => ({ ...f, assigned_to_user_id: f.assigned_to_user_id || eRes.data[0]?.profile_id || eRes.data[0]?.id }))
      }
    } catch (err) {
      console.error(err)
    }
  }

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

  function openCreateItemModal() {
    setEditingItem(null)
    setItemForm({
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      description: '',
      description_ar: '',
      category: 'electrical_components',
      uom: 'pcs',
      qty_on_hand: 10,
      reorder_threshold: 5,
      purchase_cost: 100
    })
    setShowItemModal(true)
  }

  function openEditItemModal(itm: any) {
    setEditingItem(itm)
    setItemForm({
      sku: itm.sku || '',
      description: itm.description || '',
      description_ar: itm.description_ar || '',
      category: itm.category || 'electrical_components',
      uom: itm.uom || 'pcs',
      qty_on_hand: parseFloat(itm.qty_on_hand) || 0,
      reorder_threshold: parseFloat(itm.reorder_threshold) || 0,
      purchase_cost: parseFloat(itm.purchase_cost) || 0
    })
    setShowItemModal(true)
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingItem) {
        const res = await fetch('/api/inventory', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            sku: itemForm.sku,
            description: itemForm.description,
            description_ar: itemForm.description_ar,
            category: itemForm.category,
            uom: itemForm.uom,
            qty_on_hand: parseFloat(itemForm.qty_on_hand as any) || 0,
            reorder_threshold: parseFloat(itemForm.reorder_threshold as any) || 0,
            purchase_cost: parseFloat(itemForm.purchase_cost as any) || 0
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowItemModal(false)
          setEditingItem(null)
          loadData()
        } else {
          alert(data.error || 'Failed to update item')
        }
      } else {
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
      }
    } catch (err) {
      console.error('Save item error:', err)
    }
  }

  async function handleDeleteItem() {
    if (!deletingItem) return
    try {
      const res = await fetch(`/api/inventory?id=${deletingItem.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingItem(null)
        loadData()
      } else {
        alert(data.error || 'Failed to delete item')
      }
    } catch (err) {
      console.error('Delete item error:', err)
    }
  }

  function openAssignModal(itm: any) {
    setShowAssignModal(itm)
    setAssignForm({
      project_id: projects[0]?.id || '',
      assigned_to_user_id: employees[0]?.profile_id || employees[0]?.id || '',
      quantity: 1,
      notes: ''
    })
  }

  async function handleAssignToUserProject(e: React.FormEvent) {
    e.preventDefault()
    if (!showAssignModal) return
    try {
      const res = await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_to_project_user',
          item_id: showAssignModal.id,
          project_id: assignForm.project_id,
          assigned_to_user_id: assignForm.assigned_to_user_id,
          quantity: parseFloat(assignForm.quantity as any) || 1,
          notes: assignForm.notes
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowAssignModal(null)
        loadData()
      } else {
        alert(data.error || 'Assignment failed')
      }
    } catch (err) {
      console.error('Assignment error:', err)
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
    electrical_components: { en: 'Breakers & Components', ar: 'قواطع ومكونات كهربائية' },
    panel_stock: { en: 'Modular Enclosures', ar: 'هياكل صاج نمطية' },
    consumables: { en: 'Powder & Consumables', ar: 'بودرة دهان ومستهلكات' },
    company_supplies: { en: 'Factory Supplies', ar: 'مستلزمات عامة' }
  }

  const filteredItems = items.filter(itm => {
    const q = search.toLowerCase()
    const matchSearch = (
      (itm.sku || '').toLowerCase().includes(q) ||
      (itm.description || '').toLowerCase().includes(q) ||
      (itm.description_ar || '').toLowerCase().includes(q)
    )
    const matchCategory = categoryFilter === 'all' || itm.category === categoryFilter
    return matchSearch && matchCategory
  })

  const totalInventoryValue = items.reduce((s, itm) => s + ((parseFloat(itm.qty_on_hand) || 0) * (parseFloat(itm.purchase_cost) || 0)), 0)
  const lowStockCount = items.filter(itm => parseFloat(itm.qty_available) <= parseFloat(itm.reorder_threshold)).length

  return (
    <AppLayout
      title="Warehouse & Inventory Management"
      titleAr="المستودعات، إدارة المخزون وصرف المواد للمشاريع"
      actions={
        <button className="btn btn-primary btn-sm" onClick={openCreateItemModal}>
          {isRtl ? '+ إضافة صنف جديد للمستودع' : '+ Add Inventory Item'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">📦</div>
          <div className="kpi-value">{items.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي أصناف المستودع' : 'Total Inventory SKUs'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💰</div>
          <div className="kpi-value">{formatCurrency(totalInventoryValue)}</div>
          <div className="kpi-label">{isRtl ? 'القيمة الإجمالية للمخزون' : 'Total Stock Asset Value'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⚠️</div>
          <div className="kpi-value">{lowStockCount}</div>
          <div className="kpi-label">{isRtl ? 'أصناف قاربت النفاد' : 'Low Stock Items'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">📊</div>
          <div className="kpi-value">{items.reduce((s, i) => s + (parseFloat(i.qty_on_hand) || 0), 0).toFixed(0)}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي عدد القطع والوحدات' : 'Total Units on Hand'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${activeTab === 'catalogue' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('catalogue')}
        >
          📦 {isRtl ? 'كتالوج الأصناف والكميات المتوفرة' : 'Item Catalogue & Balances'} ({items.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ledger')}
        >
          📜 {isRtl ? 'سجل حركات المخزون وصرف المواد' : 'Stock Movement & Audit Ledger'}
        </button>
      </div>

      {/* TAB 1: Catalogue */}
      {activeTab === 'catalogue' && (
        <div className="card" style={{ padding: 20 }}>
          {/* Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <input
              type="text"
              className="input"
              style={{ width: 320 }}
              placeholder={isRtl ? '...بحث بالرمز (SKU)، اسم الصنف' : 'Search SKU, description...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'التصنيف:' : 'Category:'}</span>
              <select
                className="input"
                style={{ width: 220 }}
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                <option value="all">{isRtl ? 'جميع التصنيفات' : 'All Categories'}</option>
                {Object.keys(CATEGORY_LABELS).map(catKey => (
                  <option key={catKey} value={catKey}>
                    {CATEGORY_LABELS[catKey]?.[lang] || catKey}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'رمز الصنف (SKU)' : 'SKU CODE'}</th>
                  <th>{isRtl ? 'الوصف والتفاصيل' : 'ITEM DESCRIPTION'}</th>
                  <th>{isRtl ? 'التصنيف' : 'CATEGORY'}</th>
                  <th>{isRtl ? 'الرصيد الفعلي' : 'ON HAND'}</th>
                  <th>{isRtl ? 'محجوز لأوامر' : 'RESERVED'}</th>
                  <th>{isRtl ? 'المتاح للصرف' : 'AVAILABLE'}</th>
                  <th>{isRtl ? 'تكلفة الوحدة' : 'UNIT COST'}</th>
                  <th>{isRtl ? 'حالة المخزون' : 'STATUS'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(itm => {
                  const cat = CATEGORY_LABELS[itm.category] || { en: itm.category, ar: itm.category }
                  const isLowStock = parseFloat(itm.qty_available) <= parseFloat(itm.reorder_threshold)

                  return (
                    <tr key={itm.id} style={{ background: isLowStock ? 'rgba(239, 68, 68, 0.04)' : 'inherit' }}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{itm.sku}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{isRtl && itm.description_ar ? itm.description_ar : itm.description}</div>
                        {itm.description_ar && !isRtl && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{itm.description_ar}</div>}
                      </td>
                      <td>
                        <span className="badge badge-subtle">{isRtl ? cat.ar : cat.en}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{itm.qty_on_hand} {itm.uom}</td>
                      <td style={{ color: '#f59e0b' }}>{itm.qty_reserved || 0} {itm.uom}</td>
                      <td style={{ fontWeight: 700, color: isLowStock ? '#ef4444' : '#10b981' }}>
                        {itm.qty_available} {itm.uom}
                      </td>
                      <td>{formatCurrency(itm.purchase_cost || 0)}</td>
                      <td>
                        {isLowStock ? (
                          <span className="state-pill" style={{ background: '#ef444422', color: '#ef4444' }}>
                            ⚠️ {isRtl ? 'منخفض' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="state-pill" style={{ background: '#10b98122', color: '#10b981' }}>
                            ✓ {isRtl ? 'متوفر' : 'In Stock'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() => openAssignModal(itm)}
                            title="Assign to User for Project"
                          >
                            👷 {isRtl ? 'صرف لمشروع' : 'Assign to User'}
                          </button>
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => openEditItemModal(itm)}
                            title="Edit Item"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-xs btn-danger"
                            onClick={() => setDeletingItem(itm)}
                            title="Delete Item"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Stock Movement Ledger */}
      {activeTab === 'ledger' && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'التاريخ والوقت' : 'TIMESTAMP'}</th>
                  <th>{isRtl ? 'الصنف' : 'ITEM SKU'}</th>
                  <th>{isRtl ? 'نوع الحركة' : 'TRANSACTION TYPE'}</th>
                  <th>{isRtl ? 'التغير في الكمية' : 'QTY CHANGE'}</th>
                  <th>{isRtl ? 'الرصيد السابق' : 'BEFORE'}</th>
                  <th>{isRtl ? 'الرصيد الجديد' : 'AFTER'}</th>
                  <th>{isRtl ? 'المستند المرجعي' : 'REFERENCE DOC'}</th>
                  <th>{isRtl ? 'الملاحظات والمسؤول' : 'NOTES'}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(l.created_at)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{l.sku}</td>
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

      {/* Add / Edit Item Modal */}
      {showItemModal && (
        <div className="modal-backdrop" onClick={() => setShowItemModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveItem}>
              <div className="modal-header">
                <h3>{editingItem ? (isRtl ? 'تعديل بيانات الصنف' : 'Edit Inventory Item') : (isRtl ? 'إضافة صنف جديد للمستودع' : 'New Inventory Item')}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'رمز الصنف (SKU)' : 'SKU Code'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={itemForm.sku}
                      onChange={e => setItemForm({ ...itemForm, sku: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'التصنيف' : 'Category'}</label>
                    <select
                      className="input"
                      value={itemForm.category}
                      onChange={e => setItemForm({ ...itemForm, category: e.target.value })}
                    >
                      {Object.keys(CATEGORY_LABELS).map(c => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]?.[lang] || c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف الصنف (إنجليزي)' : 'Description (English)'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder="Molded Case Circuit Breaker 250A 3P 36kA"
                    value={itemForm.description}
                    onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف الصنف (عربي)' : 'Description (Arabic)'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="قاطع دائرة كهربائية مصبوب 250 أمبير 3 أقطاب"
                    value={itemForm.description_ar}
                    onChange={e => setItemForm({ ...itemForm, description_ar: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'وحدة القياس' : 'UOM'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="pcs / m"
                      value={itemForm.uom}
                      onChange={e => setItemForm({ ...itemForm, uom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الرصيد الفعلي' : 'On Hand'}</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="input"
                      value={itemForm.qty_on_hand}
                      onChange={e => setItemForm({ ...itemForm, qty_on_hand: e.target.value as any })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'حد إعادة الطلب' : 'Reorder Alert'}</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="input"
                      value={itemForm.reorder_threshold}
                      onChange={e => setItemForm({ ...itemForm, reorder_threshold: e.target.value as any })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'سعر الشراء' : 'Cost (SAR)'}</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      className="input"
                      value={itemForm.purchase_cost}
                      onChange={e => setItemForm({ ...itemForm, purchase_cost: e.target.value as any })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إضافة الصنف' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign / Issue to User for Project Modal */}
      {showAssignModal && (
        <div className="modal-backdrop" onClick={() => setShowAssignModal(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleAssignToUserProject}>
              <div className="modal-header">
                <h3>👷 {isRtl ? 'صرف وتخصيص مواد لفني لمشروع محدد' : 'Issue Item to Worker for Project'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(null)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isRtl ? 'الصنف المحدد:' : 'Selected Item:'}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
                    {showAssignModal.sku} — {showAssignModal.description}
                  </div>
                  <div style={{ fontSize: 13, color: '#10b981', marginTop: 4 }}>
                    {isRtl ? 'الرصيد المتاح حالياً للصرف:' : 'Available Stock:'} <strong>{showAssignModal.qty_available} {showAssignModal.uom}</strong>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'المشروع المستهدف' : 'Target Project'}</label>
                  <select
                    required
                    className="input"
                    value={assignForm.project_id}
                    onChange={e => setAssignForm({ ...assignForm, project_id: e.target.value })}
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.reference} - {p.customer_name} ({p.name})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'الفني أو المهندس المستلم' : 'Assignee / Technician'}</label>
                  <select
                    required
                    className="input"
                    value={assignForm.assigned_to_user_id}
                    onChange={e => setAssignForm({ ...assignForm, assigned_to_user_id: e.target.value })}
                  >
                    {employees.map(e => (
                      <option key={e.id} value={e.profile_id || e.id}>{e.full_name} ({e.job_title || e.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'الكمية المراد صرفها' : 'Quantity to Issue'}</label>
                  <input
                    required
                    type="number"
                    min="0.1"
                    max={showAssignModal.qty_available}
                    step="0.1"
                    className="input"
                    value={assignForm.quantity}
                    onChange={e => setAssignForm({ ...assignForm, quantity: e.target.value as any })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات الصرف وأمر العمل' : 'Notes / Work Order Reference'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'تم التسليم لغرض تركيب بسبار اللوحة...' : 'Issued for main busbar assembly...'}
                    value={assignForm.notes}
                    onChange={e => setAssignForm({ ...assignForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(null)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'تأكيد الصرف وتحديث المخزون' : 'Confirm Issue & Deduct Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation */}
      {deletingItem && (
        <div className="modal-backdrop" onClick={() => setDeletingItem(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد حذف الصنف' : 'Confirm Delete Item'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingItem(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p>{isRtl ? `هل أنت متأكد من حذف الصنف "${deletingItem.sku} - ${deletingItem.description}" من المستودع؟` : `Are you sure you want to delete item "${deletingItem.sku} - ${deletingItem.description}"?`}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingItem(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteItem}>
                {isRtl ? 'تأكيد الحذف' : 'Delete Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
