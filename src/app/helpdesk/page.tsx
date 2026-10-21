'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { SupportTicket, TicketPriority, TicketState } from '@/lib/types'
import { TICKET_PRIORITY_LABELS, TICKET_STATE_LABELS, formatDate } from '@/lib/constants'

const SEED_TICKETS: SupportTicket[] = [
  {
    id: 't-1',
    ticket_number: 'HD-2026-081',
    subject: 'Main ACB 2500A Micrologic 6.0E Trip Alarm on Substation Power-Up',
    customer_name: 'Saudi Electricity Co. (SEC)',
    project_reference: 'PJ-2026-001',
    panel_serial_number: 'SN-MS-2026-0019',
    priority: 'critical',
    state: 'in_progress',
    assigned_to: 'Eng. Ahmed Al-Mansoor',
    description: 'During site energization, the 2500A incoming ACB tripped on instantaneous overcurrent. Protection curves need verification with upstream substation relays.',
    resolution_notes: 'Site visit scheduled for 21-Oct. Relay test kit calibrated.',
    created_at: '2026-10-19T09:00:00Z',
    updated_at: '2026-10-20T14:30:00Z',
  },
  {
    id: 't-2',
    ticket_number: 'HD-2026-080',
    subject: 'Capacitor Bank Automatic Power Factor Controller Alarm (C/K ratio)',
    customer_name: 'Al-Bawani Contracting',
    project_reference: 'PJ-2026-002',
    panel_serial_number: 'SN-MS-2026-0024',
    priority: 'high',
    state: 'waiting',
    assigned_to: 'Mohammed Salem',
    description: 'The Varlogic PFC controller indicates stage 3 hunting and defective step contactor under partial factory load.',
    resolution_notes: 'Replacement Schneider LC1DPK contactor dispatched from warehouse.',
    created_at: '2026-10-18T11:20:00Z',
    updated_at: '2026-10-19T16:00:00Z',
  },
  {
    id: 't-3',
    ticket_number: 'HD-2026-079',
    subject: 'Annual Preventative Thermal Imaging & Busbar Torque Audit',
    customer_name: 'Nesma Infrastructure',
    project_reference: 'PJ-2025-098',
    panel_serial_number: 'SN-MS-2025-0841',
    priority: 'medium',
    state: 'resolved',
    assigned_to: 'Hassan Al-Otaibi',
    description: 'Client requested routine infrared thermographic scan and torque re-tightening for all copper busbar bolted connections after 12 months in service.',
    resolution_notes: 'Completed. All joints verified under 45 Nm torque. Thermography report delivered with zero hot spots.',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-15T11:00:00Z',
  },
  {
    id: 't-4',
    ticket_number: 'HD-2026-078',
    subject: 'Auxiliary Door Interlock Key Duplicate Request',
    customer_name: 'Binladin Group',
    project_reference: 'PJ-2026-003',
    panel_serial_number: 'SN-MS-2026-0031',
    priority: 'low',
    state: 'closed',
    assigned_to: 'Tariq Al-Harbi',
    description: 'Client facility manager requested 2 extra Castell safety interlock keys for Form 4b enclosure access.',
    resolution_notes: 'Castell keys engraved and delivered via logistics transfer.',
    created_at: '2026-10-08T10:15:00Z',
    updated_at: '2026-10-10T12:00:00Z',
  },
]

export default function HelpdeskPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(SEED_TICKETS)
  const [filterState, setFilterState] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form State
  const [form, setForm] = useState({
    subject: '',
    customer_name: '',
    project_reference: 'PJ-2026-001',
    panel_serial_number: '',
    priority: 'medium' as TicketPriority,
    description: '',
    assigned_to: 'Eng. Ahmed Al-Mansoor',
  })

  const filtered = tickets.filter(t => {
    if (filterState !== 'all' && t.state !== filterState) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.customer_name.toLowerCase().includes(q) ||
      (t.panel_serial_number && t.panel_serial_number.toLowerCase().includes(q))
    )
  })

  // Helpdesk KPIs
  const openTickets = tickets.filter(t => ['new', 'in_progress', 'waiting'].includes(t.state)).length
  const criticalTickets = tickets.filter(t => t.priority === 'critical' && t.state !== 'closed').length
  const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.state)).length
  const resolutionRate = tickets.length > 0 ? Math.round((resolvedTickets / tickets.length) * 100) : 0

  function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    const newT: SupportTicket = {
      id: `t-${Date.now()}`,
      ticket_number: `HD-2026-0${80 + tickets.length + 2}`,
      subject: form.subject,
      customer_name: form.customer_name,
      project_reference: form.project_reference,
      panel_serial_number: form.panel_serial_number || 'SN-MS-GEN',
      priority: form.priority,
      state: 'new',
      assigned_to: form.assigned_to,
      description: form.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setTickets([newT, ...tickets])
    setShowCreateModal(false)
    setForm({
      subject: '',
      customer_name: '',
      project_reference: 'PJ-2026-001',
      panel_serial_number: '',
      priority: 'medium',
      description: '',
      assigned_to: 'Eng. Ahmed Al-Mansoor',
    })
  }

  function handleUpdateState(id: string, newState: TicketState, notes?: string) {
    setTickets(prev =>
      prev.map(t => (t.id === id ? {
        ...t,
        state: newState,
        resolution_notes: notes || t.resolution_notes,
        updated_at: new Date().toISOString()
      } : t))
    )
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket(prev => prev ? {
        ...prev,
        state: newState,
        resolution_notes: notes || prev.resolution_notes,
        updated_at: new Date().toISOString()
      } : null)
    }
  }

  return (
    <AppLayout
      title="Helpdesk & After-Sales Service"
      titleAr="الدعم الفني وخدمات ما بعد البيع والضمان"
      actions={
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Open Support Ticket
        </button>
      }
    >
      {/* Helpdesk KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🎟️</div>
          <div className="kpi-value">{openTickets}</div>
          <div className="kpi-label">Active Site Tickets</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Pending investigation or site intervention
          </div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚠️</div>
          <div className="kpi-value">{criticalTickets}</div>
          <div className="kpi-label">Critical Substation Issues</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Substation trips or urgent energization blocks
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✅</div>
          <div className="kpi-value">{resolutionRate}%</div>
          <div className="kpi-label">First-Time Resolution Rate</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {resolvedTickets} tickets successfully closed
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">🛡️</div>
          <div className="kpi-value">24 Months</div>
          <div className="kpi-label">Standard Factory Warranty</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Full coverage on busbars, wiring & switchgear
          </div>
        </div>
      </div>

      {/* Main Ticket List Card */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>All Warranty & Support Cases</span>
            <span className="badge badge-subtle">{filtered.length} tickets</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder="Search ticket #, subject, customer, S/N..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input"
              style={{ width: 280 }}
            />
            <select
              value={filterState}
              onChange={e => setFilterState(e.target.value)}
              className="input"
              style={{ width: 140 }}
            >
              <option value="all">All States</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="input"
              style={{ width: 140 }}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="table-container" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Priority</th>
                <th>Subject & Switchgear Issue</th>
                <th>Customer</th>
                <th>Panel Serial #</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => {
                const prioInfo = TICKET_PRIORITY_LABELS[ticket.priority] || { en: ticket.priority, color: '#6b7280' }
                const stateInfo = TICKET_STATE_LABELS[ticket.state] || { en: ticket.state, color: '#6b7280' }
                return (
                  <tr key={ticket.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTicket(ticket)}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{ticket.ticket_number}</span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${prioInfo.color}22`,
                          color: prioInfo.color,
                          border: `1px solid ${prioInfo.color}44`,
                        }}
                      >
                        {prioInfo.en}
                      </span>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.subject}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        Project: {ticket.project_reference || 'N/A'}
                      </div>
                    </td>
                    <td>{ticket.customer_name}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ticket.panel_serial_number || '—'}</span>
                    </td>
                    <td>{ticket.assigned_to || 'Unassigned'}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${stateInfo.color}22`,
                          color: stateInfo.color,
                        }}
                      >
                        {stateInfo.en}
                      </span>
                    </td>
                    <td>{formatDate(ticket.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ticket.state !== 'resolved' && ticket.state !== 'closed' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUpdateState(ticket.id, 'resolved', 'Resolved on site by field engineer')}
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>
                    No support tickets match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 18 }}>{selectedTicket.ticket_number} — {selectedTicket.subject}</h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Customer: {selectedTicket.customer_name} | Serial: {selectedTicket.panel_serial_number}
                </span>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div style={{ padding: 24, display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: `${TICKET_PRIORITY_LABELS[selectedTicket.priority]?.color}22`,
                    color: TICKET_PRIORITY_LABELS[selectedTicket.priority]?.color,
                  }}
                >
                  Priority: {TICKET_PRIORITY_LABELS[selectedTicket.priority]?.en}
                </span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: `${TICKET_STATE_LABELS[selectedTicket.state]?.color}22`,
                    color: TICKET_STATE_LABELS[selectedTicket.state]?.color,
                  }}
                >
                  Status: {TICKET_STATE_LABELS[selectedTicket.state]?.en}
                </span>
                <span className="badge badge-subtle">
                  Assigned: {selectedTicket.assigned_to || 'None'}
                </span>
              </div>

              <div>
                <label className="label">Issue Description</label>
                <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 14 }}>
                  {selectedTicket.description}
                </div>
              </div>

              <div>
                <label className="label">Action Plan & Resolution History</label>
                <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selectedTicket.resolution_notes || 'No resolution notes documented yet.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Change Ticket State:</span>
                {(['new', 'in_progress', 'waiting', 'resolved', 'closed'] as TicketState[]).map(st => (
                  <button
                    key={st}
                    className={`btn btn-sm ${selectedTicket.state === st ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleUpdateState(selectedTicket.id, st)}
                  >
                    {TICKET_STATE_LABELS[st]?.en || st}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>
                Close
              </button>
              {selectedTicket.state !== 'resolved' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleUpdateState(selectedTicket.id, 'resolved', 'Case closed and client acknowledged resolution')}
                >
                  ✓ Mark As Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-header">
                <h3>Open After-Sales / Warranty Ticket</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">Issue Subject</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder="e.g. Capacitor bank regulator hunting alarm"
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Customer Name</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder="e.g. Saudi Electricity Co."
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Panel Serial Number (S/N)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. SN-MS-2026-0045"
                      value={form.panel_serial_number}
                      onChange={e => setForm({ ...form, panel_serial_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">Priority Level</label>
                    <select
                      className="input"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })}
                    >
                      <option value="low">Low (General inquiry)</option>
                      <option value="medium">Medium (Component inspection)</option>
                      <option value="high">High (Factory shutdown risk)</option>
                      <option value="critical">Critical (Energization trip / fire risk)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Assigned Field Engineer / Tech</label>
                    <input
                      type="text"
                      className="input"
                      value={form.assigned_to}
                      onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Detailed Defect / Symptom Description</label>
                  <textarea
                    required
                    rows={4}
                    className="input"
                    placeholder="Explain the electrical symptoms, breaker status, error codes displayed on protection relays..."
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Support Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
