'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { addNotification, getNotifications, markNotificationRead, AppNotification } from '@/lib/notifications'

export type HangarOrderStatus = 'pending' | 'received' | 'manufacturing' | 'ready'

export interface HangarOrder {
  id: string
  reference: string
  projectName: string
  customerName?: string
  receiptDate: string
  deliveryDate: string
  hangarType: 'fixed_measurements' | 'new_project'
  measurement?: string
  quantity: number
  blueprintName?: string
  notes?: string
  status: HangarOrderStatus
  updatedAt?: string
}

const INITIAL_HANGAR_ORDERS: HangarOrder[] = [
  {
    id: 'HNG-2026-001',
    reference: 'REF-2026-0062',
    projectName: 'هنجر مستودع تخزين مركزي 30x50',
    customerName: 'شركة اللوجستيات الحديثة',
    receiptDate: '2026-11-01',
    deliveryDate: '2026-12-05',
    hangarType: 'new_project',
    quantity: 1,
    blueprintName: 'Warehouse_Hangar_Frame_Details.pdf',
    notes: 'هيكل معدني H-Beam مائل، مع ألواح ساندوتش بنل عازلة سماكة 50 ملم ودهان إيبوكسي مقاوم للرطوبة',
    status: 'manufacturing',
    updatedAt: '2026-11-04T11:00:00Z'
  },
  {
    id: 'HNG-2026-002',
    reference: 'REF-2026-0070',
    projectName: 'كباين قياسات ثابتة ( 100X80X30 )',
    customerName: 'مؤسسة الرياض للأجهزة الكهربائية',
    receiptDate: '2026-11-05',
    deliveryDate: '2026-11-18',
    hangarType: 'fixed_measurements',
    measurement: '( 100X80X30 )',
    quantity: 8,
    blueprintName: undefined, // Optional / none
    notes: 'كباين صاج معزولة مع أقفال صناعية وجوان مطاطي ضد العوامل الجوية',
    status: 'received',
    updatedAt: '2026-11-05T14:30:00Z'
  },
  {
    id: 'HNG-2026-003',
    reference: 'REF-2026-0071',
    projectName: 'كباين قياسات ثابتة ( 160X120X40 )',
    customerName: 'شركة البنية التحتية المتكاملة',
    receiptDate: '2026-10-20',
    deliveryDate: '2026-11-12',
    hangarType: 'fixed_measurements',
    measurement: '( 160X120X40 )',
    quantity: 4,
    blueprintName: undefined, // Optional / none
    notes: 'تم الانتهاء من تصنيع كافة الكباين والدهان والفحص النهائي',
    status: 'ready',
    updatedAt: '2026-11-07T12:00:00Z'
  },
  {
    id: 'HNG-2026-004',
    reference: 'REF-2026-0075',
    projectName: 'مظلات مواقف سيارات معدنية معلقة',
    customerName: 'مجمع واحة الأعمال التجاري',
    receiptDate: '2026-11-09',
    deliveryDate: '2026-11-28',
    hangarType: 'new_project',
    quantity: 12,
    blueprintName: 'Car_Parking_Shade_Structure.dwg',
    notes: 'أنابيب حديد مجوف دائري ومربعات مع بليتات تثبيت أرضية مجلفنة',
    status: 'pending',
    updatedAt: '2026-11-09T09:00:00Z'
  }
]

export default function HangarDepartmentPage() {
  const router = useRouter()
  const { lang, isRtl } = useLanguage()
  const { theme, toggleTheme, isLight } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<HangarOrder[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [bannerNotice, setBannerNotice] = useState<AppNotification | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

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
      setUser({ name: 'م. محمد الدويري', nameAr: 'م. محمد الدويري' })
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
      const raw = localStorage.getItem('almasar_dept_orders_hangar')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOrders(parsed)
          return
        }
      }
      localStorage.setItem('almasar_dept_orders_hangar', JSON.stringify(INITIAL_HANGAR_ORDERS))
      setOrders(INITIAL_HANGAR_ORDERS)
    } catch (e) {
      console.error('Failed to load hangar orders:', e)
      setOrders(INITIAL_HANGAR_ORDERS)
    }
  }

  function loadNotifications() {
    try {
      const allNotifs = getNotifications()
      setNotifications(allNotifs)

      // Find new manufacturing order for hangar
      const unreadOrderNotif = allNotifs.find(
        n => !n.read && (n.type === 'new_manufacturing_order' || n.type === 'dept_status_update') && (n.department === 'hangar' || n.targetSection === 'hangar')
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

  function handleStatusChange(orderId: string, newStatus: HangarOrderStatus) {
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
    localStorage.setItem('almasar_dept_orders_hangar', JSON.stringify(updatedOrders))

    const targetOrder = orders.find(o => o.id === orderId)
    const statusLabelsAr: Record<HangarOrderStatus, string> = {
      pending: 'قيد الانتظار',
      received: 'استلمت',
      manufacturing: 'قيد التصنيع',
      ready: 'جاهز للتسليم'
    }

    addNotification({
      type: 'dept_status_update',
      department: 'hangar',
      targetSections: ['tasks_production', 'production_manager', 'general_manager'],
      targetSection: 'tasks_production',
      title: `تحديث أمر تصنيع (قسم الهنجر): ${targetOrder?.projectName || ''}`,
      message: `تم تحديث حالة الطلب [${targetOrder?.reference || ''}] إلى: ${statusLabelsAr[newStatus]}`,
      projectName: targetOrder?.projectName,
      projectRef: targetOrder?.reference,
      fromUser: user?.nameAr || user?.name || 'م. محمد الدويري',
      status: newStatus
    })

    showToast(`تم تحديث الحالة بنجاح: ${statusLabelsAr[newStatus]}`)
  }

  function handleDownloadBlueprint(blueprintName?: string, projectName?: string) {
    if (!blueprintName) {
      showToast('ℹ️ هذا الطلب بمقاسات معيارية ثابتة ولا يتطلب مخططاً تفصيلياً')
      return
    }

    const fileName = blueprintName
    const dummyContent = `=====================================================
شركة المسار للصناعات الهندسية - قسم الهنجر والمظلات
Al-Masar Engineering Industries - Hangar Department
=====================================================
اسم المشروع: ${projectName}
المخطط المرفق: ${fileName}
تاريخ التنزيل: ${new Date().toLocaleString('ar-SA')}
المسؤول: ${user?.nameAr || user?.name || 'م. محمد الدويري'}

المواصفات الإنشائية:
- التحقق من استوائية القواعد المعدنية وزوايا الجملونات.
- فحص قياسات الألواح والعوازل قبل التثبيت.
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

    showToast(`📥 تم بدء تحميل المخطط: ${fileName}`)
  }

  function handleLogout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('almasar_user')
    }
    router.replace('/login')
  }

  // Filter orders
  const filteredOrders = orders.filter(ord => {
    const matchesSearch =
      ord.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.customerName && ord.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ord.measurement && ord.measurement.toLowerCase().includes(searchQuery.toLowerCase()))

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
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26
              }}
            >
              🏭
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
                قسم الهنجر
              </h1>
              <span style={{ fontSize: '13px', color: textSecondary, fontWeight: 500 }}>
                Hangar Department
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
              <span>{user?.nameAr || user?.name || 'م. محمد الدويري'}</span>
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
                  {bannerNotice.title || bannerNotice.message || 'لديك أمر تصنيع جديد في قسم الهنجر بانتظار التنفيذ'}
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
              placeholder="🔍 ابحث بالاسم، القياس، رقم المرجع، أو العميل..."
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
                    border: active ? '2px solid #f59e0b' : `1px solid ${borderColor}`,
                    backgroundColor: active ? (isLight ? '#f59e0b' : '#d97706') : isLight ? '#e2e8f0' : 'rgba(255,255,255,0.05)',
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
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏭</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: textPrimary }}>لا توجد أوامر تصنيع في قسم الهنجر</div>
              <p style={{ fontSize: 14, marginTop: 4 }}>يمكنك تغيير خيارات البحث أو تصفية الحالات</p>
            </div>
          ) : (
            filteredOrders.map(order => {
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
                      <span style={{ fontSize: 24 }}>🏭</span>
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
                        backgroundColor: isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#d97706',
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

                  {/* Quantity & Measurement Specs */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 10
                    }}
                  >
                    {/* Quantity */}
                    <div
                      style={{
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`
                      }}
                    >
                      <div style={{ fontSize: '12px', color: textSecondary, marginBottom: 2 }}>
                        📦 العدد المطلوب (إلزامي)
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: textPrimary }}>
                        {order.quantity} {order.quantity > 1 ? 'قطع / وحدات' : 'وحدة واحدة'}
                      </div>
                    </div>

                    {/* Type / Measurements */}
                    <div
                      style={{
                        backgroundColor: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`
                      }}
                    >
                      <div style={{ fontSize: '12px', color: textSecondary, marginBottom: 2 }}>
                        📐 نوع الهنجر / القياسات
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0284c7' }}>
                        {order.hangarType === 'fixed_measurements'
                          ? `قياسات ثابتة: ${order.measurement || ''}`
                          : 'مشروع جديد متخصص'}
                      </div>
                    </div>
                  </div>

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
                      <strong style={{ color: textPrimary }}>تفاصيل التصنيع: </strong>
                      {order.notes}
                    </div>
                  )}

                  {/* Blueprint Download Section (OPTIONAL for Hangar) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {order.blueprintName ? (
                      <button
                        onClick={() => handleDownloadBlueprint(order.blueprintName, order.projectName)}
                        style={{
                          minHeight: 46,
                          width: '100%',
                          borderRadius: 10,
                          border: '1.5px solid #d97706',
                          backgroundColor: isLight ? '#fffbeb' : 'rgba(217, 119, 6, 0.12)',
                          color: '#d97706',
                          fontWeight: 700,
                          fontSize: '15px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: 18 }}>📥</span>
                        <span>تحميل المخطط الهندسي (مخطط اختياري متوفر)</span>
                      </button>
                    ) : (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 10,
                          backgroundColor: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.04)',
                          border: `1px dashed ${borderColor}`,
                          fontSize: '13px',
                          color: textSecondary,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <span>ℹ️</span>
                        <span>
                          <strong>مخطط التصنيع اختياري:</strong> هذا الطلب يعتمد القياسات الثابتة المعيارية الموضحة أعلاه ولا يتطلب مخططاً تفصيلياً.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Section: pending → received → manufacturing → ready */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: textSecondary }}>
                      حالة طلب الهنجر (Hangar Status):
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

                      {/* STATUS 4: ready */}
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
    </div>
  )
}
