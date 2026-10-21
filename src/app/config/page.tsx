'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { STAGE_TYPE_LABELS, ROLE_LABELS } from '@/lib/constants'
import { StageType, UserRole } from '@/lib/types'

const STAGE_TYPES = Object.keys(STAGE_TYPE_LABELS) as StageType[]

export default function ConfigPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'templates' | 'users'>('templates')
  const [templates, setTemplates] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [form, setForm] = useState({ name_en: '', name_ar: '', stage_type: 'sheet_metal' as StageType, sequence: '10', default_points: '5' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: t }, { data: u }] = await Promise.all([
      supabase.from('activity_templates').select('*').is('parent_id', null).order('stage_type').order('sequence'),
      supabase.from('profiles').select('*').order('full_name'),
    ])
    setTemplates(t || [])
    setUsers(u || [])
    setLoading(false)
  }

  async function createTemplate() {
    const { error } = await supabase.from('activity_templates').insert({ ...form, sequence: parseInt(form.sequence), default_points: parseInt(form.default_points) })
    if (!error) { setShowTemplateModal(false); loadAll() }
  }

  async function deleteTemplate(id: string) {
    if (confirm('Delete this activity template?')) {
      await supabase.from('activity_templates').delete().eq('id', id)
      loadAll()
    }
  }

  async function updateUserRole(id: string, role: UserRole) {
    await supabase.from('profiles').update({ role }).eq('id', id)
    loadAll()
  }

  return (
    <AppLayout title="Configuration" titleAr="الإعدادات">
      <div className="tabs">
        <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>Activity Templates</button>
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users & Roles</button>
      </div>

      {tab === 'templates' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowTemplateModal(true)}>+ New Template</button>
          </div>

          {STAGE_TYPES.map(stage => {
            const stageTemplates = templates.filter(t => t.stage_type === stage)
            return (
              <div key={stage} className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{STAGE_TYPE_LABELS[stage].en}</div>
                    <div className="card-subtitle" style={{ fontFamily: 'var(--font-ar)' }}>{STAGE_TYPE_LABELS[stage].ar}</div>
                  </div>
                  <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{stageTemplates.length} templates</span>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>English Name</th><th>Arabic Name</th><th>Seq</th><th>Points</th><th></th></tr></thead>
                    <tbody>
                      {stageTemplates.map(t => (
                        <tr key={t.id}>
                          <td className="td-primary">{t.name_en}</td>
                          <td style={{ fontFamily: 'var(--font-ar)', direction: 'rtl' }}>{t.name_ar}</td>
                          <td>{t.sequence}</td>
                          <td><span className="points-badge" style={{ fontSize: 11 }}>⭐ {t.default_points}</span></td>
                          <td><button className="btn btn-danger btn-sm" onClick={() => deleteTemplate(t.id)}>Delete</button></td>
                        </tr>
                      ))}
                      {stageTemplates.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No templates in this stage</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </>
      )}

      {tab === 'users' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>Reward Points</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>
                : users.map(user => (
                  <tr key={user.id}>
                    <td className="td-primary">{user.full_name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</td>
                    <td>
                      <select className="form-control" style={{ padding: '4px 8px', fontSize: 12, marginBottom: 0 }}
                        value={user.role} onChange={e => updateUserRole(user.id, e.target.value as UserRole)}>
                        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r].en}</option>)}
                      </select>
                    </td>
                    <td>{user.department || '—'}</td>
                    <td><span className="points-badge">⭐ {user.reward_points}</span></td>
                    <td>
                      <span className="state-pill" style={{ background: user.is_active ? 'var(--success-dim)' : 'var(--danger-dim)', color: user.is_active ? 'var(--success)' : 'var(--danger)' }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id).then(loadAll)}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">New Activity Template</h2><button className="btn-icon" onClick={() => setShowTemplateModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">English Name *</label><input className="form-control" value={form.name_en} onChange={e => setForm({...form, name_en: e.target.value})} placeholder="e.g. Install DIN rails" /></div>
              <div className="form-group"><label className="form-label">Arabic Name *</label><input className="form-control" value={form.name_ar} onChange={e => setForm({...form, name_ar: e.target.value})} placeholder="مثال: تركيب قضبان DIN" style={{ fontFamily: 'var(--font-ar)', direction: 'rtl' }} /></div>
              <div className="form-group"><label className="form-label">Production Stage</label><select className="form-control" value={form.stage_type} onChange={e => setForm({...form, stage_type: e.target.value as StageType})}>{STAGE_TYPES.map(s => <option key={s} value={s}>{STAGE_TYPE_LABELS[s].en}</option>)}</select></div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Sequence</label><input className="form-control" type="number" value={form.sequence} onChange={e => setForm({...form, sequence: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Default Points</label><input className="form-control" type="number" value={form.default_points} onChange={e => setForm({...form, default_points: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createTemplate} disabled={!form.name_en || !form.name_ar}>Create Template</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
