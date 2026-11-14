'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate, formatCurrency } from '@/lib/constants'
import {
  AppNotification,
  addNotification,
  getNotificationsForSection,
  markNotificationRead
} from '@/lib/notifications'

interface SalesLead {
  id: string
  reference: string
  name: string
  customer_name: string
  company: string
  customer_email?: string
  customer_phone?: string
  expected_revenue: number
  probability: number
  product_category: 'iron' | 'hangar' | 'electrical' | 'misc' | string
  outcome: 'won' | 'in_progress' | 'pending' | string
  sales_status: 'under_manufacturing' | 'ready_for_delivery' | 'delivered' | string
  pricing_status?: 'pending_response' | 'price_approved' | 'price_rejected'
  payment_method?: 'cash' | 'credit' | 'gm_approval'
  invoice_name?: string
  files?: string
  description?: string
  created_at: string
}

interface ProjectTemplate {
  id: string
  template_name: string
  template_name_ar: string
  category: string
  description: string
  specs: any
  estimated_cost: number
}

const CATEGORY_MAP: Record<string, { ar: string; en: string; icon: string; color: string }> = {
  all: { ar: 'الكل', en: 'All Departments', icon: '🏢', color: '#38bdf8' },
  iron: { ar: 'الحديد', en: 'Iron', icon: '🔩', color: '#f59e0b' },
  hangar: { ar: 'الهنجر', en: 'Hangar', icon: '🏭', color: '#06b6d4' },
  electrical: { ar: 'الكهرباء والتجميع', en: 'Electrical & Assembly', icon: '⚡', color: '#8b5cf6' },
  misc: { ar: 'متفرقات', en: 'Miscellaneous', icon: '📦', color: '#ec4899' },
  // Backward compatibility aliases
  electrical_panels: { ar: 'الكهرباء والتجميع', en: 'Electrical & Assembly', icon: '⚡', color: '#8b5cf6' },
  cable_tray_enclosure: { ar: 'الهنجر', en: 'Hangar', icon: '🏭', color: '#06b6d4' },
  materials_parts: { ar: 'الحديد', en: 'Iron', icon: '🔩', color: '#f59e0b' }
}

const VISIBLE_CATEGORIES = ['all', 'iron', 'hangar', 'electrical', 'misc']

const PRICING_STATUS_MAP: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  pending_response: { ar: 'في انتظار رد العميل', en: 'Pending Response', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  price_approved: { ar: 'موافقة على السعر', en: 'Price Approved', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  price_rejected: { ar: 'عدم موافقة على السعر', en: 'Price Rejected', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
}

const STATUS_MAP: Record<string, { ar: string; en: string; color: string; bg: string }> = {
  under_manufacturing: { ar: 'قيد التصنيع', en: 'Under Manufacturing', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  ready_for_delivery: { ar: 'جاهز للتسليم', en: 'Ready for Delivery', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  delivered: { ar: 'تم التسليم', en: 'Delivered', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
}

const OUTCOME_MAP: Record<string, { ar: string; en: string; color: string }> = {
  won: { ar: 'تم التعاقد / ناجح', en: 'Won / Contracted', color: '#10b981' },
  in_progress: { ar: 'جاري العمل والتفاوض', en: 'In Progress', color: '#f59e0b' },
  pending: { ar: 'معلق بالدراسة', en: 'Pending Review', color: '#94a3b8' }
}

export default function CRMPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<'sales_orders' | 'pipeline'>('sales_orders')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [leads, setLeads] = useState<SalesLead[]>([])
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<SalesLead | null>(null)

  // Pricing Approval & Send to Warehouse Modal
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalLead, setApprovalLead] = useState<SalesLead | null>(null)
  const [approvalForm, setApprovalForm] = useState({
    payment_method: 'cash' as 'cash' | 'credit' | 'gm_approval',
    invoice_name: '',
    files_note: ''
  })

  // Notifications from Warehouse & System
  const [salesNotifications, setSalesNotifications] = useState<AppNotification[]>([])
  const [showNotifsCollapse, setShowNotifsCollapse] = useState(true)

  const loadSalesNotifications = () => {
    const notifs = getNotificationsForSection('sales')
    setSalesNotifications(notifs)
  }

  // Form (+ تسعير مشروع جديد)
  const [form, setForm] = useState({
    name: '',
    reference: '',
    customer_name: '',
    company: '',
    customer_email: '',
    customer_phone: '',
    expected_revenue: '',
    product_category: 'iron',
    outcome: 'won',
    sales_status: 'under_manufacturing',
    pricing_status: 'pending_response' as 'pending_response' | 'price_approved' | 'price_rejected',
    payment_method: 'cash' as 'cash' | 'credit' | 'gm_approval',
    invoice_name: '',
    files: '',
    description: '',
    is_template: false,
    template_name: ''
  })

  // New Template Form
  const [tplForm, setTplForm] = useState({
    template_name: '',
    template_name_ar: '',
    category: 'electrical_panels',
    description: '',
    estimated_cost: ''
  })

  useEffect(() => {
    loadSales()
    loadTemplates()
    loadSalesNotifications()

    const handleUpdate = () => loadSalesNotifications()
    window.addEventListener('almasar_notification', handleUpdate)
    window.addEventListener('almasar_notification_update', handleUpdate)
    return () => {
      window.removeEventListener('almasar_notification', handleUpdate)
      window.removeEventListener('almasar_notification_update', handleUpdate)
    }
  }, [])

  const getWarehouseStatusForProject = (ref?: string, name?: string) => {
    if (!ref && !name) return null
    const notif = salesNotifications.find(n =>
      (n.type === 'warehouse_to_sales' || n.type === 'materials_available' || n.type === 'materials_shortage') &&
      ((ref && (n.projectRef === ref || n.reference === ref)) || (name && (n.projectName === name || n.project_name === name)))
    )
    if (!notif) return null
    if (notif.type === 'warehouse_to_sales' || notif.type === 'materials_available') {
      if (notif.status === 'partial') {
        return { label: isRtl ? 'المواد متوفرة جزئياً 🟡' : 'Partially Available 🟡', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', notif }
      }
      return { label: isRtl ? 'المواد متوفرة ✅' : 'Materials Available ✅', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', notif }
    }
    if (notif.type === 'materials_shortage') {
      if (notif.status === 'partial') {
        return { label: isRtl ? 'المواد متوفرة جزئياً 🟡' : 'Partially Available 🟡', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', notif }
      }
      return { label: isRtl ? 'نقص مواد ⚠️' : 'Shortage ⚠️', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', notif }
    }
    return null
  }

  async function loadSales() {
    setLoading(true)
    try {
      const res = await fetch('/api/sales')
      const json = await res.json()
      if (json.success && json.data) {
        setLeads(json.data)
      }
    } catch (e) {
      console.error('Error loading sales:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/sales?view=templates')
      const json = await res.json()
      if (json.success && json.data) {
        setTemplates(json.data)
      }
    } catch (e) {
      console.error('Error loading templates:', e)
    }
  }

  async function handleCreateSalesOrder(e: React.FormEvent, sendToWarehouse: boolean = false) {
    e.preventDefault()
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_sales_order',
          ...form,
          pricing_status: sendToWarehouse ? 'price_approved' : form.pricing_status
        })
      })
      const json = await res.json()
      if (json.success) {
        if (sendToWarehouse) {
          addNotification({
            type: 'po_to_warehouse',
            targetSections: ['warehouse'],
            title: isRtl ? `أمر شراء جديد: ${form.name}` : `New P.O: ${form.name}`,
            message: isRtl
              ? `تم إنشاء أمر شراء P.O للمشروع (${form.reference || 'REF'}) وإرساله إلى المستودع للتحقق من توفر المواد`
              : `P.O dispatched to Warehouse for material verification (${form.reference || 'REF'})`,
            projectRef: form.reference,
            projectName: form.name,
            project_name: form.name,
            reference: form.reference,
            quantity: 1,
            fromUser: 'Sales / CRM',
            status: 'pending'
          })
        }
        setShowAddModal(false)
        resetForm()
        loadSales()
        if (sendToWarehouse) {
          alert(isRtl ? 'تم حفظ تسعير المشروع وإرسال أمر الشراء P.O إلى المستودع بنجاح!' : 'Quotation saved & P.O dispatched to Warehouse successfully!')
        }
      } else {
        alert(json.error || 'Failed to create sales order')
      }
    } catch (err) {
      console.error('Failed to create sales order:', err)
    }
  }

  async function handleUpdateStatus(id: string, nextStatus: string) {
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, sales_status: nextStatus })
      })
      const json = await res.json()
      if (json.success) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, sales_status: nextStatus } : l))
      }
    } catch (e) {
      console.error('Error updating status:', e)
    }
  }

  async function handleUpdatePricingStatus(lead: SalesLead, newStatus: 'pending_response' | 'price_approved' | 'price_rejected') {
    if (newStatus === 'price_approved') {
      setApprovalLead(lead)
      setApprovalForm({
        payment_method: (lead.payment_method as any) || 'cash',
        invoice_name: lead.invoice_name || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        files_note: lead.files || 'مخططات وتفاصيل اللوحة المعتمدة.pdf'
      })
      setShowApprovalModal(true)
      return
    }

    try {
      await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lead.id,
          pricing_status: newStatus,
          outcome: newStatus === 'price_rejected' ? 'lost' : 'pending'
        })
      })
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, pricing_status: newStatus } : l))
    } catch (e) {
      console.error('Error updating pricing status:', e)
    }
  }

  async function handleConfirmApprovalAndSendToDesign(e: React.FormEvent) {
    e.preventDefault()
    if (!approvalLead) return

    try {
      await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: approvalLead.id,
          pricing_status: 'price_approved',
          payment_method: approvalForm.payment_method,
          invoice_name: approvalForm.invoice_name,
          files: approvalForm.files_note,
          outcome: 'won'
        })
      })

      // Queue into design incoming projects (LocalStorage sync so Engineering immediately shows it under استقبال مشروع جديد)
      const designIncoming = {
        id: `des-${Date.now()}`,
        sales_lead_id: approvalLead.id,
        project_ref: approvalLead.reference,
        name: approvalLead.name,
        customer_name: approvalLead.customer_name,
        company: approvalLead.company,
        product_category: approvalLead.product_category,
        expected_revenue: approvalLead.expected_revenue,
        payment_method: approvalForm.payment_method,
        invoice_name: approvalForm.invoice_name,
        client_files: approvalForm.files_note || 'ملفات ومواصفات العميل المعتمدة.pdf',
        received_date: new Date().toISOString().split('T')[0],
        delivery_date: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
        status: 'received_from_sales'
      }

      if (typeof window !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('almasar_design_projects') || '[]')
        localStorage.setItem('almasar_design_projects', JSON.stringify([designIncoming, ...stored.filter((p: any) => p.sales_lead_id !== approvalLead.id)]))
      }

      // Dispatch P.O to Warehouse Notification
      addNotification({
        type: 'po_to_warehouse',
        targetSections: ['warehouse'],
        title: isRtl ? `أمر شراء جديد: ${approvalLead.name}` : `New P.O: ${approvalLead.name}`,
        message: isRtl
          ? `تم إرسال أمر الشراء للمشروع (${approvalLead.reference}) إلى المستودع للتحقق من توفر المواد. الفاتورة: ${approvalForm.invoice_name || '-'}`
          : `P.O dispatched to Warehouse for material verification (${approvalLead.reference}). Invoice: ${approvalForm.invoice_name || '-'}`,
        projectRef: approvalLead.reference,
        projectName: approvalLead.name,
        project_name: approvalLead.name,
        reference: approvalLead.reference,
        quantity: 1,
        fromUser: 'Sales / CRM',
        status: 'pending'
      })

      setLeads(prev => prev.map(l => l.id === approvalLead.id ? {
        ...l,
        pricing_status: 'price_approved',
        payment_method: approvalForm.payment_method,
        invoice_name: approvalForm.invoice_name,
        files: approvalForm.files_note
      } : l))

      setShowApprovalModal(false)
      alert(isRtl ? 'تم حفظ أمر الشراء وإرساله مباشرة إلى المستودع للتحقق من توفر المواد بنجاح!' : 'P.O saved and dispatched to Warehouse successfully!')
    } catch (err) {
      console.error('Error approving and sending to warehouse:', err)
    }
  }

  async function handleEditSalesOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLead) return
    try {
      const res = await fetch('/api/sales', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          name: form.name,
          customer_name: form.customer_name,
          company: form.company,
          expected_revenue: form.expected_revenue,
          product_category: form.product_category,
          outcome: form.outcome,
          sales_status: form.sales_status,
          description: form.description
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowEditModal(false)
        resetForm()
        loadSales()
      }
    } catch (e) {
      console.error('Error editing order:', e)
    }
  }

  async function handleDeleteSalesOrder() {
    if (!selectedLead) return
    try {
      const res = await fetch(`/api/sales?id=${selectedLead.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setShowDeleteModal(false)
        setSelectedLead(null)
        setLeads(prev => prev.filter(l => l.id !== selectedLead.id))
      }
    } catch (e) {
      console.error('Error deleting order:', e)
    }
  }

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_template',
          ...tplForm
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowTemplateModal(false)
        setTplForm({ template_name: '', template_name_ar: '', category: 'electrical_panels', description: '', estimated_cost: '' })
        loadTemplates()
      }
    } catch (e) {
      console.error('Error saving template:', e)
    }
  }

  function applyTemplate(tpl: ProjectTemplate) {
    setForm({
      name: isRtl ? `${tpl.template_name_ar || tpl.template_name} - مشروع جديد` : `${tpl.template_name} - New Project`,
      reference: '',
      customer_name: '',
      company: '',
      customer_email: '',
      customer_phone: '',
      expected_revenue: String(tpl.estimated_cost || 0),
      product_category: tpl.category || 'iron',
      outcome: 'won',
      sales_status: 'under_manufacturing',
      pricing_status: 'pending_response',
      payment_method: 'cash',
      invoice_name: '',
      files: '',
      description: tpl.description || '',
      is_template: false,
      template_name: tpl.template_name
    })
    setShowAddModal(true)
  }

  function resetForm() {
    const nextRef = `REF-2026-${String(leads.length + 1).padStart(4, '0')}`
    setForm({
      name: '',
      reference: nextRef,
      customer_name: '',
      company: '',
      customer_email: '',
      customer_phone: '',
      expected_revenue: '',
      product_category: 'iron',
      outcome: 'won',
      sales_status: 'under_manufacturing',
      pricing_status: 'pending_response',
      payment_method: 'cash',
      invoice_name: '',
      files: '',
      description: '',
      is_template: false,
      template_name: ''
    })
    setSelectedLead(null)
  }

  function openEdit(lead: SalesLead) {
    setSelectedLead(lead)
    setForm({
      name: lead.name,
      reference: lead.reference,
      customer_name: lead.customer_name,
      company: lead.company || lead.customer_name,
      customer_email: lead.customer_email || '',
      customer_phone: lead.customer_phone || '',
      expected_revenue: String(lead.expected_revenue || 0),
      product_category: lead.product_category || 'iron',
      outcome: lead.outcome || 'won',
      sales_status: lead.sales_status || 'under_manufacturing',
      pricing_status: (lead as any).pricing_status || 'pending_response',
      payment_method: (lead as any).payment_method || 'cash',
      invoice_name: (lead as any).invoice_name || '',
      files: (lead as any).files || '',
      description: lead.description || '',
      is_template: false,
      template_name: ''
    })
    setShowEditModal(true)
  }

  // Filtered Leads
  const filtered = leads.filter(l => {
    let matchCategory = true
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'iron') matchCategory = l.product_category === 'iron' || l.product_category === 'materials_parts'
      else if (selectedCategory === 'hangar') matchCategory = l.product_category === 'hangar' || l.product_category === 'cable_tray_enclosure'
      else if (selectedCategory === 'electrical') matchCategory = l.product_category === 'electrical' || l.product_category === 'electrical_panels'
      else matchCategory = l.product_category === selectedCategory
    }
    const matchStatus = selectedStatus === 'all' || l.sales_status === selectedStatus
    const matchSearch = (
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.company && l.company.toLowerCase().includes(search.toLowerCase())) ||
      l.reference.toLowerCase().includes(search.toLowerCase())
    )
    return matchCategory && matchStatus && matchSearch
  })

  // KPIs
  const underMfgCount = leads.filter(l => l.sales_status === 'under_manufacturing').length
  const readyDelivCount = leads.filter(l => l.sales_status === 'ready_for_delivery').length
  const deliveredCount = leads.filter(l => l.sales_status === 'delivered').length
  const totalValue = leads.reduce((sum, l) => sum + (Number(l.expected_revenue) || 0), 0)

  return (
    <AppLayout
      title="Sales & Projects"
      titleAr="المبيعات (مشاريع المسار)"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowAddModal(true) }}>
            {isRtl ? '+ تسعير مشروع جديد' : '+ New Project Pricing'}
          </button>
        </div>
      }
    >
      {/* Notifications & Warehouse Status Panel */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          padding: '14px 18px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setShowNotifsCollapse(!showNotifsCollapse)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isRtl ? 'إشعارات المبيعات وحالة توفر مواد المستودع' : 'Sales Notifications & Warehouse Material Status'}
            </span>
            {salesNotifications.filter(n => !n.read).length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10
                }}
              >
                {salesNotifications.filter(n => !n.read).length} {isRtl ? 'جديد' : 'new'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {showNotifsCollapse ? (isRtl ? 'طي' : 'Collapse') : (isRtl ? 'عرض' : 'Expand')}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {showNotifsCollapse ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {showNotifsCollapse && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {salesNotifications.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                {isRtl ? 'لا توجد إشعارات واردة للمبيعات حالياً' : 'No incoming notifications for Sales'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {salesNotifications.slice(0, 5).map(n => {
                  const isAvailable = n.type === 'warehouse_to_sales' || n.type === 'materials_available'
                  const isShortage = n.type === 'materials_shortage'
                  const badgeColor = isAvailable ? '#10b981' : isShortage ? (n.status === 'partial' ? '#f59e0b' : '#ef4444') : '#38bdf8'
                  const badgeText = isAvailable
                    ? (isRtl ? 'المواد متوفرة في المستودع ✅' : 'Materials Available ✅')
                    : isShortage
                    ? (n.status === 'partial' ? (isRtl ? 'المواد متوفرة جزئياً 🟡' : 'Partially Available 🟡') : (isRtl ? 'نقص مواد في المستودع ⚠️' : 'Materials Shortage ⚠️'))
                    : (isRtl ? 'إشعار' : 'Notice')

                  return (
                    <div
                      key={n.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'var(--bg-elevated)',
                        border: `1px solid ${n.read ? 'var(--border)' : badgeColor + '66'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 240, flex: 1 }}>
                        <span style={{ fontSize: 18 }}>
                          {isAvailable ? '✅' : isShortage ? '⚠️' : '📩'}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              {n.projectName || n.project_name || n.title || 'مشروع'}
                            </strong>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 6,
                                background: badgeColor + '22',
                                color: badgeColor,
                                border: `1px solid ${badgeColor}44`
                              }}
                            >
                              {badgeText}
                            </span>
                          </div>
                          {n.message && (
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {n.message}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                        {!n.read && (
                          <button
                            className="btn btn-xs btn-secondary"
                            onClick={() => {
                              markNotificationRead(n.id)
                              loadSalesNotifications()
                            }}
                          >
                            {isRtl ? 'تحديد كمقروء' : 'Mark Read'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boxed Header / Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card)', padding: 6, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('sales_orders')}
            className={`btn btn-sm ${activeTab === 'sales_orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            📋 {isRtl ? 'المبيعات ومشاريع الإنتاج' : 'Sales & Production Projects'}
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`btn btn-sm ${activeTab === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            📊 {isRtl ? 'مسار المبيعات' : 'Sales Pipeline'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isRtl ? 'إجمالي قيمة العقود:' : 'Total Value:'}</span>
          <strong style={{ fontSize: 16, color: 'var(--gold)' }}>{formatCurrency(totalValue)}</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">📋</div>
          <div className="kpi-value">{leads.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي المشاريع والطلبيات' : 'Total Sales Projects'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⚙️</div>
          <div className="kpi-value">{underMfgCount}</div>
          <div className="kpi-label">{isRtl ? 'قيد التصنيع في المصنع' : 'Under Manufacturing'}</div>
        </div>
        <div className="kpi-card info">
          <div className="kpi-icon info-bg">🚚</div>
          <div className="kpi-value">{readyDelivCount}</div>
          <div className="kpi-label">{isRtl ? 'جاهز للتسليم والشحن' : 'Ready for Delivery'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✅</div>
          <div className="kpi-value">{deliveredCount}</div>
          <div className="kpi-label">{isRtl ? 'تم التسليم للعميل' : 'Delivered & Handed Over'}</div>
        </div>
      </div>

      {/* TAB 1: SALES ORDERS & PRODUCTION PROJECTS */}
      {activeTab === 'sales_orders' && (
        <div className="card" style={{ padding: '20px 24px' }}>
          {/* Section 2: Department Category Filter (صفحة البيع / العميل / الشركة / القسم) */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              {isRtl ? 'تصنيف القسم / خط الإنتاج (العميل / الشركة / القسم):' : 'Department & Product Line Category:'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {VISIBLE_CATEGORIES.map(key => {
                const info = CATEGORY_MAP[key]
                if (!info) return null
                const isSelected = selectedCategory === key
                const count = key === 'all'
                  ? leads.length
                  : leads.filter(l => {
                      if (key === 'iron') return l.product_category === 'iron' || l.product_category === 'materials_parts'
                      if (key === 'hangar') return l.product_category === 'hangar' || l.product_category === 'cable_tray_enclosure'
                      if (key === 'electrical') return l.product_category === 'electrical' || l.product_category === 'electrical_panels'
                      return l.product_category === key
                    }).length
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: isSelected ? `2px solid ${info.color}` : '1px solid var(--border)',
                      background: isSelected ? `${info.color}22` : 'var(--bg-base)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{info.icon}</span>
                    <span>{info[lang] || info.en}</span>
                    <span style={{ fontSize: 11, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: 10 }}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status Filter Tabs (قيد التصنيع / جاهز للتسليم / تم التسليم) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedStatus('all')}
                className={`btn btn-sm ${selectedStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {isRtl ? 'جميع الحالات' : 'All Statuses'} ({leads.length})
              </button>
              {Object.entries(STATUS_MAP).map(([key, info]) => {
                const count = leads.filter(l => l.sales_status === key).length
                const isSelected = selectedStatus === key
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStatus(key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? `2px solid ${info.color}` : '1px solid var(--border)',
                      background: isSelected ? info.bg : 'transparent',
                      color: isSelected ? info.color : 'var(--text-secondary)'
                    }}
                  >
                    {info[lang] || info.en} ({count})
                  </button>
                )
              })}
            </div>

            <input
              type="text"
              className="input"
              style={{ width: 260 }}
              placeholder={isRtl ? '...بحث بالرقم المرجعي أو اسم المشروع أو العميل' : 'Search reference, project, client...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* TABLE: Section 1 */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'الرقم المرجعي' : 'Ref Number'}</th>
                  <th>{isRtl ? 'اسم المشروع' : 'Project Name'}</th>
                  <th>{isRtl ? 'اسم العميل' : 'Customer'}</th>
                  <th>{isRtl ? 'الشركة / المؤسسة' : 'Company'}</th>
                  <th>{isRtl ? 'القسم' : 'Department'}</th>
                  <th>{isRtl ? 'القيمة' : 'Value'}</th>
                  <th>{isRtl ? 'مرحلة الرد على السعر' : 'Price Response'}</th>
                  <th>{isRtl ? 'تفاصيل وملاحظات المشروع' : 'Details & Notes'}</th>
                  <th>{isRtl ? 'خيارات' : 'Options'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const catInfo = CATEGORY_MAP[lead.product_category] || CATEGORY_MAP.iron

                  return (
                    <tr key={lead.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace' }}>
                        {lead.reference}
                      </td>
                      <td>
                        <strong>{lead.name}</strong>
                      </td>
                      <td>
                        <strong>{lead.customer_name}</strong>
                      </td>
                      <td>
                        <div>{lead.company || lead.customer_name}</div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `${catInfo.color}15`,
                            color: catInfo.color,
                            border: `1px solid ${catInfo.color}33`
                          }}
                        >
                          {catInfo.icon} {catInfo[lang] || catInfo.en}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {formatCurrency(lead.expected_revenue)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              background: (PRICING_STATUS_MAP[lead.pricing_status || 'pending_response']?.bg || 'rgba(245, 158, 11, 0.15)'),
                              color: (PRICING_STATUS_MAP[lead.pricing_status || 'pending_response']?.color || '#f59e0b'),
                              border: `1px solid ${(PRICING_STATUS_MAP[lead.pricing_status || 'pending_response']?.color || '#f59e0b')}44`
                            }}
                          >
                            ● {isRtl ? PRICING_STATUS_MAP[lead.pricing_status || 'pending_response']?.ar : PRICING_STATUS_MAP[lead.pricing_status || 'pending_response']?.en}
                          </span>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-xs"
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: lead.pricing_status === 'pending_response' ? '#f59e0b33' : 'var(--bg-base)',
                                color: '#f59e0b',
                                border: '1px solid #f59e0b55'
                              }}
                              onClick={() => handleUpdatePricingStatus(lead, 'pending_response')}
                              title={isRtl ? 'في انتظار رد العميل' : 'Pending Response'}
                            >
                              ⏳ {isRtl ? 'انتظار' : 'Pending'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs"
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: lead.pricing_status === 'price_approved' ? '#10b98133' : 'var(--bg-base)',
                                color: '#10b981',
                                border: '1px solid #10b98155',
                                fontWeight: 700
                              }}
                              onClick={() => handleUpdatePricingStatus(lead, 'price_approved')}
                              title={isRtl ? 'اعتماد أمر الشراء وإرسال للمستودع' : 'Approve & Send P.O to Warehouse'}
                            >
                              ✓ {isRtl ? 'موافقة وإرسال P.O' : 'Approve & P.O'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-xs"
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                background: lead.pricing_status === 'price_rejected' ? '#ef444433' : 'var(--bg-base)',
                                color: '#ef4444',
                                border: '1px solid #ef444455'
                              }}
                              onClick={() => handleUpdatePricingStatus(lead, 'price_rejected')}
                              title={isRtl ? 'عدم موافقة على السعر' : 'Price Rejected'}
                            >
                              ✕ {isRtl ? 'عدم موافقة' : 'Reject'}
                            </button>
                          </div>

                          {lead.pricing_status === 'price_approved' && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '4px 6px', borderRadius: 4 }}>
                              <div>💳 {lead.payment_method === 'cash' ? (isRtl ? 'نقدي' : 'Cash') : lead.payment_method === 'credit' ? (isRtl ? 'ذمم' : 'Credit') : (isRtl ? 'موافقة المدير العام' : 'GM Approval')}</div>
                              {lead.invoice_name && <div>🧾 {lead.invoice_name}</div>}
                            </div>
                          )}

                          {(() => {
                            const whStatus = getWarehouseStatusForProject(lead.reference, lead.name)
                            if (!whStatus) return null
                            return (
                              <div
                                style={{
                                  marginTop: 4,
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: whStatus.bg,
                                  color: whStatus.color,
                                  border: `1px solid ${whStatus.color}44`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title={whStatus.notif.message || ''}
                              >
                                <span>{whStatus.label}</span>
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                      <td style={{ maxWidth: 280 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {lead.description || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => openEdit(lead)}
                          >
                            {isRtl ? 'تعديل' : 'Edit'}
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '3px 8px', fontSize: 11, color: '#ef4444' }}
                            onClick={() => { setSelectedLead(lead); setShowDeleteModal(true) }}
                          >
                            {isRtl ? 'حذف' : 'Del'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد مشاريع بيع مطابقة للفلاتر المحددة' : 'No sales projects match the criteria'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PIPELINE BOARD */}
      {activeTab === 'pipeline' && (
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {isRtl ? 'مراحل تسليم وتنفيذ المبيعات' : 'Sales Execution & Delivery Stages'}
          </div>
          <div className="pipeline" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {['under_manufacturing', 'ready_for_delivery', 'delivered'].map(stKey => {
              const info = STATUS_MAP[stKey]
              const items = leads.filter(l => l.sales_status === stKey)
              return (
                <div key={stKey} className="pipeline-col" style={{ background: 'var(--bg-base)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, color: info.color }}>{info[lang] || info.en}</span>
                    <span style={{ background: info.bg, color: info.color, padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                      {items.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(lead => (
                      <div key={lead.id} className="lead-card" style={{ background: 'var(--bg-card)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>{lead.reference}</span>
                          <strong style={{ fontSize: 12 }}>{formatCurrency(lead.expected_revenue)}</strong>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{lead.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.customer_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                          {stKey === 'under_manufacturing' && (
                            <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => handleUpdateStatus(lead.id, 'ready_for_delivery')}>
                              {isRtl ? 'جاهز للتسليم ➔' : 'Ready Delivery ➔'}
                            </button>
                          )}
                          {stKey === 'ready_for_delivery' && (
                            <button className="btn btn-sm btn-primary" style={{ fontSize: 10, background: '#10b981' }} onClick={() => handleUpdateStatus(lead.id, 'delivered')}>
                              {isRtl ? 'تم التسليم ✓' : 'Delivered ✓'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>
                        {isRtl ? 'لا توجد عناصر' : 'No items'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / NEW PROJECT PRICING (+ تسعير مشروع جديد) */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateSalesOrder}>
              <div className="modal-header">
                <h3>💰 {isRtl ? 'تسعير مشروع جديد' : 'New Project Pricing / Quotation'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم المشروع *' : 'Project Name *'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'مشروع لوحة توزيع رئيسية MDB' : 'Main MDB Board Project'}
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الرقم المرجعي' : 'Ref Number'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="REF-2026-0001"
                      value={form.reference}
                      onChange={e => setForm({ ...form, reference: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم العميل *' : 'Customer Name *'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'اسم المهندس / العميل' : 'Client contact name'}
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value, company: form.company || e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الشركة / المؤسسة' : 'Company / Institution'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'اسم الشركة المقاولة' : 'Company name'}
                      value={form.company}
                      onChange={e => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم *' : 'Department *'}</label>
                    <select
                      className="input"
                      value={form.product_category}
                      onChange={e => setForm({ ...form, product_category: e.target.value })}
                    >
                      <option value="iron">{isRtl ? '1- الحديد' : '1- Iron'}</option>
                      <option value="hangar">{isRtl ? '2- الهنجر' : '2- Hangar'}</option>
                      <option value="electrical">{isRtl ? '3- الكهرباء والتجميع' : '3- Electrical & Assembly'}</option>
                      <option value="misc">{isRtl ? '4- متفرقات' : '4- Miscellaneous'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'القيمة (SAR) *' : 'Value (SAR) *'}</label>
                    <input
                      required
                      type="number"
                      className="input"
                      placeholder="0.00"
                      value={form.expected_revenue}
                      onChange={e => setForm({ ...form, expected_revenue: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'تحميل ملفات وتفاصيل' : 'Upload Files & Details'}</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="file"
                      id="crm-file-upload"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) setForm({ ...form, files: file.name })
                      }}
                    />
                    <label
                      htmlFor="crm-file-upload"
                      className="btn btn-secondary btn-sm"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      📎 {isRtl ? 'اختر ملف العميل / المخطط' : 'Choose Client File / Schematic'}
                    </label>
                    <input
                      type="text"
                      className="input"
                      style={{ flex: 1 }}
                      placeholder={isRtl ? 'اسم الملف أو رابط المخطط (مثال: specs-sld.pdf)' : 'File name or spec notes...'}
                      value={form.files}
                      onChange={e => setForm({ ...form, files: e.target.value })}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {isRtl ? 'الملفات المرفقة سيتم إتاحة تحميلها ونقلها تلقائياً للمخططات الهندسية وقسم التصميم.' : 'Uploaded files will be transferred to Engineering Design upon approval.'}
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات المشروع' : 'Project Notes'}</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder={isRtl ? 'اكتب تفاصيل وملاحظات المشروع...' : 'Enter specifications and details...'}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-secondary">
                  {isRtl ? 'حفظ مسودة التسعير' : 'Save Draft Quotation'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: 700 }}
                  onClick={(e) => handleCreateSalesOrder(e, true)}
                >
                  📦 {isRtl ? 'حفظ وإرسال P.O للمستودع' : 'Save & Send P.O to Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: موافقة على السعر وإرسال للمستودع */}
      {showApprovalModal && approvalLead && (
        <div className="modal-backdrop" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleConfirmApprovalAndSendToDesign}>
              <div className="modal-header">
                <h3>📦 {isRtl ? 'اعتماد أمر الشراء (P.O) وإرسال للمستودع' : 'P.O Approval & Send to Warehouse'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 16 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                    {approvalLead.name} ({approvalLead.reference})
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>{isRtl ? 'العميل: ' : 'Customer: '}<strong>{approvalLead.customer_name}</strong></span>
                    {approvalLead.company && <span> • <strong>{approvalLead.company}</strong></span>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginTop: 6 }}>
                    {isRtl ? 'قيمة المشروع: ' : 'Value: '} {formatCurrency(approvalLead.expected_revenue)}
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? '1- طريقة الدفع *' : '1- Payment Method *'}</label>
                  <select
                    className="input"
                    value={approvalForm.payment_method}
                    onChange={e => setApprovalForm({ ...approvalForm, payment_method: e.target.value as any })}
                  >
                    <option value="cash">{isRtl ? 'نقدي (Cash)' : 'Cash'}</option>
                    <option value="credit">{isRtl ? 'ذمم (Accounts Receivable / Credit)' : 'Credit / Receivables'}</option>
                    <option value="gm_approval">{isRtl ? 'موافقة المدير العام (GM Approval)' : 'General Manager Approval'}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? '2- اسم الفاتورة *' : '2- Invoice Name *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: فاتورة تسعير مشروع رقم INV-2026-089' : 'Invoice name / reference...'}
                    value={approvalForm.invoice_name}
                    onChange={e => setApprovalForm({ ...approvalForm, invoice_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? '3- ملفات ومواصفات العميل المرفقة' : '3- Attached Files & Specs'}</label>
                  <input
                    type="text"
                    className="input"
                    value={approvalForm.files_note}
                    onChange={e => setApprovalForm({ ...approvalForm, files_note: e.target.value })}
                    placeholder={isRtl ? 'مخططات وجدول كميات العميل.pdf' : 'Client schematics & BoQ...'}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {isRtl ? 'سيتم إرسال أمر الشراء (P.O) ومواصفات المشروع فوراً إلى قسم المستودع للتحقق من توفر المواد والقطع المطلوبة.' : 'This project P.O will be dispatched immediately to the Warehouse to verify material availability.'}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: 700 }}>
                  📦 {isRtl ? 'حفظ وإرسال P.O للمستودع' : 'Save & Send P.O to Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SALES PROJECT */}
      {showEditModal && selectedLead && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleEditSalesOrder}>
              <div className="modal-header">
                <h3>{isRtl ? `تعديل مشروع: ${selectedLead.reference}` : `Edit Project: ${selectedLead.reference}`}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم المشروع' : 'Project Name'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الرقم المرجعي' : 'Ref Number'}</label>
                    <input
                      type="text"
                      className="input"
                      value={form.reference}
                      onChange={e => setForm({ ...form, reference: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم العميل' : 'Customer'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الشركة / المؤسسة' : 'Company / Institution'}</label>
                    <input
                      type="text"
                      className="input"
                      value={form.company}
                      onChange={e => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم' : 'Department'}</label>
                    <select
                      className="input"
                      value={form.product_category}
                      onChange={e => setForm({ ...form, product_category: e.target.value })}
                    >
                      <option value="iron">{isRtl ? '1- الحديد' : '1- Iron'}</option>
                      <option value="hangar">{isRtl ? '2- الهنجر' : '2- Hangar'}</option>
                      <option value="electrical">{isRtl ? '3- الكهرباء والتجميع' : '3- Electrical & Assembly'}</option>
                      <option value="misc">{isRtl ? '4- متفرقات' : '4- Miscellaneous'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'القيمة (SAR)' : 'Value (SAR)'}</label>
                    <input
                      type="number"
                      className="input"
                      value={form.expected_revenue}
                      onChange={e => setForm({ ...form, expected_revenue: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'تفاصيل وملاحظات المشروع' : 'Project Details & Notes'}</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {showDeleteModal && selectedLead && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#ef4444' }}>{isRtl ? 'تأكيد حذف المشروع' : 'Confirm Delete Project'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {isRtl
                  ? `هل أنت متأكد من حذف مشروع "${selectedLead.name}" (${selectedLead.reference})؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete "${selectedLead.name}" (${selectedLead.reference})? This action cannot be undone.`}
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeleteSalesOrder}>
                {isRtl ? 'حذف نهائياً' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEW TEMPLATE */}
      {showTemplateModal && (
        <div className="modal-backdrop" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateTemplate}>
              <div className="modal-header">
                <h3>{isRtl ? 'إضافة نموذج جديد (Templates)' : 'Create New Project Template'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'اسم النموذج بالعربية *' : 'Template Name (Arabic) *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: نموذج لوحة توزيع فرعية SMDB 400A' : 'Arabic template name'}
                    value={tplForm.template_name_ar}
                    onChange={e => setTplForm({ ...tplForm, template_name_ar: e.target.value, template_name: tplForm.template_name || e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'اسم النموذج بالإنجليزية' : 'Template Name (English)'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Sub Main Distribution Board SMDB 400A"
                    value={tplForm.template_name}
                    onChange={e => setTplForm({ ...tplForm, template_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم والتصنيف' : 'Category'}</label>
                    <select
                      className="input"
                      value={tplForm.category}
                      onChange={e => setTplForm({ ...tplForm, category: e.target.value })}
                    >
                      <option value="electrical_panels">⚡ لوحات كهربائية (Electrical panels)</option>
                      <option value="cable_tray_enclosure">📦 كابل تري وخزنه (Cable tray & storage)</option>
                      <option value="materials_parts">🔩 مواد وقطع (Materials & parts)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'التكلفة التقديرية (SAR)' : 'Estimated Cost (SAR)'}</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0.00"
                      value={tplForm.estimated_cost}
                      onChange={e => setTplForm({ ...tplForm, estimated_cost: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف النموذج ومواصفاته' : 'Description & Specs'}</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder={isRtl ? 'اكتب المواصفات الفنية للنموذج...' : 'Enter technical specifications...'}
                    value={tplForm.description}
                    onChange={e => setTplForm({ ...tplForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ النموذج' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
