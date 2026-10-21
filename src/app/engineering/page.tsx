'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/constants'

export default function EngineeringPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', partner_name: '' })

  useEffect(() => { loadTasks() }, [])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('panel_tasks')
      .select(`*, project:panel_projects(reference, customer_name), technician:profiles(full_name)`)
      .in('stage_type', ['layout', 'power_wires', 'power_busbar', 'control'])
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const filtered = tasks.filter(t =>
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.project?.reference || '').toLowerCase().includes(search.toLowerCase())
  )

  const stages = [
    { key: 'Design Started', count: tasks.filter(t => t.state === 'pending').length, color: 'var(--accent)' },
    { key: 'Design Review', count: tasks.filter(t => t.state === 'in_progress').length, color: 'var(--warning)' },
    { key: 'Client Approved', count: tasks.filter(t => t.state === 'done').length, color: 'var(--success)' },
  ]

  return (
    <AppLayout title="Engineering" titleAr="الهندسة والتصميم">
      {/* Stage summary */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        {stages.map(s => (
          <div key={s.key} className="kpi-card">
            <div className="kpi-value" style={{ color: s.color }}>{s.count}</div>
            <div className="kpi-label">{s.key}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
          <input className="search-input" placeholder="Search engineering tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Task</th><th>Project</th><th>Engineer</th><th>Stage Type</th><th>Status</th><th>Progress</th><th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>
            ) : filtered.map(task => (
              <tr key={task.id}>
                <td className="td-primary">{task.name || 'Unnamed Task'}</td>
                <td>{task.project?.reference || '—'}</td>
                <td>{task.technician?.full_name || '—'}</td>
                <td>{task.stage_type?.replace('_', ' ') || '—'}</td>
                <td>
                  <span className="state-pill" style={{
                    background: task.state === 'done' ? 'var(--success-dim)' : task.state === 'in_progress' ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                    color: task.state === 'done' ? 'var(--success)' : task.state === 'in_progress' ? 'var(--accent)' : 'var(--text-muted)'
                  }}>{task.state.replace('_', ' ')}</span>
                </td>
                <td>
                  <div className="progress-bar-wrapper" style={{ width: 80 }}>
                    <div className="progress-bar" style={{ width: task.state === 'done' ? '100%' : task.state === 'in_progress' ? '50%' : '0%' }} />
                  </div>
                </td>
                <td>{formatDate(task.created_at)}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No engineering tasks found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  )
}
