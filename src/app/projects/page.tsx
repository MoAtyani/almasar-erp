'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { PanelProject, ProjectState } from '@/lib/types'
import { PROJECT_STATE_LABELS, formatDate, formatCurrency, projectStateFlow } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

export default function ProjectsPage() {
  const { lang, isRtl } = useLanguage()
  const [projects, setProjects] = useState<PanelProject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<PanelProject | null>(null)
  const [deletingProject, setDeletingProject] = useState<PanelProject | null>(null)
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState<ProjectState | 'all'>('all')

  const [form, setForm] = useState({
    name: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    location: '',
    date_start: '',
    date_delivery: '',
    description: '',
    job_order_number: '',
    quotation_amount: 50000,
    priority: 'medium',
    state: 'new'
  })

  useEffect(() => { loadProjects() }, [filterState])

  async function loadProjects() {
    setLoading(true)
    try {
      const url = `/api/projects?state=${filterState}&search=${encodeURIComponent(search)}`
      const res = await fetch(url)
      const data = await res.json()
      if (data && data.success && Array.isArray(data.data)) {
        setProjects(data.data)
      } else {
        setProjects([])
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingProject(null)
    setForm({
      name: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      location: '',
      date_start: new Date().toISOString().split('T')[0],
      date_delivery: '',
      description: '',
      job_order_number: '',
      quotation_amount: 50000,
      priority: 'medium',
      state: 'new'
    })
    setShowModal(true)
  }

  function openEditModal(proj: PanelProject) {
    setEditingProject(proj)
    setForm({
      name: proj.name || '',
      customer_name: proj.customer_name || '',
      customer_email: (proj as any).customer_email || '',
      customer_phone: (proj as any).customer_phone || '',
      location: proj.location || '',
      date_start: proj.date_start ? proj.date_start.substring(0, 10) : '',
      date_delivery: proj.date_delivery ? proj.date_delivery.substring(0, 10) : '',
      description: proj.description || '',
      job_order_number: proj.job_order_number || '',
      quotation_amount: (proj as any).quotation_amount || 50000,
      priority: (proj as any).priority || 'medium',
      state: proj.state || 'new'
    })
    setShowModal(true)
  }

  async function handleSubmitProject(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingProject) {
        // Edit existing project
        const res = await fetch('/api/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProject.id,
            name: form.name || form.customer_name,
            customer_name: form.customer_name,
            customer_email: form.customer_email,
            customer_phone: form.customer_phone,
            location: form.location,
            date_start: form.date_start,
            date_delivery: form.date_delivery,
            description: form.description,
            job_order_number: form.job_order_number,
            quotation_amount: Number(form.quotation_amount),
            priority: form.priority,
            state: form.state
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowModal(false)
          setEditingProject(null)
          loadProjects()
        } else {
          alert(data.error || 'Failed to update project')
        }
      } else {
        // Create new project
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name || form.customer_name,
            customer_name: form.customer_name,
            customer_email: form.customer_email,
            customer_phone: form.customer_phone,
            location: form.location,
            date_start: form.date_start,
            date_delivery: form.date_delivery,
            description: form.description,
            job_order_number: form.job_order_number,
            quotation_amount: Number(form.quotation_amount),
            priority: form.priority
          })
        })
        const data = await res.json()
        if (data.success) {
          setShowModal(false)
          loadProjects()
        } else {
          alert(data.error || 'Failed to create project')
        }
      }
    } catch (err) {
      console.error('Error saving project:', err)
    }
  }

  async function handleDeleteProject() {
    if (!deletingProject) return
    try {
      const res = await fetch(`/api/projects?id=${deletingProject.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setDeletingProject(null)
        loadProjects()
      } else {
        alert(data.error || 'Failed to delete project')
      }
    } catch (err) {
      console.error('Delete project error:', err)
    }
  }

  async function advanceState(proj: PanelProject) {
    const next = projectStateFlow(proj.state)
    if (!next) return
    const nextProgress = Math.min(100, (proj.overall_progress || 0) + 12)
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proj.id,
          state: next,
          overall_progress: nextProgress
        })
      })
      const data = await res.json()
      if (data.success) {
        loadProjects()
      }
    } catch (err) {
      console.error('Failed to advance state:', err)
    }
  }

  const safeProjects = Array.isArray(projects) ? projects : []
  const filtered = safeProjects.filter(p => {
    if (!p) return false
    const ref = (p.reference || '').toLowerCase()
    const cust = (p.customer_name || '').toLowerCase()
    const jo = (p.job_order_number || '').toLowerCase()
    const q = (search || '').toLowerCase()
    const matchSearch = !q || ref.includes(q) || cust.includes(q) || jo.includes(q)
    const matchState = filterState === 'all' || p.state === filterState
    return matchSearch && matchState
  })

  const STATES = Object.keys(PROJECT_STATE_LABELS) as ProjectState[]

  return (
    <AppLayout
      title="Electrical Panel Projects"
      titleAr="مشاريع اللوحات الكهربائية ومراحل التصنيع"
      actions={
        <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
          {isRtl ? '+ إنشاء مشروع لوحة جديد' : '+ New Project'}
        </button>
      }
    >
      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <input
            className="input"
            style={{ width: 340 }}
            placeholder={isRtl ? '...بحث بالمرجع، اسم العميل، أمر العمل' : 'Search reference, customer, job order...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'المرحلة:' : 'Stage:'}</span>
            <select
              className="input"
              style={{ width: 180 }}
              value={filterState}
              onChange={e => setFilterState(e.target.value as any)}
            >
              <option value="all">{isRtl ? 'جميع المراحل (10)' : 'All Stages (10)'}</option>
              {STATES.map(s => {
                const sLabel = PROJECT_STATE_LABELS[s]
                return (
                  <option key={s} value={s}>
                    {sLabel ? (sLabel[lang] || sLabel.en) : s}
                  </option>
                )
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading && (
          <div className="card" style={{ padding: 30, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {isRtl ? 'جاري تحميل المشاريع...' : 'Loading projects...'}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{isRtl ? 'لا توجد مشاريع مطابقة للبحث' : 'No projects found'}</div>
          </div>
        )}

        {!loading && filtered.map(proj => {
          const stateInfo = PROJECT_STATE_LABELS[proj.state] || {
            en: proj.state || 'New',
            ar: proj.state === 'new' ? 'مشروع جديد' : (proj.state || 'جديد'),
            color: '#8b5cf6'
          }
          const nextState = projectStateFlow(proj.state)
          const nextStateInfo = nextState ? (PROJECT_STATE_LABELS[nextState] || { en: nextState, ar: nextState }) : null

          return (
            <div key={proj.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{proj.reference}</span>
                    <span
                      className="state-pill"
                      style={{
                        background: (stateInfo?.color || '#8b5cf6') + '22',
                        color: stateInfo?.color || '#8b5cf6',
                        border: `1px solid ${(stateInfo?.color || '#8b5cf6')}55`
                      }}
                    >
                      {stateInfo?.[lang] || stateInfo?.en || proj.state || 'New'}
                    </span>
                    {proj.job_order_number && (
                      <span className="badge badge-subtle">{proj.job_order_number}</span>
                    )}
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {proj.customer_name} {proj.name && proj.name !== proj.customer_name && `— ${proj.name}`}
                  </div>
                  {proj.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {proj.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    {proj.location && <span>📍 {proj.location}</span>}
                    <span>📅 {isRtl ? 'البدء:' : 'Start:'} {formatDate(proj.date_start)}</span>
                    <span>🚚 {isRtl ? 'التسليم:' : 'Delivery:'} {formatDate(proj.date_delivery)}</span>
                    {(proj as any).quotation_amount > 0 && (
                      <span style={{ color: '#10b981', fontWeight: 600 }}>💰 {formatCurrency((proj as any).quotation_amount)}</span>
                    )}
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>⭐ {proj.total_points || 0} {isRtl ? 'نقطة' : 'pts'}</span>
                  </div>
                </div>

                {/* Progress & Actions */}
                <div style={{ textAlign: isRtl ? 'left' : 'right', minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: isRtl ? 'flex-start' : 'flex-end', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {isRtl ? 'نسبة إنجاز التصنيع' : 'Manufacturing Progress'} ({Number(proj.overall_progress || 0).toFixed(0)}%)
                  </div>
                  <div className="progress-bar-wrapper" style={{ width: 160, marginBottom: 4 }}>
                    <div className="progress-bar" style={{ width: `${Number(proj.overall_progress || 0)}%` }} />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {nextState && (
                      <button
                        className="btn btn-xs btn-primary"
                        onClick={() => advanceState(proj)}
                      >
                        {isRtl ? `نقل للمرحلة: ${nextStateInfo?.ar || nextState} ←` : `Advance: ${nextStateInfo?.en || nextState} →`}
                      </button>
                    )}
                    <button
                      className="btn btn-xs btn-secondary"
                      onClick={() => openEditModal(proj)}
                      title="Edit Project"
                    >
                      ✏️ {isRtl ? 'تعديل' : 'Edit'}
                    </button>
                    <button
                      className="btn btn-xs btn-danger"
                      onClick={() => setDeletingProject(proj)}
                      title="Delete Project"
                    >
                      🗑️ {isRtl ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit Project Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmitProject}>
              <div className="modal-header">
                <h3>{editingProject ? (isRtl ? 'تعديل بيانات المشروع' : 'Edit Project Details') : (isRtl ? 'إنشاء مشروع لوحة كهربائية جديد' : 'New Panel Project')}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم المشروع' : 'Project Title'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'مشروع لوحة تحكم رئيسية MDB' : 'Main MDB Panel Project'}
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'اسم العميل / الجهة المالكة' : 'Customer / Client Name'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'شركة الكهرباء السعودية' : 'Saudi Electricity Co.'}
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'البريد الإلكتروني للعميل' : 'Customer Email'}</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="client@company.com"
                      value={form.customer_email}
                      onChange={e => setForm({ ...form, customer_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'هاتف العميل' : 'Customer Phone'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="+966 50 000 0000"
                      value={form.customer_phone}
                      onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'رقم أمر العمل (Job Order #)' : 'Job Order #'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="JO-MS-2026-099"
                      value={form.job_order_number}
                      onChange={e => setForm({ ...form, job_order_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'قيمة العرض المالي (SAR)' : 'Quotation Amount (SAR)'}</label>
                    <input
                      type="number"
                      className="input"
                      value={form.quotation_amount}
                      onChange={e => setForm({ ...form, quotation_amount: e.target.value as any })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف اللوحة الكهربائية والمواصفات' : 'Panel Specification & Description'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={isRtl ? 'لوحة توزيع رئيسية MDB 2500A Form 4b مع قواطع Masterpact...' : 'Main Distribution Board MDB 2500A Form 4b...'}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الموقع الجغرافي / المحطة' : 'Site Location'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'الرياض - المنطقة الصناعية' : 'Riyadh Industrial Area'}
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ البدء' : 'Start Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={form.date_start}
                      onChange={e => setForm({ ...form, date_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'تاريخ التسليم المخطط' : 'Delivery Target Date'}</label>
                    <input
                      type="date"
                      className="input"
                      value={form.date_delivery}
                      onChange={e => setForm({ ...form, date_delivery: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الأولوية' : 'Priority'}</label>
                    <select
                      className="input"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                    >
                      <option value="low">{isRtl ? 'منخفضة' : 'Low'}</option>
                      <option value="medium">{isRtl ? 'متوسطة' : 'Medium'}</option>
                      <option value="high">{isRtl ? 'عالية' : 'High'}</option>
                      <option value="urgent">{isRtl ? 'عاجلة' : 'Urgent'}</option>
                    </select>
                  </div>
                  {editingProject && (
                    <div>
                      <label className="label">{isRtl ? 'مرحلة المشروع الحالية' : 'Current Stage'}</label>
                      <select
                        className="input"
                        value={form.state}
                        onChange={e => setForm({ ...form, state: e.target.value as any })}
                      >
                        {STATES.map(s => (
                          <option key={s} value={s}>{PROJECT_STATE_LABELS[s]?.[lang] || s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') : (isRtl ? 'إنشاء وبدء المشروع' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProject && (
        <div className="modal-backdrop" onClick={() => setDeletingProject(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ {isRtl ? 'تأكيد حذف المشروع' : 'Confirm Delete Project'}</h3>
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingProject(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
                {isRtl 
                  ? `هل أنت متأكد من رغبتك في حذف المشروع "${deletingProject.reference} - ${deletingProject.customer_name}"؟`
                  : `Are you sure you want to delete project "${deletingProject.reference} - ${deletingProject.customer_name}"?`
                }
              </p>
              <p style={{ fontSize: 13, color: '#ef4444' }}>
                {isRtl ? 'سيتم حذف جميع سجلات المهام وأوامر العمل المرتبطة به نهائياً.' : 'All associated tasks and records will be deleted.'}
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeletingProject(null)}>
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteProject}>
                {isRtl ? 'تأكيد الحذف النهائي' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
