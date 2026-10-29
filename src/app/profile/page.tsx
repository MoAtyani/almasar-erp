'use client'
import { useEffect, useState, useRef } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { ROLE_LABELS } from '@/lib/constants'

const PRESET_AVATARS = [
  { id: 'gold_crown', label: 'تاج ذهبي (المدير العام)', icon: '👑', bg: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'executive', label: 'تنفيذي أزرق', icon: '👔', bg: 'linear-gradient(135deg, #0284c7, #0369a1)' },
  { id: 'engineer', label: 'مهندس كهرباء', icon: '⚡', bg: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { id: 'production', label: 'مدير تصنيع', icon: '⚙️', bg: 'linear-gradient(135deg, #f97316, #c2410c)' },
  { id: 'qc', label: 'مفتش جودة', icon: '🔍', bg: 'linear-gradient(135deg, #10b981, #047857)' },
]

export default function ProfilePage() {
  const { lang, isRtl, toggleLang } = useLanguage()
  const { theme, toggleTheme, isLight } = useTheme()

  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'users' | 'preferences'>('info')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState('')
  const [saveError, setSaveError] = useState('')

  // Profile Edit Form State
  const [infoForm, setInfoForm] = useState({
    full_name: '',
    full_name_ar: '',
    email: '',
    phone: '',
    department: '',
    job_title: '',
    avatar_url: ''
  })

  // Password Reset Form State
  const [pwdForm, setPwdForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdError, setPwdError] = useState('')

  // User Management State (For General Manager)
  const [usersList, setUsersList] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [deletingUser, setDeletingUser] = useState<any | null>(null)

  // New / Edit User Form State
  const [userModalForm, setUserModalForm] = useState({
    full_name: '',
    full_name_ar: '',
    email: '',
    role: 'technician',
    department: 'قسم الكهرباء والتجميع',
    phone: '',
    password: '',
    is_active: true
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCurrentProfile()
  }, [])

  // Check URL query parameters (e.g. /profile?tab=users)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      if (tabParam === 'users') {
        setActiveTab('users')
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'users') {
      loadAllUsers()
    }
  }, [activeTab])

  function loadCurrentProfile() {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('almasar_user') : null
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setProfile(u)
        setInfoForm({
          full_name: u.full_name || '',
          full_name_ar: u.full_name_ar || '',
          email: u.email || '',
          phone: u.phone || '',
          department: u.department || 'Executive Management',
          job_title: u.job_title || u.role || 'General Manager',
          avatar_url: u.avatar_url || ''
        })
      } catch (e) {
        console.error('Failed to parse profile:', e)
      }
    }
    setLoading(false)
  }

  async function loadAllUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success && data.data) {
        setUsersList(data.data)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  // Handle Photo File Upload
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert(isRtl ? 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2 ميغابايت' : 'Image is too large (max 2MB)')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setInfoForm(prev => ({ ...prev, avatar_url: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  // Save Profile Info
  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSaveSuccess('')
    setSaveError('')

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile?.id,
          email: profile?.email,
          full_name: infoForm.full_name,
          full_name_ar: infoForm.full_name_ar,
          phone: infoForm.phone,
          department: infoForm.department,
          avatar_url: infoForm.avatar_url
        })
      })
      const data = await res.json()

      if (data.success && data.user) {
        const merged = { ...profile, ...data.user }
        setProfile(merged)
        if (typeof window !== 'undefined') {
          localStorage.setItem('almasar_user', JSON.stringify(merged))
        }
        setSaveSuccess(isRtl ? 'تم حفظ وتحديث بيانات الملف الشخصي بنجاح ✓' : 'Profile updated successfully ✓')
        setTimeout(() => setSaveSuccess(''), 4000)
      } else {
        setSaveError(data.error || (isRtl ? 'فشل حفظ التعديلات' : 'Failed to update profile'))
      }
    } catch (err: any) {
      setSaveError(isRtl ? 'حدث خطأ أثناء حفظ البيانات' : 'An error occurred while saving')
    }
  }

  // Reset / Change Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setPwdSuccess('')
    setPwdError('')

    if (pwdForm.new_password.length < 6) {
      setPwdError(isRtl ? 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل' : 'Password must be at least 6 characters')
      return
    }

    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setPwdError(isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')
      return
    }

    setPwdLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile?.id,
          email: profile?.email,
          current_password: pwdForm.current_password,
          new_password: pwdForm.new_password
        })
      })
      const data = await res.json()

      if (data.success) {
        setPwdSuccess(isRtl ? 'تم تغيير كلمة المرور بنجاح ✓' : 'Password changed successfully ✓')
        setPwdForm({ current_password: '', new_password: '', confirm_password: '' })
        setTimeout(() => setPwdSuccess(''), 4000)
      } else {
        setPwdError(data.error || (isRtl ? 'فشل تغيير كلمة المرور' : 'Failed to change password'))
      }
    } catch (err: any) {
      setPwdError(isRtl ? 'حدث خطأ في الاتصال' : 'Connection error')
    } finally {
      setPwdLoading(false)
    }
  }

  // User Management Handlers (General Manager)
  function openAddUserModal() {
    setEditingUser(null)
    setUserModalForm({
      full_name: '',
      full_name_ar: '',
      email: '',
      role: 'technician',
      department: 'قسم الكهرباء والتجميع',
      phone: '',
      password: '',
      is_active: true
    })
    setShowAddUserModal(true)
  }

  function openEditUserModal(user: any) {
    setEditingUser(user)
    setUserModalForm({
      full_name: user.full_name || '',
      full_name_ar: user.full_name_ar || '',
      email: user.email || '',
      role: user.role || 'technician',
      department: user.department || 'قسم الكهرباء والتجميع',
      phone: user.phone || '',
      password: '',
      is_active: user.is_active !== false && user.is_active !== 0
    })
    setShowAddUserModal(true)
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingUser) {
        // Update User
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            full_name: userModalForm.full_name,
            full_name_ar: userModalForm.full_name_ar,
            email: userModalForm.email,
            role: userModalForm.role,
            department: userModalForm.department,
            phone: userModalForm.phone,
            password: userModalForm.password || undefined,
            is_active: userModalForm.is_active
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowAddUserModal(false)
          setEditingUser(null)
          loadAllUsers()
        } else {
          alert(data.error || 'Failed to update user')
        }
      } else {
        // Create User
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userModalForm)
        })
        const data = await res.json()
        if (data.success) {
          setShowAddUserModal(false)
          loadAllUsers()
        } else {
          alert(data.error || 'Failed to create user')
        }
      }
    } catch (err: any) {
      console.error('Error saving user:', err)
    }
  }

  async function handleDeleteUserConfirm() {
    if (!deletingUser) return
    try {
      const res = await fetch(`/api/users?id=${deletingUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingUser(null)
        loadAllUsers()
      } else {
        alert(data.error || 'Failed to delete user')
      }
    } catch (err: any) {
      console.error('Error deleting user:', err)
    }
  }

  const isManager = profile?.is_manager || ['system_admin', 'company_owner', 'general_manager', 'admin'].includes(profile?.role)

  const filteredUsers = usersList.filter(u => {
    if (!userSearch.trim()) return true
    const term = userSearch.toLowerCase()
    return (
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.full_name_ar && u.full_name_ar.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.department && u.department.toLowerCase().includes(term))
    )
  })

  return (
    <AppLayout
      title="User Profile & Account Settings"
      titleAr="الملف الشخصي وإعدادات الحساب"
    >
      {/* 1. Header Banner & Profile Overview */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 24,
          background: isLight
            ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: isManager
            ? (isLight ? '1.5px solid #d97706' : '1.5px solid rgba(234, 179, 8, 0.4)')
            : '1px solid var(--border)',
          borderRadius: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar with Upload Hover Button */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                overflow: 'hidden',
                background: infoForm.avatar_url
                  ? 'none'
                  : (isManager ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--accent)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                color: '#ffffff',
                border: isLight ? '3px solid #ffffff' : '3px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
              }}
            >
              {infoForm.avatar_url ? (
                <img
                  src={infoForm.avatar_url}
                  alt={profile?.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : isManager ? (
                '👑'
              ) : (
                (isRtl && profile?.full_name_ar ? profile?.full_name_ar : profile?.full_name || 'U').charAt(0).toUpperCase()
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            {/* Change Photo Overlay Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={isRtl ? 'تغيير الصورة الشخصية' : 'Change profile photo'}
              style={{
                position: 'absolute',
                bottom: 0,
                [isRtl ? 'left' : 'right']: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            >
              📷
            </button>
          </div>

          {/* User Details */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
                {isRtl && profile?.full_name_ar ? profile?.full_name_ar : profile?.full_name}
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  background: isManager ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(56, 189, 248, 0.15)',
                  color: isManager ? '#ffffff' : 'var(--accent)',
                  boxShadow: isManager ? '0 2px 8px rgba(245, 158, 11, 0.35)' : undefined
                }}
              >
                {isManager ? '👑 ' : ''}
                {isManager
                  ? (isRtl ? 'المدير العام (تحكم كامل)' : 'General Manager (Full Access)')
                  : ((ROLE_LABELS as any)[profile?.role]?.[lang] || profile?.role)}
              </span>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              <span>{profile?.email}</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
              <span>{infoForm.department || (isRtl ? 'الإدارة التنفيذية' : 'Executive Management')}</span>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>•</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● {isRtl ? 'نشط' : 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Quick Avatar Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: isRtl ? 'flex-end' : 'flex-start' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
            {isRtl ? 'أو اختر رمزاً تمثيلياً سريعاً:' : 'Or pick an executive avatar icon:'}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PRESET_AVATARS.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setInfoForm(prev => ({ ...prev, avatar_url: '' }))}
                title={a.label}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: a.bg,
                  border: 'none',
                  fontSize: 15,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              >
                {a.icon}
              </button>
            ))}
            {infoForm.avatar_url && (
              <button
                type="button"
                onClick={() => setInfoForm(prev => ({ ...prev, avatar_url: '' }))}
                title={isRtl ? 'إزالة الصورة الحالية' : 'Remove current photo'}
                style={{
                  padding: '0 8px',
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                ✕ {isRtl ? 'إزالة' : 'Remove'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="tab-group" style={{ marginBottom: 20 }}>
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <span>👤</span>
          <span>{isRtl ? 'البيانات الشخصية والحساب' : 'Personal Information'}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <span>🔒</span>
          <span>{isRtl ? 'الأمان وتغيير كلمة المرور' : 'Security & Password'}</span>
        </button>

        {isManager && (
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
            style={{ fontWeight: 700 }}
          >
            <span>👑</span>
            <span>{isRtl ? 'إدارة المستخدمين والصلاحيات' : 'User Management (Admin)'}</span>
          </button>
        )}

        <button
          className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <span>⚙️</span>
          <span>{isRtl ? 'تفضيلات النظام والإشعارات' : 'Preferences & Alerts'}</span>
        </button>
      </div>

      {/* 3. TAB 1: Personal Info & Account */}
      {activeTab === 'info' && (
        <div className="card" style={{ padding: 24, maxWidth: 760 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
            {isRtl ? 'تعديل بيانات الحساب والاسم' : 'Edit Account Details'}
          </h3>

          {saveSuccess && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: 13,
              marginBottom: 16
            }}>
              {saveSuccess}
            </div>
          )}

          {saveError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16
            }}>
              {saveError}
            </div>
          )}

          <form onSubmit={handleSaveInfo} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">{isRtl ? 'الاسم بالإنجليزية (Full Name)' : 'Full Name (English) *'}</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={infoForm.full_name}
                  onChange={e => setInfoForm({ ...infoForm, full_name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">{isRtl ? 'الاسم بالعربية' : 'Full Name (Arabic)'}</label>
                <input
                  type="text"
                  className="input"
                  value={infoForm.full_name_ar}
                  onChange={e => setInfoForm({ ...infoForm, full_name_ar: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input
                  type="email"
                  disabled
                  className="input"
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  value={infoForm.email}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {isRtl ? 'البريد الإلكتروني مرتبط بحساب الدخول ولا يعدل إلا من قبل النظام' : 'Primary login email'}
                </span>
              </div>

              <div>
                <label className="label">{isRtl ? 'رقم الهاتف / الجوال' : 'Phone Number'}</label>
                <input
                  type="text"
                  className="input"
                  placeholder="+962 7..."
                  value={infoForm.phone}
                  onChange={e => setInfoForm({ ...infoForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label className="label">{isRtl ? 'القسم / الإدارة' : 'Department'}</label>
                <input
                  type="text"
                  className="input"
                  value={infoForm.department}
                  onChange={e => setInfoForm({ ...infoForm, department: e.target.value })}
                />
              </div>

              <div>
                <label className="label">{isRtl ? 'المسمى الوظيفي' : 'Job Title / Role'}</label>
                <input
                  type="text"
                  className="input"
                  value={infoForm.job_title}
                  onChange={e => setInfoForm({ ...infoForm, job_title: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                {isRtl ? 'حفظ وتحديث الملف الشخصي' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. TAB 2: Security & Password Reset */}
      {activeTab === 'security' && (
        <div className="card" style={{ padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
            {isRtl ? 'تغيير وإعادة تعيين كلمة المرور' : 'Change & Reset Password'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            {isRtl
              ? 'يرجى اختيار كلمة مرور قوية تحتوي على 6 أحرف على الأقل لحماية حسابك.'
              : 'Choose a secure password of at least 6 characters.'}
          </p>

          {pwdSuccess && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: 13,
              marginBottom: 16
            }}>
              {pwdSuccess}
            </div>
          )}

          {pwdError && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: 13,
              marginBottom: 16
            }}>
              {pwdError}
            </div>
          )}

          <form onSubmit={handleResetPassword} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="label">{isRtl ? 'كلمة المرور الحالية' : 'Current Password'}</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={pwdForm.current_password}
                onChange={e => setPwdForm({ ...pwdForm, current_password: e.target.value })}
              />
            </div>

            <div>
              <label className="label">{isRtl ? 'كلمة المرور الجديدة' : 'New Password'}</label>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={pwdForm.new_password}
                onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })}
              />
            </div>

            <div>
              <label className="label">{isRtl ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}</label>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={pwdForm.confirm_password}
                onChange={e => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <button
                type="submit"
                disabled={pwdLoading}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                {pwdLoading
                  ? (isRtl ? 'جاري التحديث...' : 'Updating...')
                  : (isRtl ? 'تأكيد وتحديث كلمة المرور' : 'Update Password')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. TAB 3: User Management (General Manager Only) */}
      {activeTab === 'users' && isManager && (
        <div>
          {/* Action Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 20
          }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px' }}>
                {isRtl ? 'إدارة المستخدمين وحسابات المصنع' : 'Factory Users & Permissions Management'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {isRtl
                  ? 'بصفتك المدير العام، لديك الصلاحية الكاملة لإضافة، وتعديل، وحذف المستخدمين وتعيين أدوارهم.'
                  : 'As General Manager, you have full privileges to add, edit, and delete user accounts and assign roles.'}
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={openAddUserModal}
            >
              <span>+</span>
              <span>{isRtl ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 18 }}>
            <input
              type="text"
              className="input"
              style={{ width: '100%', maxWidth: 420 }}
              placeholder={isRtl ? 'بحث باسم المستخدم أو البريد الإلكتروني أو القسم...' : 'Search users by name, email, or department...'}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          {/* Users Table */}
          <div className="card" style={{ padding: 20 }}>
            {usersLoading && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                {isRtl ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
              </div>
            )}

            {!usersLoading && filteredUsers.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                {isRtl ? 'لم يتم العثور على أي مستخدمين مطابقين للبحث.' : 'No users found matching search.'}
              </div>
            )}

            {!usersLoading && filteredUsers.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>{isRtl ? 'المستخدم' : 'User'}</th>
                      <th>{isRtl ? 'البريد الإلكتروني' : 'Email'}</th>
                      <th>{isRtl ? 'الدور الوظيفي' : 'Role'}</th>
                      <th>{isRtl ? 'القسم' : 'Department'}</th>
                      <th>{isRtl ? 'الحالة' : 'Status'}</th>
                      <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const isUserMgr = ['system_admin', 'company_owner', 'general_manager', 'admin'].includes(u.role)
                      const isActive = u.is_active !== false && u.is_active !== 0
                      return (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: '50%',
                                  background: isUserMgr ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--accent)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 14,
                                  fontWeight: 700
                                }}
                              >
                                {isUserMgr ? '👑' : (u.full_name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>
                                  {isRtl && u.full_name_ar ? u.full_name_ar : u.full_name}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {u.user_code || u.employee_code || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</span>
                          </td>
                          <td>
                            <span
                              className="state-pill"
                              style={{
                                background: isUserMgr ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: isUserMgr ? '#d97706' : 'var(--accent)',
                                border: `1px solid ${isUserMgr ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                              }}
                            >
                              {(ROLE_LABELS as any)[u.role]?.[lang] || u.role}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: 13 }}>{u.department || '-'}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: isActive ? '#10b981' : '#ef4444'
                              }}
                            >
                              {isActive ? (isRtl ? '● نشط' : '● Active') : (isRtl ? '○ معطل' : '○ Inactive')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-xs btn-secondary"
                                onClick={() => openEditUserModal(u)}
                                title={isRtl ? 'تعديل بيانات المستخدم' : 'Edit User'}
                              >
                                ✏️ {isRtl ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                className="btn btn-xs btn-danger"
                                onClick={() => setDeletingUser(u)}
                                title={isRtl ? 'حذف المستخدم نهائياً' : 'Delete User'}
                              >
                                🗑️ {isRtl ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 4: Preferences & Notifications */}
      {activeTab === 'preferences' && (
        <div className="card" style={{ padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
            {isRtl ? 'تفضيلات العرض والنظام' : 'System & Display Preferences'}
          </h3>

          <div style={{ display: 'grid', gap: 20 }}>
            {/* Theme Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{isRtl ? 'مظهر النظام (Theme)' : 'Theme Mode'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isRtl ? 'التبديل بين الوضع الداكن والوضع النهاري الفاتح' : 'Switch between Dark and Light mode'}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-btn"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                <span>{isLight ? '🌙 الوضع الليلي (Dark)' : '☀️ الوضع النهاري (Light)'}</span>
              </button>
            </div>

            {/* Language Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{isRtl ? 'لغة الواجهة (Language)' : 'Interface Language'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isRtl ? 'اللغة العربية والإنجليزية مدعومتان بالكامل' : 'Full English and Arabic RTL support'}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleLang}
                className="lang-btn"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                {lang === 'en' ? '🇸🇦 التبديل للعربية' : '🇬🇧 Switch to English'}
              </button>
            </div>

            {/* Device & Session Info */}
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{isRtl ? 'بيانات الجلسة الحالية' : 'Current Active Session'}</div>
              <div style={{
                padding: 12,
                borderRadius: 8,
                background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.8
              }}>
                <div>💻 <strong>{isRtl ? 'الجهاز المتصل:' : 'Device:'}</strong> Windows PC / Chrome Browser</div>
                <div>🌐 <strong>{isRtl ? 'النطاق والسيرفر:' : 'Environment:'}</strong> Cloudflare Workers & Postgres DB</div>
                <div>🔑 <strong>{isRtl ? 'المستوى الأمني:' : 'Security:'}</strong> Session Token Active (7 Days)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit User (General Manager) */}
      {showAddUserModal && (
        <div className="modal-backdrop" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveUser}>
              <div className="modal-header">
                <h3>
                  {editingUser
                    ? (isRtl ? 'تعديل بيانات المستخدم' : 'Edit User')
                    : (isRtl ? 'إضافة مستخدم جديد للنظام' : 'Add New User')}
                </h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالإنجليزية *' : 'Name (English) *'}</label>
                    <input
                      type="text"
                      required
                      className="input"
                      value={userModalForm.full_name}
                      onChange={e => setUserModalForm({ ...userModalForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالعربية' : 'Name (Arabic)'}</label>
                    <input
                      type="text"
                      className="input"
                      value={userModalForm.full_name_ar}
                      onChange={e => setUserModalForm({ ...userModalForm, full_name_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={userModalForm.email}
                    onChange={e => setUserModalForm({ ...userModalForm, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'الدور والصلاحيات *' : 'Role & Privileges *'}</label>
                    <select
                      className="input"
                      value={userModalForm.role}
                      onChange={e => setUserModalForm({ ...userModalForm, role: e.target.value })}
                    >
                      <option value="system_admin">{isRtl ? 'المدير العام (تحكم كامل)' : 'General Manager (Full Access)'}</option>
                      <option value="production_manager">{isRtl ? 'مدير الإنتاج والتصنيع' : 'Production Manager'}</option>
                      <option value="sales_officer">{isRtl ? 'مدير المبيعات' : 'Sales Officer'}</option>
                      <option value="qc_inspector">{isRtl ? 'مفتش ضبط الجودة' : 'QC Inspector'}</option>
                      <option value="warehouse_officer">{isRtl ? 'أمين المستودع' : 'Warehouse Officer'}</option>
                      <option value="technician">{isRtl ? 'فني تجميع وورشة' : 'Technician'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">{isRtl ? 'القسم' : 'Department'}</label>
                    <select
                      className="input"
                      value={userModalForm.department}
                      onChange={e => setUserModalForm({ ...userModalForm, department: e.target.value })}
                    >
                      <option value="قسم الحديد">{isRtl ? 'قسم الحديد' : 'Iron Department'}</option>
                      <option value="قسم الهنجر">{isRtl ? 'قسم الهنجر' : 'Hangar Department'}</option>
                      <option value="قسم الكهرباء والتجميع">{isRtl ? 'قسم الكهرباء والتجميع' : 'Electrical & Assembly'}</option>
                      <option value="Executive Management">{isRtl ? 'الإدارة التنفيذية' : 'Executive Management'}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'رقم الهاتف' : 'Phone'}</label>
                    <input
                      type="text"
                      className="input"
                      value={userModalForm.phone}
                      onChange={e => setUserModalForm({ ...userModalForm, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="label">
                      {editingUser
                        ? (isRtl ? 'تغيير كلمة المرور (اختياري)' : 'New Password (Optional)')
                        : (isRtl ? 'كلمة المرور الابتدائية' : 'Initial Password')}
                    </label>
                    <input
                      type="password"
                      className="input"
                      placeholder={editingUser ? '••••••••' : 'Almasar@2026'}
                      value={userModalForm.password}
                      onChange={e => setUserModalForm({ ...userModalForm, password: e.target.value })}
                    />
                  </div>
                </div>

                {editingUser && (
                  <div style={{ marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={userModalForm.is_active}
                        onChange={e => setUserModalForm({ ...userModalForm, is_active: e.target.checked })}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {isRtl ? 'الحساب نشط ويستطيع تسجيل الدخول' : 'Account active & can login'}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser
                    ? (isRtl ? 'حفظ التعديلات' : 'Save Changes')
                    : (isRtl ? 'إنشاء المستخدم' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete User Confirmation */}
      {deletingUser && (
        <div className="modal-backdrop" onClick={() => setDeletingUser(null)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#ef4444' }}>{isRtl ? 'تأكيد حذف المستخدم' : 'Confirm User Deletion'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingUser(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 14, margin: '0 0 10px' }}>
                {isRtl
                  ? `هل أنت متأكد من رغبتك في حذف حساب المستخدم "${deletingUser.full_name || deletingUser.email}" نهائياً؟`
                  : `Are you sure you want to permanently delete user "${deletingUser.full_name || deletingUser.email}"?`}
              </p>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isRtl ? 'تحذير: سيتم إلغاء وصول هذا المستخدم لكافة أقسام النظام.' : 'Warning: This user will immediately lose access to all modules.'}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingUser(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteUserConfirm}>
                {isRtl ? 'نعم، حذف نهائي' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
