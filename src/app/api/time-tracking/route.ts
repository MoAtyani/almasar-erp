import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/time-tracking (Check current active timer for employee)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    let employeeId = searchParams.get('employee_id')
    const taskId = searchParams.get('task_id')

    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    if (employeeId && !isUuid(employeeId)) {
      const pRes = await query('SELECT id FROM profiles LIMIT 1')
      employeeId = pRes.rows.length > 0 ? pRes.rows[0].id : null
    }

    if (!employeeId && !taskId) {
      return NextResponse.json({ success: true, activeTimer: null, history: [] })
    }

    let sql = `
      SELECT tl.*, t.task_code, t.title as task_title, p.reference as project_reference
      FROM time_logs tl
      JOIN technician_tasks t ON tl.task_id = t.id
      JOIN panel_projects p ON t.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    if (employeeId) {
      params.push(employeeId)
      sql += ` AND tl.employee_id = $${params.length}`
    }
    if (taskId) {
      params.push(taskId)
      sql += ` AND tl.task_id = $${params.length}`
    }

    sql += ` ORDER BY tl.start_time DESC LIMIT 50`

    const res = await query(sql, params)
    const activeTimer = res.rows.find(r => r.state === 'active')

    return NextResponse.json({
      success: true,
      activeTimer: activeTimer || null,
      history: res.rows
    })
  } catch (error: any) {
    console.error('Error in GET /api/time-tracking:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/time-tracking (Start timer, Pause, Resume, Stop, Correct)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, task_id, employee_id, user_id, correction_reason, new_duration_seconds } = body

    if (!action || !employee_id) {
      return NextResponse.json({ success: false, error: 'Action and Employee ID are required' }, { status: 400 })
    }

    if (action === 'start') {
      if (!task_id) {
        return NextResponse.json({ success: false, error: 'Task ID is required to start timer' }, { status: 400 })
      }

      // Enforce: Prevent overlapping active timers server-side!
      const activeCheck = await query(`
        SELECT id, task_id FROM time_logs 
        WHERE employee_id = $1 AND state = 'active'
      `, [employee_id])

      if (activeCheck.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'An active timer is already running for this employee. Pause or complete it before starting a new one.',
          activeTimerId: activeCheck.rows[0].id
        }, { status: 409 })
      }

      // Start timer
      const insertRes = await query(`
        INSERT INTO time_logs (task_id, employee_id, start_time, state)
        VALUES ($1, $2, NOW(), 'active')
        RETURNING *
      `, [task_id, employee_id])

      // Also ensure task status is in_progress
      await query(`UPDATE technician_tasks SET status = 'in_progress', actual_start = COALESCE(actual_start, NOW()) WHERE id = $1`, [task_id])

      return NextResponse.json({ success: true, timer: insertRes.rows[0] })
    }

    if (action === 'pause' || action === 'stop') {
      // Find active timer
      const activeRes = await query(`
        SELECT * FROM time_logs 
        WHERE employee_id = $1 AND state = 'active'
        ORDER BY start_time DESC LIMIT 1
      `, [employee_id])

      if (activeRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'No active timer found to pause/stop' }, { status: 404 })
      }

      const activeTimer = activeRes.rows[0]
      const newState = action === 'pause' ? 'paused' : 'completed'

      // Compute elapsed seconds server-side
      const updateRes = await query(`
        UPDATE time_logs SET
          end_time = NOW(),
          duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time))::INTEGER,
          state = $1
        WHERE id = $2
        RETURNING *
      `, [newState, activeTimer.id])

      return NextResponse.json({ success: true, timer: updateRes.rows[0] })
    }

    if (action === 'correct') {
      const { timer_id, new_start_time, new_end_time, reason } = body
      if (!timer_id || !reason) {
        return NextResponse.json({ success: false, error: 'Timer ID and justification reason required for correction' }, { status: 400 })
      }

      const originalRes = await query('SELECT * FROM time_logs WHERE id = $1', [timer_id])
      if (originalRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Timer record not found' }, { status: 404 })
      }
      const orig = originalRes.rows[0]

      const correctRes = await query(`
        UPDATE time_logs SET
          original_start_time = COALESCE(original_start_time, start_time),
          original_end_time = COALESCE(original_end_time, end_time),
          start_time = COALESCE($1, start_time),
          end_time = COALESCE($2, end_time),
          duration_seconds = COALESCE($3, duration_seconds),
          is_correction = true,
          correction_reason = $4,
          corrected_by = $5
        WHERE id = $6
        RETURNING *
      `, [new_start_time || null, new_end_time || null, new_duration_seconds || null, reason, user_id || null, timer_id])

      // Log correction in audit logs
      await query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
        VALUES ($1, 'correct_time_log', 'time_logs', $2, $3, $4)
      `, [user_id || null, timer_id, JSON.stringify(orig), JSON.stringify(correctRes.rows[0])])

      return NextResponse.json({ success: true, timer: correctRes.rows[0] })
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/time-tracking:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
