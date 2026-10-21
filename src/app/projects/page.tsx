'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { PanelProject, ProjectState } from '@/lib/types'
import { PROJECT_STATE_LABELS, formatDate, projectStateFlow } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'
import { MOCK_PROJECTS } from '@/lib/mockData'

export default function ProjectsPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [projects, setProjects] = useState<PanelProject[]>(MOCK_PROJECTS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterState, setFilterState] = useState<ProjectState | 'all'>('all')
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    location: '', date_delivery: '', description: '', job_order_number: '',
    monday_link: '', boq_link: '',
  })

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    try {
      const { data } = await supabase.from('panel_projects').select('*').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setProjects(data as PanelProject[])
      }
    } catch {
      // keep mock
    }
  }

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    const newP: PanelProject = {
      id: `proj-${Date.now()}`,
      reference: `PJ-2026-00${projects.length + 1}`,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      location: form.location,
      date_start: new Date().toISOString().split('T')[0],
      date_delivery: form.date_delivery,
      description: form.description,
      state: 'estimation',
      job_order_number: form.job_order_number || `JO-MS-2026-0${projects.length + 90}`,
      estimation_duration_days: 3.5,
      procurement_delay_days: 0,
      delivery_time_days: 45,
      overall_progress: 15,
      total_points: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setProjects([newP, ...projects])
    setShowModal(false)
    setForm({ customer_name: '', customer_email: '', customer_phone: '', location: '', date_delivery: '', description: '', job_order_number: '', monday_link: '', boq_link: '' })
  }

  function advanceState(proj: PanelProject) {
    const next = projectStateFlow(proj.state)
    if (!next) return
    setProjects(prev => prev.map(p => {
      if (p.id === proj.id) {
        const nextProgress = Math.min(100, (p.overall_progress || 0) + 12)
        return { ...p, state: next, overall_progress: nextProgress }
      }
      return p
    }))
  }

  const filtered = projects.filter(p => {
    const matchSearch = p.reference.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.job_order_number || '').toLowerCase().includes(search.toLowerCase())
    const matchState = filterState === 'all' || p.state === filterState
    return matchSearch && matchState
  })

  const STATES = Object.keys(PROJECT_STATE_LABELS) as ProjectState[]

  return (
    <AppLayout
      title="Electrical Panel Projects"
      titleAr="مشاريع اللوحات الكهربائية ومراحل التصنيع"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
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
              {STATES.map(s => (
                <option key={s} value={s}>{PROJECT_STATE_LABELS[s][lang] || PROJECT_STATE_LABELS[s].en}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(proj => {
          const stateInfo = PROJECT_STATE_LABELS[proj.state]
          const nextState = projectStateFlow(proj.state)
          const nextStateInfo = nextState ? PROJECT_STATE_LABELS[nextState] : null

          return (
            <div key={proj.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{proj.reference}</span>
                    <span
                      className="state-pill"
                      style={{
                        background: stateInfo?.color + '22',
                        color: stateInfo?.color,
                        border: `1px solid ${stateInfo?.color}55`
                      }}
                    >
                      {stateInfo[lang] || stateInfo?.en || proj.state}
                    </span>
                    {proj.job_order_number && (
                      <span className="badge badge-subtle">{proj.job_order_number}</span>
                    )}
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {proj.customer_name}
                  </div>
                  {proj.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                      {proj.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    {proj.location && <span>📍 {proj.location}</span>}
                    <span>📅 {isRtl ? 'تاريخ البدء:' : 'Start:'} {formatDate(proj.date_start)}</span>
                    <span>🚚 {isRtl ? 'التسليم:' : 'Delivery:'} {formatDate(proj.date_delivery)}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>⭐ {proj.total_points || 0} {isRtl ? 'نقطة مكافأة' : 'points'}</span>
                  </div>
                </div>

                {/* Progress & Next stage button */}
                <div style={{ textAlign: isRtl ? 'left' : 'right', minWidth: 160 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {isRtl ? 'نسبة إنجاز التصنيع' : 'Manufacturing Progress'} ({proj.overall_progress?.toFixed(0)}%)
                  </div>
                  <div className="progress-bar-wrapper" style={{ width: 160, marginBottom: 12 }}>
                    <div className="progress-bar" style={{ width: `${proj.overall_progress || 0}%` }} />
                  </div>

                  {nextState && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => advanceState(proj)}
                    >
                      {isRtl ? `نقل للمرحلة: ${nextStateInfo?.ar} ←` : `Advance: ${nextStateInfo?.en} →`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateProject}>
              <div className="modal-header">
                <h3>{isRtl ? 'إنشاء مشروع لوحة كهربائية جديد' : 'New Panel Project'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم العميل / المشروع' : 'Customer / Project'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'شركة الكهرباء السعودية' : 'Saudi Electricity Co.'}
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'الموقع الجغرافي / المحطة' : 'Site Location'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'محطة الرياض المركزية' : 'Riyadh Central Substation'}
                      value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })}
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
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'إنشاء وبدء المشروع' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
