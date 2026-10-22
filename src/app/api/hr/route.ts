import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

function normalizeRole(role?: string): string {
  const map: Record<string, string> = {
    design_engineer: 'designer',
    production_supervisor: 'production_manager',
    supervisor: 'production_manager',
    qc_technician: 'qc_inspector',
    inventory_clerk: 'warehouse_officer',
    sales: 'sales_officer',
    hr: 'hr_officer',
    finance: 'finance_officer',
    general_manager: 'company_owner'
  }
  const clean = role ? role.toLowerCase() : 'technician'
  return map[clean] || clean
}

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

    if (action === 'create_user' || action === 'create_employee') {
      const {
        full_name,
        full_name_ar,
        email,
        phone,
        role: rawRole = 'technician',
        department = 'Production',
        job_title = 'Technician',
        basic_salary = 4500,
        housing_allowance = 1000,
        transport_allowance = 500
      } = body

      const role = normalizeRole(rawRole)

      if (!full_name || !email) {
        return NextResponse.json({ success: false, error: 'Full name and email are required' }, { status: 400 })
      }

      const userCode = `EMP-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`

      // Create Profile
      const profRes = await query(`
        INSERT INTO profiles (user_code, full_name, full_name_ar, email, role, department, phone, is_active, reward_points)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, 100)
        RETURNING *
      `, [userCode, full_name, full_name_ar || full_name, email, role, department, phone || null])
      const prof = profRes.rows[0]

      // Create Employee Record
      let empRecord = null
      try {
        const empRes = await query(`
          INSERT INTO employees (
            profile_id, employee_code, full_name, full_name_ar, department, job_title,
            employment_status
          ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
          RETURNING *
        `, [prof.id, userCode, full_name, full_name_ar || full_name, department, job_title])
        empRecord = empRes.rows[0]
      } catch (e: any) {
        console.warn('Employee record creation warning:', e.message)
      }

      return NextResponse.json({ success: true, data: prof, profile: prof, employee: empRecord })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/hr:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/hr - Edit User / Employee
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      profile_id,
      full_name,
      full_name_ar,
      email,
      phone,
      role,
      department,
      job_title,
      basic_salary,
      housing_allowance,
      transport_allowance,
      employment_status,
      is_active
    } = body

    let targetProfId = profile_id || id
    let targetEmpId = id

    const profCheck = await query('SELECT id FROM profiles WHERE id = $1', [targetProfId])
    if (profCheck.rows.length === 0) {
      const empCheck = await query('SELECT profile_id FROM employees WHERE id = $1', [id])
      if (empCheck.rows.length > 0) targetProfId = empCheck.rows[0].profile_id
    }

    if (targetProfId) {
      await query(`
        UPDATE profiles
        SET full_name = COALESCE($1, full_name),
            full_name_ar = COALESCE($2, full_name_ar),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            role = COALESCE($5, role),
            department = COALESCE($6, department),
            is_active = COALESCE($7, is_active),
            updated_at = NOW()
        WHERE id = $8
      `, [
        full_name || null,
        full_name_ar || null,
        email || null,
        phone || null,
        role ? normalizeRole(role) : null,
        department || null,
        is_active !== undefined ? Boolean(is_active) : null,
        targetProfId
      ])
    }

    if (targetEmpId) {
      try {
        await query(`
          UPDATE employees
          SET full_name = COALESCE($1, full_name),
              full_name_ar = COALESCE($2, full_name_ar),
              department = COALESCE($3, department),
              job_title = COALESCE($4, job_title),
              employment_status = COALESCE($5, employment_status)
          WHERE id = $6 OR profile_id = $6
        `, [
          full_name || null,
          full_name_ar || null,
          department || null,
          job_title || null,
          employment_status || null,
          targetEmpId
        ])
      } catch (e: any) {
        console.warn('Employee record update warning:', e.message)
      }
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' })
  } catch (error: any) {
    console.error('Error in PUT /api/hr:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/hr - Delete User / Employee
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const profileId = searchParams.get('profile_id')

    if (!id && !profileId) {
      return NextResponse.json({ success: false, error: 'Employee ID or Profile ID is required' }, { status: 400 })
    }

    if (id) {
      const empRes = await query('SELECT profile_id FROM employees WHERE id = $1', [id])
      const profId = empRes.rows.length > 0 ? empRes.rows[0].profile_id : null

      await query('DELETE FROM attendance_logs WHERE employee_id = $1', [id])
      await query('DELETE FROM leave_requests WHERE employee_id = $1', [id])
      await query('DELETE FROM employee_salaries WHERE employee_id = $1', [id])
      await query('DELETE FROM employee_advances WHERE employee_id = $1', [id])
      await query('DELETE FROM employees WHERE id = $1', [id])

      if (profId) {
        await query('DELETE FROM profiles WHERE id = $1', [profId])
      }
    } else if (profileId) {
      await query('DELETE FROM employees WHERE profile_id = $1', [profileId])
      await query('DELETE FROM profiles WHERE id = $1', [profileId])
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/hr:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

