'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

const NAV_ITEMS = [
  {
    section: 'Overview',
    sectionAr: 'نظرة عامة',
    items: [
      { href: '/dashboard', icon: '▦', label: 'Dashboard', labelAr: 'لوحة التحكم' },
      { href: '/projects', icon: '🗂', label: 'Panel Projects', labelAr: 'مشاريع اللوحات' },
    ],
  },
  {
    section: 'Sales & CRM',
    sectionAr: 'المبيعات والعملاء',
    items: [
      { href: '/crm', icon: '💼', label: 'Sales / CRM', labelAr: 'المبيعات / CRM' },
    ],
  },
  {
    section: 'Engineering & Production',
    sectionAr: 'الهندسة والتصنيع',
    items: [
      { href: '/engineering', icon: '📐', label: 'Engineering', labelAr: 'الهندسة' },
      { href: '/tasks', icon: '✅', label: 'Tasks & Production', labelAr: 'المهام والإنتاج' },
      { href: '/procurement', icon: '🛒', label: 'Procurement', labelAr: 'المشتريات' },
      { href: '/warehouse', icon: '🏭', label: 'Warehouse', labelAr: 'المستودع' },
      { href: '/production', icon: '⚙️', label: 'Production (MRP)', labelAr: 'الإنتاج (MRP)' },
      { href: '/qc', icon: '🔍', label: 'Quality Control', labelAr: 'ضبط الجودة' },
      { href: '/logistics', icon: '🚚', label: 'Logistics', labelAr: 'اللوجستيات' },
    ],
  },
  {
    section: 'Finance & HR',
    sectionAr: 'المالية والموارد البشرية',
    items: [
      { href: '/accounting', icon: '💳', label: 'Invoicing & Accounting', labelAr: 'الفواتير والمحاسبة' },
      { href: '/hr', icon: '👥', label: 'HR & Payroll', labelAr: 'الموارد البشرية والرواتب' },
    ],
  },
  {
    section: 'Documents & Support',
    sectionAr: 'الوثائق والدعم الفني',
    items: [
      { href: '/dms', icon: '📁', label: 'DMS Documents', labelAr: 'إدارة الوثائق والمخططات' },
      { href: '/helpdesk', icon: '🎧', label: 'Helpdesk & Warranty', labelAr: 'الدعم الفني وخدمات ما بعد البيع والضمان' },
      { href: '/reports', icon: '📊', label: 'Reporting Engine', labelAr: 'محرك التقارير وتحليلات الأعمال' },
    ],
  },
  {
    section: 'Settings',
    sectionAr: 'الإعدادات',
    items: [
      { href: '/config', icon: '⚙', label: 'Configuration', labelAr: 'الإعدادات' },
    ],
  },
]

interface Props {
  children: React.ReactNode
  title: string
  titleAr?: string
  actions?: React.ReactNode
}

const DEFAULT_PROFILE: Profile & { permissions?: any; is_manager?: boolean } = {
  id: 'usr-manager-001',
  full_name: 'Eng. Tariq Al-Masar',
  full_name_ar: 'م. طارق المسار',
  email: 'manager@almasar-switchgear.com',
  role: 'system_admin',
  department: 'Executive Management',
  reward_points: 1250,
  is_active: true,
  is_manager: true,
  permissions: {
    can_add: true,
    can_edit: true,
    can_delete: true,
    manage_users: true,
    full_access: true
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const QUICK_ROLES = [
  { id: 'manager', role: 'system_admin', name: 'Eng. Tariq Al-Masar', nameAr: 'م. طارق المسار (المدير العام)', email: 'manager@almasar-switchgear.com', icon: '👑', isManager: true },
  { id: 'sales', role: 'sales_officer', name: 'Ahmad Zaitoun', nameAr: 'أحمد زيتون (مدير المبيعات)', email: 'sales@almasar-switchgear.com', icon: '💼', isManager: false },
  { id: 'prod', role: 'production_manager', name: 'Abdullah Khaddam', nameAr: 'عبدالله خدام (مدير الإنتاج)', email: 'production@almasar-switchgear.com', icon: '⚙️', isManager: false },
  { id: 'tech', role: 'technician', name: 'Mahmoud Majid', nameAr: 'محمود ماجد (فني لوحات)', email: 'technician@almasar-switchgear.com', icon: '⚡', isManager: false },
  { id: 'wh', role: 'warehouse_officer', name: 'Khaled Al-Otaibi', nameAr: 'خالد العتيبي (المستودع)', email: 'warehouse@almasar-switchgear.com', icon: '📦', isManager: false },
  { id: 'qc', role: 'qc_inspector', name: 'Ahmad Saadi', nameAr: 'أحمد سعدي (مفتش الجودة)', email: 'qc@almasar-switchgear.com', icon: '🔍', isManager: false },
]

export default function AppLayout({ children, title, titleAr, actions }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, toggleLang, isRtl } = useLanguage()
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE)
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('almasar_user') : null
    if (stored) {
      try {
        setProfile(JSON.parse(stored))
      } catch {
        setProfile(DEFAULT_PROFILE)
      }
    } else {
      setProfile(DEFAULT_PROFILE)
      if (typeof window !== 'undefined') {
        localStorage.setItem('almasar_user', JSON.stringify(DEFAULT_PROFILE))
      }
    }
  }, [])

  function switchUserRole(roleItem: typeof QUICK_ROLES[0]) {
    const newProfile = {
      id: `usr-${roleItem.id}`,
      full_name: roleItem.name,
      full_name_ar: roleItem.nameAr,
      email: roleItem.email,
      role: roleItem.role,
      department: roleItem.isManager ? 'Executive Management' : 'Operations',
      is_manager: roleItem.isManager,
      reward_points: roleItem.isManager ? 1250 : 450,
      is_active: true,
      permissions: roleItem.isManager ? {
        can_add: true, can_edit: true, can_delete: true, manage_users: true, full_access: true
      } : {
        can_add: roleItem.id !== 'tech',
        can_edit: true,
        can_delete: false,
        manage_users: false
      }
    }
    setProfile(newProfile)
    if (typeof window !== 'undefined') {
      localStorage.setItem('almasar_user', JSON.stringify(newProfile))
    }
    setShowRoleSwitcher(false)
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    if (typeof window !== 'undefined') localStorage.removeItem('almasar_user')
    router.push('/login')
  }

  const isManager = profile?.is_manager || ['system_admin', 'company_owner', 'general_manager', 'admin'].includes(profile?.role)
  const displayTitle = isRtl && titleAr ? titleAr : title

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div className="sidebar-logo-text">
            <span className="brand-name">{isRtl ? 'المسار' : 'Al-Masar'}</span>
            <span className="brand-sub">{isRtl ? 'نظام إدارة المصنع' : 'Switchgear ERP'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(section => (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-label">
                {isRtl ? section.sectionAr : section.section}
              </div>
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{isRtl ? item.labelAr : item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {profile && (
            <div className="user-card" style={{ border: isManager ? '1.5px solid #eab308' : undefined, background: isManager ? 'rgba(234, 179, 8, 0.08)' : undefined }}>
              <div className="user-avatar" style={{ background: isManager ? 'linear-gradient(135deg, #eab308, #ca8a04)' : undefined, color: isManager ? '#000' : undefined }}>
                {isManager ? '👑' : (isRtl && profile.full_name_ar ? profile.full_name_ar : profile.full_name).charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{isRtl && profile.full_name_ar ? profile.full_name_ar : profile.full_name}</span>
                </div>
                <div className="user-role" style={{ color: isManager ? '#eab308' : undefined, fontWeight: isManager ? 700 : undefined }}>
                  {isManager ? (isRtl ? 'المدير العام (تحكم كامل)' : 'General Manager (Full Access)') : (ROLE_LABELS[profile.role]?.[lang] || profile.role)}
                </div>
              </div>
              <button onClick={handleLogout} title={isRtl ? 'تسجيل الخروج' : 'Logout'} style={{ background: 'none', padding: 4, color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', border: 'none' }}>⎋</button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="topbar-title">{displayTitle}</h1>
            {isManager ? (
              <span style={{ background: '#eab308', color: '#000', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                👑 {isRtl ? 'صلاحيات المدير العام (إضافة/تعديل/حذف شامل)' : 'Manager (Full Add/Edit/Delete Access)'}
              </span>
            ) : (
              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>
                👤 {ROLE_LABELS[profile.role]?.[lang] || profile.role}
              </span>
            )}
          </div>

          <div className="topbar-actions" style={{ position: 'relative' }}>
            {/* Quick Role Switcher Button */}
            <button
              className="lang-btn"
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              style={{ background: isManager ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.08)', borderColor: isManager ? '#eab308' : 'rgba(255, 255, 255, 0.15)', color: isManager ? '#fef08a' : '#fff' }}
              title="تبديل دور المستخدم الحالي لاختبار الصلاحيات"
            >
              🔄 {isRtl ? 'تبديل دور المستخدم' : 'Switch Role'} ({profile?.role === 'system_admin' ? '👑 مدير' : profile?.role})
            </button>

            {/* Role Switcher Dropdown */}
            {showRoleSwitcher && (
              <div style={{
                position: 'absolute',
                top: 48,
                [isRtl ? 'left' : 'right']: 0,
                width: 290,
                background: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 12,
                boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
                zIndex: 9999,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', padding: '6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  {isRtl ? 'اختر دور للاختبار الفوري:' : 'Select role to test live:'}
                </div>
                {QUICK_ROLES.map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => switchUserRole(qr)}
                    style={{
                      background: profile?.email === qr.email ? 'rgba(14, 165, 233, 0.2)' : 'transparent',
                      border: profile?.email === qr.email ? '1px solid #38bdf8' : '1px solid transparent',
                      borderRadius: 8,
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      textAlign: isRtl ? 'right' : 'left',
                      color: '#fff',
                      width: '100%'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{qr.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: qr.isManager ? '#fef08a' : '#fff' }}>
                        {isRtl ? qr.nameAr : qr.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                        {qr.email}
                      </div>
                    </div>
                    {qr.isManager && (
                      <span style={{ fontSize: 10, background: '#eab308', color: '#000', fontWeight: 800, padding: '1px 5px', borderRadius: 4 }}>
                        الكل
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Lang Switcher */}
            <button className="lang-btn" onClick={toggleLang}>
              {lang === 'en' ? '🇸🇦 عربي' : '🇬🇧 English'}
            </button>

            {/* Points badge */}
            {profile && profile.reward_points > 0 && (
              <span className="points-badge">
                ⭐ {profile.reward_points} {isRtl ? 'نقطة' : 'pts'}
              </span>
            )}

            {actions}
          </div>
        </header>

        <main className="page-content animate-fade">
          {children}
        </main>
      </div>
    </div>
  )
}

