'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/constants'

const NAV_ITEMS = [
  { section: 'Overview', items: [
    { href: '/dashboard', icon: '▦', label: 'Dashboard', labelAr: 'لوحة التحكم' },
    { href: '/projects', icon: '🗂', label: 'Panel Projects', labelAr: 'مشاريع اللوحات' },
  ]},
  { section: 'Sales & CRM', items: [
    { href: '/crm', icon: '💼', label: 'Sales / CRM', labelAr: 'المبيعات / CRM' },
  ]},
  { section: 'Engineering & Production', items: [
    { href: '/engineering', icon: '📐', label: 'Engineering', labelAr: 'الهندسة' },
    { href: '/tasks', icon: '✅', label: 'Tasks & Production', labelAr: 'المهام والإنتاج' },
    { href: '/procurement', icon: '🛒', label: 'Procurement', labelAr: 'المشتريات' },
    { href: '/warehouse', icon: '🏭', label: 'Warehouse', labelAr: 'المستودع' },
    { href: '/production', icon: '⚙️', label: 'Production (MRP)', labelAr: 'الإنتاج (MRP)' },
    { href: '/qc', icon: '🔍', label: 'Quality Control', labelAr: 'ضبط الجودة' },
    { href: '/logistics', icon: '🚚', label: 'Logistics', labelAr: 'اللوجستيات' },
  ]},
  { section: 'Finance & HR', items: [
    { href: '/accounting', icon: '💳', label: 'Invoicing & Accounting', labelAr: 'الفواتير والمحاسبة' },
    { href: '/hr', icon: '👥', label: 'HR & Payroll', labelAr: 'الموارد البشرية والرواتب' },
  ]},
  { section: 'Documents & Support', items: [
    { href: '/dms', icon: '📁', label: 'DMS Documents', labelAr: 'إدارة الوثائق والمخططات' },
    { href: '/helpdesk', icon: '🎧', label: 'Helpdesk & Warranty', labelAr: 'الدعم الفني والضمان' },
    { href: '/reports', icon: '📊', label: 'Reporting Engine', labelAr: 'محرك التقارير' },
  ]},
  { section: 'Settings', items: [
    { href: '/config', icon: '⚙', label: 'Configuration', labelAr: 'الإعدادات' },
  ]},
]


interface Props {
  children: React.ReactNode
  title: string
  titleAr?: string
  actions?: React.ReactNode
}

const DEFAULT_PROFILE: Profile = {
  id: 'usr-admin',
  full_name: 'Eng. Tariq Al-Masar',
  full_name_ar: 'م. طارق المسار',
  email: 'admin@almasar-switchgear.com',
  role: 'general_manager',
  department: 'Executive Management',
  reward_points: 1250,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

export default function AppLayout({ children, title, titleAr, actions }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [lang, setLang] = useState<'en' | 'ar'>('en')

  useEffect(() => {
    supabase.auth.getUser()
      .then(({ data }) => {
        if (data?.user) {
          supabase.from('profiles').select('*').eq('id', data.user.id).single()
            .then(({ data: p }) => { if (p) setProfile(p) })
        } else {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('almasar_user') : null
          if (stored) {
            try { setProfile(JSON.parse(stored)) } catch { setProfile(DEFAULT_PROFILE) }
          } else {
            setProfile(DEFAULT_PROFILE)
          }
        }
      })
      .catch(() => {
        setProfile(DEFAULT_PROFILE)
      })
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
  }, [lang])

  async function handleLogout() {
    try { await supabase.auth.signOut() } catch {}
    if (typeof window !== 'undefined') localStorage.removeItem('almasar_user')
    router.push('/login')
  }

  const displayTitle = lang === 'ar' && titleAr ? titleAr : title

  return (
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div className="sidebar-logo-text">
            <span className="brand-name">Al-Masar</span>
            <span className="brand-sub">Switchgear ERP</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(section => (
            <div key={section.section} className="sidebar-section">
              <div className="sidebar-section-label">{section.section}</div>
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{lang === 'ar' ? item.labelAr : item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          {profile && (
            <div className="user-card">
              <div className="user-avatar">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{profile.full_name}</div>
                <div className="user-role">{ROLE_LABELS[profile.role]?.en}</div>
              </div>
              <button onClick={handleLogout} title="Logout" style={{ background: 'none', padding: 4, color: 'var(--text-muted)', fontSize: 16 }}>⎋</button>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <header className="topbar">
          <h1 className="topbar-title">{displayTitle}</h1>
          <div className="topbar-actions">
            {/* Lang Switcher */}
            <button className="lang-btn" onClick={() => setLang(l => l === 'en' ? 'ar' : 'en')}>
              {lang === 'en' ? '🇸🇦 عربي' : '🇬🇧 English'}
            </button>

            {/* Points badge */}
            {profile && profile.reward_points > 0 && (
              <span className="points-badge">⭐ {profile.reward_points} pts</span>
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
