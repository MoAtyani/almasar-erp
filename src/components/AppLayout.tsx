'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

const NAV_ITEMS = [
  {
    section: 'Overview',
    sectionAr: 'نظرة عامة',
    items: [
      { href: '/dashboard', icon: '▦', label: 'Dashboard', labelAr: 'لوحة التحكم' },
      { href: '/projects', icon: '🗂', label: 'Al-Masar Projects', labelAr: 'مشاريع المسار' },
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
    section: 'Settings & Account',
    sectionAr: 'الإعدادات والحساب',
    items: [
      { href: '/profile', icon: '👤', label: 'Profile & Account', labelAr: 'الملف الشخصي والحساب' },
      { href: '/config', icon: '⚙', label: 'Configuration', labelAr: 'إعدادات النظام' },
    ],
  },
]

interface Props {
  children: React.ReactNode
  title: string
  titleAr?: string
  actions?: React.ReactNode
}

export default function AppLayout({ children, title, titleAr, actions }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, toggleLang, isRtl } = useLanguage()
  const { theme, toggleTheme, isLight } = useTheme()
  const [profile, setProfile] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('almasar_user') : null
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.email) {
          setProfile(parsed)
          setAuthChecked(true)
          return
        }
      } catch {}
    }
    // If not authenticated, redirect immediately to login
    router.replace('/login')
  }, [router])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    if (typeof window !== 'undefined') localStorage.removeItem('almasar_user')
    router.push('/login')
  }

  // Show clean loading spinner while checking auth status
  if (!authChecked || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary, #0f172a)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: 'var(--accent, #38bdf8)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 14px'
          }} />
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {isRtl ? 'جاري التحقق من جلسة الدخول...' : 'Verifying user session...'}
          </div>
        </div>
      </div>
    )
  }

  const isManager = profile?.is_manager || ['system_admin', 'company_owner', 'general_manager', 'admin'].includes(profile?.role)
  const displayTitle = isRtl && titleAr ? titleAr : title

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ padding: '16px 16px', flexDirection: 'column', gap: 0, alignItems: 'center' }}>
          <Image
            src="/logo.jpg"
            alt="Al-Masar Switchgear"
            width={180}
            height={80}
            style={{
              objectFit: 'contain',
              width: '100%',
              height: 'auto',
              maxHeight: 72,
              borderRadius: 8,
              filter: isLight ? 'none' : 'brightness(0.92) contrast(1.05)',
            }}
            priority
          />
          <div style={{ marginTop: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {isRtl ? 'نظام إدارة المصنع' : 'Factory ERP System'}
            </div>
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
                  className={`sidebar-item ${pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) ? 'active' : ''}`}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{isRtl ? item.labelAr : item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User Profile Card in Sidebar Footer (Clickable to /profile) */}
        <div className="sidebar-footer">
          {profile && (
            <div
              className="user-card"
              onClick={() => router.push('/profile')}
              title={isRtl ? 'اضغط لعرض وتعديل الملف الشخصي وإعدادات الحساب' : 'Click to view & edit your profile'}
              style={{
                cursor: 'pointer',
                border: isManager ? (isLight ? '1.5px solid #d97706' : '1.5px solid #eab308') : '1px solid var(--border)',
                background: isManager ? (isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(234, 179, 8, 0.08)') : 'var(--bg-card)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                className="user-avatar"
                style={{
                  background: profile.avatar_url ? 'none' : (isManager ? 'linear-gradient(135deg, #eab308, #ca8a04)' : undefined),
                  color: isManager ? '#000' : undefined,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  />
                ) : isManager ? (
                  '👑'
                ) : (
                  (isRtl && profile.full_name_ar ? profile.full_name_ar : profile.full_name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div className="user-info">
                <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{isRtl && profile.full_name_ar ? profile.full_name_ar : profile.full_name}</span>
                </div>
                <div className="user-role" style={{ color: isManager ? (isLight ? '#b45309' : '#eab308') : undefined, fontWeight: isManager ? 700 : undefined }}>
                  {isManager ? (isRtl ? 'المدير العام (تحكم كامل)' : 'General Manager (Full Access)') : ((ROLE_LABELS as any)[profile?.role]?.[lang] || profile?.role)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleLogout()
                }}
                title={isRtl ? 'تسجيل الخروج' : 'Logout'}
                style={{
                  background: 'none',
                  padding: 6,
                  color: 'var(--text-muted)',
                  fontSize: 16,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: 4
                }}
              >
                ⎋
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="topbar-title">{displayTitle}</h1>
          </div>

          <div className="topbar-actions" style={{ position: 'relative' }}>
            {/* Theme Switcher */}
            <button
              className="theme-btn"
              onClick={toggleTheme}
              title={isRtl ? (isLight ? 'التبديل إلى الوضع الليلي (Dark)' : 'التبديل إلى الوضع النهاري (Light)') : (isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode')}
              aria-label="Toggle theme"
            >
              <span style={{ fontSize: 14 }}>{isLight ? '🌙' : '☀️'}</span>
              <span>{isRtl ? (isLight ? 'داكن' : 'فاتح') : (isLight ? 'Dark' : 'Light')}</span>
            </button>

            {/* Lang Switcher */}
            <button className="lang-btn" onClick={toggleLang}>
              {lang === 'en' ? '🇸🇦 عربي' : '🇬🇧 English'}
            </button>

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
