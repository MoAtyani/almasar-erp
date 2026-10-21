'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-orb orb1" />
      <div className="login-bg-orb orb2" />

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">⚡</div>
          <div>
            <div className="login-brand">Al-Masar Switchgear</div>
            <div className="login-sub">ERP Factory System</div>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-desc">Sign in to access your factory management dashboard</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@almasar.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 10 }}>
            Or explore immediately with demo profiles:
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
              onClick={() => {
                const gm = {
                  id: 'usr-admin',
                  full_name: 'Eng. Tariq Al-Masar',
                  full_name_ar: 'م. طارق المسار',
                  email: 'admin@almasar-switchgear.com',
                  role: 'general_manager',
                  department: 'Executive Management',
                  reward_points: 1250,
                  is_active: true,
                }
                localStorage.setItem('almasar_user', JSON.stringify(gm))
                router.push('/dashboard')
              }}
            >
              👔 Enter as General Manager (المدير العام)
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: 13 }}
              onClick={() => {
                const tech = {
                  id: 'usr-tech1',
                  full_name: 'Mohammed Salem',
                  full_name_ar: 'محمد سالم',
                  email: 'mohammed.s@almasar-switchgear.com',
                  role: 'technician',
                  department: 'Panel Fabrication',
                  reward_points: 640,
                  is_active: true,
                }
                localStorage.setItem('almasar_user', JSON.stringify(tech))
                router.push('/tasks')
              }}
            >
              ⚡ Enter as Panel Technician (فني لوحات)
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          Al-Masar Switchgear — Confidential Internal System
        </p>
      </div>
    </div>
  )
}
