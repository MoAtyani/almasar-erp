'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

export default function QCPage() {
  const { lang, isRtl } = useLanguage()
  const [inspections, setInspections] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [actionModal, setActionModal] = useState<{ id: string; decision: 'passed' | 'failed' } | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  // Inspection decision form (Approve / Reject)
  const [decisionForm, setDecisionForm] = useState({
    defect_category: 'Mechanical Clearance',
    defect_severity: 'major',
    notes: '',
    corrective_actions: ''
  })

  // New Inspection Form
  const [newForm, setNewForm] = useState({
    project_id: '',
    department: 'iron',
    status: 'pending',
    notes: '',
    inspector_name: 'م. يوسف بصبوص'
  })

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    loadQCInspections()
  }, [departmentFilter, statusFilter, projectFilter])

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects').then(r => r.json())
      if (res.success && res.data) {
        setProjects(res.data)
        if (res.data.length > 0 && !newForm.project_id) {
          const firstProj = res.data[0]
          setNewForm(f => ({
            ...f,
            project_id: firstProj.id,
            department: firstProj.department || 'iron'
          }))
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  async function loadQCInspections() {
    setLoading(true)
    try {
      let url = `/api/qc?department=${departmentFilter}&status=${statusFilter}`
      if (projectFilter !== 'all') {
        url += `&project_id=${projectFilter}`
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`
      }
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setInspections(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load QC inspections:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle Search on Enter or Click
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadQCInspections()
  }

  // Submit Inspection Decision (Pass / Fail)
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
        loadQCInspections()
      } else {
        alert(data.error || 'Failed to submit decision')
      }
    } catch (err) {
      console.error('Error submitting QC decision:', err)
    }
  }

  // Submit New Inspection
  async function handleCreateInspection(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.project_id) {
      alert(isRtl ? 'يرجى تحديد المشروع أولاً' : 'Please select a project first')
      return
    }

    try {
      const selectedProj = projects.find(p => p.id === newForm.project_id)
      const res = await fetch('/api/qc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: newForm.project_id,
          department: newForm.department,
          status: newForm.status,
          notes: newForm.notes || (selectedProj ? `فحص جودة لمشروع ${selectedProj.name} (${selectedProj.reference})` : 'فحص جودة'),
          checklists: [
            { item: 'المطابقة للمخططات الهندسية', checked: true },
            { item: 'جودة اللحام والتشطيب والدهان', checked: true },
            { item: 'الفحص الميكانيكي وأبعاد القواطع', checked: true }
          ]
        })
      })
      const data = await res.json()
      if (data.success) {
        setShowNewModal(false)
        setNewForm(f => ({ ...f, notes: '' }))
        loadQCInspections()
      } else {
        alert(data.error || 'Failed to create inspection')
      }
    } catch (err) {
      console.error('Error creating inspection:', err)
    }
  }

  const passedCount = inspections.filter(i => i.status === 'passed').length
  const failedCount = inspections.filter(i => i.status === 'failed').length
  const pendingCount = inspections.filter(i => i.status === 'pending').length

  const DEPT_NAMES: Record<string, { en: string; ar: string }> = {
    iron: { en: 'Iron Department', ar: 'قسم الحديد' },
    hangar: { en: 'Hangar Department', ar: 'قسم الهنجر' },
    electrical: { en: 'Electrical & Assembly', ar: 'قسم الكهرباء والتجميع' },
    // Legacy fallbacks for historical records
    factory_a: { en: 'Iron Department', ar: 'قسم الحديد' },
    factory_b: { en: 'Hangar Department', ar: 'قسم الهنجر' },
    painting: { en: 'Painting Phase', ar: 'مرحلة الطلاء' },
    assembly: { en: 'Electrical & Assembly', ar: 'قسم الكهرباء والتجميع' },
    final_inspection: { en: 'Final Inspection', ar: 'الفحص النهائي' }
  }

  // Selected project details in modal
  const selectedModalProject = projects.find(p => p.id === newForm.project_id)

  return (
    <AppLayout
      title="Quality Control (QC) & FAT Inspections"
      titleAr="فحص وضبط الجودة واختبارات القبول المصنعي (FAT)"
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

      {/* Filter Bar with Inspection Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            
            {/* 1. Department Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {isRtl ? 'الفحص حسب القسم:' : 'Inspection by Department:'}
              </span>
              <select
                className="input"
                style={{ width: 200 }}
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
              >
                <option value="all">{isRtl ? 'جميع الأقسام' : 'All Departments'}</option>
                <option value="iron">{isRtl ? '1- قسم الحديد' : '1- Iron Department'}</option>
                <option value="hangar">{isRtl ? '2- قسم الهنجر' : '2- Hangar Department'}</option>
                <option value="electrical">{isRtl ? '3- قسم الكهرباء والتجميع' : '3- Electrical & Assembly'}</option>
              </select>
            </div>

            {/* 2. Project Selector Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {isRtl ? 'تحديد المشروع:' : 'Select Project:'}
              </span>
              <select
                className="input"
                style={{ maxWidth: 260 }}
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
              >
                <option value="all">{isRtl ? 'جميع المشاريع' : 'All Projects'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.reference} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{isRtl ? 'الحالة:' : 'Status:'}</span>
              <select
                className="input"
                style={{ width: 150 }}
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

          {/* Action: Add New Project Inspection */}
          <div>
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
              onClick={() => setShowNewModal(true)}
            >
              <span>+</span>
              <span>{isRtl ? 'فحص مشروع جديد' : 'New Project Inspection'}</span>
            </button>
          </div>
        </div>

        {/* Quick Search Row */}
        <form onSubmit={handleSearchSubmit} style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1, maxWidth: 420 }}
            placeholder={isRtl ? 'بحث سريع برقم المرجع، اسم المشروع، أو رقم الفحص...' : 'Quick search by Project Ref, Name, or Inspection #...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            🔍 {isRtl ? 'بحث' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => { setSearchQuery(''); loadQCInspections(); }}
            >
              {isRtl ? 'مسح' : 'Clear'}
            </button>
          )}
        </form>
      </div>

      {/* QC Inspections Table */}
      <div className="card" style={{ padding: 20 }}>
        {loading && <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>{isRtl ? 'جاري تحميل سجلات الفحص...' : 'Loading inspections...'}</div>}

        {!loading && inspections.length === 0 && (
          <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
            {isRtl ? 'لا توجد فحوصات مسجلة في هذا القسم أو المشروع.' : 'No inspection records found for this selection.'}
          </div>
        )}

        {!loading && inspections.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{isRtl ? 'رقم الفحص' : 'Inspection #'}</th>
                  <th>{isRtl ? 'القسم المستهدف' : 'Department'}</th>
                  <th>{isRtl ? 'رقم المرجع واسم المشروع' : 'Project Ref & Name'}</th>
                  <th>{isRtl ? 'الشركة / المؤسسة' : 'Company'}</th>
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
                        <div style={{ fontWeight: 600 }}>
                          {insp.project_reference ? `${insp.project_reference} - ${insp.project_name}` : insp.order_number || insp.item_description || '-'}
                        </div>
                        {insp.item_description && insp.project_name && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {insp.item_description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {insp.project_company || '-'}
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
                      <td>{insp.inspector_name || (isRtl ? 'م. يوسف بصبوص' : 'Eng. Yousef Basbous')}</td>
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

      {/* Modal: Schedule / Create New Project Inspection */}
      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateInspection}>
              <div className="modal-header">
                <h3>{isRtl ? 'تحديد فحص مشروع جديد' : 'New Project QC Inspection'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>✕</button>
              </div>

              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                {/* 1. Select Project by Ref & Name */}
                <div>
                  <label className="label">
                    {isRtl ? 'المشروع (رقم المرجع واسم المشروع) *' : 'Project (Reference & Name) *'}
                  </label>
                  <select
                    required
                    className="input"
                    value={newForm.project_id}
                    onChange={e => {
                      const prjId = e.target.value
                      const prj = projects.find(p => p.id === prjId)
                      setNewForm(f => ({
                        ...f,
                        project_id: prjId,
                        department: prj?.department || f.department
                      }))
                    }}
                  >
                    <option value="">{isRtl ? '-- اختر المشروع --' : '-- Select Project --'}</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.reference} - {p.name} {p.company ? `(${p.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Previous Details Card if Project Selected */}
                {selectedModalProject && (
                  <div style={{
                    padding: 12,
                    background: 'var(--bg-card-subtle, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 13
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                      <div><strong>{isRtl ? 'رقم المرجع:' : 'Ref:'}</strong> {selectedModalProject.reference}</div>
                      <div><strong>{isRtl ? 'اسم المشروع:' : 'Project:'}</strong> {selectedModalProject.name}</div>
                      <div><strong>{isRtl ? 'الشركة / المؤسسة:' : 'Company:'}</strong> {selectedModalProject.company || '-'}</div>
                      <div><strong>{isRtl ? 'القسم المسجل:' : 'Dept:'}</strong> {DEPT_NAMES[selectedModalProject.department]?.ar || selectedModalProject.department || '-'}</div>
                    </div>
                    {selectedModalProject.panel_specs && (
                      <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                        <strong>{isRtl ? 'تفاصيل وملاحظات المشروع السابقة:' : 'Details:'}</strong> {selectedModalProject.panel_specs}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Target Department */}
                <div>
                  <label className="label">
                    {isRtl ? 'القسم المطلوب فحصه *' : 'Department for Inspection *'}
                  </label>
                  <select
                    required
                    className="input"
                    value={newForm.department}
                    onChange={e => setNewForm({ ...newForm, department: e.target.value })}
                  >
                    <option value="iron">{isRtl ? '1- قسم الحديد' : '1- Iron Department'}</option>
                    <option value="hangar">{isRtl ? '2- قسم الهنجر' : '2- Hangar Department'}</option>
                    <option value="electrical">{isRtl ? '3- قسم الكهرباء والتجميع' : '3- Electrical & Assembly'}</option>
                  </select>
                </div>

                {/* 3. Initial Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">{isRtl ? 'حالة الفحص المبدئية' : 'Initial Status'}</label>
                    <select
                      className="input"
                      value={newForm.status}
                      onChange={e => setNewForm({ ...newForm, status: e.target.value })}
                    >
                      <option value="pending">{isRtl ? 'بانتظار الفحص (Pending)' : 'Pending'}</option>
                      <option value="passed">{isRtl ? 'مطابق ومعتمد (Passed)' : 'Passed'}</option>
                      <option value="failed">{isRtl ? 'مرفوض / يحتاج تعديل (Failed)' : 'Failed'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الفاحص المسؤول' : 'Inspector'}</label>
                    <input
                      type="text"
                      className="input"
                      value={newForm.inspector_name}
                      onChange={e => setNewForm({ ...newForm, inspector_name: e.target.value })}
                    />
                  </div>
                </div>

                {/* 4. Notes & Inspection Details */}
                <div>
                  <label className="label">{isRtl ? 'تفاصيل وملاحظات الفحص وبنود الاختبار' : 'Inspection Details & Test Notes'}</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder={isRtl ? 'أدخل تفاصيل وملاحظات فحص المشروع ونتائج القياسات...' : 'Enter inspection notes, test results, clearances...'}
                    value={newForm.notes}
                    onChange={e => setNewForm({ ...newForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ وإدراج الفحص' : 'Save & Queue Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decision Modal (Approve / Reject) */}
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
