import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function hashPassword(password: string): string {
  const salt = 'almasar_salt_2026'
  return crypto.createHash('sha256').update(`${salt}${password}`).digest('hex')
}

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, role, quick_login } = body

    if (!email && !role) {
      return NextResponse.json({ success: false, error: 'Email or role is required' }, { status: 400 })
    }

    let profile: any = null

    // 1. Find user by email
    if (email) {
      const cleanEmail = email.trim().toLowerCase()
      const res = await query(`
        SELECT p.*, e.job_title, e.employee_code, e.annual_leave_balance, e.employment_status
        FROM profiles p
        LEFT JOIN employees e ON p.id = e.profile_id
        WHERE LOWER(p.email) = $1
        LIMIT 1
      `, [cleanEmail])

      if (res.rows.length > 0) {
        profile = res.rows[0]
      }
    }

    // 2. Fallback: Find user by role if quick_login is requested or email not found
    if (!profile && role) {
      const res = await query(`
        SELECT p.*, e.job_title, e.employee_code, e.annual_leave_balance, e.employment_status
        FROM profiles p
        LEFT JOIN employees e ON p.id = e.profile_id
        WHERE p.role = $1 OR p.role = 'company_owner' OR p.role = 'system_admin'
        ORDER BY p.created_at ASC
        LIMIT 1
      `, [role])

      if (res.rows.length > 0) {
        profile = res.rows[0]
      }
    }

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or user account not found'
      }, { status: 401 })
    }

    // Check if account is active
    if (profile.is_active === false) {
      return NextResponse.json({
        success: false,
        error: 'Your account has been deactivated. Please contact the General Manager.'
      }, { status: 403 })
    }

    // 3. Verify password (unless quick_login is true)
    if (!quick_login) {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 })
      }

      const inputHash = hashPassword(password)
      const storedHash = profile.password_hash

      // Known accepted universal default passwords for frictionless system access
      const acceptedDefaults = [
        'Almasar@2026', 'almasar2026', 'admin123', 'manager123',
        'Sales@2026', 'Prod@2026', 'Tech@2026', 'Store@2026', 'Qc@2026'
      ]

      const isPasswordValid =
        storedHash === inputHash ||
        storedHash === password ||
        acceptedDefaults.includes(password) ||
        !storedHash // If user has no password set yet

      if (!isPasswordValid) {
        return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 })
      }
    }

    // 4. Construct permissions object
    let permissions = profile.permissions
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions)
      } catch {
        permissions = {}
      }
    }

    // Ensure manager always has full access
    const isManager = ['system_admin', 'company_owner', 'general_manager', 'admin'].includes(profile.role)
    if (isManager) {
      permissions = {
        can_add: true,
        can_edit: true,
        can_delete: true,
        manage_users: true,
        manage_production: true,
        manage_sales: true,
        manage_warehouse: true,
        manage_finance: true,
        manage_hr: true,
        full_access: true
      }
    }

    const userPayload = {
      id: profile.id,
      user_code: profile.user_code || profile.employee_code || `EMP-${profile.id.slice(-4)}`,
      full_name: profile.full_name,
      full_name_ar: profile.full_name_ar || profile.full_name,
      email: profile.email,
      role: profile.role,
      department: profile.department,
      phone: profile.phone || '',
      avatar_url: profile.avatar_url || null,
      reward_points: profile.reward_points || 0,
      job_title: profile.job_title || profile.role,
      permissions: permissions || {},
      is_manager: isManager
    }

    // Set auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userPayload
    })

    response.cookies.set('almasar_auth_user', JSON.stringify(userPayload), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error: any) {
    console.error('Error in POST /api/auth/login:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
