import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/users
export async function GET(req: NextRequest) {
  try {
    const res = await query(`
      SELECT p.*, e.job_title, e.annual_leave_balance, e.employment_status, e.skills
      FROM profiles p
      LEFT JOIN employees e ON p.id = e.profile_id
      ORDER BY p.full_name ASC
    `)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/users (Add new user)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      full_name,
      full_name_ar,
      email,
      role = 'technician',
      department = 'Production',
      phone = '',
      password_hash = '',
      is_active = true
    } = body

    if (!full_name || !email) {
      return NextResponse.json({ success: false, error: 'Full name and email are required' }, { status: 400 })
    }

    const userCode = `EMP-${Date.now().toString().slice(-4)}`

    // 1. Insert into profiles
    const profRes = await query(`
      INSERT INTO profiles (user_code, full_name, full_name_ar, email, role, department, phone, password_hash, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [userCode, full_name, full_name_ar || full_name, email, role, department, phone, password_hash, is_active])

    const newProfile = profRes.rows[0]

    // 2. Insert into employees
    await query(`
      INSERT INTO employees (employee_id, profile_id, full_name, full_name_ar, department, job_title, employment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
    `, [userCode, newProfile.id, full_name, full_name_ar || full_name, department, role])

    return NextResponse.json({ success: true, user: newProfile }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/users (Edit user and assign roles/permissions)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, full_name, full_name_ar, email, role, department, phone, is_active } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    const res = await query(`
      UPDATE profiles
      SET full_name = COALESCE($1, full_name),
          full_name_ar = COALESCE($2, full_name_ar),
          email = COALESCE($3, email),
          role = COALESCE($4, role),
          department = COALESCE($5, department),
          phone = COALESCE($6, phone),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [full_name, full_name_ar, email, role, department, phone, is_active, id])

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Update employees record
    await query(`
      UPDATE employees
      SET full_name = COALESCE($1, full_name),
          full_name_ar = COALESCE($2, full_name_ar),
          department = COALESCE($3, department),
          job_title = COALESCE($4, job_title)
      WHERE profile_id = $5
    `, [full_name, full_name_ar, department, role, id])

    return NextResponse.json({ success: true, user: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PUT /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/users (Delete user)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 })
    }

    await query('DELETE FROM employees WHERE profile_id = $1', [id])
    await query('DELETE FROM profiles WHERE id = $1', [id])

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/users:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
