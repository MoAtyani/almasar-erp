import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
export const dynamic = 'force-dynamic'

// GET /api/performance
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const department = searchParams.get('department')
    const timeframe = searchParams.get('timeframe') || 'monthly' // monthly | annual

    let sql = `
      SELECT 
        emp.id as employee_id,
        emp.full_name,
        emp.full_name_ar,
        emp.department,
        emp.reward_points,
        COUNT(t.id) as tasks_assigned,
        COUNT(t.id) FILTER (WHERE t.status IN ('completed', 'verified')) as tasks_completed,
        COUNT(t.id) FILTER (WHERE t.status IN ('completed', 'verified') AND (t.actual_finish <= t.due_date OR t.due_date IS NULL)) as tasks_on_time,
        ROUND(COALESCE(AVG(t.estimated_hours), 0), 2) as avg_estimated_hours,
        ROUND(COALESCE(AVG(
          (SELECT SUM(duration_seconds)/3600.0 FROM time_logs tl WHERE tl.task_id = t.id)
        ), 0), 2) as avg_actual_hours,
        COUNT(t.id) FILTER (WHERE t.status = 'rework') as rework_tasks_count,
        ROUND(COALESCE(
          (COUNT(t.id) FILTER (WHERE t.status IN ('completed', 'verified'))::FLOAT / NULLIF(COUNT(t.id), 0)) * 100, 
        0)::NUMERIC, 1) as completion_rate_pct,
        ROUND(COALESCE(
          (COUNT(t.id) FILTER (WHERE t.status IN ('completed', 'verified') AND (t.actual_finish <= t.due_date OR t.due_date IS NULL))::FLOAT / 
           NULLIF(COUNT(t.id) FILTER (WHERE t.status IN ('completed', 'verified')), 0)) * 100, 
        100)::NUMERIC, 1) as on_time_rate_pct
      FROM profiles emp
      LEFT JOIN technician_tasks t ON t.assigned_employee_id = emp.id
      WHERE emp.role IN ('technician', 'engineer')
    `
    const params: any[] = []
    if (employeeId) {
      params.push(employeeId)
      sql += ` AND emp.id = $${params.length}`
    }
    if (department && department !== 'all') {
      params.push(department)
      sql += ` AND emp.department = $${params.length}`
    }

    sql += ` GROUP BY emp.id, emp.full_name, emp.full_name_ar, emp.department, emp.reward_points ORDER BY tasks_completed DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/performance:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
