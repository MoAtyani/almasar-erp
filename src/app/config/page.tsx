'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
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

const DEFAULT_USERS = [
  { id: 'u1', full_name: 'Eng. Tariq Al-Masar', full_name_ar: 'م. طارق المسار', email: 'admin@almasar-switchgear.com', role: 'general_manager' as UserRole, department: 'Executive' },
  { id: 'u2', full_name: 'Eng. Ahmed Al-Mansoor', full_name_ar: 'م. أحمد المنصور', email: 'ahmed.m@almasar-switchgear.com', role: 'design_engineer' as UserRole, department: 'Engineering' },
  { id: 'u3', full_name: 'Tariq Al-Harbi', full_name_ar: 'طارق الحربي', email: 'tariq.h@almasar-switchgear.com', role: 'production_supervisor' as UserRole, department: 'Production' },
  { id: 'u4', full_name: 'Hassan Al-Otaibi', full_name_ar: 'حسن العتيبي', email: 'hassan.o@almasar-switchgear.com', role: 'qc_technician' as UserRole, department: 'Quality' },
  { id: 'u5', full_name: 'Mohammed Salem', full_name_ar: 'محمد سالم', email: 'mohammed.s@almasar-switchgear.com', role: 'technician' as UserRole, department: 'Workshop' },
]

export default function ConfigPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [tab, setTab] = useState<'templates' | 'users'>('templates')
  const [templates, setTemplates] = useState<any[]>(DEFAULT_TEMPLATES)
  const [users, setUsers] = useState<any[]>(DEFAULT_USERS)
  const [loading, setLoading] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [form, setForm] = useState({ name_en: '', name_ar: '', stage_type: 'sheet_metal' as StageType, sequence: '10', default_points: '20' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [{ data: t }, { data: u }] = await Promise.all([
        supabase.from('activity_templates').select('*').is('parent_id', null).order('stage_type').order('sequence'),
        supabase.from('profiles').select('*').order('full_name'),
      ])
      if (t && t.length > 0) setTemplates(t)
      if (u && u.length > 0) setUsers(u)
    } catch {}
  }

  function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault()
    const newT = {
      id: `tmpl-${Date.now()}`,
      name_en: form.name_en,
      name_ar: form.name_ar,
      stage_type: form.stage_type,
      sequence: parseInt(form.sequence) || 10,
      default_points: parseInt(form.default_points) || 20,
    }
    setTemplates([...templates, newT])
    setShowTemplateModal(false)
    setForm({ name_en: '', name_ar: '', stage_type: 'sheet_metal', sequence: '10', default_points: '20' })
  }

  function handleDeleteTemplate(id: string) {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  function handleUpdateUserRole(id: string, role: UserRole) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <AppLayout title="Factory Configuration" titleAr="إعدادات المصنع والمراحل والصلاحيات">
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'templates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('templates')}
        >
          ⚙️ {isRtl ? 'قوالب مراحل التجميع ونقاط الفنيين' : 'Assembly Stage Templates & Points'}
        </button>
        <button
          className={`btn ${tab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('users')}
        >
          👥 {isRtl ? 'المستخدمين والصلاحيات والأدوار' : 'Users & Access Roles'}
        </button>
      </div>

      {tab === 'templates' && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {isRtl ? 'قوالب مراحل تصنيع اللوحات الكهربائية' : 'Standard Switchgear Assembly Templates'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowTemplateModal(true)}>
              {isRtl ? '+ إضافة خطوة معيارية' : '+ New Template'}
            </button>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'المرحلة' : 'STAGE'}</th>
                  <th>{isRtl ? 'اسم الخطوة (عربي / English)' : 'ACTIVITY NAME'}</th>
                  <th>{isRtl ? 'الترتيب' : 'SEQ'}</th>
                  <th>{isRtl ? 'نقاط المكافأة المعتمدة' : 'POINTS'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(tmpl => {
                  const stageInfo = STAGE_TYPE_LABELS[tmpl.stage_type as StageType]
                  return (
                    <tr key={tmpl.id}>
                      <td>
                        <span className="badge badge-subtle">
                          {stageInfo ? (stageInfo[lang] || stageInfo.en) : tmpl.stage_type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{isRtl ? tmpl.name_ar : tmpl.name_en}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isRtl ? tmpl.name_en : tmpl.name_ar}</div>
                      </td>
                      <td>{tmpl.sequence}</td>
                      <td>
                        <span style={{ color: '#f59e0b', fontWeight: 700 }}>
                          ⭐ {tmpl.default_points} {isRtl ? 'نقطة' : 'pts'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {isRtl ? 'إدارة أدوار وصلاحيات طاقم المصنع' : 'User Roles & System Permissions'}
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isRtl ? 'الاسم' : 'NAME'}</th>
                  <th>{isRtl ? 'البريد الإلكتروني' : 'EMAIL'}</th>
                  <th>{isRtl ? 'القسم' : 'DEPARTMENT'}</th>
                  <th>{isRtl ? 'الدور الوظيفي' : 'ROLE'}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div><strong>{isRtl && u.full_name_ar ? u.full_name_ar : u.full_name}</strong></div>
                      {u.full_name_ar && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{isRtl ? u.full_name : u.full_name_ar}</div>}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.department || 'Operations'}</td>
                    <td>
                      <select
                        className="input"
                        style={{ width: 200, padding: '4px 8px' }}
                        value={u.role}
                        onChange={e => handleUpdateUserRole(u.id, e.target.value as UserRole)}
                      >
                        {Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v[lang] || v.en}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="modal-backdrop" onClick={() => setShowTemplateModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateTemplate}>
              <div className="modal-header">
                <h3>{isRtl ? 'إضافة خطوة معيارية جديدة لمرحلة التصنيع' : 'Add Assembly Template'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المرحلة' : 'Stage'}</label>
                  <select
                    className="input"
                    value={form.stage_type}
                    onChange={e => setForm({ ...form, stage_type: e.target.value as StageType })}
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
                    placeholder="مثال: فحص عزل أطوار البسبار 1000 فولت"
                    value={form.name_ar}
                    onChange={e => setForm({ ...form, name_ar: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'اسم الخطوة (بالإنجليزي)' : 'Activity Name (English)'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder="e.g. 1000V Megger phase insulation check"
                    value={form.name_en}
                    onChange={e => setForm({ ...form, name_en: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الترتيب' : 'Sequence'}</label>
                    <input
                      type="number"
                      className="input"
                      value={form.sequence}
                      onChange={e => setForm({ ...form, sequence: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'نقاط المكافأة المكتسبة' : 'Reward Points'}</label>
                    <input
                      type="number"
                      className="input"
                      value={form.default_points}
                      onChange={e => setForm({ ...form, default_points: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ القالب' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
