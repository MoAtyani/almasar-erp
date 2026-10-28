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
  full_name: 'Eng. Yousef Basbous',
  full_name_ar: 'م. يوسف بصبوص',
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

export default function AppLayout({ children, title, titleAr, actions }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, toggleLang, isRtl } = useLanguage()
  const { theme, toggleTheme, isLight } = useTheme()
  const [profile, setProfile] = useState<any>(DEFAULT_PROFILE)

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
            <div className="user-card" style={{
              border: isManager ? (isLight ? '1.5px solid #d97706' : '1.5px solid #eab308') : undefined,
              background: isManager ? (isLight ? 'rgba(217, 119, 6, 0.08)' : 'rgba(234, 179, 8, 0.08)') : undefined
            }}>
              <div className="user-avatar" style={{ background: isManager ? 'linear-gradient(135deg, #eab308, #ca8a04)' : undefined, color: isManager ? '#000' : undefined }}>
                {isManager ? '👑' : (isRtl && profile.full_name_ar ? profile.full_name_ar : profile.full_name).charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{isRtl && profile.full_name_ar ? profile.full_name_ar : profile.full_name}</span>
                </div>
                <div className="user-role" style={{ color: isManager ? (isLight ? '#b45309' : '#eab308') : undefined, fontWeight: isManager ? 700 : undefined }}>
                  {isManager ? (isRtl ? 'المدير العام (تحكم كامل)' : 'General Manager (Full Access)') : ((ROLE_LABELS as any)[profile?.role]?.[lang] || profile?.role)}
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

