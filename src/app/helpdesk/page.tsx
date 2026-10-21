'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { SupportTicket, TicketPriority, TicketState } from '@/lib/types'
import { TICKET_PRIORITY_LABELS, TICKET_STATE_LABELS, formatDate } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

const SEED_TICKETS: SupportTicket[] = [
  {
    id: 't-1',
    ticket_number: 'HD-2026-081',
    subject: 'Trip alarm on 2500A Main ACB (Micrologic 6.0E) during energization',
    subject_ar: 'إنذار فصل القاطع الهوائي الرئيسي 2500A (Micrologic 6.0E) أثناء إطلاق التيار',
    customer_name: 'Saudi Electricity Company (SEC)',
    customer_name_ar: 'الشركة السعودية للكهرباء (SEC)',
    project_reference: 'PJ-2026-001',
    panel_serial_number: 'SN-MS-2026-0019',
    priority: 'critical',
    state: 'in_progress',
    assigned_to: 'Eng. Ahmed Al-Mansoor',
    assigned_to_ar: 'م. أحمد المنصور',
    description: 'During site energization, the 2500A ACB tripped on instantaneous overcurrent. Protection relay curves must be coordinated with upstream substation breakers.',
    description_ar: 'أثناء إطلاق التيار بالمحطة، فصل القاطع 2500A على تيار لحظي زائد. يلزم ضبط ومطابقة منحنيات الحماية مع قواطع المحطة المغذية.',
    resolution_notes: 'Site visit scheduled for relay testing. Secondary injection test kit prepared.',
    resolution_notes_ar: 'تمت جدولة زيارة ميدانية لفريق الهندسة. جهاز اختبار الترحيل بحقن التيار الثانوي جاهز.',
    created_at: '2026-10-19T09:00:00Z',
    updated_at: '2026-10-20T14:30:00Z',
  },
  {
    id: 't-2',
    ticket_number: 'HD-2026-080',
    subject: 'Capacitor bank automatic PFC regulator (C/K ratio) hunting alarm',
    subject_ar: 'إنذار منظم معامل القدرة الآلي (PFC C/K ratio) في لوحة المكثفات',
    customer_name: 'Al-Bawani Contracting Co.',
    customer_name_ar: 'شركة البواني للمقاولات',
    project_reference: 'PJ-2026-002',
    panel_serial_number: 'SN-MS-2026-0024',
    priority: 'high',
    state: 'waiting',
    assigned_to: 'Mohammed Salem',
    assigned_to_ar: 'محمد سالم',
    description: 'Varlogic controller displays hunting on step 3 and chatter on capacitor contactor under partial plant load.',
    description_ar: 'جهاز التحكم Varlogic يظهر تذبذب في الخطوة 3 وخلل بكونتاكتور المكثف عند الحمل الجزئي.',
    resolution_notes: 'Replacement Schneider LC1DPK contactor issued from warehouse for dispatch.',
    resolution_notes_ar: 'تم صرف كونتاكتور بديل شنايدر LC1DPK من المستودع للتسليم.',
    created_at: '2026-10-18T11:20:00Z',
    updated_at: '2026-10-19T16:00:00Z',
  },
  {
    id: 't-3',
    ticket_number: 'HD-2026-079',
    subject: 'Annual copper busbar thermography & torque inspection request',
    subject_ar: 'طلب فحص حراري دوري بالأشعة تحت الحمراء وعزم تربيط البسبار النحاسي',
    customer_name: 'Nesma Infrastructure & Tech',
    customer_name_ar: 'شركة نسما للبنية التحتية',
    project_reference: 'PJ-2025-098',
    panel_serial_number: 'SN-MS-2025-0841',
    priority: 'medium',
    state: 'resolved',
    assigned_to: 'Hassan Al-Otaibi',
    assigned_to_ar: 'حسن العتيبي',
    description: 'Client requested complete IR thermographic survey of busbar joints and bolt retorquing after 12 months operation.',
    description_ar: 'طلب العميل إجراء مسح حراري لكافة وصلات البسبار وإعادة شد المسامير بعد مرور عام على التشغيل.',
    resolution_notes: 'Inspection completed. All joints torqued to 45 N.m. No thermal hotspots detected.',
    resolution_notes_ar: 'تم الفحص. كافة الوصلات مشدودة بعزم 45 نيوتن.متر ولا توجد أي نقاط ساخنة.',
    created_at: '2026-10-12T08:00:00Z',
    updated_at: '2026-10-15T11:00:00Z',
  },
  {
    id: 't-4',
    ticket_number: 'HD-2026-078',
    subject: 'Spare mechanical Castell safety interlock key request for Form 4b',
    subject_ar: 'طلب نسخة إضافية لمفتاح الأمان الداخلي الميكانيكي (Castell Key)',
    customer_name: 'Saudi Binladin Group (SBG)',
    customer_name_ar: 'مجموعة بن لادن السعودية',
    project_reference: 'PJ-2026-003',
    panel_serial_number: 'SN-MS-2026-0031',
    priority: 'low',
    state: 'closed',
    assigned_to: 'Tariq Al-Harbi',
    assigned_to_ar: 'طارق الحربي',
    description: 'Maintenance manager requested 2 spare coded keys for Form 4b compartment interlocks.',
    description_ar: 'طلب مدير الصيانة نسختين إضافيتين لمفاتيح قفل أبواب خلايا Form 4b.',
    resolution_notes: 'Keys milled and handed over to site representative with delivery voucher.',
    resolution_notes_ar: 'تم تجهيز المفاتيح وتسليمها لممثل العميل بموجب إذن استلام.',
    created_at: '2026-10-08T10:15:00Z',
    updated_at: '2026-10-10T12:00:00Z',
  },
]

const TEAM_MEMBERS = [
  { en: 'Eng. Ahmed Al-Mansoor', ar: 'م. أحمد المنصور' },
  { en: 'Mohammed Salem', ar: 'محمد سالم' },
  { en: 'Tariq Al-Harbi', ar: 'طارق الحربي' },
  { en: 'Hassan Al-Otaibi', ar: 'حسن العتيبي' },
  { en: 'Bilal Khan', ar: 'بلال خان' },
]

export default function HelpdeskPage() {
  const { lang, isRtl } = useLanguage()
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
      (t.subject_ar && t.subject_ar.includes(q)) ||
      t.customer_name.toLowerCase().includes(q) ||
      (t.customer_name_ar && t.customer_name_ar.includes(q)) ||
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
    const member = TEAM_MEMBERS.find(m => m.en === form.assigned_to || m.ar === form.assigned_to)
    const newT: SupportTicket = {
      id: `t-${Date.now()}`,
      ticket_number: `HD-2026-0${80 + tickets.length + 2}`,
      subject: form.subject,
      subject_ar: form.subject,
      customer_name: form.customer_name,
      customer_name_ar: form.customer_name,
      project_reference: form.project_reference,
      panel_serial_number: form.panel_serial_number || 'SN-MS-GEN',
      priority: form.priority,
      state: 'new',
      assigned_to: member ? member.en : form.assigned_to,
      assigned_to_ar: member ? member.ar : form.assigned_to,
      description: form.description,
      description_ar: form.description,
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
        resolution_notes_ar: notes || t.resolution_notes_ar || t.resolution_notes,
        updated_at: new Date().toISOString()
      } : t))
    )
    if (selectedTicket && selectedTicket.id === id) {
      setSelectedTicket(prev => prev ? {
        ...prev,
        state: newState,
        resolution_notes: notes || prev.resolution_notes,
        resolution_notes_ar: notes || prev.resolution_notes_ar || prev.resolution_notes,
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
          {isRtl ? '+ فتح تذكرة دعم فني' : '+ Open Support Ticket'}
        </button>
      }
    >
      {/* Helpdesk KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">🎟️</div>
          <div className="kpi-value">{openTickets}</div>
          <div className="kpi-label">{isRtl ? 'التذاكر الميدانية النشطة' : 'Active Site Tickets'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'قيد الفحص والمتابعة الميدانية' : 'Pending investigation or site visit'}
          </div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚠️</div>
          <div className="kpi-value">{criticalTickets}</div>
          <div className="kpi-label">{isRtl ? 'أعطال وفصولات حرجة بالمحطات' : 'Critical Substation Trips'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'فصل قواطع رئيسية أو عطل تشغيل' : 'Immediate energization trip risk'}
          </div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✅</div>
          <div className="kpi-value">{resolutionRate}%</div>
          <div className="kpi-label">{isRtl ? 'معدل الحل من الزيارة الأولى' : 'First-Visit Resolution'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {resolvedTickets} {isRtl ? 'تذكرة تم إغلاقها بنجاح' : 'tickets successfully resolved'}
          </div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">🛡️</div>
          <div className="kpi-value">24 {isRtl ? 'شهراً' : 'Months'}</div>
          <div className="kpi-label">{isRtl ? 'ضمان المصنع المعتمد' : 'Factory Warranty'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'تغطية شاملة للبسبار، القواطع، والأسلاك' : 'Full switchgear & busbar coverage'}
          </div>
        </div>
      </div>

      {/* Main Ticket List Card */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {isRtl ? 'سجل بلاغات الضمان والدعم الميداني' : 'All Warranty & Support Cases'}
            </span>
            <span className="badge badge-subtle">{filtered.length} {isRtl ? 'تذكرة' : 'tickets'}</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              placeholder={isRtl ? '...بحث بالرقم، العطل، العميل، السيريال' : 'Search ticket #, subject, customer, S/N...'}
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
              <option value="all">{isRtl ? 'جميع الحالات' : 'All States'}</option>
              <option value="new">{isRtl ? 'جديد' : 'New'}</option>
              <option value="in_progress">{isRtl ? 'جاري المعالجة' : 'In Progress'}</option>
              <option value="waiting">{isRtl ? 'في الانتظار' : 'Waiting'}</option>
              <option value="resolved">{isRtl ? 'تم الحل' : 'Resolved'}</option>
              <option value="closed">{isRtl ? 'مغلق' : 'Closed'}</option>
            </select>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="input"
              style={{ width: 140 }}
            >
              <option value="all">{isRtl ? 'جميع الأولويات' : 'All Priorities'}</option>
              <option value="critical">{isRtl ? 'حرج' : 'Critical'}</option>
              <option value="high">{isRtl ? 'عالي' : 'High'}</option>
              <option value="medium">{isRtl ? 'متوسط' : 'Medium'}</option>
              <option value="low">{isRtl ? 'منخفض' : 'Low'}</option>
            </select>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="table-container" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'رقم التذكرة' : 'TICKET ID'}</th>
                <th>{isRtl ? 'الأولوية' : 'PRIORITY'}</th>
                <th>{isRtl ? 'موضوع البلاغ والعطل الكهربائي' : 'SUBJECT & ISSUE'}</th>
                <th>{isRtl ? 'العميل' : 'CUSTOMER'}</th>
                <th>{isRtl ? 'الرقم التسلسلي للوحة (S/N)' : 'PANEL S/N'}</th>
                <th>{isRtl ? 'الفني / المهندس المسؤول' : 'ASSIGNED TO'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'تاريخ البلاغ' : 'CREATED'}</th>
                <th>{isRtl ? 'الإجراءات' : 'ACTIONS'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => {
                const prioInfo = TICKET_PRIORITY_LABELS[ticket.priority] || { en: ticket.priority, ar: ticket.priority, color: '#6b7280' }
                const stateInfo = TICKET_STATE_LABELS[ticket.state] || { en: ticket.state, ar: ticket.state, color: '#6b7280' }
                const subjectText = isRtl && ticket.subject_ar ? ticket.subject_ar : ticket.subject
                const customerText = isRtl && ticket.customer_name_ar ? ticket.customer_name_ar : ticket.customer_name
                const assignedText = isRtl && ticket.assigned_to_ar ? ticket.assigned_to_ar : (ticket.assigned_to || (isRtl ? 'غير محدد' : 'Unassigned'))

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
                        {prioInfo[lang] || prioInfo.en}
                      </span>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subjectText}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {isRtl ? 'المشروع:' : 'Project:'} {ticket.project_reference || 'N/A'}
                      </div>
                    </td>
                    <td>{customerText}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ticket.panel_serial_number || '—'}</span>
                    </td>
                    <td>{assignedText}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${stateInfo.color}22`,
                          color: stateInfo.color,
                        }}
                      >
                        {stateInfo[lang] || stateInfo.en}
                      </span>
                    </td>
                    <td>{formatDate(ticket.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ticket.state !== 'resolved' && ticket.state !== 'closed' && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleUpdateState(ticket.id, 'resolved', isRtl ? 'تمت المعالجة في الموقع بواسطة مهندس الصيانة' : 'Resolved on site by field engineer')}
                          >
                            {isRtl ? 'إغلاق البلاغ' : 'Resolve'}
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          {isRtl ? 'عرض' : 'View'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
                <h3 style={{ fontSize: 18 }}>
                  {selectedTicket.ticket_number} — {isRtl && selectedTicket.subject_ar ? selectedTicket.subject_ar : selectedTicket.subject}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {isRtl ? 'العميل:' : 'Customer:'} {isRtl && selectedTicket.customer_name_ar ? selectedTicket.customer_name_ar : selectedTicket.customer_name} | {isRtl ? 'الرقم التسلسلي:' : 'S/N:'} {selectedTicket.panel_serial_number}
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
                  {isRtl ? 'الأولوية:' : 'Priority:'} {TICKET_PRIORITY_LABELS[selectedTicket.priority]?.[lang] || selectedTicket.priority}
                </span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: `${TICKET_STATE_LABELS[selectedTicket.state]?.color}22`,
                    color: TICKET_STATE_LABELS[selectedTicket.state]?.color,
                  }}
                >
                  {isRtl ? 'الحالة:' : 'Status:'} {TICKET_STATE_LABELS[selectedTicket.state]?.[lang] || selectedTicket.state}
                </span>
                <span className="badge badge-subtle">
                  {isRtl ? 'المكلف:' : 'Assigned:'} {isRtl && selectedTicket.assigned_to_ar ? selectedTicket.assigned_to_ar : (selectedTicket.assigned_to || (isRtl ? 'غير محدد' : 'None'))}
                </span>
              </div>

              <div>
                <label className="label">{isRtl ? 'وصف العطل والأعراض الميدانية' : 'Issue Description'}</label>
                <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 14 }}>
                  {isRtl && selectedTicket.description_ar ? selectedTicket.description_ar : selectedTicket.description}
                </div>
              </div>

              <div>
                <label className="label">{isRtl ? 'خطة العمل وسجل المعالجة' : 'Action Plan & Resolution History'}</label>
                <div style={{ padding: 14, background: 'var(--bg-surface)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {isRtl
                    ? (selectedTicket.resolution_notes_ar || selectedTicket.resolution_notes || 'لا توجد ملاحظات حل حتى الآن.')
                    : (selectedTicket.resolution_notes || 'No resolution notes documented yet.')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{isRtl ? 'تغيير حالة التذكرة:' : 'Change Ticket State:'}</span>
                {(['new', 'in_progress', 'waiting', 'resolved', 'closed'] as TicketState[]).map(st => (
                  <button
                    key={st}
                    className={`btn btn-sm ${selectedTicket.state === st ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleUpdateState(selectedTicket.id, st)}
                  >
                    {TICKET_STATE_LABELS[st]?.[lang] || st}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
              {selectedTicket.state !== 'resolved' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleUpdateState(selectedTicket.id, 'resolved', isRtl ? 'تم حل البلاغ وتوقيع استلام العميل' : 'Case resolved and acknowledged by client')}
                >
                  ✓ {isRtl ? 'تأكيد الحل والإغلاق' : 'Mark As Resolved'}
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
                <h3>{isRtl ? 'فتح تذكرة دعم فني / ضمان ميداني' : 'Open Warranty Support Ticket'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'موضوع البلاغ / العطل' : 'Issue Subject'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: إنذار فصل قاطع الدخول الرئيسي 2500 أمبير' : 'e.g. Capacitor bank regulator hunting alarm'}
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم العميل' : 'Customer Name'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'الشركة السعودية للكهرباء' : 'Saudi Electricity Co.'}
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الرقم التسلسلي للوحة (S/N)' : 'Panel Serial Number (S/N)'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="SN-MS-2026-0045"
                      value={form.panel_serial_number}
                      onChange={e => setForm({ ...form, panel_serial_number: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'مستوى الأولوية' : 'Priority Level'}</label>
                    <select
                      className="input"
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })}
                    >
                      <option value="low">{isRtl ? 'منخفض (استفسار عام)' : 'Low (General inquiry)'}</option>
                      <option value="medium">{isRtl ? 'متوسط (معاينة دورية)' : 'Medium (Component inspection)'}</option>
                      <option value="high">{isRtl ? 'عالي (خطر توقف خط إنتاج)' : 'High (Shutdown risk)'}</option>
                      <option value="critical">{isRtl ? 'حرج (فصل قاطع رئيسي بالمحطة)' : 'Critical (Substation trip)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'المهندس / الفني المكلف' : 'Assigned Field Engineer'}</label>
                    <select
                      className="input"
                      value={form.assigned_to}
                      onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                    >
                      {TEAM_MEMBERS.map(m => (
                        <option key={m.en} value={m.en}>
                          {isRtl ? m.ar : m.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">{isRtl ? 'وصف العطل والأعراض الميدانية' : 'Detailed Defect Description'}</label>
                  <textarea
                    required
                    rows={4}
                    className="input"
                    placeholder={isRtl ? 'اذكر الأعراض، أكواد الأخطاء على شاشة الحماية، وقت حدوث العطل...' : 'Explain the electrical symptoms, breaker status, error codes...'}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'إرسال التذكرة' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
