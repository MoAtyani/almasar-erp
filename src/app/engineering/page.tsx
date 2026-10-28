'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { formatDate } from '@/lib/constants'
import { useLanguage } from '@/context/LanguageContext'

const MOCK_ENG_TASKS = [
  {
    id: 'eng-1',
    name: 'Single Line Diagram (SLD) & Protection Curve Coordination',
    name_ar: 'المخطط أحادي الخط (SLD) وتنسيق منحنيات الحماية والترحيل',
    project_ref: 'PJ-2026-001',
    customer: 'Saudi Electricity Co. (SEC)',
    engineer: 'Eng. Ahmed Al-Mansoor (م. أحمد المنصور)',
    status: 'approved',
    stage: 'Design Approval',
    progress: 100,
    created_at: '2026-10-02',
  },
  {
    id: 'eng-2',
    name: 'AutoCAD General Arrangement (GA) & Busbar Bending Schematics',
    name_ar: 'مخطط كاد العام ومقاسات ثني البسبار النحاسي Form 4b',
    project_ref: 'PJ-2026-001',
    customer: 'Saudi Electricity Co. (SEC)',
    engineer: 'Eng. Ahmed Al-Mansoor',
    status: 'in_progress',
    stage: 'Detailed Engineering',
    progress: 85,
    created_at: '2026-10-05',
  },
  {
    id: 'eng-3',
    name: 'MCC Motor Feeder Thermal Dissipation & Ventilation Sizing',
    name_ar: 'حسابات التبديد الحراري وتهوية خلايا قواطع المحركات MCC',
    project_ref: 'PJ-2026-002',
    customer: 'Al-Bawani Contracting',
    engineer: 'Eng. Ahmed Al-Mansoor',
    status: 'in_progress',
    stage: 'Design Review',
    progress: 60,
    created_at: '2026-10-10',
  },
  {
    id: 'eng-4',
    name: 'Bill of Quantities (BoQ) & Switchgear Cost Estimation',
    name_ar: 'إعداد جدول الكميات (BoQ) وتخمين تكلفة اللوحة والمكونات',
    project_ref: 'PJ-2026-004',
    customer: 'Nesma Infrastructure',
    engineer: 'Eng. Yousef Basbous',
    status: 'started',
    stage: 'Estimation Phase',
    progress: 40,
    created_at: '2026-10-14',
  },
]

export default function EngineeringPage() {
  const { lang, isRtl } = useLanguage()
  const [tasks, setTasks] = useState(MOCK_ENG_TASKS)
  const [search, setSearch] = useState('')

  const filtered = tasks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.name_ar.includes(search) ||
    t.project_ref.toLowerCase().includes(search.toLowerCase())
  )

  const approvedCount = tasks.filter(t => t.status === 'approved').length
  const reviewCount = tasks.filter(t => t.status === 'in_progress').length
  const startedCount = tasks.filter(t => t.status === 'started').length

  return (
    <AppLayout title="Engineering & Design" titleAr="الهندسة والتصميم">
      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card success">
          <div className="kpi-icon success-bg">✓</div>
          <div className="kpi-value">{approvedCount}</div>
          <div className="kpi-label">{isRtl ? 'المخططات المعتمدة من العميل' : 'Client Approved'}</div>
        </div>
        <div className="kpi-card warning">
          <div className="kpi-icon warning-bg">📐</div>
          <div className="kpi-value">{reviewCount}</div>
          <div className="kpi-label">{isRtl ? 'قيد المراجعة والتدقيق' : 'Design Review'}</div>
        </div>
        <div className="kpi-card accent">
          <div className="kpi-icon accent-bg">⚡</div>
          <div className="kpi-value">{startedCount}</div>
          <div className="kpi-label">{isRtl ? 'تصاميم قيد البدء' : 'Design Started'}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card" style={{ marginTop: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>
            {isRtl ? 'جدول المهام والمخططات الهندسية' : 'Engineering Submittals & Schematics'}
          </div>
          <input
            type="text"
            className="input"
            style={{ width: 300 }}
            placeholder={isRtl ? '...بحث في المخططات أو المشاريع' : 'Search engineering tasks...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isRtl ? 'المهمة الهندسية' : 'TASK'}</th>
                <th>{isRtl ? 'المشروع' : 'PROJECT'}</th>
                <th>{isRtl ? 'المهندس المسؤول' : 'ENGINEER'}</th>
                <th>{isRtl ? 'مرحلة التصميم' : 'STAGE'}</th>
                <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                <th>{isRtl ? 'نسبة الإنجاز' : 'PROGRESS'}</th>
                <th>{isRtl ? 'تاريخ الإنشاء' : 'CREATED'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(task => (
                <tr key={task.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{isRtl ? task.name_ar : task.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isRtl ? task.name : task.name_ar}</div>
                  </td>
                  <td>
                    <span className="badge badge-subtle">{task.project_ref}</span>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{task.customer}</div>
                  </td>
                  <td>{task.engineer}</td>
                  <td>{task.stage}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: task.status === 'approved' ? '#22c55e22' : '#0ea5e922',
                        color: task.status === 'approved' ? '#22c55e' : '#0ea5e9',
                      }}
                    >
                      {task.status === 'approved' ? (isRtl ? 'معتمد' : 'Approved') : (isRtl ? 'جاري العمل' : 'In Progress')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-bar-wrapper" style={{ width: 80 }}>
                        <div className="progress-bar" style={{ width: `${task.progress}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{task.progress}%</span>
                    </div>
                  </td>
                  <td>{formatDate(task.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
