'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate, formatCurrency } from '@/lib/constants'

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
  product_category: 'electrical_panels' | 'cable_tray_enclosure' | 'materials_parts' | string
  outcome: 'won' | 'in_progress' | 'pending' | string
  sales_status: 'under_manufacturing' | 'ready_for_delivery' | 'delivered' | string
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
  electrical_panels: { ar: 'لوحات كهربائية', en: 'Electrical Panels', icon: '⚡', color: '#f59e0b' },
  cable_tray_enclosure: { ar: 'كابل تري وخزنه', en: 'Cable Tray & Enclosures', icon: '📦', color: '#06b6d4' },
  materials_parts: { ar: 'مواد وقطع', en: 'Materials & Parts', icon: '🔩', color: '#a855f7' }
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
  const [activeTab, setActiveTab] = useState<'sales_orders' | 'templates' | 'pipeline'>('sales_orders')
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

  // Form
  const [form, setForm] = useState({
    name: '',
    customer_name: '',
    company: '',
    customer_email: '',
    customer_phone: '',
    expected_revenue: '',
    product_category: 'electrical_panels',
    outcome: 'won',
    sales_status: 'under_manufacturing',
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
  }, [])

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

  async function handleCreateSalesOrder(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_sales_order',
          ...form
        })
      })
      const json = await res.json()
      if (json.success) {
        setShowAddModal(false)
        resetForm()
        loadSales()
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
      customer_name: '',
      company: '',
      customer_email: '',
      customer_phone: '',
      expected_revenue: String(tpl.estimated_cost || 0),
      product_category: tpl.category || 'electrical_panels',
      outcome: 'won',
      sales_status: 'under_manufacturing',
      description: tpl.description || '',
      is_template: false,
      template_name: tpl.template_name
    })
    setShowAddModal(true)
  }

  function openEdit(lead: SalesLead) {
    setSelectedLead(lead)
    setForm({
      name: lead.name,
      customer_name: lead.customer_name,
      company: lead.company || lead.customer_name,
      customer_email: lead.customer_email || '',
      customer_phone: lead.customer_phone || '',
      expected_revenue: String(lead.expected_revenue || 0),
      product_category: lead.product_category || 'electrical_panels',
      outcome: lead.outcome || 'won',
      sales_status: lead.sales_status || 'under_manufacturing',
      description: lead.description || '',
      is_template: false,
      template_name: ''
    })
    setShowEditModal(true)
  }

  function resetForm() {
    setForm({
      name: '',
      customer_name: '',
      company: '',
      customer_email: '',
      customer_phone: '',
      expected_revenue: '',
      product_category: 'electrical_panels',
      outcome: 'won',
      sales_status: 'under_manufacturing',
      description: '',
      is_template: false,
      template_name: ''
    })
    setSelectedLead(null)
  }

  // Filtered Leads
  const filtered = leads.filter(l => {
    const matchCategory = selectedCategory === 'all' || l.product_category === selectedCategory
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
      title="Sales & Templates"
      titleAr="المبيعات والنماذج (مشاريع الإنتاج)"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplateModal(true)}>
            {isRtl ? '📑 + إضافة نموذج جديد' : '📑 + New Template'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowAddModal(true) }}>
            {isRtl ? '+ إضافة مشروع بيع جديد' : '+ New Sales Project'}
          </button>
        </div>
      }
    >
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
            onClick={() => setActiveTab('templates')}
            className={`btn btn-sm ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            📑 {isRtl ? 'النماذج (Templates)' : 'Templates Catalogue'} ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`btn btn-sm ${activeTab === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 600 }}
          >
            📊 {isRtl ? 'مسار المبيعات التفاعلي' : 'Sales Pipeline'}
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
              {Object.entries(CATEGORY_MAP).map(([key, info]) => {
                const isSelected = selectedCategory === key
                const count = key === 'all' ? leads.length : leads.filter(l => l.product_category === key).length
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
                    <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 10 }}>
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

          {/* TABLE: Section 1 (الرقم المرجعي / اسم المشروع / العميل / النتيجة / الحالة) */}
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'الرقم المرجعي' : 'Ref Number'}</th>
                  <th>{isRtl ? 'اسم المشروع' : 'Project Name'}</th>
                  <th>{isRtl ? 'العميل / الشركة' : 'Client / Company'}</th>
                  <th>{isRtl ? 'القسم والتصنيف' : 'Department'}</th>
                  <th>{isRtl ? 'النتيجة' : 'Outcome'}</th>
                  <th>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th>{isRtl ? 'القيمة' : 'Value'}</th>
                  <th>{isRtl ? 'الإجراء السريع' : 'Workflow Action'}</th>
                  <th>{isRtl ? 'خيارات' : 'Options'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const catInfo = CATEGORY_MAP[lead.product_category] || CATEGORY_MAP.electrical_panels
                  const statusInfo = STATUS_MAP[lead.sales_status] || STATUS_MAP.under_manufacturing
                  const outcomeInfo = OUTCOME_MAP[lead.outcome] || OUTCOME_MAP.won

                  return (
                    <tr key={lead.id}>
                      <td style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace' }}>
                        {lead.reference}
                      </td>
                      <td>
                        <strong>{lead.name}</strong>
                        {lead.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lead.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div><strong>{lead.customer_name}</strong></div>
                        {lead.company && lead.company !== lead.customer_name && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.company}</div>
                        )}
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
                      <td>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: outcomeInfo.color,
                            background: 'rgba(255,255,255,0.03)'
                          }}
                        >
                          {outcomeInfo[lang] || outcomeInfo.en}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background: statusInfo.bg,
                            color: statusInfo.color,
                            border: `1px solid ${statusInfo.color}44`
                          }}
                        >
                          {statusInfo[lang] || statusInfo.en}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {formatCurrency(lead.expected_revenue)}
                      </td>
                      <td>
                        {lead.sales_status === 'under_manufacturing' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11, padding: '4px 8px', borderColor: '#38bdf8', color: '#38bdf8' }}
                            onClick={() => handleUpdateStatus(lead.id, 'ready_for_delivery')}
                          >
                            {isRtl ? 'جاهز للتسليم ➔' : 'Ready Delivery ➔'}
                          </button>
                        )}
                        {lead.sales_status === 'ready_for_delivery' && (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, padding: '4px 8px', background: '#10b981', borderColor: '#10b981' }}
                            onClick={() => handleUpdateStatus(lead.id, 'delivered')}
                          >
                            {isRtl ? 'تم التسليم ✓' : 'Delivered ✓'}
                          </button>
                        )}
                        {lead.sales_status === 'delivered' && (
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ {isRtl ? 'مكتمل' : 'Completed'}</span>
                        )}
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
                    <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد مشاريع بيع مطابقة للفلاتر المحددة' : 'No sales projects match the criteria'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATES (النماذج) */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  📑 {isRtl ? 'قوالب ونماذج مشاريع الإنتاج (النماذج)' : 'Production Projects Templates'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl ? 'نماذج قياسية جاهزة لإطلاق مشاريع اللوحات الكهربائية، الكابل تري، وتوريد المواد بضغطة زر واحدة' : 'Pre-configured blueprints to quickly start electrical panels, cable trays, and parts orders'}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowTemplateModal(true)}>
                + {isRtl ? 'إضافة نموذج جديد' : 'New Template'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {templates.map(tpl => {
                const catInfo = CATEGORY_MAP[tpl.category] || CATEGORY_MAP.electrical_panels
                return (
                  <div
                    key={tpl.id}
                    style={{
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 14,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span
                          style={{
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
                        <strong style={{ fontSize: 14, color: 'var(--gold)' }}>
                          {formatCurrency(tpl.estimated_cost)}
                        </strong>
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                        {isRtl ? (tpl.template_name_ar || tpl.template_name) : tpl.template_name}
                      </h4>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
                      onClick={() => applyTemplate(tpl)}
                    >
                      🚀 {isRtl ? 'استخدام النموذج وإنشاء مشروع بيع' : 'Use Template & Create Project'}
                    </button>
                  </div>
                )
              })}
            </div>
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
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4 }}>{lead.name}</div>
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

      {/* MODAL: ADD SALES PROJECT */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateSalesOrder}>
              <div className="modal-header">
                <h3>{isRtl ? 'إضافة مشروع بيع وإنتاج جديد' : 'New Sales & Production Project'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'اسم المشروع / عنوان الطلبية *' : 'Project Name / Title *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: لوحة توزيع رئيسية MDB لمشروع برج التحلية' : 'e.g. MDB Main Board for Tower'}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
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
                    <label className="label">{isRtl ? 'الشركة / المؤسسة' : 'Company'}</label>
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
                    <label className="label">{isRtl ? 'القسم / خط الإنتاج (صفحة البيع) *' : 'Department & Line *'}</label>
                    <select
                      className="input"
                      value={form.product_category}
                      onChange={e => setForm({ ...form, product_category: e.target.value })}
                    >
                      <option value="electrical_panels">⚡ لوحات كهربائية (Electrical panels)</option>
                      <option value="cable_tray_enclosure">📦 كابل تري وخزنه (Cable tray & storage)</option>
                      <option value="materials_parts">🔩 مواد وقطع (Materials & parts)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'النتيجة (Outcome) *' : 'Outcome *'}</label>
                    <select
                      className="input"
                      value={form.outcome}
                      onChange={e => setForm({ ...form, outcome: e.target.value })}
                    >
                      <option value="won">✓ تم التعاقد / ناجح (Won)</option>
                      <option value="in_progress">⏳ جاري التفاوض (In Progress)</option>
                      <option value="pending">معلق للدراسة (Pending)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'حالة الإنتاج والتسليم *' : 'Status *'}</label>
                    <select
                      className="input"
                      value={form.sales_status}
                      onChange={e => setForm({ ...form, sales_status: e.target.value })}
                    >
                      <option value="under_manufacturing">⚙️ قيد التصنيع (Under manufacturing)</option>
                      <option value="ready_for_delivery">🚚 جاهز للتسليم (Ready for delivery)</option>
                      <option value="delivered">✅ تم التسليم (Delivered)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'القيمة المتوقعة (SAR)' : 'Contract Value (SAR)'}</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0.00"
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
                    placeholder={isRtl ? 'اكتب المواصفات والملاحظات المطلوبة...' : 'Enter specifications and details...'}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ المشروع' : 'Save Project'}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'العميل' : 'Customer'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الشركة' : 'Company'}</label>
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
                    <label className="label">{isRtl ? 'القسم / خط الإنتاج' : 'Department'}</label>
                    <select
                      className="input"
                      value={form.product_category}
                      onChange={e => setForm({ ...form, product_category: e.target.value })}
                    >
                      <option value="electrical_panels">⚡ لوحات كهربائية (Electrical panels)</option>
                      <option value="cable_tray_enclosure">📦 كابل تري وخزنه (Cable tray & storage)</option>
                      <option value="materials_parts">🔩 مواد وقطع (Materials & parts)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الحالة' : 'Status'}</label>
                    <select
                      className="input"
                      value={form.sales_status}
                      onChange={e => setForm({ ...form, sales_status: e.target.value })}
                    >
                      <option value="under_manufacturing">⚙️ قيد التصنيع (Under manufacturing)</option>
                      <option value="ready_for_delivery">🚚 جاهز للتسليم (Ready for delivery)</option>
                      <option value="delivered">✅ تم التسليم (Delivered)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'النتيجة' : 'Outcome'}</label>
                    <select
                      className="input"
                      value={form.outcome}
                      onChange={e => setForm({ ...form, outcome: e.target.value })}
                    >
                      <option value="won">✓ تم التعاقد / ناجح (Won)</option>
                      <option value="in_progress">⏳ جاري العمل (In Progress)</option>
                      <option value="pending">معلق (Pending)</option>
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
                  <label className="label">{isRtl ? 'ملاحظات' : 'Notes'}</label>
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
