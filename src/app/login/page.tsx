'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'

interface QuickRole {
  id: string
  titleAr: string
  titleEn: string
  role: string
  email: string
  password: string
  icon: string
  badge: string
}

const QUICK_ROLES: QuickRole[] = [
  {
    id: 'manager',
    titleAr: 'المدير العام (تحكم كامل)',
    titleEn: 'General Manager (Full Access)',
    role: 'system_admin',
    email: 'manager@almasar-switchgear.com',
    password: 'Almasar@2026',
    icon: '👑',
    badge: 'Full Access | تحكم كامل'
  },
  {
    id: 'production',
    titleAr: 'مدير الإنتاج والتصنيع',
    titleEn: 'Production Manager',
    role: 'production_manager',
    email: 'production@almasar-switchgear.com',
    password: 'Prod@2026',
    icon: '⚙️',
    badge: 'Manufacturing | خطوط الإنتاج'
  },
  {
    id: 'sales',
    titleAr: 'مدير المبيعات والمشاريع',
    titleEn: 'Sales & Estimation Manager',
    role: 'sales_officer',
    email: 'sales@almasar-switchgear.com',
    password: 'Sales@2026',
    icon: '💼',
    badge: 'Sales & CRM | المبيعات'
  },
  {
    id: 'qc',
    titleAr: 'مهندس فحص وضبط الجودة',
    titleEn: 'QC Inspection Lead',
    role: 'qc_inspector',
    email: 'qc@almasar-switchgear.com',
    password: 'Qc@2026',
    icon: '🔍',
    badge: 'Quality Control | ضبط الجودة'
  },
  {
    id: 'warehouse',
    titleAr: 'أمين المستودع والمخزون',
    titleEn: 'Warehouse & Inventory Officer',
    role: 'warehouse_officer',
    email: 'warehouse@almasar-switchgear.com',
    password: 'Store@2026',
    icon: '🏭',
    badge: 'Inventory | المستودع'
  },
  {
    id: 'technician',
    titleAr: 'فني التجميع واللوحات',
    titleEn: 'Panel Assembly Technician',
    role: 'technician',
    email: 'technician@almasar-switchgear.com',
    password: 'Tech@2026',
    icon: '⚡',
    badge: 'Technician | الورشة'
  }
]

export default function LoginPage() {
  const router = useRouter()
  const { theme, toggleTheme, isLight } = useTheme()
  const { lang, toggleLang, isRtl } = useLanguage()

  const [email, setEmail] = useState('manager@almasar-switchgear.com')
  const [password, setPassword] = useState('Almasar@2026')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showQuickRoles, setShowQuickRoles] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError(isRtl ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email')
      return
    }
    if (!password) {
      setError(isRtl ? 'يرجى إدخال كلمة المرور' : 'Please enter your password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await res.json()

      if (data.success && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('almasar_user', JSON.stringify(data.user))
        }
        router.push('/dashboard')
      } else {
        setError(data.error || (isRtl ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password'))
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(isRtl ? 'تعذر الاتصال بخادم المصادقة، يرجى المحاولة ثانية' : 'Connection error with authentication server')
    } finally {
      setLoading(false)
    }
  }

  function handleSelectQuickRole(roleItem: QuickRole) {
    setEmail(roleItem.email)
    setPassword(roleItem.password)
    setError('')
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 16px',
        background: isLight 
          ? 'radial-gradient(circle at 50% 10%, #e0f2fe 0%, #f8fafc 50%, #f1f5f9 100%)' 
          : 'radial-gradient(circle at 50% 10%, #0c4a6e 0%, #0f172a 50%, #020617 100%)',
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Bar Switchers */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        marginBottom: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {isRtl ? 'نظام المسار المتكامل v2.6' : 'Al-Masar ERP v2.6'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-btn"
            style={{
              padding: '6px 12px',
              fontSize: 13,
              borderRadius: 8,
              background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.7)',
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`
            }}
          >
            <span>{isLight ? '🌙 داكن' : '☀️ فاتح'}</span>
          </button>
          <button
            type="button"
            onClick={toggleLang}
            className="lang-btn"
            style={{
              padding: '6px 12px',
              fontSize: 13,
              borderRadius: 8,
              background: isLight ? '#ffffff' : 'rgba(30, 41, 59, 0.7)',
              border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)'}`
            }}
          >
            {lang === 'en' ? '🇸🇦 عربي' : '🇬🇧 English'}
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '32px 28px',
          borderRadius: 20,
          boxShadow: isLight
            ? '0 20px 40px -15px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'
            : '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
          background: isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          zIndex: 10
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-block', marginBottom: 12 }}>
            <Image
              src="/logo.jpg"
              alt="Al-Masar Switchgear"
              width={200}
              height={85}
              style={{
                objectFit: 'contain',
                maxHeight: 76,
                borderRadius: 10,
                filter: isLight ? 'none' : 'brightness(0.95) contrast(1.05)'
              }}
              priority
            />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 2px', color: 'var(--text-primary)' }}>
            {isRtl ? 'شركة المسار لصناعة اللوحات الكهربائية' : 'Al-Masar Switchgear Factory'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {isRtl ? 'بوابة تسجيل الدخول وإدارة عمليات المصنع' : 'Unified Enterprise & Factory Management Portal'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 18
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
              {isRtl ? 'البريد الإلكتروني / اسم المستخدم' : 'Email Address / Username'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input"
                style={{ width: '100%', paddingLeft: isRtl ? 14 : 38, paddingRight: isRtl ? 38 : 14, height: 42, fontSize: 14 }}
                placeholder="name@almasar-switchgear.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <span style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isRtl ? 'right' : 'left']: 12,
                color: 'var(--text-muted)',
                fontSize: 16
              }}>
                ✉️
              </span>
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {isRtl ? 'كلمة المرور' : 'Password'}
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input"
                style={{ width: '100%', paddingLeft: isRtl ? 40 : 38, paddingRight: isRtl ? 38 : 40, height: 42, fontSize: 14 }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <span style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [isRtl ? 'right' : 'left']: 12,
                color: 'var(--text-muted)',
                fontSize: 16
              }}>
                🔒
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isRtl ? 'left' : 'right']: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4,
                  fontSize: 16
                }}
              >
                {showPassword ? '👁️' : '🕶️'}
              </button>
            </div>
          </div>

          {/* Remember me & Helper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>{isRtl ? 'تذكر بيانات تسجيل الدخول' : 'Remember my login'}</span>
            </label>
            <span style={{ color: 'var(--accent)', fontSize: 12 }}>
              {isRtl ? 'دخول آمن ومشفّر' : 'Secured SSL'}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              height: 44,
              fontSize: 15,
              fontWeight: 700,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
            }}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                <span>{isRtl ? 'جاري التحقق والدخول...' : 'Signing in...'}</span>
              </>
            ) : (
              <span>{isRtl ? 'تسجيل الدخول إلى النظام ←' : 'Sign In to Dashboard →'}</span>
            )}
          </button>
        </form>

        {/* Quick Demo Roles Section */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            cursor: 'pointer'
          }}
          onClick={() => setShowQuickRoles(!showQuickRoles)}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              {isRtl ? '⚡ الدخول التجريبي السريع حسب الصلاحية:' : '⚡ Quick Test Accounts by Role:'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>
              {showQuickRoles ? '▲' : '▼'}
            </span>
          </div>

          {showQuickRoles && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_ROLES.map(r => {
                const isActive = email === r.email
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectQuickRole(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: isActive
                        ? '1.5px solid var(--accent)'
                        : `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                      background: isActive
                        ? (isLight ? 'rgba(2, 132, 199, 0.08)' : 'rgba(56, 189, 248, 0.12)')
                        : (isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                      textAlign: isRtl ? 'right' : 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden'
                      }}>
                        {isRtl ? r.titleAr : r.titleEn}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {r.role === 'system_admin' ? (isRtl ? 'تحكم كامل' : 'Full Admin') : r.email.split('@')[0]}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Official Factory Footer Details */}
      <footer style={{
        marginTop: 20,
        textAlign: 'center',
        fontSize: 11.5,
        color: 'var(--text-muted)',
        lineHeight: 1.8,
        maxWidth: 580,
        zIndex: 10
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>
          {isRtl ? 'المصنع: عمان - الأردن | هاتف: 4123035 6 962 | فاكس: 4123034 6 962' : 'Factory: Amman - Jordan | Tel: +962 6 4123035 | Fax: +962 6 4123034'}
        </div>
        <div>
          <span>🌐 <a href="https://www.almasarjo.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>www.almasarjo.com</a></span>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
          <span>✉️ <a href="mailto:info@almasarjo.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>info@almasarjo.com</a></span>
          <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
          <span>© 2026 Al-Masar Switchgear Co. All Rights Reserved</span>
        </div>
      </footer>
    </div>
  )
}
