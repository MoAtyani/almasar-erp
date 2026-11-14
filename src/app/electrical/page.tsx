'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { addNotification, getNotifications, markNotificationRead, AppNotification } from '@/lib/notifications'

export type ElectricalOrderStatus = 'pending' | 'received' | 'manufacturing' | 'qc_sent' | 'ready'

export interface ElectricalOrder {
  id: string
  reference: string
  projectName: string
  customerName?: string
  receiptDate: string
  deliveryDate: string
  blueprintName?: string
  notes?: string
  status: ElectricalOrderStatus
  updatedAt?: string
  shortageReported?: boolean
  shortageDetails?: {
    materialName: string
    quantity: number | string
    reportedAt: string
    status: 'pending' | 'arrived'
  }
}

const INITIAL_ELECTRICAL_ORDERS: ElectricalOrder[] = [
  {
    id: 'ELE-2026-001',
    reference: 'REF-2026-0042',
    projectName: 'مشروع لوحات توزيع رئيسية 2500A MDB',
    customerName: 'شركة المباني المتقدمة للمقاولات',
    receiptDate: '2026-10-24',
    deliveryDate: '2026-11-15',
    blueprintName: 'SLD_Single_Line_Diagram_MDB_Rev2.pdf',
    notes: 'البدء بأعمال التقطيع والتجميع حسب المخططات المعتمدة وتجهيز فحص FAT، قواطع هوائية ACB 2500A وباسبار نحاس',
    status: 'manufacturing',
    updatedAt: '2026-10-25T10:00:00Z',
    shortageReported: true,
    shortageDetails: {
      materialName: 'نحاس إلكتروليتي 100x10 ملم',
      quantity: '40 متر',
      reportedAt: '2026-10-28T11:00:00Z',
      status: 'pending'
    }
  },
  {
    id: 'ELE-2026-002',
    reference: 'REF-2026-0058',
    projectName: 'لوحة تحكم مضخات مياه مع ATS ذكي',
    customerName: 'مؤسسة الري الحديث',
    receiptDate: '2026-11-04',
    deliveryDate: '2026-11-22',
    blueprintName: 'Water_Pump_ATS_Wiring_Schematic.pdf',
    notes: 'توصيل محولات VFD 45kW، جهاز PLC Siemens S7-1200، وشاشة HMI قياس 7 إنش',
    status: 'received',
    updatedAt: '2026-11-05T09:30:00Z'
  },
  {
    id: 'ELE-2026-003',
    reference: 'REF-2026-0033',
    projectName: 'لوحة توزيع فرعية SMDB 630A مقاومة للأتربة',
    customerName: 'المستشفى التخصصي للأورام',
    receiptDate: '2026-10-18',
    deliveryDate: '2026-11-08',
    blueprintName: 'Sub_Distribution_Panel_Specs.pdf',
    notes: 'تم استكمال التمديدات الداخلية والترقيم والربط الكهربائي وبانتظار تقرير مهندس الجودة',
    status: 'qc_sent',
    updatedAt: '2026-11-02T15:00:00Z',
    shortageReported: true,
    shortageDetails: {
      materialName: 'مفاتيح قواطع فرعية 63A MCB',
      quantity: 12,
      reportedAt: '2026-10-20T08:00:00Z',
      status: 'arrived'
    }
  },
  {
    id: 'ELE-2026-004',
    reference: 'REF-2026-0067',
    projectName: 'لوحات تحكم إنارة شوارع مع مؤقتات فلكية',
    customerName: 'أمانة العاصمة الكبرى',
    receiptDate: '2026-11-08',
    deliveryDate: '2026-11-26',
    blueprintName: 'Street_Light_Panel_Wiring.pdf',
    notes: 'لوحات معزولة IP65 مع خلايا كهروضوئية ومؤقتات ذكية وحماية ضد الصواعق',
    status: 'pending',
    updatedAt: '2026-11-08T11:00:00Z'
  },
  {
    id: 'ELE-2026-005',
    reference: 'REF-2026-0021',
    projectName: 'لوحة مكثفات تحسين معامل القدرة 300 kVAR',
    customerName: 'مصنع الخليج للبلاستيك',
    receiptDate: '2026-10-12',
    deliveryDate: '2026-10-30',
    blueprintName: 'Power_Factor_Capacitor_Bank_Drawing.pdf',
    notes: 'تم إجراء فحص العزل وفحص الحقن والتشغيل واجتياز الجودة، جاهزة للتسليم النهائي',
    status: 'ready',
    updatedAt: '2026-10-29T14:00:00Z'
  }
]

export default function ElectricalDepartmentPage() {
  const router = useRouter()
  const { lang, isRtl } = useLanguage()
  const { theme, toggleTheme, isLight } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<ElectricalOrder[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [bannerNotice, setBannerNotice] = useState<AppNotification | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Shortage Modal State
  const [isShortageModalOpen, setIsShortageModalOpen] = useState(false)
  const [selectedOrderForShortage, setSelectedOrderForShortage] = useState<ElectricalOrder | null>(null)
  const [shortageForm, setShortageForm] = useState({
    materialName: '',
    quantity: '',
    projectName: '',
    refNumber: ''
  })
  const [submittingShortage, setSubmittingShortage] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('almasar_user')
    if (!storedUser) {
      router.replace('/login')
      return
    }
    try {
      setUser(JSON.parse(storedUser))
    } catch {
      setUser({ name: 'باسل خريس', nameAr: 'باسل خريس' })
    }

    loadOrders()
    loadNotifications()

    const handleNotifUpdate = () => {
      loadNotifications()
      loadOrders()
    }
    window.addEventListener('almasar_notification', handleNotifUpdate)
    window.addEventListener('almasar_notification_update', handleNotifUpdate)

    return () => {
      window.removeEventListener('almasar_notification', handleNotifUpdate)
      window.removeEventListener('almasar_notification_update', handleNotifUpdate)
    }
  }, [router])

  function loadOrders() {
    try {
      const raw = localStorage.getItem('almasar_dept_orders_electrical')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed)
          return
        }
      }
      localStorage.setItem('almasar_dept_orders_electrical', JSON.stringify(INITIAL_ELECTRICAL_ORDERS))
      setOrders(INITIAL_ELECTRICAL_ORDERS)
    } catch (e) {
      console.error('Failed to load electrical orders:', e)
      setOrders(INITIAL_ELECTRICAL_ORDERS)
    }
  }

  function loadNotifications() {
    try {
      const allNotifs = getNotifications()
      setNotifications(allNotifs)

      // Find new manufacturing order for electrical
      const unreadOrderNotif = allNotifs.find(
        n => !n.read && (n.type === 'new_manufacturing_order' || n.type === 'dept_status_update') && (n.department === 'electrical' || n.targetSection === 'electrical')
      )
      setBannerNotice(unreadOrderNotif || null)
    } catch (e) {
      console.error('Failed to load notifications:', e)
    }
  }

  function handleDismissBanner() {
    if (bannerNotice) {
      markNotificationRead(bannerNotice.id)
      setBannerNotice(null)
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  function handleStatusChange(orderId: string, newStatus: ElectricalOrderStatus) {
    const updatedOrders = orders.map(ord => {
      if (ord.id === orderId) {
        return {
          ...ord,
          status: newStatus,
          updatedAt: new Date().toISOString()
        }
      }
      return ord
    })

    setOrders(updatedOrders)
    localStorage.setItem('almasar_dept_orders_electrical', JSON.stringify(updatedOrders))

    const targetOrder = orders.find(o => o.id === orderId)
    const statusLabelsAr: Record<ElectricalOrderStatus, string> = {
      pending: 'قيد الانتظار',
      received: 'استلمت',
      manufacturing: 'قيد التصنيع',
      qc_sent: 'تم الإرسال لقسم الجودة',
      ready: 'جاهز للتسليم'
    }

    addNotification({
      type: 'dept_status_update',
      department: 'electrical',
      targetSections: ['tasks_production', 'production_manager', 'general_manager', 'qc'],
      targetSection: 'tasks_production',
      title: `تحديث أمر تصنيع (قسم الكهرباء والتجميع): ${targetOrder?.projectName || ''}`,
      message: `تم تحديث حالة الطلب [${targetOrder?.reference || ''}] إلى: ${statusLabelsAr[newStatus]}`,
      projectName: targetOrder?.projectName,
      projectRef: targetOrder?.reference,
      fromUser: user?.nameAr || user?.name || 'باسل خريس',
      status: newStatus
    })

    showToast(`تم تحديث الحالة بنجاح: ${statusLabelsAr[newStatus]}`)
  }

  function handleDownloadBlueprint(blueprintName?: string, projectName?: string) {
    const fileName = blueprintName || `Electrical_Schematic_${projectName || 'Panel'}.pdf`
    const dummyContent = `=====================================================
شركة المسار للصناعات الهندسية - قسم الكهرباء والتجميع
Al-Masar Engineering Industries - Electrical & Assembly Dept.
=====================================================
اسم المشروع: ${projectName || 'مشروع لوحات كهربائية'}
المخطط الكهربائي: ${fileName}
تاريخ التنزيل: ${new Date().toLocaleString('ar-SA')}
المسؤول: ${user?.nameAr || user?.name || 'باسل خريس'}

المعايير الكهربائية:
- مطابقة مواصفات IEC 61439-1/2 للوحات الجهد المنخفض.
- الالتزام برسم التوصيلات وترقيم الأسلاك حسب مخطط التحكم (Wiring Diagram).
- عزم شد البراغي لقضبان النحاس والقواطع حسب كود الشركة المصنعة.
=====================================================`

    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.endsWith('.pdf') || fileName.endsWith('.dwg') ? fileName : `${fileName}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    showToast(`📥 تم بدء تحميل المخطط الكهربائي: ${fileName}`)
  }

  function openShortageModal(order: ElectricalOrder) {
    setSelectedOrderForShortage(order)
    setShortageForm({
      materialName: '',
      quantity: '',
      projectName: order.projectName,
      refNumber: order.reference
    })
    setIsShortageModalOpen(true)
  }

  function closeShortageModal() {
    setIsShortageModalOpen(false)
    setSelectedOrderForShortage(null)
  }

  function handleSubmitShortage(e: React.FormEvent) {
    e.preventDefault()
    if (!shortageForm.materialName.trim()) {
      alert('يرجى إدخال اسم المادة المطلوبة')
      return
    }
    if (!shortageForm.quantity) {
      alert('يرجى تحديد الكمية المطلوبة')
      return
    }

    setSubmittingShortage(true)

    try {
      const parsedQty = Number(shortageForm.quantity) || shortageForm.quantity

      // Push notification according to spec
      const notifData = {
        id: Date.now().toString(),
        type: 'project_shortage' as const,
        department: 'electrical',
        material_name: shortageForm.materialName.trim(),
        quantity: typeof parsedQty === 'number' ? parsedQty : undefined,
        project_name: shortageForm.projectName,
        reference: shortageForm.refNumber,
        projectName: shortageForm.projectName,
        projectRef: shortageForm.refNumber,
        title: `⚠️ إبلاغ عن نقص مواد: ${shortageForm.materialName}`,
        message: `تم تسجيل نقص في مواد المشروع ${shortageForm.projectName} [${shortageForm.refNumber}] - الكمية: ${shortageForm.quantity}`,
        targetSections: ['procurement', 'sales', 'tasks_production', 'general_manager', 'warehouse'],
        targetSection: 'procurement',
        fromUser: user?.nameAr || user?.name || 'باسل خريس',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        read: false
      }

      // Add to notifications
      addNotification(notifData)

      // Also update order state in almasar_dept_orders_electrical
      if (selectedOrderForShortage) {
        const updatedOrders = orders.map(ord => {
          if (ord.id === selectedOrderForShortage.id) {
            return {
              ...ord,
              shortageReported: true,
              shortageDetails: {
                materialName: shortageForm.materialName.trim(),
                quantity: shortageForm.quantity,
                reportedAt: new Date().toISOString(),
                status: 'pending' as const
              }
            }
          }
          return ord
        })
        setOrders(updatedOrders)
        localStorage.setItem('almasar_dept_orders_electrical', JSON.stringify(updatedOrders))
      }

      showToast(`⚠️ تم إرسال بلاغ النقص بنجاح للمشتريات والإدارة`)
      closeShortageModal()
    } catch (err) {
      console.error('Failed to submit shortage:', err)
      alert('حدث خطأ أثناء إرسال بلاغ النقص')
    } finally {
      setSubmittingShortage(false)
    }
  }

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('almasar_user')
    }
    router.replace('/login')
  }

  // Helper to determine shortage status for an order
  function getShortageInfo(order: ElectricalOrder): { hasShortage: boolean; status: 'pending' | 'arrived' | null; materialName?: string } {
    // 1. Check notifications array for latest matching notification
    const matchingNotif = notifications.find(
      n =>
        n.type === 'project_shortage' &&
        (n.reference === order.reference || n.projectRef === order.reference || n.project_name === order.projectName)
    )

    if (matchingNotif) {
      const isArrived = matchingNotif.status === 'arrived' || matchingNotif.status === 'resolved'
      return {
        hasShortage: true,
        status: isArrived ? 'arrived' : 'pending',
        materialName: matchingNotif.material_name
      }
    }

    // 2. Fallback to order's own saved shortage details
    if (order.shortageReported && order.shortageDetails) {
      return {
        hasShortage: true,
        status: order.shortageDetails.status,
        materialName: order.shortageDetails.materialName
      }
    }

    return { hasShortage: false, status: null }
  }

  // Filter orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch =
      ord.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStatus = filterStatus === 'all' || ord.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Theme colors
  const bgMain = isLight ? '#f1f5f9' : '#0a0f1e'
  const cardBg = isLight ? '#ffffff' : '#141e33'
  const textPrimary = isLight ? '#0f172a' : '#f8fafc'
  const textSecondary = isLight ? '#475569' : '#94a3b8'
  const borderColor = isLight ? '#cbd5e1' : '#1e2d45'
  const bannerBg = isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
  const bannerBorder = isLight ? '#f87171' : 'rgba(239, 68, 68, 0.4)'

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        backgroundColor: bgMain,
        color: textPrimary,
        fontFamily: "'Noto Kufi Arabic', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 12px 48px 12px',
        boxSizing: 'border-box',
        transition: 'background-color 0.2s ease, color 0.2s ease'
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '15px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: '90%'
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container - max-width 768px for iPad */}
      <div
        style={{
          width: '100%',
          maxWidth: 768,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        {/* TOP BAR / HEADER */}
        <header
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: '16px 20px',
            border: `1px solid ${borderColor}`,
            boxShadow: isLight ? '0 2px 8px rgba(0,0,0,0.05)' : '0 4px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          {/* Department Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26
              }}
            >
              ⚡
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 800,
                  color: textPrimary,
                  letterSpacing: '-0.3px'
                }}
              >
                قسم الكهرباء والتجميع
              </h1>
              <span style={{ fontSize: '13px', color: textSecondary, fontWeight: 500 }}>
                Electrical & Assembly Department
              </span>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* User Pill */}
            <div
              style={{
                backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)',
                borderRadius: 24,
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '14px',
                fontWeight: 600,
                color: textPrimary
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>{user?.nameAr || user?.name || 'باسل خريس'}</span>
            </div>

            {/* Theme Toggle Button (Min 44px) */}
            <button
              onClick={toggleTheme}
              title={isLight ? 'الوضع الداكن' : 'الوضع الفاتح'}
              aria-label="Toggle Theme"
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                border: `1px solid ${borderColor}`,
                backgroundColor: isLight ? '#e2e8f0' : '#1e2d45',
                color: textPrimary,
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {isLight ? '🌙' : '☀️'}
            </button>

            {/* Logout Button (Min 44px) */}
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              aria-label="Logout"
              style={{
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                fontSize: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}
            >
              🚪
            </button>
          </div>
        </header>

        {/* RED NOTIFICATION BANNER */}
        {bannerNotice ? (
          <div
            onClick={handleDismissBanner}
            style={{
              backgroundColor: bannerBg,
              border: `1.5px solid ${bannerBorder}`,
              borderRadius: 14,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)',
              animation: 'pulse 2s infinite ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>🔴</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px', color: '#dc2626' }}>
                  أمر تصنيع جديد - New Order
                </div>
                <div style={{ fontSize: '13px', color: textPrimary, marginTop: 2 }}>
                  {bannerNotice.title || bannerNotice.message || 'لديك أمر تصنيع كهربائي جديد بانتظار البدء في التجميع'}
                </div>
              </div>
            </div>
            <div
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: '13px',
                fontWeight: 700,
                minHeight: 36,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              اضغط للعرض ✕
            </div>
          </div>
        ) : null}

        {/* SEARCH & FILTER CONTROLS */}
        <section
          style={{
            backgroundColor: cardBg,
            borderRadius: 14,
            padding: 14,
            border: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}
        >
          {/* Search input */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 ابحث برقم اللوحة، اسم المشروع، أو العميل..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 46,
                borderRadius: 10,
                border: `1px solid ${borderColor}`,
                backgroundColor: isLight ? '#f8fafc' : '#0a0f1e',
                color: textPrimary,
                padding: '0 14px',
                fontSize: '15px',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>

          {/* Status filter pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4
            }}
          >
            {[
              { id: 'all', label: 'الكل', count: orders.length },
              { id: 'pending', label: 'قيد الانتظار', count: orders.filter(o => o.status === 'pending').length },
              { id: 'received', label: 'استلمت', count: orders.filter(o => o.status === 'received').length },
              { id: 'manufacturing', label: 'قيد التصنيع', count: orders.filter(o => o.status === 'manufacturing').length },
              { id: 'qc_sent', label: 'في الجودة', count: orders.filter(o => o.status === 'qc_sent').length },
              { id: 'ready', label: 'جاهز', count: orders.filter(o => o.status === 'ready').length }
            ].map(tab => {
              const active = filterStatus === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  style={{
                    minHeight: 44,
                    padding: '8px 16px',
                    borderRadius: 10,
                    border: active ? '2px solid #eab308' : `1px solid ${borderColor}`,
                    backgroundColor: active ? (isLight ? '#ca8a04' : '#eab308') : isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)',
                    color: active ? '#ffffff' : textSecondary,
                    fontWeight: active ? 700 : 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      borderRadius: 10,
                      backgroundColor: active ? 'rgba(255,255,255,0.25)' : isLight ? '#cbd5e1' : '#1e293b',
                      color: active ? '#ffffff' : textPrimary
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ORDER CARDS LIST */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredOrders.length === 0 ? (
            <div
              style={{
                backgroundColor: cardBg,
                borderRadius: 16,
                padding: '40px 20px',
                textAlign: 'center',
                border: `1px dashed ${borderColor}`,
                color: textSecondary
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>لا توجد أوامر تصنيع في قسم الكهرباء والتجميع</div>
              <p style={{ fontSize: 14, marginTop: 4 }}>يمكنك تغيير خيارات البحث أو تصفية الحالات</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const shortageInfo = getShortageInfo(order)

              return (
                <article
                  key={order.id}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: 18,
                    padding: '20px',
                    border: `1.5px solid ${borderColor}`,
                    boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.04)' : '0 6px 20px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.07)'}`,
                      paddingBottom: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>⚡</span>
                      <div>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 800,
                            color: textPrimary
                          }}
                        >
                          {order.projectName}
                        </h2>
                        {order.customerName && (
                          <div style={{ fontSize: '13px', color: textSecondary, marginTop: 2 }}>
                            العميل: {order.customerName}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reference pill */}
                    <div
                      style={{
                        backgroundColor: isLight ? '#fef9c3' : 'rgba(234, 179, 8, 0.15)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        color: '#ca8a04',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        direction: 'ltr'
                      }}
                    >
                      {order.reference}
                    </div>
                  </div>

                  {/* Shortage Badges if any */}
                  {shortageInfo.hasShortage && (
                    <div>
                      {shortageInfo.status === 'arrived' ? (
                        <div
                          style={{
                            backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.15)',
                            border: '1.5px solid #22c55e',
                            color: isLight ? '#15803d' : '#4ade80',
                            borderRadius: 10,
                            padding: '8px 14px',
                            fontSize: '14px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <span>✅</span>
                          <span>وصلت المواد / Materials Arrived</span>
                          {shortageInfo.materialName && (
                            <span style={{ fontWeight: 500, fontSize: '13px', opacity: 0.9 }}>
                              ({shortageInfo.materialName})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                            border: '1.5px solid #f59e0b',
                            color: isLight ? '#b45309' : '#fbbf24',
                            borderRadius: 10,
                            padding: '8px 14px',
                            fontSize: '14px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <span>⚠️</span>
                          <span>نقص مبلغ / Shortage Reported</span>
                          {shortageInfo.materialName && (
                            <span style={{ fontWeight: 500, fontSize: '13px', opacity: 0.9 }}>
                              ({shortageInfo.materialName})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`
                      }}
                    >
                      <div style={{ fontSize: '12px', color: textSecondary, marginBottom: 2 }}>
                        📅 تاريخ الاستلام (Receipt Date)
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: textPrimary }}>
                        {order.receiptDate}
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`
                      }}
                    >
                      <div style={{ fontSize: '12px', color: textSecondary, marginBottom: 2 }}>
                        🚚 موعد التسليم (Delivery Date)
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>
                        {order.deliveryDate}
                      </div>
                    </div>
                  </div>

                  {/* Notes / Details */}
                  {order.notes && (
                    <div
                      style={{
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(0,0,0,0.2)',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: '14px',
                        color: textSecondary,
                        lineHeight: '1.5'
                      }}
                    >
                      <strong style={{ color: textPrimary }}>مواصفات التجميع: </strong>
                      {order.notes}
                    </div>
                  )}

                  {/* Action Buttons: Blueprint Download + Report Shortage */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 10
                    }}
                  >
                    {/* 1. Download Blueprint */}
                    <button
                      onClick={() => handleDownloadBlueprint(order.blueprintName, order.projectName)}
                      style={{
                        minHeight: 46,
                        borderRadius: 10,
                        border: '1.5px solid #0284c7',
                        backgroundColor: isLight ? '#f0f9ff' : 'rgba(2, 132, 199, 0.12)',
                        color: '#0284c7',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: 18 }}>📥</span>
                      <span>تحميل المخططات الهندسية</span>
                    </button>

                    {/* 2. Report Shortage Button (Min 44px) */}
                    <button
                      onClick={() => openShortageModal(order)}
                      style={{
                        minHeight: 46,
                        borderRadius: 10,
                        border: '1.5px solid #f59e0b',
                        backgroundColor: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.12)',
                        color: '#d97706',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: 18 }}>⚠️</span>
                      <span>إبلاغ عن نقص / Report Shortage</span>
                    </button>
                  </div>

                  {/* Status Section: pending → received → manufacturing → qc_sent → ready */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: textSecondary }}>
                      حالة أمر التجميع (Assembly Status):
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: 8
                      }}
                    >
                      {/* STATUS 1: pending */}
                      <button
                        onClick={() => handleStatusChange(order.id, 'pending')}
                        style={{
                          minHeight: 48,
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: order.status === 'pending' ? 800 : 600,
                          backgroundColor:
                            order.status === 'pending'
                              ? '#64748b'
                              : isLight
                              ? '#f1f5f9'
                              : 'rgba(100, 116, 139, 0.15)',
                          color: order.status === 'pending' ? '#ffffff' : textSecondary,
                          border:
                            order.status === 'pending'
                              ? '2px solid #334155'
                              : `1px solid ${borderColor}`,
                          boxShadow: order.status === 'pending' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {order.status === 'pending' ? '✓ قيد الانتظار' : 'قيد الانتظار'}
                      </button>

                      {/* STATUS 2: received */}
                      <button
                        onClick={() => handleStatusChange(order.id, 'received')}
                        style={{
                          minHeight: 48,
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: order.status === 'received' ? 800 : 600,
                          backgroundColor:
                            order.status === 'received'
                              ? '#2563eb'
                              : isLight
                              ? '#eff6ff'
                              : 'rgba(37, 99, 235, 0.15)',
                          color: order.status === 'received' ? '#ffffff' : '#2563eb',
                          border:
                            order.status === 'received'
                              ? '2px solid #1d4ed8'
                              : '1px solid rgba(37, 99, 235, 0.3)',
                          boxShadow: order.status === 'received' ? '0 2px 8px rgba(37, 99, 235, 0.4)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {order.status === 'received' ? '✓ استلمت' : 'استلمت'}
                      </button>

                      {/* STATUS 3: manufacturing */}
                      <button
                        onClick={() => handleStatusChange(order.id, 'manufacturing')}
                        style={{
                          minHeight: 48,
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: order.status === 'manufacturing' ? 800 : 600,
                          backgroundColor:
                            order.status === 'manufacturing'
                              ? '#d97706'
                              : isLight
                              ? '#fffbeb'
                              : 'rgba(217, 119, 6, 0.15)',
                          color: order.status === 'manufacturing' ? '#ffffff' : '#d97706',
                          border:
                            order.status === 'manufacturing'
                              ? '2px solid #b45309'
                              : '1px solid rgba(217, 119, 6, 0.3)',
                          boxShadow: order.status === 'manufacturing' ? '0 2px 8px rgba(217, 119, 6, 0.4)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {order.status === 'manufacturing' ? '✓ قيد التصنيع' : 'قيد التصنيع'}
                      </button>

                      {/* STATUS 4: qc_sent */}
                      <button
                        onClick={() => handleStatusChange(order.id, 'qc_sent')}
                        style={{
                          minHeight: 48,
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: order.status === 'qc_sent' ? 800 : 600,
                          backgroundColor:
                            order.status === 'qc_sent'
                              ? '#4f46e5'
                              : isLight
                              ? '#eef2ff'
                              : 'rgba(79, 70, 229, 0.15)',
                          color: order.status === 'qc_sent' ? '#ffffff' : '#4f46e5',
                          border:
                            order.status === 'qc_sent'
                              ? '2px solid #4338ca'
                              : '1px solid rgba(79, 70, 229, 0.3)',
                          boxShadow: order.status === 'qc_sent' ? '0 2px 8px rgba(79, 70, 229, 0.4)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {order.status === 'qc_sent' ? '✓ لقسم الجودة' : 'تم الإرسال لقسم الجودة'}
                      </button>

                      {/* STATUS 5: ready */}
                      <button
                        onClick={() => handleStatusChange(order.id, 'ready')}
                        style={{
                          minHeight: 48,
                          padding: '8px 10px',
                          borderRadius: 10,
                          fontSize: '14px',
                          cursor: 'pointer',
                          fontWeight: order.status === 'ready' ? 800 : 600,
                          backgroundColor:
                            order.status === 'ready'
                              ? '#16a34a'
                              : isLight
                              ? '#f0fdf4'
                              : 'rgba(22, 163, 74, 0.15)',
                          color: order.status === 'ready' ? '#ffffff' : '#16a34a',
                          border:
                            order.status === 'ready'
                              ? '2px solid #15803d'
                              : '1px solid rgba(22, 163, 74, 0.3)',
                          boxShadow: order.status === 'ready' ? '0 2px 8px rgba(22, 163, 74, 0.4)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {order.status === 'ready' ? '✓ جاهز للتسليم' : 'جاهز للتسليم'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </main>
      </div>

      {/* SHORTAGE MODAL */}
      {isShortageModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={closeShortageModal}
        >
          <div
            dir="rtl"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: cardBg,
              borderRadius: 20,
              padding: '24px',
              width: '100%',
              maxWidth: 520,
              border: `1.5px solid ${borderColor}`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${borderColor}`,
                paddingBottom: 14
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 26 }}>⚠️</span>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '19px',
                      fontWeight: 800,
                      color: textPrimary
                    }}
                  >
                    إبلاغ عن نقص في المواد
                  </h3>
                  <span style={{ fontSize: '13px', color: textSecondary }}>
                    Report Material Shortage
                  </span>
                </div>
              </div>

              <button
                onClick={closeShortageModal}
                style={{
                  minWidth: 40,
                  minHeight: 40,
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                  color: textPrimary,
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitShortage} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Field 1: Material Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 700,
                    marginBottom: 6,
                    color: textPrimary
                  }}
                >
                  اسم المادة / Material Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: قاطع فرعي MCB 32A، باسبار نحاس 40x5..."
                  value={shortageForm.materialName}
                  onChange={e => setShortageForm({ ...shortageForm, materialName: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: 48,
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isLight ? '#f8fafc' : '#0a0f1e',
                    color: textPrimary,
                    padding: '0 14px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Field 2: Quantity */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 700,
                    marginBottom: 6,
                    color: textPrimary
                  }}
                >
                  الكمية المطلوبة / Quantity <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 15 حبة، 20 متر، 50 كغ..."
                  value={shortageForm.quantity}
                  onChange={e => setShortageForm({ ...shortageForm, quantity: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: 48,
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isLight ? '#f8fafc' : '#0a0f1e',
                    color: textPrimary,
                    padding: '0 14px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Field 3: Project Name (pre-filled) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 700,
                    marginBottom: 6,
                    color: textPrimary
                  }}
                >
                  اسم المشروع / Project Name
                </label>
                <input
                  type="text"
                  value={shortageForm.projectName}
                  onChange={e => setShortageForm({ ...shortageForm, projectName: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: 48,
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                    color: textPrimary,
                    padding: '0 14px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Field 4: Ref Number (pre-filled) */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 700,
                    marginBottom: 6,
                    color: textPrimary
                  }}
                >
                  الرقم المرجعي / Ref Number
                </label>
                <input
                  type="text"
                  value={shortageForm.refNumber}
                  onChange={e => setShortageForm({ ...shortageForm, refNumber: e.target.value })}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: 48,
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isLight ? '#f1f5f9' : '#1e293b',
                    color: textPrimary,
                    padding: '0 14px',
                    fontSize: '15px',
                    fontFamily: 'inherit',
                    direction: 'ltr',
                    textAlign: 'right',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Modal Buttons (Min 44px) */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 8,
                  justifyContent: 'flex-end'
                }}
              >
                <button
                  type="button"
                  onClick={closeShortageModal}
                  style={{
                    minHeight: 46,
                    padding: '0 20px',
                    borderRadius: 10,
                    border: `1px solid ${borderColor}`,
                    backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
                    color: textPrimary,
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingShortage}
                  style={{
                    minHeight: 46,
                    padding: '0 24px',
                    borderRadius: 10,
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: submittingShortage ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                  }}
                >
                  {submittingShortage ? 'جاري الإرسال...' : 'إرسال Send ⚠️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
