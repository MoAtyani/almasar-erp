import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/hr
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'employees' // 'employees' | 'leave' | 'attendance' | 'recruitment'

    if (view === 'leave') {
      const res = await query(`
        SELECT l.*, e.full_name as employee_name, e.full_name_ar as employee_name_ar, e.department,
          rev.full_name as reviewed_by_name
        FROM leave_requests l
        JOIN employees e ON l.employee_id = e.id
        LEFT JOIN profiles rev ON l.reviewed_by = rev.id
        ORDER BY l.created_at DESC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    if (view === 'attendance') {
      const res = await query(`
        SELECT a.*, e.full_name as employee_name, e.department
        FROM attendance_logs a
        JOIN employees e ON a.employee_id = e.id
        ORDER BY a.log_date DESC, a.check_in DESC
        LIMIT 100
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    if (view === 'recruitment') {
      const vacancies = await query('SELECT * FROM recruitment_vacancies ORDER BY created_at DESC')
      const candidates = await query(`
        SELECT c.*, v.title as vacancy_title
        FROM recruitment_candidates c
        LEFT JOIN recruitment_vacancies v ON c.vacancy_id = v.id
        ORDER BY c.created_at DESC
      `)
      return NextResponse.json({
        success: true,
        vacancies: vacancies.rows,
        candidates: candidates.rows
      })
    }

    // Default: employees
    const empRes = await query(`
      SELECT e.*, p.role as system_role, p.reward_points, mgr.full_name as manager_name
      FROM employees e
      LEFT JOIN profiles p ON e.profile_id = p.id
      LEFT JOIN profiles mgr ON e.manager_id = mgr.id
      ORDER BY e.full_name ASC
    `)
    return NextResponse.json({ success: true, data: empRes.rows })
  } catch (error: any) {
    console.error('Error in GET /api/hr:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/hr (Request leave, approve leave, create vacancy, update candidate)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'request_leave') {
      const { employee_id, leave_type, start_date, end_date, days_count, reason } = body
      if (!employee_id || !leave_type || !start_date || !end_date) {
        return NextResponse.json({ success: false, error: 'Employee, leave type, and dates are required' }, { status: 400 })
      }

      const res = await query(`
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days_count, reason, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
      `, [employee_id, leave_type, start_date, end_date, days_count || 1, reason || null])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    if (action === 'approve_leave') {
      const { request_id, decision, user_id } = body // decision: 'approved' | 'rejected'
      if (!request_id || !decision) {
        return NextResponse.json({ success: false, error: 'Request ID and decision are required' }, { status: 400 })
      }

      const currentRes = await query('SELECT * FROM leave_requests WHERE id = $1', [request_id])
      if (currentRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 })
      }
      const reqRecord = currentRes.rows[0]

      const updateRes = await query(`
        UPDATE leave_requests SET
          status = $1,
          reviewed_by = $2,
          reviewed_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [decision, user_id || null, request_id])

      // If approved, deduct leave balance
      if (decision === 'approved' && reqRecord.leave_type === 'annual') {
        await query(`
          UPDATE employees SET annual_leave_balance = annual_leave_balance - $1
          WHERE id = $2
        `, [reqRecord.days_count, reqRecord.employee_id])
      }

      return NextResponse.json({ success: true, data: updateRes.rows[0] })
    }

    if (action === 'log_attendance') {
      const { employee_id, check_in, check_out, shift_hours, status, notes } = body
      const res = await query(`
        INSERT INTO attendance_logs (employee_id, log_date, check_in, check_out, shift_hours, status, notes)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
        RETURNING *
      `, [employee_id, check_in || new Date(), check_out || null, shift_hours || 8.0, status || 'present', notes || null])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/hr:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
