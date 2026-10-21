'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { CrmLead, LeadState } from '@/lib/types'
import { LEAD_STATE_LABELS, formatDate, formatCurrency } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'
import { MOCK_LEADS } from '@/lib/mockData'

const STAGES: LeadState[] = ['new', 'qualified', 'proposition', 'won', 'lost']

export default function CRMPage() {
  const supabase = createClient()
  const { lang, isRtl } = useLanguage()
  const [leads, setLeads] = useState<CrmLead[]>(MOCK_LEADS)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '', customer_name: '', customer_email: '', customer_phone: '',
    company: '', expected_revenue: '', probability: '50', description: '', state: 'new' as LeadState
  })

  useEffect(() => { loadLeads() }, [])

  async function loadLeads() {
    try {
      const { data } = await supabase.from('crm_leads').select('*').order('created_at', { ascending: false })
      if (data && data.length > 0) {
        setLeads(data as CrmLead[])
      }
    } catch {
      // keep fallback mock
    }
  }

  async function createLead(e: React.FormEvent) {
    e.preventDefault()
    const newL: CrmLead = {
      id: `lead-${Date.now()}`,
      reference: `LEAD/2026/00${leads.length + 1}`,
      name: form.name,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      company: form.company,
      expected_revenue: parseFloat(form.expected_revenue) || 0,
      probability: parseInt(form.probability) || 50,
      description: form.description,
      state: form.state,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setLeads([newL, ...leads])
    setShowModal(false)
    setForm({
      name: '', customer_name: '', customer_email: '', customer_phone: '',
      company: '', expected_revenue: '', probability: '50', description: '', state: 'new'
    })
  }

  function updateState(id: string, nextState: LeadState) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, state: nextState } : l))
  }

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    l.reference.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = leads.filter(l => l.state === 'won').reduce((s, l) => s + l.expected_revenue, 0)
  const wonCount = leads.filter(l => l.state === 'won').length
  const propCount = leads.filter(l => l.state === 'proposition').length

  return (
    <AppLayout
      title="Sales / CRM"
      titleAr="المبيعات / إدارة العملاء"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          {isRtl ? '+ إضافة فرصة جديدة' : '+ New Opportunity'}
        </button>
      }
    >
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">💼</div>
          <div className="kpi-value">{leads.length}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي الفرص والعملاء' : 'Total Leads'}</div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">🏆</div>
          <div className="kpi-value">{wonCount}</div>
          <div className="kpi-label">{isRtl ? 'المشاريع المكتسبة' : 'Won Deals'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{propCount}</div>
          <div className="kpi-label">{isRtl ? 'عروض الأسعار المقدمة' : 'In Proposal'}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple-bg">💰</div>
          <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي الإيرادات المكتسبة' : 'Revenue Won'}</div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
          {isRtl ? 'مسار المبيعات التفاعلي (Kanban Pipeline)' : 'Pipeline Board'}
        </div>
        <div className="pipeline">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.state === stage)
            const info = LEAD_STATE_LABELS[stage]
            return (
              <div key={stage} className="pipeline-col">
                <div className="pipeline-col-header">
                  <span className="pipeline-col-title" style={{ color: info.color }}>
                    {info[lang] || info.en}
                  </span>
                  <span className="pipeline-col-count">{stageLeads.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageLeads.map(lead => (
                    <div key={lead.id} className="lead-card">
                      <div className="lead-card-header">
                        <span className="lead-card-title">{lead.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                          {formatCurrency(lead.expected_revenue)}
                        </span>
                      </div>
                      <div className="lead-card-company">{lead.customer_name}</div>
                      {lead.company && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.company}</div>}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 11 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {isRtl ? 'الاحتمالية:' : 'Prob:'} {lead.probability}%
                        </span>
                        {stage !== 'won' && stage !== 'lost' && (
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => {
                              const nextIdx = STAGES.indexOf(stage) + 1
                              if (nextIdx < STAGES.length - 1) updateState(lead.id, STAGES[nextIdx])
                              else updateState(lead.id, 'won')
                            }}
                          >
                            {isRtl ? 'نقل للمرحلة التالية ←' : 'Next Stage →'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                      {isRtl ? 'لا توجد فرص هنا' : 'No leads here'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* All Leads Table */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {isRtl ? 'جدول الفرص والعروض المقدمة' : 'All Leads Table'}
          </div>
          <input
            type="text"
            className="input"
            style={{ width: 280 }}
            placeholder={isRtl ? '...بحث بالمرجع أو اسم العميل أو المشروع' : 'Search leads, customer, project...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'المرجع' : 'REF'}</th>
                <th>{isRtl ? 'الفرصة واللوحة' : 'OPPORTUNITY'}</th>
                <th>{isRtl ? 'العميل' : 'CUSTOMER'}</th>
                <th>{isRtl ? 'الشركة' : 'COMPANY'}</th>
                <th>{isRtl ? 'القيمة المتوقعة' : 'REVENUE'}</th>
                <th>{isRtl ? 'الاحتمالية' : 'PROBABILITY'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'التاريخ' : 'DATE'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => {
                const badgeInfo = LEAD_STATE_LABELS[lead.state] || { en: lead.state, ar: lead.state, color: '#6b7280' }
                return (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{lead.reference}</td>
                    <td><strong>{lead.name}</strong></td>
                    <td>{lead.customer_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{lead.company || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(lead.expected_revenue)}</td>
                    <td>{lead.probability}%</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: `${badgeInfo.color}22`,
                          color: badgeInfo.color,
                          border: `1px solid ${badgeInfo.color}44`,
                        }}
                      >
                        {badgeInfo[lang] || badgeInfo.en}
                      </span>
                    </td>
                    <td>{formatDate(lead.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={createLead}>
              <div className="modal-header">
                <h3>{isRtl ? 'إضافة فرصة بيع جديدة' : 'Add New Sales Opportunity'}</h3>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div style={{ padding: 24, display: 'grid', gap: 14 }}>
                <div>
                  <label className="label">{isRtl ? 'عنوان اللوحة / المشروع' : 'Project / Panel Title'}</label>
                  <input
                    required
                    type="text"
                    className="input"
                    placeholder={isRtl ? 'مثال: لوحة توزيع رئيسية MDB 2500A' : 'e.g. Main Distribution Board MDB 2500A'}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'اسم جهة الاتصال' : 'Customer Contact'}</label>
                    <input
                      required
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'م. عبدالله الشهري' : 'e.g. Eng. Abdullah'}
                      value={form.customer_name}
                      onChange={e => setForm({ ...form, customer_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'الشركة / المقاول' : 'Company Name'}</label>
                    <input
                      type="text"
                      className="input"
                      placeholder={isRtl ? 'شركة البواني للمقاولات' : 'Al-Bawani Contracting'}
                      value={form.company}
                      onChange={e => setForm({ ...form, company: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="label">{isRtl ? 'القيمة المتوقعة ($)' : 'Expected Revenue ($)'}</label>
                    <input
                      required
                      type="number"
                      className="input"
                      placeholder="150000"
                      value={form.expected_revenue}
                      onChange={e => setForm({ ...form, expected_revenue: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">{isRtl ? 'احتمالية الفوز (%)' : 'Win Probability (%)'}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="input"
                      value={form.probability}
                      onChange={e => setForm({ ...form, probability: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  {isRtl ? 'حفظ الفرصة' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
