'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { MRP_STATE_LABELS, formatDate } from '@/lib/constants'
import { MrpState } from '@/lib/types'

export default function ProductionPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [technicians, setTechnicians] = useState<any[]>([])
  const [form, setForm] = useState({ project_id: '', product_name: '', quantity: '1', scheduled_date: '', responsible_id: '', notes: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: mo }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('mrp_orders').select('*, project:panel_projects(reference), responsible:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('panel_projects').select('id,reference,customer_name'),
      supabase.from('profiles').select('id,full_name'),
    ])
    setOrders(mo || [])
    setProjects(p || [])
    setTechnicians(t || [])
    setLoading(false)
  }

  async function createMO() {
    const { error } = await supabase.from('mrp_orders').insert({ ...form, quantity: parseFloat(form.quantity) || 1, project_id: form.project_id || null, responsible_id: form.responsible_id || null })
    if (!error) { setShowModal(false); loadAll() }
  }

  async function updateState(id: string, state: MrpState) {
    const updates: any = { state }
    if (state === 'in_progress') updates.date_started = new Date().toISOString()
    if (state === 'done') updates.date_finished = new Date().toISOString()
    await supabase.from('mrp_orders').update(updates).eq('id', id)
    if (state === 'done') {
      // Auto-create QC check
      const order = orders.find(o => o.id === id)
      if (order) {
        await supabase.from('qc_checks').insert({ project_id: order.project_id, mrp_id: id })
      }
    }
    loadAll()
  }

  return (
    <AppLayout
      title="Production (MRP)"
      titleAr="الإنتاج (MRP)"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New MO</button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">⚙️</div><div className="kpi-value">{orders.length}</div><div className="kpi-label">Total Orders</div></div>
        <div className="kpi-card warning"><div className="kpi-icon warning-bg">🔄</div><div className="kpi-value">{orders.filter(o => o.state === 'in_progress').length}</div><div className="kpi-label">In Production</div></div>
        <div className="kpi-card success"><div className="kpi-icon success-bg">✅</div><div className="kpi-value">{orders.filter(o => o.state === 'done').length}</div><div className="kpi-label">Completed</div></div>
        <div className="kpi-card danger"><div className="kpi-icon danger-bg">📋</div><div className="kpi-value">{orders.filter(o => o.state === 'draft').length}</div><div className="kpi-label">Draft</div></div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Reference</th><th>Product</th><th>Project</th><th>Qty</th><th>Responsible</th><th>Scheduled</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8}><div className="skeleton" style={{ height: 40 }} /></td></tr>
              : orders.map(mo => {
                const info = MRP_STATE_LABELS[mo.state as MrpState]
                return (
                  <tr key={mo.id}>
                    <td className="td-primary">{mo.reference}</td>
                    <td>{mo.product_name}</td>
                    <td>{mo.project?.reference || '—'}</td>
                    <td>{mo.quantity}</td>
                    <td>{mo.responsible?.full_name || '—'}</td>
                    <td>{formatDate(mo.scheduled_date)}</td>
                    <td><span className="state-pill" style={{ background: info.color + '20', color: info.color }}>{info.en}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {mo.state === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => updateState(mo.id, 'confirmed')}>Confirm</button>}
                        {mo.state === 'confirmed' && <button className="btn btn-secondary btn-sm" onClick={() => updateState(mo.id, 'in_progress')}>▶ Start</button>}
                        {mo.state === 'in_progress' && <button className="btn btn-success btn-sm" onClick={() => updateState(mo.id, 'done')}>✓ Done</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            {!loading && orders.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No manufacturing orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">New Manufacturing Order</h2><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Product / Panel Name *</label><input className="form-control" value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} placeholder="e.g. MDB-400A Panel" /></div>
                <div className="form-group"><label className="form-label">Quantity</label><input className="form-control" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Linked Project</label><select className="form-control" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">No project</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.reference} — {p.customer_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Responsible</label><select className="form-control" value={form.responsible_id} onChange={e => setForm({...form, responsible_id: e.target.value})}><option value="">Unassigned</option>{technicians.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Scheduled Date</label><input className="form-control" type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createMO} disabled={!form.product_name}>Create MO</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
