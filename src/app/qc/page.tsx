'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

export default function QCPage() {
  const { lang, isRtl } = useLanguage()
  const [inspections, setInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null)
  const [actionModal, setActionModal] = useState<{ id: string; decision: 'passed' | 'failed' } | null>(null)
  
  // Inspection decision form
  const [decisionForm, setDecisionForm] = useState({
    defect_category: 'Mechanical Clearance',
    defect_severity: 'major',
    notes: '',
    corrective_actions: ''
  })

  useEffect(() => {
    loadQCQueue()
  }, [departmentFilter, statusFilter])

  async function loadQCQueue() {
    setLoading(true)
    try {
      const url = `/api/qc?department=${departmentFilter}&status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setInspections(data.data)
      }
    } catch (err) {
      console.error('Failed to load QC inspections:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitDecision(e: React.FormEvent) {
    e.preventDefault()
    if (!actionModal) return

    try {
      const res = await fetch('/api/qc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: actionModal.id,
          decision: actionModal.decision,
          defect_category: actionModal.decision === 'failed' ? decisionForm.defect_category : null,
          defect_severity: actionModal.decision === 'failed' ? decisionForm.defect_severity : null,
          notes: decisionForm.notes,
          corrective_actions: actionModal.decision === 'failed' ? decisionForm.corrective_actions : null
        })
      })
      const data = await res.json()
      if (data.success) {
        setActionModal(null)
        setDecisionForm({
          defect_category: 'Mechanical Clearance',
          defect_severity: 'major',
          notes: '',
          corrective_actions: ''
        })
        loadQCQueue()
      } else {
        alert(data.error || 'Failed to submit decision')
      }
    } catch (err) {
      console.error('Error submitting QC decision:', err)
    }
  }

  const passedCount = inspections.filter(i => i.status === 'passed').length
  const failedCount = inspections.filter(i => i.status === 'failed').length
  const pendingCount = inspections.filter(i => i.status === 'pending').length

  const DEPT_NAMES: Record<string, { en: string; ar: string }> = {
    factory_a: { en: 'Factory A (Metal)', ar: 'مصنع أ (الصاج)' },
    factory_b: { en: 'Factory B (Batches)', ar: 'مصنع ب (الدفعات)' },
    electrical: { en: 'Electrical (Busbar/Wires)', ar: 'الكهرباء والتجميع' },
    painting: { en: 'Painting Shop', ar: 'قسم الدهان الحراري' },
    assembly: { en: 'Final Assembly', ar: 'التجميع النهائي' },
    final_inspection: { en: 'Final FAT Testing', ar: 'الفحص النهائي والتسليم' }
  }

  return (
    <AppLayout
      title="Quality Control (QC) & FAT Inspection Queue"
      titleAr="طابور فحص وضبط الجودة واختبارات القبول المصنعي (FAT)"
    >
      {/* KPI Overview */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🔍</div>
          <div className="kpi-value">{inspections.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي الفحوصات' : 'Total Inspections'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{pendingCount}</div>
          <div className="kpi-label">{isRtl ? 'بانتظار الفحص والاعتماد' : 'Pending Verification'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✓</div>
          <div className="kpi-value">{passedCount}</div>
          <div className="kpi-label">{isRtl ? 'مطابق ومعتمد (FAT Passed)' : 'Passed & Certified'}</div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚠️</div>
          <div className="kpi-value">{failedCount}</div>
          <div className="kpi-label">{isRtl ? 'مرفوض / مطلوب إعادة عمل' : 'Failed / Rework Required'}</div>
        </div>
      </div>

      {/* Filter Bar with Queue Filters per Workflow 1.6 */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'طابور الفحص حسب القسم:' : 'QC Queue Filter:'}</span>
            <select
              className="input"
              style={{ width: 220 }}
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
            >
              <option value="all">{isRtl ? 'جميع الأقسام' : 'All Departments'}</option>
              <option value="factory_a">{isRtl ? 'مصنع أ (أعمال الصاج)' : 'Factory A (Metal)'}</option>
              <option value="factory_b">{isRtl ? 'مصنع ب (اللوحات النمطية)' : 'Factory B (Panels)'}</option>
              <option value="painting">{isRtl ? 'قسم الدهان والطلاء' : 'Painting Shop'}</option>
              <option value="electrical">{isRtl ? 'قسم الكهرباء والأسلاك' : 'Electrical & Wiring'}</option>
              <option value="assembly">{isRtl ? 'التجميع والتركيب' : 'Assembly'}</option>
              <option value="final_inspection">{isRtl ? 'الفحص النهائي (FAT)' : 'Final Inspection (FAT)'}</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'حالة الفحص:' : 'Status:'}</span>
            <select
              className="input"
              style={{ width: 170 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="pending">{isRtl ? 'بانتظار الفحص' : 'Pending'}</option>
              <option value="passed">{isRtl ? 'معتمد / مطابق' : 'Passed'}</option>
              <option value="failed">{isRtl ? 'مرفوض / إعادة عمل' : 'Failed / Rework'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* QC Queue Table */}
      <div className="card" style={{ padding: 20 }}>
        {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>{isRtl ? 'جاري تحميل الفحوصات...' : 'Loading inspections...'}</div>}

        {!loading && inspections.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            {isRtl ? 'لا توجد فحوصات معلقة في هذا الطابور.' : 'No inspection records in this queue.'}
          </div>
        )}

        {!loading && inspections.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الفحص' : 'Inspection #'}</th>
                  <th>{isRtl ? 'القسم المستهدف' : 'Department'}</th>
                  <th>{isRtl ? 'أمر التشغيل / المشروع' : 'Order / Project'}</th>
                  <th>{isRtl ? 'الحالة' : 'Result'}</th>
                  <th>{isRtl ? 'الفاحص المسؤول' : 'Inspector'}</th>
                  <th>{isRtl ? 'تاريخ الفحص والملاحظات' : 'Date & Notes'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map(insp => {
                  const dept = DEPT_NAMES[insp.department] || { en: insp.department, ar: insp.department }
                  return (
                    <tr key={insp.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{insp.inspection_number}</td>
                      <td>
                        <span className="badge badge-subtle">{isRtl ? dept.ar : dept.en}</span>
                      </td>
                      <td>
                        <div><strong>{insp.order_number || insp.batch_number || 'Direct Inspection'}</strong></div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {insp.project_reference ? `${insp.project_reference} - ${insp.project_name}` : insp.item_description || '-'}
                        </div>
                      </td>
                      <td>
                        <span
                          className="state-pill"
                          style={{
                            background: insp.status === 'passed' ? '#10b98122' : insp.status === 'failed' ? '#ef444422' : '#f59e0b22',
                            color: insp.status === 'passed' ? '#10b981' : insp.status === 'failed' ? '#ef4444' : '#f59e0b',
                            border: `1px solid ${insp.status === 'passed' ? '#10b98144' : insp.status === 'failed' ? '#ef444444' : '#f59e0b44'}`
                          }}
                        >
                          {insp.status === 'passed' ? (isRtl ? 'مطابق / معتمد ✓' : 'PASSED') :
                           insp.status === 'failed' ? (isRtl ? 'مرفوض ⚠️' : 'FAILED') :
                           (isRtl ? 'قيد الانتظار ⏳' : 'PENDING')}
                        </span>
                      </td>
                      <td>{insp.inspector_name || (isRtl ? 'فاحص الجودة المعتمد' : 'QC Lead')}</td>
                      <td style={{ maxWidth: 260 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(insp.created_at)}</div>
                        <div style={{ fontSize: 13, marginTop: 2 }}>{insp.notes || '-'}</div>
                        {insp.defect_category && (
                          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                            ⚠️ {insp.defect_category} ({insp.defect_severity})
                          </div>
                        )}
                      </td>
                      <td>
                        {insp.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-xs btn-success"
                              onClick={() => setActionModal({ id: insp.id, decision: 'passed' })}
                            >
                              ✓ {isRtl ? 'اعتماد' : 'Pass'}
                            </button>
                            <button
                              className="btn btn-xs btn-danger"
                              onClick={() => setActionModal({ id: insp.id, decision: 'failed' })}
                            >
                              ✕ {isRtl ? 'رفض' : 'Fail'}
                            </button>
                          </div>
                        ) : insp.status === 'failed' ? (
                          <button
                            className="btn btn-xs btn-primary"
                            onClick={() => setActionModal({ id: insp.id, decision: 'passed' })}
                          >
                            🔄 {isRtl ? 'إعادة الفحص والاعتماد' : 'Reinspect'}
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: '#10b981' }}>✓ {isRtl ? 'معتمد' : 'Verified'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {actionModal && (
        <div className="modal-backdrop" onClick={() => setActionModal(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmitDecision}>
              <div className="modal-header">
                <h3>
                  {actionModal.decision === 'passed' ? (isRtl ? 'اعتماد فحص الجودة' : 'Approve QC Inspection') :
                   (isRtl ? 'تسجيل رفض الفحص وإعادة العمل' : 'Reject QC & Assign Rework')}
                </h3>
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                {actionModal.decision === 'failed' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label className="label">{isRtl ? 'تصنيف العيب' : 'Defect Category'}</label>
                        <select
                          className="input"
                          value={decisionForm.defect_category}
                          onChange={e => setDecisionForm({ ...decisionForm, defect_category: e.target.value })}
                        >
                          <option value="Mechanical Clearance">{isRtl ? 'خلوص ميكانيكي وصاج' : 'Mechanical Clearance'}</option>
                          <option value="Dielectric Breakdown">{isRtl ? 'عزل كهربائي وانهيار جهد' : 'Dielectric Breakdown'}</option>
                          <option value="Paint Thickness / Adhesion">{isRtl ? 'سماكة الدهان والتصاق البودرة' : 'Paint Thickness'}</option>
                          <option value="Busbar Torque / Tightening">{isRtl ? 'عزم شد البسبار والبراغي' : 'Busbar Torque'}</option>
                          <option value="Wiring Labeling / Ferrules">{isRtl ? 'ترقيم الأسلاك والنهايات' : 'Wiring Labeling'}</option>
                          <option value="Component Specification Mismatch">{isRtl ? 'مخالفة لمواصفات القواطع' : 'Spec Mismatch'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">{isRtl ? 'مستوى خطورة العيب' : 'Defect Severity'}</label>
                        <select
                          className="input"
                          value={decisionForm.defect_severity}
                          onChange={e => setDecisionForm({ ...decisionForm, defect_severity: e.target.value })}
                        >
                          <option value="minor">{isRtl ? 'بسيط (Minor)' : 'Minor'}</option>
                          <option value="major">{isRtl ? 'متوسط / هام (Major)' : 'Major'}</option>
                          <option value="critical">{isRtl ? 'حرج يمنع التسليم (Critical)' : 'Critical'}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="label">{isRtl ? 'الإجراءات التصحيحية المطلوبة من فريق الإنتاج' : 'Required Corrective Action'}</label>
                      <textarea
                        required
                        rows={2}
                        className="input"
                        placeholder={isRtl ? 'إعادة تثبيت البسبار وتعديل العوازل وإعادة الشد بمفتاح العزم 45 Nm...' : 'Re-adjust busbar clearance and re-torque to 45 Nm...'}
                        value={decisionForm.corrective_actions}
                        onChange={e => setDecisionForm({ ...decisionForm, corrective_actions: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="label">{isRtl ? 'تقرير الفاحص وملاحظات الاختبار' : 'Inspection Notes & Test Summary'}</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder={actionModal.decision === 'passed' ? 
                      (isRtl ? 'اجتياز اختبار الجهد العالي 2.5 kV والمطابقة التامة للمخططات المعتمدة.' : 'Passed 2.5kV HV dielectric test, zero breakdown.') :
                      (isRtl ? 'تم الرفض لعدم المطابقة للمواصفات الفنية.' : 'Rejected due to non-conformity.')}
                    value={decisionForm.notes}
                    onChange={e => setDecisionForm({ ...decisionForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`btn ${actionModal.decision === 'passed' ? 'btn-success' : 'btn-danger'}`}
                >
                  {actionModal.decision === 'passed' ? (isRtl ? 'تأكيد الاعتماد' : 'Confirm Approval') :
                   (isRtl ? 'تأكيد الرفض والإرسال لإعادة العمل' : 'Confirm Rejection & Rework')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
