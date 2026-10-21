'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { QC_RESULT_LABELS, formatDate } from '@/lib/constants'
import { QcResult } from '@/lib/types'

export default function QCPage() {
  const supabase = createClient()
  const [checks, setChecks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [inspectors, setInspectors] = useState<any[]>([])
  const [form, setForm] = useState({ project_id: '', inspector_id: '', inspection_date: '', fat_passed: false, notes: '', rejection_reason: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: qc }, { data: p }, { data: i }] = await Promise.all([
      supabase.from('qc_checks').select('*, project:panel_projects(reference,customer_name), inspector:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('panel_projects').select('id,reference,customer_name'),
      supabase.from('profiles').select('id,full_name').in('role', ['qc_technician', 'production_supervisor', 'general_manager']),
    ])
    setChecks(qc || [])
    setProjects(p || [])
    setInspectors(i || [])
    setLoading(false)
  }

  async function createQC() {
    const { error } = await supabase.from('qc_checks').insert({ ...form, project_id: form.project_id || null, inspector_id: form.inspector_id || null, fat_passed: form.fat_passed })
    if (!error) { setShowModal(false); loadAll() }
  }

  async function updateResult(id: string, result: QcResult, reason?: string) {
    await supabase.from('qc_checks').update({ result, rejection_reason: reason || null }).eq('id', id)
    loadAll()
  }

  return (
    <AppLayout
      title="Quality Control"
      titleAr="ضبط الجودة"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New QC Check</button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">🔍</div><div className="kpi-value">{checks.length}</div><div className="kpi-label">Total Checks</div></div>
        <div className="kpi-card warning"><div className="kpi-icon warning-bg">⏳</div><div className="kpi-value">{checks.filter(c => c.result === 'pending').length}</div><div className="kpi-label">Pending</div></div>
        <div className="kpi-card success"><div className="kpi-icon success-bg">✅</div><div className="kpi-value">{checks.filter(c => c.result === 'passed').length}</div><div className="kpi-label">Passed</div></div>
        <div className="kpi-card danger"><div className="kpi-icon danger-bg">❌</div><div className="kpi-value">{checks.filter(c => c.result === 'failed').length}</div><div className="kpi-label">Failed</div></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />) :
          checks.map(check => {
            const info = QC_RESULT_LABELS[check.result as QcResult]
            return (
              <div key={check.id} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{check.reference}</span>
                      {check.fat_passed && <span style={{ fontSize: 11, background: 'var(--success-dim)', color: 'var(--success)', padding: '2px 8px', borderRadius: 100, fontWeight: 700 }}>FAT ✓</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📁 {check.project?.customer_name || '—'} ({check.project?.reference || '—'})</div>
                    {check.inspector && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>👤 Inspector: {check.inspector.full_name}</div>}
                    {check.inspection_date && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {formatDate(check.inspection_date)}</div>}
                    {check.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 6 }}>{check.notes}</div>}
                    {check.rejection_reason && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>❌ Rejection: {check.rejection_reason}</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <span className="state-pill" style={{ background: info.color + '20', color: info.color }}>
                      <span className="badge-dot" />{info.en}
                    </span>
                    {check.result === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" onClick={() => updateResult(check.id, 'passed')}>✓ Pass</button>
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          const reason = prompt('Rejection reason:')
                          if (reason !== null) updateResult(check.id, 'failed', reason)
                        }}>✕ Fail</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        {!loading && checks.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ fontSize: 32 }}>🔍</div>
            <div className="empty-state-title">No QC Checks Yet</div>
            <div className="empty-state-desc">QC checks are auto-created when manufacturing orders are completed.</div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">New QC Check</h2><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Project</label><select className="form-control" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">No project</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.reference} — {p.customer_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Inspector</label><select className="form-control" value={form.inspector_id} onChange={e => setForm({...form, inspector_id: e.target.value})}><option value="">Unassigned</option>{inspectors.map((i: any) => <option key={i.id} value={i.id}>{i.full_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Inspection Date</label><input className="form-control" type="date" value={form.inspection_date} onChange={e => setForm({...form, inspection_date: e.target.value})} /></div>
                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label className="form-label">FAT Test Passed</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input type="checkbox" id="fat" checked={form.fat_passed} onChange={e => setForm({...form, fat_passed: e.target.checked})} style={{ width: 18, height: 18 }} />
                    <label htmlFor="fat" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Factory Acceptance Test passed</label>
                  </div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createQC}>Create QC Check</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
