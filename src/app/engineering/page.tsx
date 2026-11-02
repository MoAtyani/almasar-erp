'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { formatDate, formatCurrency } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

interface DesignProject {
  id: string
  sales_lead_id?: string
  project_ref: string
  name: string
  customer_name: string
  company: string
  product_category: string
  expected_revenue: number
  payment_method: string
  invoice_name: string
  client_files: string
  received_date: string
  delivery_date: string
  status: 'received_from_sales' | 'po_sent_to_warehouse' | 'sent_to_production' | string
  po_number?: string
  po_sent_at?: string
  production_order_id?: string
  production_sent_at?: string
  notes?: string
}

const INITIAL_DESIGN_PROJECTS: DesignProject[] = [
  {
    id: 'des-001',
    project_ref: 'REF-2026-0042',
    name: 'مشروع لوحات توزيع رئيسية 2500A MDB',
    customer_name: 'شركة المباني المتقدمة للمقاولات',
    company: 'شركة المباني المتقدمة',
    product_category: 'electrical',
    expected_revenue: 145000,
    payment_method: 'credit',
    invoice_name: 'فاتورة تسعير مبدئي INV-2026-0042',
    client_files: 'SLD_Single_Line_Diagram_MDB_Rev2.pdf',
    received_date: '2026-10-24',
    delivery_date: '2026-11-15',
    status: 'received_from_sales',
    po_number: 'PO-WH-2026-091',
    notes: 'مخطط القواطع الهوائية ABB Emax 2 مع محولات التيار CT'
  },
  {
    id: 'des-002',
    project_ref: 'REF-2026-0045',
    name: 'حوامل كوابل ومجاري صاج مجلفن للهنجر الرئيسي',
    customer_name: 'مؤسسة إعمار الصناعية',
    company: 'مؤسسة إعمار الصناعية',
    product_category: 'hangar',
    expected_revenue: 68000,
    payment_method: 'cash',
    invoice_name: 'فاتورة كاش رقم INV-2026-0045',
    client_files: 'Cable_Tray_Layout_Hangar_B2.dwg',
    received_date: '2026-10-26',
    delivery_date: '2026-11-10',
    status: 'po_sent_to_warehouse',
    po_number: 'PO-WH-2026-094',
    notes: 'صاج مجلفن على الساخن سماكة 2.0 مم مع الأغطية والمثبتات'
  },
  {
    id: 'des-003',
    project_ref: 'REF-2026-0048',
    name: 'هياكل حديد وأبواب خارجية معالجة ضد الرطوبة IP65',
    customer_name: 'المهندس خالد الرشيد',
    company: 'مشاريع الشرق للأعمال الكهروميكانيكية',
    product_category: 'iron',
    expected_revenue: 42000,
    payment_method: 'gm_approval',
    invoice_name: 'فاتورة اعتماد خاص INV-2026-0048',
    client_files: 'Outdoor_Enclosure_IP65_Specs.pdf',
    received_date: '2026-10-28',
    delivery_date: '2026-11-20',
    status: 'received_from_sales',
    notes: 'حديد أسود مدرفل على البارد 2.5 مم مع دهان بودرة حراري RAL 7035'
  }
]

const MOCK_ENG_TASKS = [
  {
    id: 'eng-1',
    name: 'Single Line Diagram (SLD) & Protection Curve Coordination',
    name_ar: 'المخطط أحادي الخط (SLD) وتنسيق منحنيات الحماية والترحيل',
    project_ref: 'PJ-2026-001',
    customer: 'Saudi Electricity Co. (SEC)',
    engineer: 'Eng. Ahmed Al-Mansoor (م. أحمد المنصور)',
    status: 'approved',
    stage: 'Design Approval',
    progress: 100,
    created_at: '2026-10-02',
  },
  {
    id: 'eng-2',
    name: 'AutoCAD General Arrangement (GA) & Busbar Bending Schematics',
    name_ar: 'مخطط كاد العام ومقاسات ثني البسبار النحاسي Form 4b',
    project_ref: 'PJ-2026-001',
    customer: 'Saudi Electricity Co. (SEC)',
    engineer: 'Eng. Ahmed Al-Mansoor',
    status: 'in_progress',
    stage: 'Detailed Engineering',
    progress: 85,
    created_at: '2026-10-05',
  },
  {
    id: 'eng-3',
    name: 'MCC Motor Feeder Thermal Dissipation & Ventilation Sizing',
    name_ar: 'حسابات التبديد الحراري وتهوية خلايا قواطع المحركات MCC',
    project_ref: 'PJ-2026-002',
    customer: 'Al-Bawani Contracting',
    engineer: 'Eng. Ahmed Al-Mansoor',
    status: 'in_progress',
    stage: 'Design Review',
    progress: 60,
    created_at: '2026-10-10',
  },
  {
    id: 'eng-4',
    name: 'Bill of Quantities (BoQ) & Switchgear Cost Estimation',
    name_ar: 'إعداد جدول الكميات (BoQ) وتخمين تكلفة اللوحة والمكونات',
    project_ref: 'PJ-2026-004',
    customer: 'Nesma Infrastructure',
    engineer: 'Eng. Yousef Basbous',
    status: 'started',
    stage: 'Estimation Phase',
    progress: 40,
    created_at: '2026-10-14',
  },
]

export default function EngineeringPage() {
  const { lang, isRtl } = useLanguage()
  const [activeTab, setActiveTab] = useState<'design' | 'schematics'>('design')
  const [designProjects, setDesignProjects] = useState<DesignProject[]>([])
  const [tasks, setTasks] = useState(MOCK_ENG_TASKS)
  const [search, setSearch] = useState('')

  // Modals
  const [selectedProjectForPO, setSelectedProjectForPO] = useState<DesignProject | null>(null)
  const [selectedProjectForProd, setSelectedProjectForProd] = useState<DesignProject | null>(null)
  const [poForm, setPoForm] = useState({
    po_number: '',
    warehouse: 'المستودع الرئيسي - قطاع المواد الأولية',
    materials_list: 'نحاس إلكتروليتي 99.9%، صاج مجلفن 2.0 مم، عوازل بسبار SMC، مسامير عزم مجلفنة',
    notes: 'طلب مواد عاجل لإنتاج المشروع المعتمد'
  })
  const [prodForm, setProdForm] = useState({
    target_department: 'قسم الكهرباء والتجميع',
    quantity: 1,
    schematics_attachment: '',
    manufacturing_instructions: 'البدء بأعمال التقطيع والتجميع حسب المخططات المعتمدة وتجهيز فحص FAT'
  })

  useEffect(() => {
    loadDesignProjects()
  }, [])

  function loadDesignProjects() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('almasar_design_projects')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDesignProjects(parsed)
            return
          }
        } catch (e) {
          console.error('Error parsing design projects:', e)
        }
      }
      localStorage.setItem('almasar_design_projects', JSON.stringify(INITIAL_DESIGN_PROJECTS))
      setDesignProjects(INITIAL_DESIGN_PROJECTS)
    }
  }

  function handleDateChange(id: string, field: 'received_date' | 'delivery_date', val: string) {
    const updated = designProjects.map(p => p.id === id ? { ...p, [field]: val } : p)
    setDesignProjects(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('almasar_design_projects', JSON.stringify(updated))
    }
  }

  function handleDownloadClientFile(p: DesignProject) {
    alert(isRtl ? `جاري تحميل ملف العميل: ${p.client_files}` : `Downloading client file: ${p.client_files}`)
  }

  function openPOModal(p: DesignProject) {
    setSelectedProjectForPO(p)
    setPoForm({
      po_number: p.po_number || `PO-WH-2026-${Math.floor(100 + Math.random() * 900)}`,
      warehouse: 'المستودع الرئيسي - قطاع المواد الأولية',
      materials_list: `المواد والمكونات المحجوزة لمشروع ${p.name} (بسبار نحاسي، قواطع، هيكل، كابلات)`,
      notes: 'طلب صرف مواد P.O معتمد من قسم التصميم والهندسة'
    })
  }

  function handleSendPOToWarehouse(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProjectForPO) return
    const updated = designProjects.map(p => p.id === selectedProjectForPO.id ? {
      ...p,
      status: 'po_sent_to_warehouse',
      po_number: poForm.po_number,
      po_sent_at: new Date().toISOString()
    } : p)
    setDesignProjects(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('almasar_design_projects', JSON.stringify(updated))
    }
    setSelectedProjectForPO(null)
    alert(isRtl ? `تم تحميل وإرسال أمر الشراء / صرف المواد (P.O #${poForm.po_number}) إلى المستودع بنجاح!` : `P.O #${poForm.po_number} uploaded & dispatched to Warehouse successfully!`)
  }

  function openProductionModal(p: DesignProject) {
    setSelectedProjectForProd(p)
    setProdForm({
      target_department: p.product_category === 'iron' ? 'قسم الحديد' : p.product_category === 'hangar' ? 'قسم الهنجر' : 'قسم الكهرباء والتجميع',
      quantity: 1,
      schematics_attachment: p.client_files || 'مخططات_التصميم_المعتمدة.pdf',
      manufacturing_instructions: `أمر تصنيع وتشغيل صادر من التصميم لمشروع ${p.name} (${p.project_ref})`
    })
  }

  function handleSendToProduction(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProjectForProd) return

    const prodOrderId = `MO-${Date.now()}`
    const productionOrder = {
      id: prodOrderId,
      project_id: selectedProjectForProd.id,
      project_ref: selectedProjectForProd.project_ref,
      project_name: selectedProjectForProd.name,
      customer_name: selectedProjectForProd.customer_name,
      company: selectedProjectForProd.company,
      department: prodForm.target_department,
      quantity: prodForm.quantity,
      schematics: prodForm.schematics_attachment,
      instructions: prodForm.manufacturing_instructions,
      received_date: selectedProjectForProd.received_date,
      deadline: selectedProjectForProd.delivery_date,
      created_at: new Date().toISOString(),
      origin: 'from_design'
    }

    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('almasar_production_from_design') || '[]')
      localStorage.setItem('almasar_production_from_design', JSON.stringify([productionOrder, ...existing]))
    }

    const updated = designProjects.map(p => p.id === selectedProjectForProd.id ? {
      ...p,
      status: 'sent_to_production',
      production_order_id: prodOrderId,
      production_sent_at: new Date().toISOString()
    } : p)
    setDesignProjects(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('almasar_design_projects', JSON.stringify(updated))
    }

    setSelectedProjectForProd(null)
    alert(isRtl ? `تم إرسال أمر التصنيع الجديد (${prodOrderId}) بنجاح إلى قسم الإنتاج والمهام مع كافة ملفات المخططات!` : `New manufacturing order (${prodOrderId}) sent to Production successfully!`)
  }

  const filteredProjects = designProjects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.project_ref.toLowerCase().includes(search.toLowerCase()) ||
    p.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTasks = tasks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.name_ar.includes(search) ||
    t.project_ref.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout
      title="Engineering & Design"
      titleAr="الهندسة والتصميم (صفحة التصميم)"
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const file = prompt(isRtl ? 'أدخل اسم ملف العميل الجديد:' : 'Enter client file name:', 'Client_Drawing_V1.dwg')
              if (file) alert(isRtl ? `تم رفع ملف العميل: ${file}` : `Client file uploaded: ${file}`)
            }}
          >
            + {isRtl ? 'تحميل ملف العميل' : 'Upload Client File'}
          </button>
        </div>
      }
    >
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-card)', padding: 6, borderRadius: 10, border: '1px solid var(--border)' }}>
        <button
          className={`btn btn-sm ${activeTab === 'design' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('design')}
          style={{ fontWeight: 700 }}
        >
          📐 {isRtl ? 'صفحة التصميم (استقبال مشروع جديد من المبيعات)' : 'Design Department (Incoming Projects)'} ({designProjects.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'schematics' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('schematics')}
          style={{ fontWeight: 700 }}
        >
          📋 {isRtl ? 'المخططات والمهام الهندسية' : 'Engineering Schematics & Tasks'} ({tasks.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: صفحة التصميم (استقبال مشروع جديد) */}
      {/* ========================================================================= */}
      {activeTab === 'design' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 20, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                  📐 {isRtl ? 'صفحة التصميم: استقبال وإدارة مشاريع الإنتاج الواردة' : 'Design Department: Incoming Projects from Sales'}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isRtl
                    ? 'استقبال مشاريع المبيعات المعتمدة، تحميل ملفات العميل، إصدار وتحميل P.O للمستودع، وإرسال أوامر التصنيع مباشرة لخطوط الإنتاج.'
                    : 'Manage incoming client orders from Sales, download files, issue warehouse P.O, and dispatch new manufacturing orders to production.'}
                </p>
              </div>
              <input
                type="text"
                className="input"
                style={{ width: 280 }}
                placeholder={isRtl ? '...بحث في مشاريع التصميم' : 'Search design projects...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Incoming Projects Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredProjects.map(proj => (
              <div
                key={proj.id}
                className="card"
                style={{
                  padding: 22,
                  border: proj.status === 'sent_to_production' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                  background: proj.status === 'sent_to_production' ? 'rgba(16, 185, 129, 0.02)' : 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold)', fontFamily: 'monospace' }}>
                        {proj.project_ref}
                      </span>
                      <span className="badge badge-subtle" style={{ fontWeight: 700 }}>
                        {proj.product_category === 'iron' ? (isRtl ? 'قسم الحديد' : 'Iron') : proj.product_category === 'hangar' ? (isRtl ? 'قسم الهنجر' : 'Hangar') : proj.product_category === 'misc' ? (isRtl ? 'متفرقات' : 'Misc') : (isRtl ? 'الكهرباء والتجميع' : 'Electrical')}
                      </span>
                      {proj.status === 'sent_to_production' ? (
                        <span className="badge" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98155' }}>
                          ✓ {isRtl ? 'تم الإرسال للإنتاج' : 'Sent to Production'}
                        </span>
                      ) : proj.status === 'po_sent_to_warehouse' ? (
                        <span className="badge" style={{ background: '#38bdf822', color: '#38bdf8', border: '1px solid #38bdf855' }}>
                          📦 {isRtl ? 'تم إرسال P.O للمستودع' : 'P.O Sent to Warehouse'}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55' }}>
                          ⏳ {isRtl ? 'استقبال مشروع جديد' : 'New Incoming Project'}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {proj.name}
                    </h4>

                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span><strong>{isRtl ? 'العميل:' : 'Client:'}</strong> {proj.customer_name}</span>
                      {proj.company && <span><strong>{isRtl ? 'الشركة:' : 'Company:'}</strong> {proj.company}</span>}
                      <span><strong>{isRtl ? 'طريقة الدفع:' : 'Payment:'}</strong> {proj.payment_method === 'cash' ? (isRtl ? 'نقدي' : 'Cash') : proj.payment_method === 'credit' ? (isRtl ? 'ذمم' : 'Credit') : (isRtl ? 'موافقة المدير العام' : 'GM Approval')}</span>
                      <span><strong>{isRtl ? 'اسم الفاتورة:' : 'Invoice:'}</strong> {proj.invoice_name}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{isRtl ? 'قيمة العقد المعتمد' : 'Contract Value'}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)' }}>
                      {formatCurrency(proj.expected_revenue)}
                    </div>
                  </div>
                </div>

                {/* Dates & File specs bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, margin: '14px 0', background: 'var(--bg-base)', padding: 12, borderRadius: 8 }}>
                  <div>
                    <label className="label" style={{ fontSize: 11, marginBottom: 2 }}>
                      📅 {isRtl ? 'تاريخ الاستلام' : 'Received Date'}
                    </label>
                    <input
                      type="date"
                      className="input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={proj.received_date}
                      onChange={e => handleDateChange(proj.id, 'received_date', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontSize: 11, marginBottom: 2 }}>
                      🚚 {isRtl ? 'موعد التسليم' : 'Delivery Date'}
                    </label>
                    <input
                      type="date"
                      className="input"
                      style={{ fontSize: 12, padding: '4px 8px' }}
                      value={proj.delivery_date}
                      onChange={e => handleDateChange(proj.id, 'delivery_date', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label" style={{ fontSize: 11, marginBottom: 2 }}>
                      📁 {isRtl ? 'ملف العميل المرفق' : 'Client Spec File'}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                      <span>📎</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                        {proj.client_files || 'Client_Drawing_Specs.pdf'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions row: Download Client file, Send PO to warehouse, Send to production */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', paddingTop: 8 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDownloadClientFile(proj)}
                    style={{ fontWeight: 600 }}
                  >
                    📥 {isRtl ? '+ تحميل ملف العميل' : 'Download Client File'}
                  </button>

                  <button
                    className="btn btn-sm"
                    style={{ background: '#38bdf822', color: '#38bdf8', border: '1px solid #38bdf855', fontWeight: 600 }}
                    onClick={() => openPOModal(proj)}
                  >
                    📦 {isRtl ? 'تحميل وارسال P.O للمستودع' : 'Upload & Send P.O to Warehouse'}
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => openProductionModal(proj)}
                    style={{ fontWeight: 700 }}
                  >
                    🚀 {isRtl ? 'ارسال للانتاج امر تصنيع جديد' : 'Send Manufacturing Order to Production'}
                  </button>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                {isRtl ? 'لا توجد مشاريع واردة من قسم المبيعات حالياً' : 'No incoming design projects found'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: المخططات والمهام الهندسية */}
      {/* ========================================================================= */}
      {activeTab === 'schematics' && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {isRtl ? 'جدول المهام والمخططات الهندسية' : 'Engineering Submittals & Schematics'}
            </div>
            <input
              type="text"
              className="input"
              style={{ width: 300 }}
              placeholder={isRtl ? '...بحث في المخططات أو المشاريع' : 'Search engineering tasks...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'المهمة الهندسية' : 'TASK'}</th>
                  <th>{isRtl ? 'المشروع' : 'PROJECT'}</th>
                  <th>{isRtl ? 'المهندس المسؤول' : 'ENGINEER'}</th>
                  <th>{isRtl ? 'مرحلة التصميم' : 'STAGE'}</th>
                  <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                  <th>{isRtl ? 'نسبة الإنجاز' : 'PROGRESS'}</th>
                  <th>{isRtl ? 'تاريخ الإنشاء' : 'CREATED'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{isRtl ? task.name_ar : task.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isRtl ? task.name : task.name_ar}</div>
                    </td>
                    <td>
                      <span className="badge badge-subtle">{task.project_ref}</span>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{task.customer}</div>
                    </td>
                    <td>{task.engineer}</td>
                    <td>{task.stage}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: task.status === 'approved' ? '#22c55e22' : '#0ea5e922',
                          color: task.status === 'approved' ? '#22c55e' : '#0ea5e9',
                        }}
                      >
                        {task.status === 'approved' ? (isRtl ? 'معتمد' : 'Approved') : (isRtl ? 'جاري العمل' : 'In Progress')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar-wrapper" style={{ width: 80 }}>
                          <div className="progress-bar" style={{ width: `${task.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.progress}%</span>
                      </div>
                    </td>
                    <td>{formatDate(task.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: تحميل وارسال P.O للمستودع */}
      {/* ========================================================================= */}
      {selectedProjectForPO && (
        <div className="modal-backdrop" onClick={() => setSelectedProjectForPO(null)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSendPOToWarehouse}>
              <div className="modal-header">
                <h3>📦 {isRtl ? 'تحميل وإرسال P.O للمستودع (طلب صرف مواد)' : 'Send Material P.O to Warehouse'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProjectForPO(null)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{selectedProjectForPO.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProjectForPO.project_ref} • {selectedProjectForPO.customer_name}</div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'رقم أمر الشراء / صرف المواد (P.O Number) *' : 'P.O Number *'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    value={poForm.po_number}
                    onChange={e => setPoForm({ ...poForm, po_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'المستودع المستهدف' : 'Target Warehouse'}</label>
                  <select
                    className="input"
                    value={poForm.warehouse}
                    onChange={e => setPoForm({ ...poForm, warehouse: e.target.value })}
                  >
                    <option value="المستودع الرئيسي - قطاع المواد الأولية">المستودع الرئيسي - قطاع المواد الأولية</option>
                    <option value="مستودع مستلزمات اللوحات الكهربائية">مستودع مستلزمات اللوحات الكهربائية</option>
                    <option value="مستودع حوامل الكوابل والصاج">مستودع حوامل الكوابل والصاج</option>
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'قائمة المواد المطلوبة للحجز والصرف' : 'Materials Bill of Quantities'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    value={poForm.materials_list}
                    onChange={e => setPoForm({ ...poForm, materials_list: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'ملاحظات وتوجيهات للمستودع' : 'Warehouse Instructions'}</label>
                  <input
                    type="text"
                    className="input"
                    value={poForm.notes}
                    onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProjectForPO(null)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: 700 }}>
                  📦 {isRtl ? 'تحميل وإرسال P.O للمستودع' : 'Dispatch P.O to Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ارسال للانتاج امر تصنيع جديد */}
      {/* ========================================================================= */}
      {selectedProjectForProd && (
        <div className="modal-backdrop" onClick={() => setSelectedProjectForProd(null)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSendToProduction}>
              <div className="modal-header">
                <h3>🚀 {isRtl ? 'إرسال أمر تصنيع جديد للإنتاج' : 'Send Manufacturing Order to Production'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProjectForProd(null)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{selectedProjectForProd.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {selectedProjectForProd.project_ref} • {selectedProjectForProd.customer_name} • التسليم: {selectedProjectForProd.delivery_date}
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'القسم الإنتاجي المستهدف *' : 'Target Production Department *'}</label>
                  <select
                    className="input"
                    value={prodForm.target_department}
                    onChange={e => setProdForm({ ...prodForm, target_department: e.target.value })}
                  >
                    <option value="قسم الكهرباء والتجميع">{isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical & Assembly'}</option>
                    <option value="قسم الحديد">{isRtl ? 'قسم الحديد' : 'Iron Department'}</option>
                    <option value="قسم الهنجر">{isRtl ? 'قسم الهنجر' : 'Hangar Department'}</option>
                    <option value="قسم الدهان">{isRtl ? 'قسم الدهان' : 'Painting Department'}</option>
                    <option value="قسم الفحص والجودة">{isRtl ? 'قسم الفحص والجودة' : 'Quality Control (QC)'}</option>
                  </select>
                </div>

                <div>
                  <label className="label">{isRtl ? 'العدد المطلوب تصنيعه *' : 'Manufacturing Quantity *'}</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input"
                    value={prodForm.quantity}
                    onChange={e => setProdForm({ ...prodForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'مخططات وملفات التصميم المرفقة' : 'Attached Schematics'}</label>
                  <input
                    type="text"
                    className="input"
                    value={prodForm.schematics_attachment}
                    onChange={e => setProdForm({ ...prodForm, schematics_attachment: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'تعليمات وملاحظات التصنيع' : 'Manufacturing Instructions'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    value={prodForm.manufacturing_instructions}
                    onChange={e => setProdForm({ ...prodForm, manufacturing_instructions: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProjectForProd(null)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}>
                  🚀 {isRtl ? 'إصدار وإرسال أمر التصنيع' : 'Dispatch Order to Production'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
