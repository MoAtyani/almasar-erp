'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { TRANSFER_STATE_LABELS, formatDate } from '@/lib/constants'
import { TransferState } from '@/lib/types'

export default function LogisticsPage() {
  const supabase = createClient()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [form, setForm] = useState({ project_id: '', origin: '', destination: '', scheduled_date: '', notes: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('stock_transfers').select('*, project:panel_projects(reference,customer_name)').eq('transfer_type', 'outgoing').order('created_at', { ascending: false }),
      supabase.from('panel_projects').select('id,reference,customer_name'),
    ])
    setDeliveries(t || [])
    setProjects(p || [])
    setLoading(false)
  }

  async function createDelivery() {
    const { error } = await supabase.from('stock_transfers').insert({ ...form, transfer_type: 'outgoing', project_id: form.project_id || null })
    if (!error) { setShowModal(false); loadAll() }
  }

  async function updateState(id: string, state: TransferState) {
    await supabase.from('stock_transfers').update({ state, done_date: state === 'done' ? new Date().toISOString().split('T')[0] : null }).eq('id', id)
    loadAll()
  }

  const STAGES = [
    { label: 'Packing', count: deliveries.filter(d => d.state === 'draft').length, color: 'var(--accent)' },
    { label: 'Ready to Ship', count: deliveries.filter(d => d.state === 'ready').length, color: 'var(--warning)' },
    { label: 'Delivered', count: deliveries.filter(d => d.state === 'done').length, color: 'var(--success)' },
  ]

  return (
    <AppLayout
      title="Logistics & Delivery"
      titleAr="الشحن واللوجستيات"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Delivery</button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">🚚</div><div className="kpi-value">{deliveries.length}</div><div className="kpi-label">Total Deliveries</div></div>
        {STAGES.map(s => <div key={s.label} className="kpi-card"><div className="kpi-value" style={{ color: s.color }}>{s.count}</div><div className="kpi-label">{s.label}</div></div>)}
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Reference</th><th>Customer / Project</th><th>From</th><th>To</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>
              : deliveries.map(d => {
                const info = TRANSFER_STATE_LABELS[d.state as TransferState]
                return (
                  <tr key={d.id}>
                    <td className="td-primary">{d.reference}</td>
                    <td>{d.project?.customer_name || '—'} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({d.project?.reference})</span></td>
                    <td>{d.origin || 'Factory'}</td>
                    <td>{d.destination || '—'}</td>
                    <td>{formatDate(d.scheduled_date)}</td>
                    <td><span className="state-pill" style={{ background: info.color + '20', color: info.color }}>{info.en}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {d.state === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => updateState(d.id, 'ready')}>🚢 Ready</button>}
                        {d.state === 'ready' && <button className="btn btn-success btn-sm" onClick={() => updateState(d.id, 'done')}>✓ Delivered</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            {!loading && deliveries.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No deliveries yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">New Delivery</h2><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Linked Project</label><select className="form-control" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">No project</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.reference} — {p.customer_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">From (Origin)</label><input className="form-control" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="Factory / Warehouse" /></div>
                <div className="form-group"><label className="form-label">To (Destination)</label><input className="form-control" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Customer site / City" /></div>
                <div className="form-group"><label className="form-label">Scheduled Date</label><input className="form-control" type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createDelivery}>Create Delivery</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
