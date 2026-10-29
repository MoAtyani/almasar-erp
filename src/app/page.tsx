'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('almasar_user') : null
    if (stored) {
      try {
        const u = JSON.parse(stored)
        if (u && u.email) {
          router.replace('/dashboard')
          return
        }
      } catch {}
    }
    router.replace('/login')
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ fontSize: 14 }}>جاري التحويل...</div>
      </div>
    </div>
  )
}
