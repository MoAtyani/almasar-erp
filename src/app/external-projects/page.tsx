'use client'
import { useEffect, useState, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { formatDate } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExternalProject {
  id: string
  reference: string
  name: string
  client_name: string
  description: string
  date_start: string
  date_delivery: string
  is_free: boolean
  quotation_amount: number
  quotation_saved: boolean
  sent_to_sales: boolean
  sent_to_production: boolean
  status: 'draft' | 'sent_sales' | 'sent_production' | 'sent_both'
  created_at: string
}

type NotificationTarget = 'sales' | 'tasks_production'

interface AlmasarNotification {
  id: string
  type: 'new_external_project'
  targetSection: NotificationTarget
  projectRef: string
  projectName: string
  createdAt: string
  read: boolean
  fromUser: string
}

interface UserProfile {
  full_name?: string
  full_name_ar?: string
  name?: string
  [key: string]: unknown
}

type FilterStatus = 'all' | 'draft' | 'sent_sales' | 'sent_production' | 'sent_both'

// ─── Storage helpers ──────────────────────────────────────────────────────────

const LS_KEY = 'almasar_external_projects'
const NOTIF_KEY = 'almasar_notifications'
const USER_KEY = 'almasar_user'

function loadProjects(): ExternalProject[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as ExternalProject[]) : []
  } catch {
    return []
  }
}

function saveProjects(projects: ExternalProject[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(projects))
}

function pushNotification(notif: AlmasarNotification) {
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    const existing: AlmasarNotification[] = raw ? JSON.parse(raw) : []
    existing.push(notif)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(existing))
  } catch {
    localStorage.setItem(NOTIF_KEY, JSON.stringify([notif]))
  }
}

function loadProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getProfileName(profile: UserProfile | null, isRtl: boolean): string {
  if (!profile) return 'Unknown'
  if (isRtl && profile.full_name_ar) return profile.full_name_ar as string
  return (profile.full_name || profile.name || 'Unknown') as string
}

function generateRef(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900 + 100)
  return `EXT-${year}${month}-${rand}`
}

// ─── Blank form state ─────────────────────────────────────────────────────────

interface FormState {
  reference: string
  name: string
  client_name: string
  description: string
  date_start: string
  date_delivery: string
  is_free: boolean
  quotation_amount: string
}

function blankForm(): FormState {
  const today = new Date().toISOString().split('T')[0]
  return {
    reference: generateRef(),
    name: '',
    client_name: '',
    description: '',
    date_start: today,
    date_delivery: '',
    is_free: false,
    quotation_amount: '',
  }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function computeStatus(
  saved: boolean,
  sentSales: boolean,
  sentProd: boolean
): ExternalProject['status'] {
  if (sentSales && sentProd) return 'sent_both'
  if (sentSales) return 'sent_sales'
  if (sentProd) return 'sent_production'
  return 'draft'
}

const STATUS_META: Record<
  ExternalProject['status'],
  { labelAr: string; labelEn: string; color: string; bg: string }
> = {
  draft: {
    labelAr: 'مسودة',
    labelEn: 'Draft',
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.12)',
  },
  sent_sales: {
    labelAr: 'أُرسل إلى المبيعات',
    labelEn: 'Sent to Sales',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
  },
  sent_production: {
    labelAr: 'أُرسل إلى مهام الإنتاج',
    labelEn: 'Sent to Production',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  sent_both: {
    labelAr: 'أُرسل إلى المبيعات والإنتاج',
    labelEn: 'Sent to Sales & Production',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExternalProjectsPage() {
  const { isRtl } = useLanguage()
  const { theme } = useTheme()

  const [projects, setProjects] = useState<ExternalProject[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(blankForm())
  const [savedId, setSavedId] = useState<string | null>(null)   // ID of the just-saved project (enables send btns)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<'sales' | 'production' | null>(null)

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Profile
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    setProjects(loadProjects())
    setProfile(loadProfile())
  }, [])

  // ── Derived KPIs ──────────────────────────────────────────────────────────
  const draftCount = projects.filter(p => p.status === 'draft').length
  const salesCount = projects.filter(p => p.status === 'sent_sales' || p.status === 'sent_both').length
  const prodCount  = projects.filter(p => p.status === 'sent_production' || p.status === 'sent_both').length

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.reference.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.client_name.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Open modal ────────────────────────────────────────────────────────────
  function openNewModal() {
    setForm(blankForm())
    setSavedId(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSavedId(null)
  }

  // ── Save quotation ────────────────────────────────────────────────────────
  function handleSave() {
    if (!form.name.trim()) {
      showToast(isRtl ? 'يرجى إدخال اسم المشروع' : 'Please enter project name', 'error')
      return
    }
    if (!form.client_name.trim()) {
      showToast(isRtl ? 'يرجى إدخال اسم العميل' : 'Please enter client name', 'error')
      return
    }

    setSaving(true)
    setTimeout(() => {
      const existing = loadProjects()
      const amount = form.is_free ? 0 : parseFloat(form.quotation_amount || '0') || 0

      let project: ExternalProject
      const existingIdx = savedId ? existing.findIndex(p => p.id === savedId) : -1

      if (existingIdx >= 0) {
        // Update existing
        project = {
          ...existing[existingIdx],
          reference: form.reference,
          name: form.name,
          client_name: form.client_name,
          description: form.description,
          date_start: form.date_start,
          date_delivery: form.date_delivery,
          is_free: form.is_free,
          quotation_amount: amount,
          quotation_saved: true,
        }
        existing[existingIdx] = project
      } else {
        // Create new
        project = {
          id: Date.now().toString(),
          reference: form.reference,
          name: form.name,
          client_name: form.client_name,
          description: form.description,
          date_start: form.date_start,
          date_delivery: form.date_delivery,
          is_free: form.is_free,
          quotation_amount: amount,
          quotation_saved: true,
          sent_to_sales: false,
          sent_to_production: false,
          status: 'draft',
          created_at: new Date().toISOString(),
        }
        existing.unshift(project)
      }

      saveProjects(existing)
      setProjects(existing)
      setSavedId(project.id)
      setSaving(false)
      showToast(isRtl ? 'تم حفظ عرض السعر بنجاح' : 'Quotation saved successfully')
    }, 300)
  }

  // ── Send notification ─────────────────────────────────────────────────────
  function handleSend(target: 'sales' | 'production') {
    if (!savedId) return
    const all = loadProjects()
    const idx = all.findIndex(p => p.id === savedId)
    if (idx < 0) return

    setSending(target)

    setTimeout(() => {
      const targetSection: NotificationTarget = target === 'sales' ? 'sales' : 'tasks_production'
      const p = all[idx]
      const fromUser = getProfileName(profile, isRtl)

      // Update project record
      const updatedSentSales = p.sent_to_sales || target === 'sales'
      const updatedSentProd  = p.sent_to_production || target === 'production'

      all[idx] = {
        ...p,
        sent_to_sales: updatedSentSales,
        sent_to_production: updatedSentProd,
        status: computeStatus(true, updatedSentSales, updatedSentProd),
      }
      saveProjects(all)
      setProjects([...all])

      // Push notification
      const notif: AlmasarNotification = {
        id: Date.now().toString(),
        type: 'new_external_project',
        targetSection,
        projectRef: p.reference,
        projectName: p.name,
        createdAt: new Date().toISOString(),
        read: false,
        fromUser,
      }
      pushNotification(notif)

      setSending(null)
      showToast(
        isRtl
          ? `تم الإرسال بنجاح إلى ${target === 'sales' ? 'المبيعات' : 'مهام الإنتاج'}`
          : `Sent successfully to ${target === 'sales' ? 'Sales' : 'Tasks & Production'}`
      )
    }, 400)
  }

  // ── Saved project (for send button state) ────────────────────────────────
  const savedProject = savedId ? projects.find(p => p.id === savedId) : null
  const canSendSales = !!savedId && !savedProject?.sent_to_sales
  const canSendProd  = !!savedId && !savedProject?.sent_to_production

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="External Projects" titleAr="المشاريع الخارجية">

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Draft */}
        <div className="kpi-card" style={{ borderTop: '3px solid #94a3b8' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
          <div className="kpi-value" style={{ color: '#94a3b8' }}>{draftCount}</div>
          <div className="kpi-label">{isRtl ? 'مسودة / قيد الإعداد' : 'Draft'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'عروض أسعار لم ترسل بعد' : 'Unsent quotations'}
          </div>
        </div>

        {/* Sent to Sales */}
        <div className="kpi-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>💼</div>
          <div className="kpi-value" style={{ color: '#3b82f6' }}>{salesCount}</div>
          <div className="kpi-label">{isRtl ? 'أُرسل إلى المبيعات' : 'Sent to Sales'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'مشاريع مُحالة لقسم المبيعات' : 'Forwarded to sales team'}
          </div>
        </div>

        {/* Sent to Production */}
        <div className="kpi-card" style={{ borderTop: '3px solid #10b981' }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🏭</div>
          <div className="kpi-value" style={{ color: '#10b981' }}>{prodCount}</div>
          <div className="kpi-label">{isRtl ? 'أُرسل إلى الإنتاج' : 'Sent to Production'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'مشاريع قيد مهام الإنتاج' : 'In production pipeline'}
          </div>
        </div>
      </div>

      {/* ── Filter / Search Bar ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <input
            className="input"
            style={{ flex: '1 1 260px', maxWidth: 380 }}
            placeholder={
              isRtl
                ? '...بحث بالمرجع، اسم المشروع، العميل'
                : 'Search reference, project, client...'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: 220, fontWeight: 600 }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="draft">{isRtl ? 'مسودة' : 'Draft'}</option>
              <option value="sent_sales">{isRtl ? 'أُرسل إلى المبيعات' : 'Sent to Sales'}</option>
              <option value="sent_production">{isRtl ? 'أُرسل إلى الإنتاج' : 'Sent to Production'}</option>
              <option value="sent_both">{isRtl ? 'أُرسل إلى الكليهما' : 'Sent to Both'}</option>
            </select>

            <button
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
              onClick={openNewModal}
            >
              ➕ {isRtl ? 'مشروع خارجي جديد' : 'New External Project'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Projects List ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🌐</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {isRtl ? 'لا توجد مشاريع خارجية مطابقة للبحث' : 'No external projects found'}
            </div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {isRtl
                ? 'اضغط "مشروع خارجي جديد" لإنشاء أول مشروع'
                : 'Click "New External Project" to create the first one'}
            </div>
          </div>
        )}

        {filtered.map(proj => {
          const meta = STATUS_META[proj.status]
          return (
            <div key={proj.id} className="card" style={{ padding: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                {/* Left / Main info */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--accent)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {proj.reference}
                    </span>

                    {/* Status pill */}
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        background: meta.bg,
                        color: meta.color,
                        border: `1px solid ${meta.color}55`,
                      }}
                    >
                      ● {isRtl ? meta.labelAr : meta.labelEn}
                    </span>

                    {proj.is_free && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          background: 'rgba(16,185,129,0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.3)',
                        }}
                      >
                        🎁 {isRtl ? 'مجاني' : 'Free'}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 4,
                    }}
                  >
                    {proj.name}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>
                      <strong>{isRtl ? 'العميل:' : 'Client:'}</strong> {proj.client_name}
                    </span>
                    {!proj.is_free && proj.quotation_amount > 0 && (
                      <span>
                        <strong>{isRtl ? 'قيمة العرض:' : 'Quotation:'}</strong>{' '}
                        {proj.quotation_amount.toLocaleString()} {isRtl ? 'د.أ' : 'JOD'}
                      </span>
                    )}
                  </div>

                  {proj.description && (
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        marginBottom: 8,
                        background: 'var(--bg-elevated)',
                        padding: '6px 10px',
                        borderRadius: 6,
                      }}
                    >
                      {proj.description}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: 16,
                      flexWrap: 'wrap',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>📅 {isRtl ? 'البدء:' : 'Start:'} {formatDate(proj.date_start)}</span>
                    {proj.date_delivery && (
                      <span>🚚 {isRtl ? 'التسليم:' : 'Delivery:'} {formatDate(proj.date_delivery)}</span>
                    )}
                    <span>
                      🕒 {isRtl ? 'الإنشاء:' : 'Created:'} {formatDate(proj.created_at)}
                    </span>
                  </div>
                </div>

                {/* Right / Send indicators */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 8,
                    minWidth: 180,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      marginBottom: 2,
                    }}
                  >
                    {isRtl ? 'حالة الإرسال:' : 'Send Status:'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: proj.sent_to_sales ? '#3b82f6' : 'var(--text-muted)',
                    }}
                  >
                    {proj.sent_to_sales ? '✅' : '⬜'}{' '}
                    {isRtl ? 'المبيعات' : 'Sales'}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: proj.sent_to_production ? '#10b981' : 'var(--text-muted)',
                    }}
                  >
                    {proj.sent_to_production ? '✅' : '⬜'}{' '}
                    {isRtl ? 'مهام الإنتاج' : 'Tasks & Production'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── New Project Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 28,
              borderRadius: 14,
              position: 'relative',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 22,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                  🌐 {isRtl ? 'مشروع خارجي جديد' : 'New External Project'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                  {isRtl ? 'عرض السعر / التسعيرة' : 'New Project Pricing / Quotation'}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px 8px',
                  borderRadius: 6,
                }}
              >
                ✕
              </button>
            </div>

            {/* Form grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

              {/* Reference # */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  {isRtl ? 'رقم المرجع *' : 'Reference # *'}
                </label>
                <input
                  className="input"
                  value={form.reference}
                  onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                  style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* Project Name */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  {isRtl ? 'اسم المشروع *' : 'Project Name *'}
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder={isRtl ? 'اسم المشروع الخارجي...' : 'External project name...'}
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Client Name */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  {isRtl ? 'اسم العميل *' : 'Client Name *'}
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder={isRtl ? 'اسم العميل أو الشركة...' : 'Client or company name...'}
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  {isRtl ? 'وصف المشروع' : 'Description'}
                </label>
                <textarea
                  className="input"
                  style={{ width: '100%', minHeight: 72, resize: 'vertical' }}
                  placeholder={isRtl ? 'وصف مختصر للمشروع أو الخدمة المطلوبة...' : 'Brief project description...'}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="form-label">
                  {isRtl ? 'تاريخ البداية' : 'Start Date'}
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={form.date_start}
                  onChange={e => setForm(f => ({ ...f, date_start: e.target.value }))}
                />
              </div>

              {/* Delivery Date */}
              <div>
                <label className="form-label">
                  {isRtl ? 'تاريخ التسليم' : 'Delivery Date'}
                </label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={form.date_delivery}
                  onChange={e => setForm(f => ({ ...f, date_delivery: e.target.value }))}
                />
              </div>

              {/* Free checkbox */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `1.5px solid ${form.is_free ? '#10b981' : 'var(--border)'}`,
                    background: form.is_free ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.is_free}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        is_free: e.target.checked,
                        quotation_amount: e.target.checked ? '0' : f.quotation_amount,
                      }))
                    }
                    style={{ width: 18, height: 18, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14, color: form.is_free ? '#10b981' : 'var(--text-primary)' }}>
                    🎁 {isRtl ? 'مجاني (Free of Charge)' : 'Free of Charge (مجاني)'}
                  </span>
                </label>
              </div>

              {/* Price input */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  {isRtl ? 'قيمة عرض السعر (JOD)' : 'Quotation Amount (JOD)'}
                </label>
                <input
                  type="number"
                  className="input"
                  style={{
                    width: '100%',
                    opacity: form.is_free ? 0.45 : 1,
                    cursor: form.is_free ? 'not-allowed' : 'text',
                    background: form.is_free ? 'var(--bg-elevated)' : undefined,
                  }}
                  disabled={form.is_free}
                  placeholder={form.is_free ? '0' : (isRtl ? 'أدخل قيمة عرض السعر...' : 'Enter quotation amount...')}
                  value={form.is_free ? '0' : form.quotation_amount}
                  onChange={e => setForm(f => ({ ...f, quotation_amount: e.target.value }))}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)', margin: '20px 0' }} />

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Save button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? (isRtl ? 'جاري الحفظ...' : 'Saving...')
                  : (isRtl ? '💾 حفظ عرض السعر' : '💾 Save Quotation')}
              </button>

              {/* Send buttons row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                {/* Send to Sales */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: canSendSales ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)',
                      color: canSendSales ? '#3b82f6' : 'var(--text-muted)',
                      border: canSendSales ? '1.5px solid #3b82f6' : '1.5px solid var(--border)',
                      cursor: canSendSales ? 'pointer' : 'not-allowed',
                      opacity: canSendSales ? 1 : 0.6,
                      transition: 'all 0.15s ease',
                    }}
                    disabled={!canSendSales || sending !== null}
                    onClick={() => handleSend('sales')}
                    title={
                      !savedId
                        ? (isRtl ? 'احفظ أولاً / Save first' : 'Save first / احفظ أولاً')
                        : savedProject?.sent_to_sales
                          ? (isRtl ? 'تم الإرسال مسبقاً' : 'Already sent')
                          : undefined
                    }
                  >
                    {sending === 'sales'
                      ? '...'
                      : (isRtl ? '🔵 إرسال إلى المبيعات' : '🔵 Send to Sales')}
                  </button>
                </div>

                {/* Send to Tasks & Production */}
                <div style={{ position: 'relative' }}>
                  <button
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: canSendProd ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
                      color: canSendProd ? '#10b981' : 'var(--text-muted)',
                      border: canSendProd ? '1.5px solid #10b981' : '1.5px solid var(--border)',
                      cursor: canSendProd ? 'pointer' : 'not-allowed',
                      opacity: canSendProd ? 1 : 0.6,
                      transition: 'all 0.15s ease',
                    }}
                    disabled={!canSendProd || sending !== null}
                    onClick={() => handleSend('production')}
                    title={
                      !savedId
                        ? (isRtl ? 'احفظ أولاً / Save first' : 'Save first / احفظ أولاً')
                        : savedProject?.sent_to_production
                          ? (isRtl ? 'تم الإرسال مسبقاً' : 'Already sent')
                          : undefined
                    }
                  >
                    {sending === 'production'
                      ? '...'
                      : (isRtl ? '🟢 إرسال إلى مهام الإنتاج' : '🟢 Send to Tasks & Production')}
                  </button>
                </div>
              </div>

              {/* Hint when not saved */}
              {!savedId && (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    padding: '6px 12px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 6,
                    border: '1px dashed var(--border)',
                  }}
                >
                  ℹ️ {isRtl
                    ? 'احفظ عرض السعر أولاً لتفعيل أزرار الإرسال'
                    : 'Save the quotation first to enable send buttons'}
                </div>
              )}

              {/* Close */}
              <button
                className="btn"
                style={{
                  width: '100%',
                  padding: '8px 0',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                }}
                onClick={closeModal}
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            padding: '12px 24px',
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            color: '#fff',
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.msg}
        </div>
      )}

    </AppLayout>
  )
}
