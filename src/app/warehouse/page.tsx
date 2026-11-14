'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate, formatCurrency } from '@/lib/constants'
import {
  addNotification,
  getNotifications,
  resolveShortage,
  markNotificationRead,
  AppNotification
} from '@/lib/notifications'

type WarehouseTab = 'catalogue' | 'ledger' | 'pos' | 'shortages'

export default function WarehousePage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<WarehouseTab>('catalogue')
  const [items, setItems] = useState<any[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Incoming P.O.s and Shortages notifications
  const [incomingPOs, setIncomingPOs] = useState<AppNotification[]>([])
  const [projectShortages, setProjectShortages] = useState<AppNotification[]>([])

  // Shortage response modal
  const [respondingPO, setRespondingPO] = useState<AppNotification | null>(null)
  const [shortageType, setShortageType] = useState<'shortage' | 'partial'>('shortage')
  const [shortageMaterialName, setShortageMaterialName] = useState('')
  const [shortageQuantityNeeded, setShortageQuantityNeeded] = useState('')
  const [shortageNotes, setShortageNotes] = useState('')

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

  useEffect(() => {
    loadNotificationsData()
    const handleNotifUpdate = () => loadNotificationsData()
    window.addEventListener('almasar_notification', handleNotifUpdate)
    window.addEventListener('almasar_notification_update', handleNotifUpdate)
    return () => {
      window.removeEventListener('almasar_notification', handleNotifUpdate)
      window.removeEventListener('almasar_notification_update', handleNotifUpdate)
    }
  }, [])

  function loadNotificationsData() {
    try {
      const all = getNotifications()
      // Incoming POs
      const pos = all.filter(n => n.type === 'po_to_warehouse')
      if (pos.length === 0) {
        const defaultPOs: AppNotification[] = [
          {
            id: 'po-mock-1',
            type: 'po_to_warehouse',
            targetSections: ['warehouse'],
            title: isRtl ? 'أمر شراء وارد: مشروع لوحات توزيع رئيسية 2500A MDB' : 'New P.O: 2500A MDB Distribution Panels',
            message: isRtl ? 'أمر شراء ومواصفات عميل واردة من المبيعات للتحقق من توفر النحاس والقواطع.' : 'P.O received from Sales for material check.',
            projectRef: 'REF-2026-0042',
            projectName: 'مشروع لوحات توزيع رئيسية 2500A MDB',
            project_name: 'مشروع لوحات توزيع رئيسية 2500A MDB',
            reference: 'REF-2026-0042',
            fromUser: 'Sales / CRM',
            createdAt: '2026-11-04T09:30:00Z',
            read: false,
            status: 'pending'
          },
          {
            id: 'po-mock-2',
            type: 'po_to_warehouse',
            targetSections: ['warehouse'],
            title: isRtl ? 'أمر شراء وارد: هياكل حديد وأبواب خارجية IP65' : 'New P.O: Outdoor IP65 Enclosures',
            message: isRtl ? 'أمر شراء وارد من المبيعات لاعتماد فحص صاج مجلفن ودهان إيبوكسي.' : 'P.O received from Sales for sheet metal & powder check.',
            projectRef: 'REF-2026-0048',
            projectName: 'هياكل حديد وأبواب خارجية IP65',
            project_name: 'هياكل حديد وأبواب خارجية IP65',
            reference: 'REF-2026-0048',
            fromUser: 'Sales / CRM',
            createdAt: '2026-11-05T14:15:00Z',
            read: false,
            status: 'pending'
          }
        ]
        setIncomingPOs(defaultPOs)
      } else {
        setIncomingPOs(pos)
      }

      // Shortages
      const shortages = all.filter(n => n.type === 'project_shortage')
      if (shortages.length === 0) {
        const defaultShortage: AppNotification[] = [
          {
            id: 'sh-mock-1',
            type: 'project_shortage',
            department: 'electrical',
            material_name: 'نحاس إلكتروليتي 100x10 ملم',
            quantity: 40,
            project_name: 'مشروع لوحات توزيع رئيسية 2500A MDB',
            reference: 'REF-2026-0042',
            projectName: 'مشروع لوحات توزيع رئيسية 2500A MDB',
            projectRef: 'REF-2026-0042',
            title: '⚠️ إبلاغ عن نقص مواد: نحاس إلكتروليتي 100x10 ملم',
            message: 'تم تسجيل نقص في مواد المشروع لوحات توزيع رئيسية 2500A MDB [REF-2026-0042] - الكمية: 40 متر',
            targetSections: ['procurement', 'sales', 'tasks_production', 'general_manager', 'warehouse'],
            fromUser: 'باسل خريس - قسم الكهرباء',
            status: 'pending',
            createdAt: '2026-11-06T10:00:00Z',
            read: false
          }
        ]
        setProjectShortages(defaultShortage)
      } else {
        setProjectShortages(shortages)
      }
    } catch (e) {
      console.error('Failed to load warehouse notifications:', e)
    }
  }

  function handleMarkPOAvailable(po: AppNotification) {
    try {
      addNotification({
        type: 'warehouse_to_sales',
        targetSections: ['sales'],
        title: isRtl ? `✅ المواد متوفرة: ${po.projectName || po.project_name}` : `Materials Available: ${po.projectName || po.project_name}`,
        message: isRtl
          ? `تم فحص وتأكيد توفر كافة المواد في المستودع للمشروع (${po.projectRef || po.reference}). يمكن لقسم المبيعات إرسال المشروع للتصميم الآن.`
          : `Warehouse confirmed all materials are available for ${po.projectName || po.project_name} (${po.projectRef || po.reference}). Ready for Design.`,
        projectRef: po.projectRef || po.reference,
        projectName: po.projectName || po.project_name,
        reference: po.projectRef || po.reference,
        project_name: po.projectName || po.project_name,
        status: 'available',
        fromUser: 'Warehouse / جهاد'
      })

      markNotificationRead(po.id)
      setIncomingPOs(prev => prev.map(p => p.id === po.id ? { ...p, status: 'available', read: true } : p))
      alert(isRtl ? `✅ تم تأكيد توفر المواد وإشعار قسم المبيعات بنجاح لمشروع (${po.projectName || po.project_name})!` : `Materials confirmed available and Sales notified successfully!`)
    } catch (e) {
      console.error(e)
    }
  }

  function openShortageModalForPO(po: AppNotification, type: 'shortage' | 'partial') {
    setRespondingPO(po)
    setShortageType(type)
    setShortageMaterialName('')
    setShortageQuantityNeeded('')
    setShortageNotes('')
  }

  function handleSubmitShortageResponse(e: React.FormEvent) {
    e.preventDefault()
    if (!respondingPO) return

    try {
      if (shortageType === 'shortage') {
        addNotification({
          type: 'materials_shortage',
          targetSections: ['procurement', 'sales'],
          title: isRtl ? `❌ المواد غير متوفرة: ${respondingPO.projectName || respondingPO.project_name}` : `Materials Unavailable: ${respondingPO.projectName}`,
          message: isRtl
            ? `أفاد المستودع بعدم توفر المواد للمشروع (${respondingPO.projectRef || respondingPO.reference}). النقص: ${shortageMaterialName} (الكمية: ${shortageQuantityNeeded}). تم تحويل الطلب لقسم المشتريات.`
            : `Warehouse reported materials unavailable for ${respondingPO.projectName}. Missing: ${shortageMaterialName} (Qty: ${shortageQuantityNeeded}). Dispatched to Procurement.`,
          projectRef: respondingPO.projectRef || respondingPO.reference,
          projectName: respondingPO.projectName || respondingPO.project_name,
          reference: respondingPO.projectRef || respondingPO.reference,
          project_name: respondingPO.projectName || respondingPO.project_name,
          material_name: shortageMaterialName,
          quantity: parseFloat(shortageQuantityNeeded) || undefined,
          status: 'shortage',
          fromUser: 'Warehouse / جهاد'
        })
      } else {
        addNotification({
          type: 'materials_shortage',
          targetSections: ['procurement', 'sales'],
          title: isRtl ? `🟡 المواد متوفرة جزئياً: ${respondingPO.projectName || respondingPO.project_name}` : `Partially Available: ${respondingPO.projectName}`,
          message: isRtl
            ? `أفاد المستودع بتوفر المواد جزئياً للمشروع (${respondingPO.projectRef || respondingPO.reference}). النقص: ${shortageMaterialName} (الكمية المطلوبة: ${shortageQuantityNeeded}). الملاحظات: ${shortageNotes}`
            : `Warehouse reported materials partially available for ${respondingPO.projectName}. Missing: ${shortageMaterialName} (Qty: ${shortageQuantityNeeded}).`,
          projectRef: respondingPO.projectRef || respondingPO.reference,
          projectName: respondingPO.projectName || respondingPO.project_name,
          reference: respondingPO.projectRef || respondingPO.reference,
          project_name: respondingPO.projectName || respondingPO.project_name,
          material_name: shortageMaterialName,
          quantity: parseFloat(shortageQuantityNeeded) || undefined,
          status: 'partial',
          fromUser: 'Warehouse / جهاد'
        })
      }

      markNotificationRead(respondingPO.id)
      setIncomingPOs(prev => prev.map(p => p.id === respondingPO.id ? { ...p, status: shortageType, read: true } : p))
      setRespondingPO(null)
      alert(isRtl ? `تم تسجيل النقص وإرسال البلاغ لقسم المشتريات والمبيعات بنجاح!` : `Shortage recorded and dispatched to Procurement & Sales successfully!`)
    } catch (e) {
      console.error(e)
    }
  }

  function handleConfirmMaterialArrival(sh: AppNotification) {
    try {
      resolveShortage(sh.id)

      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('almasar_dept_orders_electrical')
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            const updatedOrders = parsed.map((ord: any) => {
              if (
                ord.reference === sh.reference ||
                ord.reference === sh.projectRef ||
                ord.projectName === sh.project_name ||
                ord.projectName === sh.projectName
              ) {
                return {
                  ...ord,
                  shortageDetails: ord.shortageDetails ? { ...ord.shortageDetails, status: 'arrived' } : { materialName: sh.material_name, quantity: sh.quantity, reportedAt: new Date().toISOString(), status: 'arrived' }
                }
              }
              return ord
            })
            localStorage.setItem('almasar_dept_orders_electrical', JSON.stringify(updatedOrders))
          } catch (e) {
            console.error(e)
          }
        }
      }

      addNotification({
        type: 'shortage_arrived',
        targetSections: ['electrical', 'procurement', 'sales', 'tasks_production', 'general_manager'],
        title: isRtl ? `✅ وصلت المواد للمستودع: ${sh.material_name || 'مواد المشروع'}` : `Materials Arrived at Warehouse`,
        message: isRtl
          ? `تم استلام وتأكيد وصول المواد للمستودع لمشروع (${sh.project_name || sh.projectName || sh.reference}): ${sh.material_name || ''}. جاهزة للصرف للمشروع.`
          : `Warehouse confirmed arrival of materials for (${sh.project_name || sh.projectName}): ${sh.material_name || ''}. Ready for assembly.`,
        projectRef: sh.projectRef || sh.reference,
        projectName: sh.projectName || sh.project_name,
        reference: sh.reference || sh.projectRef,
        project_name: sh.project_name || sh.projectName,
        material_name: sh.material_name,
        status: 'arrived',
        fromUser: 'Warehouse / جهاد'
      })

      setProjectShortages(prev => prev.map(s => s.id === sh.id ? { ...s, status: 'arrived', read: true } : s))
      alert(isRtl ? `✅ تم تأكيد وصول واستلام المواد بالمستودع وإشعار قسم الكهرباء والمشتريات والإدارة!` : `Materials arrival confirmed and notified!`)
    } catch (e) {
      console.error(e)
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
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
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
        <button
          className={`btn btn-sm ${activeTab === 'pos' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pos')}
          style={{ position: 'relative' }}
        >
          📥 {isRtl ? 'أوامر الشراء الواردة من المبيعات (P.O)' : 'Incoming P.O.s from Sales'}
          {incomingPOs.filter(p => !p.status || p.status === 'pending').length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 10,
              marginInlineStart: 6
            }}>
              {incomingPOs.filter(p => !p.status || p.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'shortages' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('shortages')}
          style={{ position: 'relative' }}
        >
          ⚠️ {isRtl ? 'نواقص المشاريع ومواد الكهرباء' : 'Project Material Shortages'}
          {projectShortages.filter(s => s.status !== 'arrived').length > 0 && (
            <span style={{
              background: '#f59e0b',
              color: '#000',
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 10,
              marginInlineStart: 6
            }}>
              {projectShortages.filter(s => s.status !== 'arrived').length}
            </span>
          )}
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

      {/* TAB 3: Incoming P.O.s from Sales */}
      {activeTab === 'pos' && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              📥 {isRtl ? 'أوامر الشراء الواردة من قسم المبيعات (P.O) للتحقق من توفر المواد' : 'Incoming P.O.s from Sales for Material Availability Check'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {isRtl
                ? 'يتم فحص توفر المواد الأولية والمكونات لكل مشروع وإشعار المبيعات بالنتيجة. في حال توفر المواد تتاح للمبيعات إمكانية إرسال المشروع للتصميم، وفي حال النقص يتم تحويل الطلب للمشتريات.'
                : 'Inspect raw materials & components for each incoming P.O. Confirm availability to allow Sales to dispatch to Design, or report shortages to Procurement.'}
            </p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {incomingPOs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                {isRtl ? 'لا توجد أوامر شراء واردة حالياً' : 'No incoming P.O.s at this time'}
              </div>
            ) : (
              incomingPOs.map(po => {
                const isAvail = po.status === 'available'
                const isShort = po.status === 'shortage'
                const isPart = po.status === 'partial'

                return (
                  <div
                    key={po.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                            {po.projectRef || po.reference}
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {po.projectName || po.project_name}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {po.message}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isAvail ? (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b98155', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            ✅ {isRtl ? 'المواد متوفرة (تم إشعار المبيعات)' : 'Materials Available (Sales Notified)'}
                          </span>
                        ) : isShort ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef444455', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            ❌ {isRtl ? 'المواد غير متوفرة (تم إشعار المشتريات والمبيعات)' : 'Unavailable (Procurement Notified)'}
                          </span>
                        ) : isPart ? (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b55', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            🟡 {isRtl ? 'المواد متوفرة جزئياً' : 'Partially Available'}
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #38bdf855', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            ⏳ {isRtl ? 'بانتظار فحص المستودع' : 'Pending Warehouse Check'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 6 }}>
                      <span>👤 {isRtl ? 'المصدر:' : 'From:'} {po.fromUser || 'المبيعات'}</span>
                      <span>📅 {isRtl ? 'تاريخ الورود:' : 'Date:'} {formatDate(po.createdAt)}</span>
                      {po.material_name && <span>⚠️ {isRtl ? 'النقص المسجل:' : 'Reported Shortage:'} {po.material_name} ({po.quantity || '-'})</span>}
                    </div>

                    {/* 3 Action Buttons */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {isRtl ? 'إجراء فحص توفر المواد:' : 'Material Verification Action:'}
                      </span>
                      
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: isAvail ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                          color: isAvail ? '#ffffff' : '#10b981',
                          border: '1px solid #10b981',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        onClick={() => handleMarkPOAvailable(po)}
                      >
                        ✅ {isRtl ? 'المواد متوفرة' : 'Materials Available'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: isShort ? '#ef4444' : 'rgba(239, 68, 68, 0.15)',
                          color: isShort ? '#ffffff' : '#ef4444',
                          border: '1px solid #ef4444',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        onClick={() => openShortageModalForPO(po, 'shortage')}
                      >
                        ❌ {isRtl ? 'المواد غير متوفرة' : 'Materials Not Available'}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          background: isPart ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                          color: isPart ? '#000000' : '#f59e0b',
                          border: '1px solid #f59e0b',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        onClick={() => openShortageModalForPO(po, 'partial')}
                      >
                        🟡 {isRtl ? 'متوفرة جزئياً' : 'Partially Available'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Project Material Shortages */}
      {activeTab === 'shortages' && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              ⚠️ {isRtl ? 'إدارة نواقص المشاريع ومواد الكهرباء والتصنيع' : 'Project Material Shortages & Receipt Confirmation'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {isRtl
                ? 'بلاغات نقص المواد الواردة من خطوط الإنتاج (مثل فنيي قسم الكهرباء والتجميع). عند وصول البضاعة للمستودع اضغط "تأكيد وصول المواد" ليتم إشعار القسم الفني والمشتريات وتحويل الحالة إلى (وصلت المواد).'
                : 'Material shortages reported by production technicians. When received at the warehouse, click "Confirm Arrival" to update the technical teams.'}
            </p>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {projectShortages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                {isRtl ? 'لا توجد بلاغات نقص مواد مسجلة حالياً' : 'No shortages reported currently'}
              </div>
            ) : (
              projectShortages.map(sh => {
                const isArrived = sh.status === 'arrived'

                return (
                  <div
                    key={sh.id}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: isArrived ? '1px solid #10b98155' : '1px solid #f59e0b55',
                      borderRadius: 10,
                      padding: 18,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                          ⚠️ {sh.material_name || sh.title}
                        </span>
                        {sh.quantity && (
                          <span style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                            {isRtl ? 'الكمية:' : 'Qty:'} {sh.quantity}
                          </span>
                        )}
                        {isArrived ? (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b98155', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            ✅ {isRtl ? 'وصلت المواد للمستودع' : 'Materials Arrived'}
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b55', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            ⏳ {isRtl ? 'نقص بانتظار التوريد' : 'Pending Arrival'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong>{isRtl ? 'المشروع:' : 'Project:'}</strong> {sh.project_name || sh.projectName || '-'} [{sh.reference || sh.projectRef || '-'}]
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span>👷 {isRtl ? 'المبلغ:' : 'Reported By:'} {sh.fromUser || 'فني الإنتاج'}</span>
                        <span>📅 {isRtl ? 'التاريخ:' : 'Date:'} {formatDate(sh.createdAt)}</span>
                        {sh.message && <span>📝 {sh.message}</span>}
                      </div>
                    </div>

                    <div>
                      {!isArrived ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                          onClick={() => handleConfirmMaterialArrival(sh)}
                        >
                          📦 {isRtl ? 'تأكيد وصول واستلام المواد للمستودع' : 'Confirm Materials Arrived'}
                        </button>
                      ) : (
                        <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>
                          ✓ {isRtl ? 'تم الاستلام وإشعار القسم الفني' : 'Received & Notified'}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Modal for reporting shortage / partial availability back to sales and procurement */}
      {respondingPO && (
        <div className="modal-backdrop" onClick={() => setRespondingPO(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmitShortageResponse}>
              <div className="modal-header">
                <h3>
                  {shortageType === 'shortage'
                    ? (isRtl ? '❌ تسجيل عدم توفر مواد وإشعار المشتريات والمبيعات' : 'Material Unavailable Report')
                    : (isRtl ? '🟡 تسجيل توفر جزئي وتحديد النقص المطلوب' : 'Partial Availability Report')}
                </h3>
                <button type="button" className="btn btn-secondary" onClick={() => setRespondingPO(null)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                    {respondingPO.projectRef || respondingPO.reference} — {respondingPO.projectName || respondingPO.project_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {respondingPO.message}
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'اسم المادة أو الصنف الناقص *' : 'Missing Material / Item Name *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: بسبار نحاس 100x10 ملم / قواطع 250A' : 'e.g. Copper Busbar 100x10mm'}
                    value={shortageMaterialName}
                    onChange={e => setShortageMaterialName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'الكمية المطلوبة للشراء والتوريد *' : 'Quantity Needed *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: 40 متر / 6 حبات' : 'e.g. 40 meters / 6 pcs'}
                    value={shortageQuantityNeeded}
                    onChange={e => setShortageQuantityNeeded(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات وتوجيهات للمشتريات والمبيعات' : 'Notes for Procurement & Sales'}</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder={isRtl ? 'ملاحظات حول المورد المقترح أو مواصفات المادة أو المواد المتوفرة حالياً...' : 'Notes on specs or alternatives...'}
                    value={shortageNotes}
                    onChange={e => setShortageNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRespondingPO(null)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: shortageType === 'shortage' ? '#ef4444' : '#f59e0b',
                    borderColor: shortageType === 'shortage' ? '#ef4444' : '#f59e0b',
                    color: shortageType === 'shortage' ? '#fff' : '#000',
                    fontWeight: 700
                  }}
                >
                  🚀 {isRtl ? 'إرسال البلاغ لقسم المشتريات والمبيعات' : 'Send Shortage to Procurement & Sales'}
                </button>
              </div>
            </form>
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
