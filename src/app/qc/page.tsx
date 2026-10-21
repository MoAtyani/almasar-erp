'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { QC_RESULT_LABELS, formatDate } from '@/lib/constants'
import { QcResult } from '@/lib/types'
import { useLanguage } from '@/context/LanguageContext'

const MOCK_QC_CHECKS = [
  {
    id: 'qc-1',
    reference: 'QC/2026/041',
    project: { reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co. (SEC)' },
    inspector: { full_name: 'Hassan Al-Otaibi (حسن العتيبي)' },
    result: 'passed' as QcResult,
    inspection_date: '2026-10-18',
    fat_passed: true,
    notes: 'Dielectric High Voltage Test 2.5 kV for 60s passed with zero breakdown. Insulation resistance > 200 MΩ.',
  },
  {
    id: 'qc-2',
    reference: 'QC/2026/042',
    project: { reference: 'PJ-2026-002', customer_name: 'Al-Bawani Contracting' },
    inspector: { full_name: 'Hassan Al-Otaibi' },
    result: 'passed' as QcResult,
    inspection_date: '2026-10-19',
    fat_passed: true,
    notes: 'Secondary injection test for ABB thermal overload protection relay curve verified.',
  },
  {
    id: 'qc-3',
    reference: 'QC/2026/043',
    project: { reference: 'PJ-2026-004', customer_name: 'Nesma Infrastructure' },
    inspector: { full_name: 'Hassan Al-Otaibi' },
    result: 'pending' as QcResult,
    inspection_date: '2026-10-22',
    fat_passed: false,
    notes: 'Scheduled for busbar torque verification (45 Nm) and phase clearance check.',
  },
]

export default function QCPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [checks, setChecks] = useState<any[]>(MOCK_QC_CHECKS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ project_id: '', notes: '', inspection_date: new Date().toISOString().split('T')[0] })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const { data } = await supabase.from('qc_checks').select('*, project:panel_projects(reference,customer_name), inspector:profiles(full_name)').order('created_at', { ascending: false })
      if (data && data.length > 0) setChecks(data as any)
    } catch {}
  }

  function handleUpdateResult(id: string, result: QcResult) {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, result, fat_passed: result === 'passed' } : c))
  }

  function handleCreateQc(e: React.FormEvent) {
    e.preventDefault()
    const newQc = {
      id: `qc-${Date.now()}`,
      reference: `QC/2026/0${40 + checks.length + 1}`,
      project: { reference: 'PJ-2026-001', customer_name: 'Saudi Electricity Co.' },
      inspector: { full_name: 'Hassan Al-Otaibi' },
      result: 'pending' as QcResult,
      inspection_date: form.inspection_date,
      fat_passed: false,
      notes: form.notes || 'Routine factory acceptance verification',
    }
    setChecks([newQc, ...checks])
    setShowModal(false)
    setForm({ project_id: '', notes: '', inspection_date: new Date().toISOString().split('T')[0] })
  }

  const passedCount = checks.filter(c => c.result === 'passed').length
  const pendingCount = checks.filter(c => c.result === 'pending').length
  const failedCount = checks.filter(c => c.result === 'failed').length

  return (
    <AppLayout
      title="Quality Control & FAT Inspection"
      titleAr="ضبط الجودة والفحص المصنعي (FAT)"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ فحص جودة جديد (QC)' : '+ New QC Check'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🔍</div>
          <div className="kpi-value">{checks.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي فحوصات الجودة' : 'Total Inspections'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{pendingCount}</div>
          <div className="kpi-label">{isRtl ? 'فحوصات قيد الانتظار' : 'Pending Inspections'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✅</div>
          <div className="kpi-value">{passedCount}</div>
          <div className="kpi-label">{isRtl ? 'فحوصات ناجحة معتمدة' : 'Passed (FAT Approved)'}</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">❌</div>
          <div className="kpi-value">{failedCount}</div>
          <div className="kpi-label">{isRtl ? 'فحوصات بها ملاحظات' : 'Failed / Rejected'}</div>
        </div>
      </div>

      {/* QC Checks Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {checks.map(check => {
          const info = QC_RESULT_LABELS[check.result as QcResult] || { en: check.result, ar: check.result, color: '#f59e0b' }
          return (
            <div key={check.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{check.reference}</span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: `${info.color}22`,
                        color: info.color,
                        border: `1px solid ${info.color}55`,
                      }}
                    >
                      {info[lang] || info.en}
                    </span>
                    {check.fat_passed && (
                      <span className="badge" style={{ backgroundColor: '#22c55e22', color: '#22c55e' }}>
                        📜 {isRtl ? 'شهادة FAT معتمدة' : 'FAT Certified'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {isRtl ? 'مشروع:' : 'Project:'} {check.project?.reference} — {check.project?.customer_name}
                  </div>

                  {check.notes && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, background: 'var(--bg-surface)', padding: 10, borderRadius: 6 }}>
                      {check.notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>👨‍🔬 {isRtl ? 'مفتش الجودة:' : 'Inspector:'} {check.inspector?.full_name}</span>
                    <span>📅 {isRtl ? 'تاريخ الفحص:' : 'Inspection Date:'} {formatDate(check.inspection_date)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {check.result !== 'passed' && (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleUpdateResult(check.id, 'passed')}
                    >
                      ✓ {isRtl ? 'اعتماد النجاح و FAT' : 'Approve & Pass FAT'}
                    </button>
                  )}
                  {check.result !== 'failed' && (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleUpdateResult(check.id, 'failed')}
                    >
                      ✕ {isRtl ? 'تسجيل ملاحظة / رفض' : 'Reject'}
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
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateQc}>
              <div className="modal-header">
                <h3>{isRtl ? 'جدولة فحص جودة واختبار FAT جديد' : 'New Quality Control Inspection'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'المشروع المراد فحصه' : 'Project'}</label>
                  <input
                    type="text"
                    className="input"
                    readOnly
                    value="PJ-2026-001 (Saudi Electricity Co.)"
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'تاريخ الفحص المخطط' : 'Scheduled Date'}</label>
                  <input
                    type="date"
                    className="input"
                    value={form.inspection_date}
                    onChange={e => setForm({ ...form, inspection_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">{isRtl ? 'معايير الفحص والاختبار' : 'Inspection Scope & Criteria'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder={isRtl ? 'اختبار العزل الكهربائي، قياس عزم مسامير البسبار، فحص عمل القواطع...' : 'Insulation test, busbar torque audit, breaker tripping...'}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'جدولة الفحص' : 'Schedule Check'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
