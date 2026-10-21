'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { STAGE_TYPE_LABELS, ROLE_LABELS } from '@/lib/constants'
import { StageType, UserRole } from '@/lib/types'
import { useLanguage } from '@/context/LanguageContext'

const DEFAULT_TEMPLATES = [
  { id: 't1', name_en: 'CNC Sheet Metal Punching & Bending', name_ar: 'قص وثني صاج الهيكل الخارجي CNC', stage_type: 'sheet_metal' as StageType, sequence: 10, default_points: 25 },
  { id: 't2', name_en: 'Electrostatic Powder Coating RAL 7035', name_ar: 'الدهان الحراري الكتروستاتيك رمادي 7035', stage_type: 'sheet_metal' as StageType, sequence: 20, default_points: 20 },
  { id: 't3', name_en: 'DIN-Rail & Trunking Layout Integration', name_ar: 'تثبيت مجاري الأسلاك وقواعد التركيب DIN-Rail', stage_type: 'layout' as StageType, sequence: 10, default_points: 20 },
  { id: 't4', name_en: 'Circuit Breaker & Contactor Mounting', name_ar: 'تثبيت وتوزيع القواطع والكونتاكتورات والمرحلات', stage_type: 'layout' as StageType, sequence: 20, default_points: 25 },
  { id: 't5', name_en: 'Copper Busbar 10x100mm Bending & Punching', name_ar: 'ثني وتثقيب بسبار النحاس 10×100 ملم وفق الكاد', stage_type: 'power_busbar' as StageType, sequence: 10, default_points: 35 },
  { id: 't6', name_en: 'Calibrated Torque Bolting (45 Nm) with Seal', name_ar: 'تربيط مسامير البسبار بالعزم المعتمد 45 نيوتن.متر', stage_type: 'power_busbar' as StageType, sequence: 20, default_points: 30 },
  { id: 't7', name_en: 'Protection Relay CT/PT Control Wiring', name_ar: 'تمديد أسلاك الحماية ومحولات التيار والجهد', stage_type: 'control' as StageType, sequence: 10, default_points: 30 },
  { id: 't8', name_en: 'Dielectric High Voltage 2.5kV & Megger FAT', name_ar: 'اختبار الجهد العالي 2.5 ك.ف وفحص الميجر للعزل', stage_type: 'final_test' as StageType, sequence: 10, default_points: 40 },
]

export default function ConfigPage() {
  const { lang, isRtl } = useLanguage()
  const [tab, setTab] = useState<'users' | 'templates'>('users')
  const [templates, setTemplates] = useState<any[]>(DEFAULT_TEMPLATES)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name_en: '', name_ar: '', stage_type: 'sheet_metal' as StageType, sequence: '10', default_points: '20' })
  
  // User Modals (Add / Edit)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [userForm, setUserForm] = useState({
    full_name: '',
    full_name_ar: '',
    email: '',
    role: 'technician',
    department: 'Production',
    phone: '',
    is_active: true
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data)
      }
    } catch (e) {
      console.error('Failed to load users:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault()
    try {
      const isEdit = !!editingUser
      const url = '/api/users'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit ? { id: editingUser.id, ...userForm } : userForm

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.success) {
        setShowUserModal(false)
        setEditingUser(null)
        setUserForm({
          full_name: '',
          full_name_ar: '',
          email: '',
          role: 'technician',
          department: 'Production',
          phone: '',
          is_active: true
        })
        loadAll()
      } else {
        alert(data.error || 'Failed to save user')
      }
    } catch (err) {
      console.error('Error saving user:', err)
    }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(isRtl ? `هل أنت متأكد من حذف المستخدم: ${name}؟` : `Are you sure you want to delete user: ${name}?`)) {
      return
    }
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        loadAll()
      } else {
        alert(data.error || 'Failed to delete user')
      }
    } catch (err) {
      console.error('Error deleting user:', err)
    }
  }

  async function handleQuickRoleChange(userId: string, newRole: string) {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole })
      })
      loadAll()
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  function openEditModal(u: any) {
    setEditingUser(u)
    setUserForm({
      full_name: u.full_name || '',
      full_name_ar: u.full_name_ar || '',
      email: u.email || '',
      role: u.role || 'technician',
      department: u.department || 'Production',
      phone: u.phone || '',
      is_active: u.is_active !== undefined ? !!u.is_active : true
    })
    setShowUserModal(true)
  }

  function openAddModal() {
    setEditingUser(null)
    setUserForm({
      full_name: '',
      full_name_ar: '',
      email: '',
      role: 'technician',
      department: 'Production',
      phone: '',
      is_active: true
    })
    setShowUserModal(true)
  }

  return (
    <AppLayout
      title="System Configuration & User Management"
      titleAr="إعدادات النظام وإدارة المستخدمين والصلاحيات"
      actions={
        tab === 'users' ? (
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>
            {isRtl ? '+ إضافة مستخدم جديد' : '+ Add User'}
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setShowTemplateModal(true)}>
            {isRtl ? '+ إضافة قالب مرحلة جديد' : '+ Add Template'}
          </button>
        )
      }
    >
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('users')}
        >
          👥 {isRtl ? `المستخدمون والأدوار (${users.length})` : `Users & Roles (${users.length})`}
        </button>
        <button
          className={`btn ${tab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('templates')}
        >
          ⚙️ {isRtl ? `قوالب مراحل التصنيع (${templates.length})` : `Assembly Templates (${templates.length})`}
        </button>
      </div>

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {isRtl ? 'إدارة أدوار وصلاحيات طاقم المصنع والمهندسين' : 'User Roles & System Permissions Matrix'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={openAddModal}>
              {isRtl ? '+ إضافة مستخدم' : '+ Add User'}
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'الاسم' : 'NAME'}</th>
                  <th>{isRtl ? 'البريد الإلكتروني' : 'EMAIL'}</th>
                  <th>{isRtl ? 'القسم' : 'DEPARTMENT'}</th>
                  <th>{isRtl ? 'الدور والصلاحيات' : 'ROLE & PERMISSIONS'}</th>
                  <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div><strong>{isRtl && u.full_name_ar ? u.full_name_ar : u.full_name}</strong></div>
                      {u.user_code && <span className="badge badge-subtle">{u.user_code}</span>}
                      {u.phone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>📞 {u.phone}</div>}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.department || 'Operations'}</td>
                    <td>
                      <select
                        className="input"
                        style={{ width: 220, padding: '4px 8px' }}
                        value={u.role}
                        onChange={e => handleQuickRoleChange(u.id, e.target.value)}
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v[lang] || v.en}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'معطل' : 'Inactive')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(u)}
                          title={isRtl ? 'تعديل' : 'Edit'}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          title={isRtl ? 'حذف' : 'Delete'}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {isRtl ? 'قوالب خطوات التجميع والفحص المعيارية' : 'Standard Manufacturing Activity Templates'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowTemplateModal(true)}>
              {isRtl ? '+ إضافة خطوة معيارية' : '+ Add Activity'}
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'المرحلة' : 'STAGE'}</th>
                  <th>{isRtl ? 'اسم الخطوة' : 'ACTIVITY'}</th>
                  <th>{isRtl ? 'الترتيب' : 'SEQ'}</th>
                  <th>{isRtl ? 'نقاط المكافأة' : 'POINTS'}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => {
                  const sInfo = STAGE_TYPE_LABELS[t.stage_type as StageType] || { en: t.stage_type, ar: t.stage_type }
                  return (
                    <tr key={t.id}>
                      <td><span className="state-pill">{sInfo[lang] || sInfo.en}</span></td>
                      <td>
                        <strong>{isRtl ? t.name_ar : t.name_en}</strong>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{isRtl ? t.name_en : t.name_ar}</div>
                      </td>
                      <td>{t.sequence}</td>
                      <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>⭐ {t.default_points}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Modal (Add / Edit) */}
      {showUserModal && (
        <div className="modal-backdrop" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSaveUser}>
              <div className="modal-header">
                <h3>
                  {editingUser
                    ? (isRtl ? 'تعديل بيانات المستخدم والصلاحيات' : 'Edit User & Permissions')
                    : (isRtl ? 'إضافة مستخدم جديد للنظام' : 'Add New User')}
                </h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالإنجليزية' : 'Full Name (English)'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="e.g. Eng. Khalid Mansoor"
                      value={userForm.full_name}
                      onChange={e => setUserForm({ ...userForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الاسم بالعربية' : 'Full Name (Arabic)'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="م. خالد منصور"
                      value={userForm.full_name_ar}
                      onChange={e => setUserForm({ ...userForm, full_name_ar: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input
                      required
                      type="email"
                      className="input"
                      placeholder="khalid@almasar-switchgear.com"
                      value={userForm.email}
                      onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'رقم الهاتف' : 'Phone'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="+966 50 123 4567"
                      value={userForm.phone}
                      onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'القسم' : 'Department'}</label>
                    <select
                      className="input"
                      value={userForm.department}
                      onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                    >
                      <option value="Production">Production & Assembly</option>
                      <option value="Engineering & Estimation">Engineering & Design</option>
                      <option value="Quality Assurance">Quality Assurance (QC)</option>
                      <option value="Warehouse & Logistics">Warehouse & Logistics</option>
                      <option value="Finance & Accounting">Finance & Accounting</option>
                      <option value="Human Resources">Human Resources (HR)</option>
                      <option value="Management">Management & Executive</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">{isRtl ? 'الدور الوظيفي والصلاحيات' : 'Role & Permissions'}</label>
                    <select
                      className="input"
                      value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v[lang] || v.en}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={userForm.is_active}
                      onChange={e => setUserForm({ ...userForm, is_active: e.target.checked })}
                    />
                    <span>{isRtl ? 'حساب نشط ومفعل' : 'Active Account'}</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUserModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ البيانات' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="modal-backdrop" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={e => { e.preventDefault(); setShowTemplateModal(false); }}>
              <div className="modal-header">
                <h3>{isRtl ? 'إضافة خطوة معيارية جديدة' : 'Add Assembly Template'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>✕</button>
              </div>
              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المرحلة' : 'Stage'}</label>
                  <select
                    className="input"
                    value={templateForm.stage_type}
                    onChange={e => setTemplateForm({ ...templateForm, stage_type: e.target.value as StageType })}
                  >
                    {Object.entries(STAGE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v[lang] || v.en}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{isRtl ? 'اسم الخطوة (بالعربي)' : 'Activity Name (Arabic)'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    value={templateForm.name_ar}
                    onChange={e => setTemplateForm({ ...templateForm, name_ar: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{isRtl ? 'اسم الخطوة (بالإنجليزي)' : 'Activity Name (English)'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    value={templateForm.name_en}
                    onChange={e => setTemplateForm({ ...templateForm, name_en: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
