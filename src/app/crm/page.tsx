'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { CrmLead, LeadState } from '@/lib/types'
import { LEAD_STATE_LABELS, formatDate, formatCurrency } from '@/lib/constants'

const STAGES: LeadState[] = ['new', 'qualified', 'proposition', 'won', 'lost']

export default function CRMPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<CrmLead[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '', customer_name: '', customer_email: '', customer_phone: '',
    company: '', expected_revenue: '', probability: '50', description: '', state: 'new' as LeadState
  })

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    setLoading(true)
    const { data } = await supabase.from('crm_leads').select('*').order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function createLead() {
    const { error } = await supabase.from('crm_leads').insert({
      name: form.name,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      company: form.company,
      expected_revenue: parseFloat(form.expected_revenue) || 0,
      probability: parseInt(form.probability) || 50,
      description: form.description,
      state: form.state,
    })
    if (!error) { setShowModal(false); loadLeads() }
  }

  async function updateState(id: string, state: LeadState) {
    await supabase.from('crm_leads').update({ state }).eq('id', id)
    loadLeads()
  }

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.customer_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = leads.filter(l => l.state === 'won').reduce((s, l) => s + l.expected_revenue, 0)

  return (
    <AppLayout
      title="Sales / CRM"
      titleAr="المبيعات / إدارة العملاء"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New Lead</button>}
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">💼</div>
          <div className="kpi-value">{leads.length}</div>
          <div className="kpi-label">Total Leads</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">🏆</div>
          <div className="kpi-value">{leads.filter(l => l.state === 'won').length}</div>
          <div className="kpi-label">Won</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{leads.filter(l => l.state === 'proposition').length}</div>
          <div className="kpi-label">In Proposal</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💰</div>
          <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
          <div className="kpi-label">Revenue Won</div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          Pipeline Board
        </div>
        <div className="pipeline">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.state === stage)
            const info = LEAD_STATE_LABELS[stage]
            return (
              <div key={stage} className="pipeline-col">
                <div className="pipeline-col-header">
                  <span className="pipeline-col-title" style={{ color: info.color }}>{info.en}</span>
                  <span className="pipeline-col-count">{stageLeads.length}</span>
                </div>
                <div className="pipeline-col-body">
                  {stageLeads.map(lead => (
                    <div key={lead.id} className="pipeline-card">
                      <div className="pipeline-card-title">{lead.name}</div>
                      <div className="pipeline-card-meta">🏢 {lead.customer_name}</div>
                      {lead.expected_revenue > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 6 }}>
                          {formatCurrency(lead.expected_revenue)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {STAGES.filter(s => s !== stage).map(s => (
                          <button key={s} className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                            onClick={() => updateState(lead.id, s)}>
                            → {LEAD_STATE_LABELS[s].en}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 12 }}>
                      No leads here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">All Leads</div>
        </div>
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ref</th><th>Opportunity</th><th>Customer</th><th>Company</th>
                <th>Revenue</th><th>Probability</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const info = LEAD_STATE_LABELS[lead.state]
                return (
                  <tr key={lead.id}>
                    <td className="td-primary">{lead.reference}</td>
                    <td className="td-primary">{lead.name}</td>
                    <td>{lead.customer_name}</td>
                    <td>{lead.company || '—'}</td>
                    <td>{formatCurrency(lead.expected_revenue)}</td>
                    <td>{lead.probability}%</td>
                    <td>
                      <span className="state-pill" style={{ background: info.color + '20', color: info.color }}>
                        <span className="badge-dot" />
                        {info.en}
                      </span>
                    </td>
                    <td>{formatDate(lead.created_at)}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No leads found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Lead Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Lead / Opportunity</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Opportunity Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. MDB Panel Project" />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Name *</label>
                  <input className="form-control" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} placeholder="Customer name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Email</label>
                  <input className="form-control" type="email" value={form.customer_email} onChange={e => setForm({...form, customer_email: e.target.value})} placeholder="email@company.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-control" value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Company name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Revenue (USD)</label>
                  <input className="form-control" type="number" value={form.expected_revenue} onChange={e => setForm({...form, expected_revenue: e.target.value})} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Win Probability (%)</label>
                  <input className="form-control" type="number" min="0" max="100" value={form.probability} onChange={e => setForm({...form, probability: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Stage</label>
                <select className="form-control" value={form.state} onChange={e => setForm({...form, state: e.target.value as LeadState})}>
                  {STAGES.map(s => <option key={s} value={s}>{LEAD_STATE_LABELS[s].en}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Notes</label>
                <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Project details, requirements..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createLead} disabled={!form.name || !form.customer_name}>Create Lead</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
