'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { PurchaseOrder, PoState } from '@/lib/types'
import { PO_STATE_LABELS, formatDate, formatCurrency } from '@/lib/constants'

export default function ProcurementPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [projects, setProjects] = useState<any[]>([])
  const [form, setForm] = useState({ project_id: '', supplier_name: '', supplier_email: '', expected_date: '', notes: '', total_amount: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: po }, { data: p }] = await Promise.all([
      supabase.from('purchase_orders').select('*, project:panel_projects(reference)').order('created_at', { ascending: false }),
      supabase.from('panel_projects').select('id,reference,customer_name'),
    ])
    setOrders(po || [])
    setProjects(p || [])
    setLoading(false)
  }

  async function createPO() {
    const { error } = await supabase.from('purchase_orders').insert({ ...form, total_amount: parseFloat(form.total_amount) || 0, project_id: form.project_id || null })
    if (!error) { setShowModal(false); loadAll() }
  }

  async function updateState(id: string, state: PoState) {
    await supabase.from('purchase_orders').update({ state }).eq('id', id)
    loadAll()
  }

  const filtered = orders.filter(o =>
    o.reference.toLowerCase().includes(search.toLowerCase()) ||
    o.supplier_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalOpen = orders.filter(o => ['draft', 'sent', 'confirmed'].includes(o.state)).reduce((s, o) => s + o.total_amount, 0)

  return (
    <AppLayout
      title="Procurement"
      titleAr="المشتريات"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New PO</button>}
    >
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent"><div className="kpi-icon accent-bg">🛒</div><div className="kpi-value">{orders.length}</div><div className="kpi-label">Total Orders</div></div>
        <div className="kpi-card warning"><div className="kpi-icon warning-bg">⏳</div><div className="kpi-value">{orders.filter(o => o.state === 'draft').length}</div><div className="kpi-label">Draft</div></div>
        <div className="kpi-card success"><div className="kpi-icon success-bg">✅</div><div className="kpi-value">{orders.filter(o => o.state === 'received').length}</div><div className="kpi-label">Received</div></div>
        <div className="kpi-card purple"><div className="kpi-icon purple-bg">💰</div><div className="kpi-value">{formatCurrency(totalOpen)}</div><div className="kpi-label">Open Value</div></div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input className="search-input" placeholder="Search by reference or supplier..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>Reference</th><th>Supplier</th><th>Project</th><th>Amount</th><th>Expected</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>
              : filtered.map(po => {
                const info = PO_STATE_LABELS[po.state]
                return (
                  <tr key={po.id}>
                    <td className="td-primary">{po.reference}</td>
                    <td>{po.supplier_name}</td>
                    <td>{(po as any).project?.reference || '—'}</td>
                    <td style={{ color: 'var(--success)' }}>{formatCurrency(po.total_amount)}</td>
                    <td>{formatDate(po.expected_date)}</td>
                    <td><span className="state-pill" style={{ background: info.color + '20', color: info.color }}>{info.en}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {po.state === 'draft' && <button className="btn btn-secondary btn-sm" onClick={() => updateState(po.id, 'sent')}>Send</button>}
                        {po.state === 'sent' && <button className="btn btn-secondary btn-sm" onClick={() => updateState(po.id, 'confirmed')}>Confirm</button>}
                        {po.state === 'confirmed' && <button className="btn btn-success btn-sm" onClick={() => updateState(po.id, 'received')}>Receive</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            {!loading && filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No purchase orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">New Purchase Order</h2><button className="btn-icon" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Supplier Name *</label><input className="form-control" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} placeholder="Supplier name" /></div>
                <div className="form-group"><label className="form-label">Supplier Email</label><input className="form-control" type="email" value={form.supplier_email} onChange={e => setForm({...form, supplier_email: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Linked Project</label><select className="form-control" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}><option value="">No project</option>{projects.map((p: any) => <option key={p.id} value={p.id}>{p.reference} — {p.customer_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Total Amount (USD)</label><input className="form-control" type="number" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Expected Delivery Date</label><input className="form-control" type="date" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} /></div>
              </div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createPO} disabled={!form.supplier_name}>Create PO</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
