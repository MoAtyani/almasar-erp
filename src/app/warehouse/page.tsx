'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { TRANSFER_STATE_LABELS, formatDate } from '@/lib/constants'
import { TransferType, TransferState } from '@/lib/types'

export default function WarehousePage() {
  const supabase = createClient()
  const [transfers, setTransfers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | 'incoming' | 'internal'>('all')
  const [showModal, setShowModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [form, setForm] = useState({ project_id: '', transfer_type: 'incoming' as TransferType, origin: '', destination: '', scheduled_date: '', notes: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('stock_transfers').select('*, project:panel_projects(reference)').order('created_at', { ascending: false }),
      supabase.from('panel_projects').select('id,reference,customer_name'),
    ])
    setTransfers(t || [])
    setProjects(p || [])
    setLoading(false)
  }

  async function createTransfer() {
    const { error } = await supabase.from('stock_transfers').insert({ ...form, project_id: form.project_id || null })
    if (!error) { setShowModal(false); loadAll() }
  }

  async function updateState(id: string, state: TransferState) {
    await supabase.from('stock_transfers').update({ state, done_date: state === 'done' ? new Date().toISOString().split('T')[0] : null }).eq('id', id)
    loadAll()
  }

  const filtered = transfers.filter(t => {
    if (tab === 'incoming') return t.transfer_type === 'incoming'
    if (tab === 'internal') return t.transfer_type === 'internal'
    return t.transfer_type !== 'outgoing'
  })

  return (
    <AppLayout
      title="Warehouse"
      titleAr="المستودع"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Transfer</button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">📦</div><div className="kpi-value">{transfers.filter(t => ['incoming','internal'].includes(t.transfer_type)).length}</div><div className="kpi-label">Total Transfers</div></div>
        <div className="kpi-card warning"><div className="kpi-icon warning-bg">⏳</div><div className="kpi-value">{transfers.filter(t => t.state === 'draft').length}</div><div className="kpi-label">Pending</div></div>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">✅</div><div className="kpi-value">{transfers.filter(t => t.state === 'ready').length}</div><div className="kpi-label">Ready</div></div>
        <div className="kpi-card success"><div className="kpi-icon success-bg">🏁</div><div className="kpi-value">{transfers.filter(t => t.state === 'done').length}</div><div className="kpi-label">Done</div></div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Transfers</button>
        <button className={`tab-btn ${tab === 'incoming' ? 'active' : ''}`} onClick={() => setTab('incoming')}>Incoming</button>
        <button className={`tab-btn ${tab === 'internal' ? 'active' : ''}`} onClick={() => setTab('internal')}>Internal</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Reference</th><th>Type</th><th>Project</th><th>From</th><th>To</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8}><div className="skeleton" style={{ height: 40 }} /></td></tr>
              : filtered.map(t => {
                const info = TRANSFER_STATE_LABELS[t.state as TransferState]
                return (
                  <tr key={t.id}>
                    <td className="td-primary">{t.reference}</td>
                    <td><span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{t.transfer_type}</span></td>
                    <td>{t.project?.reference || '—'}</td>
                    <td>{t.origin || '—'}</td>
                    <td>{t.destination || '—'}</td>
                    <td>{formatDate(t.scheduled_date)}</td>
                    <td><span className="state-pill" style={{ background: info.color + '20', color: info.color }}>{info.en}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {t.state === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => updateState(t.id, 'ready')}>Ready</button>}
                        {t.state === 'ready' && <button className="btn btn-success btn-sm" onClick={() => updateState(t.id, 'done')}>Done</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No transfers found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">New Stock Transfer</h2><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Transfer Type</label><select className="form-control" value={form.transfer_type} onChange={e => setForm({...form, transfer_type: e.target.value as TransferType})}><option value="incoming">Incoming</option><option value="internal">Internal</option></select></div>
                <div className="form-group"><label className="form-label">Linked Project</label><select className="form-control" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">No project</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.reference}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Origin</label><input className="form-control" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="Supplier / Source location" /></div>
                <div className="form-group"><label className="form-label">Destination</label><input className="form-control" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Workshop / Zone" /></div>
                <div className="form-group"><label className="form-label">Scheduled Date</label><input className="form-control" type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createTransfer}>Create Transfer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
