'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { PanelProject } from '@/lib/types'
import { formatDate } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

type DepartmentType = 'iron' | 'hangar' | 'electrical' | 'misc' | 'all'

const DEPARTMENT_OPTIONS: { id: 'iron' | 'hangar' | 'electrical' | 'misc'; labelAr: string; labelEn: string; icon: string; color: string }[] = [
  { id: 'iron', labelAr: 'مشاريع الحديد', labelEn: 'Iron Projects', icon: '🔩', color: '#f59e0b' },
  { id: 'hangar', labelAr: 'مشاريع الهنجر', labelEn: 'Hangar Projects', icon: '🏭', color: '#06b6d4' },
  { id: 'electrical', labelAr: 'مشاريع الكهرباء والتجميع', labelEn: 'Electrical & Assembly Projects', icon: '⚡', color: '#8b5cf6' },
  { id: 'misc', labelAr: 'متفرقات', labelEn: 'Miscellaneous', icon: '📦', color: '#ec4899' },
]

const PROJECT_STAGES = [
  { id: 'under_manufacturing', ar: 'قيد التصنيع', en: 'Under Manufacturing', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { id: 'ready_for_delivery', ar: 'جاهز للتسليم', en: 'Ready for Delivery', color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)' },
  { id: 'delivered', ar: 'تم التسليم', en: 'Delivered', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' }
]

export default function ProjectsPage() {
  const { lang, isRtl } = useLanguage()
  const [projects, setProjects] = useState<PanelProject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<DepartmentType>('all')

  useEffect(() => {
    loadProjects()
  }, [filterDepartment])

  async function loadProjects() {
    setLoading(true)
    try {
      const url = `/api/projects?department=${filterDepartment}&search=${encodeURIComponent(search)}`
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

  async function handleSetProjectStage(proj: PanelProject, newStage: string) {
    try {
      await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proj.id,
          state: newStage
        })
      })
      setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, state: newStage as any } : p))
    } catch (e) {
      console.error('Error updating project stage:', e)
    }
  }

  const safeProjects = Array.isArray(projects) ? projects : []
  const filtered = safeProjects.filter(p => {
    if (!p) return false
    const ref = (p.reference || '').toLowerCase()
    const cust = (p.customer_name || '').toLowerCase()
    const comp = ((p as any).company || '').toLowerCase()
    const name = (p.name || '').toLowerCase()
    const jo = (p.job_order_number || '').toLowerCase()
    const q = (search || '').toLowerCase()
    const matchSearch = !q || ref.includes(q) || cust.includes(q) || comp.includes(q) || name.includes(q) || jo.includes(q)

    let matchDept = true
    if (filterDepartment !== 'all') {
      const pDept = (p as any).department || 'iron'
      matchDept = pDept === filterDepartment
    }
    return matchSearch && matchDept
  })

  // KPIs for the 3 active states
  const underMfgCount = safeProjects.filter(p => {
    const st = (p.state as string) || ''
    return !st || st === 'under_manufacturing' || st === 'new' || st === 'in_progress' || st === 'planning' || st === 'production'
  }).length
  const readyDeliveryCount = safeProjects.filter(p => (p.state as string) === 'ready_for_delivery').length
  const deliveredCount = safeProjects.filter(p => (p.state as string) === 'delivered' || (p.state as string) === 'done').length

  return (
    <AppLayout
      title="Al-Masar Projects"
      titleAr="مشاريع المسار"
      actions={undefined}
    >
      {/* 3 Active Stages KPI Grid */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⚙️</div>
          <div className="kpi-value">{underMfgCount}</div>
          <div className="kpi-label">{isRtl ? 'قيد التصنيع' : 'Under Manufacturing'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'المشاريع الجاري تصنيعها في صالات المصنع' : 'Active factory manufacturing line'}
          </div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon info-bg">🚚</div>
          <div className="kpi-value">{readyDeliveryCount}</div>
          <div className="kpi-label">{isRtl ? 'جاهز للتسليم' : 'Ready for Delivery'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'لوحات مجتازة للفحص وبانتظار الشحن والتسليم' : 'QC passed, waiting for handover'}
          </div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✅</div>
          <div className="kpi-value">{deliveredCount}</div>
          <div className="kpi-label">{isRtl ? 'تم التسليم' : 'Delivered'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'المشاريع المسلمة للمواقع والعملاء' : 'Successfully completed and handed over'}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <input
            className="input"
            style={{ width: 340 }}
            placeholder={isRtl ? '...بحث بالمرجع، اسم المشروع، العميل، الشركة' : 'Search reference, project, client...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{isRtl ? 'المراحل والأقسام:' : 'Department / Stage:'}</span>
            <select
              className="input"
              style={{ width: 240, fontWeight: 600 }}
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value as any)}
            >
              <option value="all">{isRtl ? 'جميع المراحل (الأقسام)' : 'All Stages (Departments)'}</option>
              <option value="iron">{isRtl ? '1- مشاريع الحديد' : '1- Iron Projects'}</option>
              <option value="hangar">{isRtl ? '2- مشاريع الهنجر' : '2- Hangar Projects'}</option>
              <option value="electrical">{isRtl ? '3- مشاريع الكهرباء والتجميع' : '3- Electrical & Assembly'}</option>
              <option value="misc">{isRtl ? '4- متفرقات' : '4- Miscellaneous'}</option>
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
          // Normalize to one of the 3 active states
          let currentStage = PROJECT_STAGES.find(s => s.id === proj.state)
          if (!currentStage) {
            currentStage = PROJECT_STAGES[0] // Default: قيد التصنيع
          }

          const deptKey = (proj as any).department || 'iron'
          const deptInfo = DEPARTMENT_OPTIONS.find(d => d.id === deptKey) || DEPARTMENT_OPTIONS[0]

          return (
            <div key={proj.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
                      {proj.reference}
                    </span>

                    {/* Department badge */}
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        background: `${deptInfo.color}18`,
                        color: deptInfo.color,
                        border: `1px solid ${deptInfo.color}44`
                      }}
                    >
                      {deptInfo.icon} {isRtl ? deptInfo.labelAr : deptInfo.labelEn}
                    </span>

                    {/* Active State Pill */}
                    <span
                      className="state-pill"
                      style={{
                        background: currentStage.bg,
                        color: currentStage.color,
                        border: `1px solid ${currentStage.color}55`,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12
                      }}
                    >
                      ● {isRtl ? currentStage.ar : currentStage.en}
                    </span>

                    {proj.job_order_number && (
                      <span className="badge badge-subtle">{proj.job_order_number}</span>
                    )}
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {proj.name}
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span><strong>{isRtl ? 'العميل:' : 'Customer:'}</strong> {proj.customer_name}</span>
                    {(proj as any).company && (proj as any).company !== proj.customer_name && (
                      <span><strong>{isRtl ? 'الشركة / المؤسسة:' : 'Company:'}</strong> {(proj as any).company}</span>
                    )}
                  </div>

                  {proj.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: 6 }}>
                      {proj.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>📅 {isRtl ? 'البدء:' : 'Start:'} {formatDate(proj.date_start)}</span>
                    {proj.date_delivery && <span>🚚 {isRtl ? 'التسليم:' : 'Delivery:'} {formatDate(proj.date_delivery)}</span>}
                    {(proj as any).customer_phone && <span>📞 {(proj as any).customer_phone}</span>}
                  </div>
                </div>

                {/* 3 Active Status Badges / Buttons (قيد التصنيع ، جاهز للتسليم ، تم التسليم) */}
                <div style={{ textAlign: isRtl ? 'left' : 'right', minWidth: 280, display: 'flex', flexDirection: 'column', alignItems: isRtl ? 'flex-start' : 'flex-end', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {isRtl ? 'حالة إنجاز المشروع:' : 'Project Active Status:'}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {PROJECT_STAGES.map(st => {
                      const stState = (proj.state as string) || ''
                      const isActive = (stState === st.id) || (st.id === 'under_manufacturing' && (!stState || stState === 'new' || stState === 'planning' || stState === 'in_progress' || stState === 'production'))
                      return (
                        <button
                          key={st.id}
                          type="button"
                          className="btn btn-sm"
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 6,
                            background: isActive ? st.bg : 'var(--bg-base)',
                            color: isActive ? st.color : 'var(--text-muted)',
                            border: isActive ? `2px solid ${st.color}` : '1px solid var(--border)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => handleSetProjectStage(proj, st.id)}
                        >
                          {isActive ? '● ' : ''}{isRtl ? st.ar : st.en}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </AppLayout>
  )
}
