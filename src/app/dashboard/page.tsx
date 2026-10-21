'use client'
import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useLanguage } from '@/context/LanguageContext'
import { formatDate } from '@/lib/constants'

export default function DashboardPage() {
  const { lang, isRtl } = useLanguage()
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [tvMode, setTvMode] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  useEffect(() => {
    fetchLiveData()
    const interval = setInterval(() => {
      fetchLiveData(false)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  async function fetchLiveData(showLoader = true) {
    if (showLoader) setLoading(true)
    try {
      const res = await fetch('/api/dashboard/live')
      const result = await res.json()
      if (result.success) {
        setData(result)
        setLastRefreshed(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch live dashboard:', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const kpis = data?.kpis || {}
  const qc = data?.qcMetrics || {}

  return (
    <AppLayout
      title="Real-Time Owner & Executive Dashboard"
      titleAr="لوحة المتابعة المركزية اللحظية للمالك (Real-Time Live Command Center)"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            🟢 {isRtl ? 'محدث لحظياً:' : 'Live:'} {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            className={`btn btn-sm ${tvMode ? 'btn-accent' : 'btn-secondary'}`}
            onClick={() => setTvMode(!tvMode)}
          >
            📺 {isRtl ? (tvMode ? 'الخروج من وضع الشاشة' : 'وضع الشاشات الكبيرة / TV') : (tvMode ? 'Exit TV Mode' : 'TV Large Display')}
          </button>
        </div>
      }
    >
      {/* Shortages & Bottlenecks Warning Banner */}
      {data?.shortages && data.shortages.length > 0 && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <div>
                <strong style={{ color: '#ef4444' }}>
                  {isRtl ? 'تنبيه نقص في المخزون والمواد الأولية:' : 'Critical Warehouse Shortages Detected:'}
                </strong>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  {data.shortages.map((s: any) => `${s.sku} (OnHand: ${s.qty_on_hand})`).join(', ')}
                </span>
              </div>
            </div>
            <a href="/procurement" className="btn btn-xs btn-danger">
              {isRtl ? 'عرض وإصدار أوامر الشراء' : 'Create Purchase Requests'}
            </a>
          </div>
        </div>
      )}

      {/* Main KPI Grid Covering All Departments (Workflow 1.7 & Workflow 9) */}
      <div className="kpi-grid" style={{ gridTemplateColumns: tvMode ? 'repeat(5, 1fr)' : 'repeat(5, 1fr)', marginBottom: 24 }}>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">⚡</div>
          <div className="kpi-value">{kpis.total_open_orders || 0}</div>
          <div className="kpi-label">{isRtl ? 'إجمالي أوامر الإنتاج المفتوحة' : 'Total Open Orders'}</div>
        </div>

        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">⏳</div>
          <div className="kpi-value">{kpis.awaiting_acceptance || 0}</div>
          <div className="kpi-label">{isRtl ? 'أوامر بانتظار قبول المصنع' : 'Awaiting Acceptance'}</div>
        </div>

        <div className="kpi-card info">
          <div className="kpi-icon info-bg">⚙️</div>
          <div className="kpi-value">{kpis.in_progress || 0}</div>
          <div className="kpi-label">{isRtl ? 'قيد التصنيع والتنفيذ الفعلي' : 'Orders In Progress'}</div>
        </div>

        <div className="kpi-card danger">
          <div className="kpi-icon danger-bg">⚠️</div>
          <div className="kpi-value">{kpis.requiring_rework || 0}</div>
          <div className="kpi-label">{isRtl ? 'أوامر تتطلب إعادة عمل (QC)' : 'Rework Bottlenecks'}</div>
        </div>

        <div className="kpi-card success">
          <div className="kpi-icon success-bg">🚚</div>
          <div className="kpi-value">{kpis.ready_for_delivery || 0}</div>
          <div className="kpi-label">{isRtl ? 'لوحات جاهزة للتسليم والشحن' : 'Ready for Delivery'}</div>
        </div>
      </div>

      {/* Secondary Department Status Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🎨 {isRtl ? 'قسم الدهان الحراري' : 'Paint Shop Queue'}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>
            {kpis.awaiting_painting || 0} {isRtl ? 'لوحة' : 'panels'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'بانتظار الطلاء والفحص' : 'Awaiting powder coating'}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>🔍 {isRtl ? 'فحص الجودة (QC / FAT)' : 'QC Inspections'}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>
            {qc.pending_inspections || 0} {isRtl ? 'فحص معلق' : 'pending'}
          </div>
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
            ⚠️ {qc.failed_inspections || 0} {isRtl ? 'فحص مرفوض' : 'failed inspections'}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>📍 {isRtl ? 'المهام الخارجية الميدانية' : 'Active Field Visits'}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#06b6d4', marginTop: 4 }}>
            {data?.activeFieldAssignments?.length || 0} {isRtl ? 'موقع نشط' : 'sites active'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {isRtl ? 'فرق فنية بمواقع المشاريع' : 'Engineers on-site'}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>⏰ {isRtl ? 'أوامر متأخرة عن الموعد' : 'Overdue Orders'}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: (kpis.overdue_orders > 0 ? '#ef4444' : '#10b981'), marginTop: 4 }}>
            {kpis.overdue_orders || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {kpis.overdue_orders > 0 ? (isRtl ? 'يتطلب تدخل الإدارة' : 'Requires escalation') : (isRtl ? 'جميع الأوامر ضمن الجدول' : 'All on track')}
          </div>
        </div>
      </div>

      {/* Department Workloads & Bottlenecks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Workload Breakdown */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
            🏭 {isRtl ? 'توزيع عبء العمل والإنتاجية حسب الأقسام' : 'Department Workload & Active Lines'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(data?.departmentWorkload || []).map((w: any) => {
              const deptTitle = w.department === 'factory_a' ? (isRtl ? 'مصنع أ (أعمال الصاج المخصصة)' : 'Factory A (Custom Metal)') :
                                w.department === 'factory_b' ? (isRtl ? 'مصنع ب (اللوحات النمطية)' : 'Factory B (Standard Panels)') :
                                (isRtl ? 'قسم الكهرباء وتجميع اللوحات' : 'Electrical & Wiring')

              return (
                <div key={w.department} style={{ padding: 12, background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{deptTitle}</span>
                    <span className="badge badge-subtle">{w.active_count} {isRtl ? 'أمر نشط' : 'orders'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>🔧 {isRtl ? 'إعادة عمل:' : 'Rework:'} <strong style={{ color: w.rework_count > 0 ? '#ef4444' : 'inherit' }}>{w.rework_count}</strong></span>
                    <span>⏰ {isRtl ? 'متأخر:' : 'Overdue:'} <strong style={{ color: w.overdue_count > 0 ? '#ef4444' : 'inherit' }}>{w.overdue_count}</strong></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
            ⚡ {isRtl ? 'آخر التحديثات والتنقلات المرحلية اللحظية' : 'Live Real-Time Activity Feed'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(data?.recentActivity || []).map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 6, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 700, color: 'var(--accent)', marginRight: 6 }}>{a.ref}</span>
                  <span>{a.title}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{a.project_ref}</div>
                </div>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <span className="badge badge-subtle">{a.status}</span>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(a.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
