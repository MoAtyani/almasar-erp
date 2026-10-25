'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RoleCredential {
  id: string
  role: string
  titleEn: string
  titleAr: string
  email: string
  password: string
  badge: string
  badgeClass: string
  descriptionEn: string
  descriptionAr: string
  permissions: string[]
  redirectUrl: string
}

const PRESET_ROLES: RoleCredential[] = [
  {
    id: 'manager',
    role: 'system_admin',
    titleEn: 'General Manager & Super Admin',
    titleAr: 'المدير العام (صلاحيات كاملة شاملة)',
    email: 'manager@almasar-switchgear.com',
    password: 'Almasar@2026',
    badge: 'Full Access | تحكم كامل',
    badgeClass: 'badge-manager',
    descriptionEn: 'Full privileges: add, edit, and delete all projects, sales, templates, casting/laser/painting production, warehouse, finance, and user accounts & roles.',
    descriptionAr: 'صلاحيات مطلقة: إضافة، تعديل، وحذف المشاريع، المبيعات، النماذج، خطوط الصب والليزر والطلاء، المستودع، والتحكم بإدارة المستخدمين والصلاحيات.',
    permissions: ['إدارة وحذف المستخدمين', 'إضافة وتعديل وحذف كل الأقسام', 'الصب والليزر والطلاء', 'المستودع والمبيعات والمالية'],
    redirectUrl: '/dashboard'
  },
  {
    id: 'sales',
    role: 'sales_officer',
    titleEn: 'Sales Manager & Estimation',
    titleAr: 'مدير المبيعات والنماذج',
    email: 'sales@almasar-switchgear.com',
    password: 'Sales@2026',
    badge: 'Sales & Templates | المبيعات',
    badgeClass: 'badge-sales',
    descriptionEn: 'Manages sales projects, customer leads, pricing outcomes, delivery statuses, and reusable switchgear templates catalog.',
    descriptionAr: 'إدارة مشاريع البيع، العملاء، نتائج الصفقات، الحالات (قيد التصنيع، جاهز، تم التسليم)، وكتالوج النماذج.',
    permissions: ['المبيعات ومشاريع الإنتاج', 'كتالوج النماذج', 'التسعير وعروض الأسعار'],
    redirectUrl: '/crm'
  },
  {
    id: 'production',
    role: 'production_manager',
    titleEn: 'Production & Factory Director',
    titleAr: 'مدير الإنتاج والتصنيع',
    email: 'production@almasar-switchgear.com',
    password: 'Prod@2026',
    badge: 'Production & Tasks | الإنتاج',
    badgeClass: 'badge-prod',
    descriptionEn: 'Oversees manufacturing lines: Casting (standard/glass cover), Laser & Bending measurements, Painting & showroom notices, and technician task workflows.',
    descriptionAr: 'الإشراف على خطوط التصنيع: قسم الصب (عادي/زجاج غطاء)، قسم الليزر والتكسير، قسم الطلاء، ومسار مهام الفنيين.',
    permissions: ['قسم الصب (Casting)', 'قسم الليزر والتكسير', 'قسم الطلاء والتشطيب', 'أوامر التصنيع وتعيين المهام'],
    redirectUrl: '/tasks'
  },
  {
    id: 'technician',
    role: 'technician',
    titleEn: 'Panel Assembly & Factory Technician',
    titleAr: 'فني لوحات وتصنيع',
    email: 'technician@almasar-switchgear.com',
    password: 'Tech@2026',
    badge: 'Tasks & Progress | الفنيين',
    badgeClass: 'badge-tech',
    descriptionEn: 'Executes assigned fabrication tasks, checks wiring diagrams, updates completion status, and logs working hours.',
    descriptionAr: 'تنفيذ المهام المسندة، قراءة المخططات، تحديث نسبة الإنجاز، وتسجيل ساعات العمل في الورشة.',
    permissions: ['قائمة المهام المسندة', 'بدء وإنهاء المهام', 'نقاط المكافأة والأداء'],
    redirectUrl: '/tasks'
  },
  {
    id: 'warehouse',
    role: 'warehouse_officer',
    titleEn: 'Warehouse & Logistics Keeper',
    titleAr: 'أمين المستودع والمخزون',
    email: 'warehouse@almasar-switchgear.com',
    password: 'Store@2026',
    badge: 'Inventory | المستودع',
    badgeClass: 'badge-wh',
    descriptionEn: 'Tracks inventory on hand, reorder thresholds, component barcodes, and issues raw materials & parts to projects.',
    descriptionAr: 'متابعة المخزون المتوفر، حد إعادة الطلب، صرف المواد والقطع للمشاريع والفنيين.',
    permissions: ['إدارة عناصر المخزون', 'صرف القطع للمشاريع', 'تنبيهات النواقص'],
    redirectUrl: '/warehouse'
  },
  {
    id: 'qc',
    role: 'qc_inspector',
    titleEn: 'Quality Control Inspector',
    titleAr: 'مفتش الجودة والمطابقة',
    email: 'qc@almasar-switchgear.com',
    password: 'Qc@2026',
    badge: 'Quality & Testing | الجودة',
    badgeClass: 'badge-qc',
    descriptionEn: 'Performs dielectric and routine tests, verifies material quality inspections in laser department, and issues QC certificates.',
    descriptionAr: 'إجراء الفحوصات العازلة والاختبارات، فحص جودة المواد في قسم الليزر، وإصدار شهادات المطابقة.',
    permissions: ['سجل فحوصات الجودة', 'اعتماد ومطابقة اللوحات', 'تقارير العيوب'],
    redirectUrl: '/qc'
  }
]

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<RoleCredential>(PRESET_ROLES[0])
  const [email, setEmail] = useState(PRESET_ROLES[0].email)
  const [password, setPassword] = useState(PRESET_ROLES[0].password)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const router = useRouter()

  function handleSelectRole(preset: RoleCredential) {
    setSelectedRole(preset)
    setEmail(preset.email)
    setPassword(preset.password)
    setError('')
  }

  async function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault()
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
        // Store user in localStorage for client-side state
        if (typeof window !== 'undefined') {
          localStorage.setItem('almasar_user', JSON.stringify(data.user))
        }

        // Redirect based on user role
        if (data.user.role === 'technician') {
          router.push('/tasks')
        } else if (data.user.role === 'sales_officer') {
          router.push('/crm')
        } else {
          router.push('/dashboard')
        }
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError('Connection error with authentication service.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOneClickManagerLogin() {
    setEmail('manager@almasar-switchgear.com')
    setPassword('Almasar@2026')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'manager@almasar-switchgear.com',
          password: 'Almasar@2026',
          quick_login: true
        })
      })
      const data = await res.json()
      if (data.success && data.user) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('almasar_user', JSON.stringify(data.user))
        }
        router.push('/dashboard')
      } else {
        setError(data.error || 'Failed to login as manager')
      }
    } catch (err: any) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, field: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  return (
    <div className="login-page-v2" dir="rtl">
      {/* Background Orbs */}
      <div className="login-orb orb-primary" />
      <div className="login-orb orb-accent" />

      <div className="login-container">
        {/* Header Branding */}
        <div className="login-header-box">
          <div className="login-brand-badge">⚡ Al-Masar Switchgear ERP | مصنع المسار للصناعات الكهربائية</div>
          <h1 className="login-main-title">نظام تسجيل الدخول وإدارة الصلاحيات</h1>
          <p className="login-subtitle">
            نظام دخول مركزي آمن لكافة مستويات المستخدمين (الإدارة العامة، الإنتاج والصب والليزر والطلاء، المبيعات والنماذج، والمستودع)
          </p>
        </div>

        <div className="login-split-grid">
          {/* Left Column: Manager & Role Selector Box */}
          <div className="login-roles-pane">
            {/* Highlighted Manager Box */}
            <div className="manager-highlight-card">
              <div className="manager-card-top">
                <div className="manager-crown-icon">👑</div>
                <div>
                  <div className="manager-title-row">
                    <span className="manager-title">حساب المدير العام (General Manager)</span>
                    <span className="tag-full-access">صلاحيات كاملة شاملة</span>
                  </div>
                  <div className="manager-subtitle-en">Full Admin Access (Add, Edit & Delete Everything + Users)</div>
                </div>
              </div>

              <p className="manager-access-note">
                المدير العام يمتلك صلاحية مطلقة للإضافة والتعديل والحذف لكافة المشاريع، المبيعات، النماذج، خطوط الصب والليزر والطلاء، المستودع، <strong>وإضافة وتعديل وحذف المستخدمين وتعيين أدوارهم</strong>.
              </p>

              <div className="credentials-chip-row">
                <div className="cred-chip" onClick={() => copyToClipboard('manager@almasar-switchgear.com', 'mgr_email')}>
                  <span className="cred-label">البريد:</span>
                  <span className="cred-val">manager@almasar-switchgear.com</span>
                  <span className="copy-icon">{copiedField === 'mgr_email' ? '✓ نُسخ' : '📋'}</span>
                </div>
                <div className="cred-chip" onClick={() => copyToClipboard('Almasar@2026', 'mgr_pw')}>
                  <span className="cred-label">كلمة المرور:</span>
                  <span className="cred-val">Almasar@2026</span>
                  <span className="copy-icon">{copiedField === 'mgr_pw' ? '✓ نُسخ' : '📋'}</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-manager-direct"
                onClick={handleOneClickManagerLogin}
                disabled={loading}
              >
                {loading ? 'جاري التحقق والدخول...' : '🚀 الدخول الفوري المباشر بصلاحيات المدير العام'}
              </button>
            </div>

            {/* Quick Role Switcher */}
            <div className="roles-selector-section">
              <div className="roles-section-title">
                <span>أو اختر دور المستخدم للاختبار السريع:</span>
                <span className="roles-count">({PRESET_ROLES.length} أدوار معرفة)</span>
              </div>

              <div className="roles-selector-grid">
                {PRESET_ROLES.map((r) => {
                  const isSelected = selectedRole.id === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`role-select-card ${isSelected ? 'active' : ''}`}
                      onClick={() => handleSelectRole(r)}
                    >
                      <div className="role-card-header">
                        <span className="role-card-title">{r.titleAr}</span>
                        <span className={`role-badge-pill ${r.badgeClass}`}>{r.badge}</span>
                      </div>
                      <div className="role-card-email">{r.email}</div>
                      <div className="role-card-desc">{r.descriptionAr}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Form */}
          <div className="login-form-pane">
            <div className="login-card-inner">
              <div className="login-card-header">
                <div className="login-avatar-icon">
                  {selectedRole.id === 'manager' ? '👑' : selectedRole.id === 'sales' ? '💼' : selectedRole.id === 'production' ? '⚙️' : '⚡'}
                </div>
                <div>
                  <h2 className="login-card-title">تسجيل الدخول للنظام</h2>
                  <p className="login-card-sub">
                    الدخول الحالي المختار: <strong>{selectedRole.titleAr}</strong>
                  </p>
                </div>
              </div>

              {error && (
                <div className="login-alert-error">
                  <span className="alert-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="login-form-body">
                <div className="form-group-v2">
                  <label className="form-label-v2">
                    البريد الإلكتروني / Email
                  </label>
                  <div className="input-wrap">
                    <input
                      type="email"
                      className="form-input-v2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@almasar-switchgear.com"
                      required
                      autoComplete="email"
                    />
                    <span className="input-icon">✉️</span>
                  </div>
                </div>

                <div className="form-group-v2">
                  <div className="label-flex-row">
                    <label className="form-label-v2">كلمة المرور / Password</label>
                    <span className="pwd-hint">الافتراضية: {selectedRole.password}</span>
                  </div>
                  <div className="input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-v2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>

                {/* Permissions summary of active role */}
                <div className="role-perms-box">
                  <div className="perms-title">صلاحيات هذا الحساب:</div>
                  <div className="perms-tag-cloud">
                    {selectedRole.permissions.map((p, idx) => (
                      <span key={idx} className="perm-tag">✓ {p}</span>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-submit-login"
                  disabled={loading}
                >
                  {loading ? (
                    <span>جاري تسجيل الدخول...</span>
                  ) : (
                    <span>دخول إلى لوحة التحكم ← ({selectedRole.titleAr})</span>
                  )}
                </button>
              </form>

              <div className="login-footer-info">
                <span>🔐 اتصال مشفر وآمن عبر قاعدة بيانات Cloudflare D1 و PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page-v2 {
          min-height: 100vh;
          background: #090d16;
          color: #f1f5f9;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          overflow: hidden;
          font-family: inherit;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
        }
        .orb-primary {
          width: 500px;
          height: 500px;
          background: rgba(14, 165, 233, 0.15);
          top: -100px;
          right: -100px;
        }
        .orb-accent {
          width: 450px;
          height: 450px;
          background: rgba(234, 179, 8, 0.12);
          bottom: -100px;
          left: -100px;
        }

        .login-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1240px;
        }

        .login-header-box {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-brand-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 700;
          color: #38bdf8;
          background: rgba(14, 165, 233, 0.12);
          border: 1px solid rgba(14, 165, 233, 0.25);
          padding: 6px 18px;
          border-radius: 20px;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
        }

        .login-main-title {
          font-size: 32px;
          font-weight: 900;
          color: #ffffff;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          font-size: 14.5px;
          color: #94a3b8;
          max-width: 720px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .login-split-grid {
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 980px) {
          .login-split-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Manager Highlight Card */
        .manager-highlight-card {
          background: linear-gradient(135deg, rgba(30, 27, 75, 0.8), rgba(24, 24, 27, 0.9));
          border: 2px solid #eab308;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 10px 30px -10px rgba(234, 179, 8, 0.25);
          margin-bottom: 20px;
        }

        .manager-card-top {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 12px;
        }

        .manager-crown-icon {
          font-size: 32px;
          background: rgba(234, 179, 8, 0.2);
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(234, 179, 8, 0.4);
        }

        .manager-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .manager-title {
          font-size: 18px;
          font-weight: 800;
          color: #fef08a;
        }

        .tag-full-access {
          font-size: 11px;
          font-weight: 800;
          background: #eab308;
          color: #000;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .manager-subtitle-en {
          font-size: 12px;
          color: #cbd5e1;
          direction: ltr;
          text-align: right;
        }

        .manager-access-note {
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.6;
          margin: 0 0 16px 0;
          background: rgba(0, 0, 0, 0.25);
          padding: 10px 14px;
          border-radius: 8px;
          border-right: 3px solid #eab308;
        }

        .credentials-chip-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .credentials-chip-row {
            grid-template-columns: 1fr;
          }
        }

        .cred-chip {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(234, 179, 8, 0.3);
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          transition: all 0.2s;
        }
        .cred-chip:hover {
          background: rgba(234, 179, 8, 0.15);
          border-color: #eab308;
        }

        .cred-label {
          color: #94a3b8;
          font-weight: 600;
        }

        .cred-val {
          font-family: monospace;
          color: #fef08a;
          font-weight: 700;
          direction: ltr;
        }

        .copy-icon {
          font-size: 12px;
          color: #38bdf8;
        }

        .btn-manager-direct {
          width: 100%;
          background: linear-gradient(135deg, #eab308, #ca8a04);
          color: #090d16;
          border: none;
          padding: 13px 18px;
          border-radius: 10px;
          font-weight: 900;
          font-size: 14.5px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-manager-direct:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(234, 179, 8, 0.4);
        }

        /* Roles Selector Grid */
        .roles-selector-section {
          background: rgba(15, 23, 42, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(16px);
        }

        .roles-section-title {
          font-size: 14px;
          font-weight: 700;
          color: #cbd5e1;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .roles-count {
          font-size: 12px;
          color: #64748b;
        }

        .roles-selector-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 600px) {
          .roles-selector-grid {
            grid-template-columns: 1fr;
          }
        }

        .role-select-card {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 10px;
          padding: 12px;
          text-align: right;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: inherit;
        }
        .role-select-card:hover {
          background: rgba(30, 41, 59, 0.9);
          border-color: rgba(56, 189, 248, 0.4);
        }
        .role-select-card.active {
          background: rgba(14, 165, 233, 0.12);
          border: 1.5px solid #38bdf8;
          box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
        }

        .role-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .role-card-title {
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
        }

        .role-badge-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .badge-manager { background: rgba(234, 179, 8, 0.2); color: #fef08a; }
        .badge-sales { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
        .badge-prod { background: rgba(168, 85, 247, 0.2); color: #d8b4fe; }
        .badge-tech { background: rgba(56, 189, 248, 0.2); color: #7dd3fc; }
        .badge-wh { background: rgba(249, 115, 22, 0.2); color: #fdba74; }
        .badge-qc { background: rgba(236, 72, 153, 0.2); color: #f472b6; }

        .role-card-email {
          font-size: 11px;
          font-family: monospace;
          color: #94a3b8;
          direction: ltr;
          text-align: right;
        }

        .role-card-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.4;
          margin-top: 2px;
        }

        /* Right Column Form Card */
        .login-card-inner {
          background: rgba(15, 23, 42, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          padding: 28px;
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .login-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 22px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .login-avatar-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(14, 165, 233, 0.15);
          border: 1px solid rgba(14, 165, 233, 0.3);
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .login-card-title {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 4px 0;
        }

        .login-card-sub {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
        }

        .login-alert-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .login-form-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group-v2 {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label-v2 {
          font-size: 13px;
          font-weight: 700;
          color: #e2e8f0;
        }

        .label-flex-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .pwd-hint {
          font-size: 11px;
          color: #94a3b8;
          font-family: monospace;
          direction: ltr;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input-v2 {
          width: 100%;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 12px 14px 12px 42px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          direction: ltr;
          text-align: left;
        }
        .form-input-v2:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
        }

        .input-icon {
          position: absolute;
          left: 14px;
          font-size: 14px;
          color: #64748b;
          pointer-events: none;
        }

        .btn-toggle-eye {
          position: absolute;
          left: 12px;
          background: none;
          border: none;
          font-size: 14px;
          color: #94a3b8;
          cursor: pointer;
        }

        .role-perms-box {
          background: rgba(30, 41, 59, 0.4);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px;
        }

        .perms-title {
          font-size: 11.5px;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .perms-tag-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .perm-tag {
          font-size: 11px;
          background: rgba(14, 165, 233, 0.12);
          color: #7dd3fc;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(14, 165, 233, 0.2);
        }

        .btn-submit-login {
          background: linear-gradient(135deg, #0284c7, #0369a1);
          color: #ffffff;
          border: none;
          padding: 14px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          margin-top: 6px;
        }
        .btn-submit-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(2, 132, 199, 0.4);
        }

        .login-footer-info {
          text-align: center;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 11.5px;
          color: #64748b;
        }
      `}</style>
    </div>
  )
}
