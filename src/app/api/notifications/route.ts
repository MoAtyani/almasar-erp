import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/notifications
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role')

    let sql = `
      SELECT * FROM system_notifications
      WHERE 1=1
    `
    const params: any[] = []

    if (userId && role) {
      params.push(userId, role)
      sql += ` AND (recipient_id = $1 OR target_role = $2 OR (recipient_id IS NULL AND target_role IS NULL))`
    } else if (userId) {
      params.push(userId)
      sql += ` AND (recipient_id = $1 OR recipient_id IS NULL)`
    } else if (role) {
      params.push(role)
      sql += ` AND (target_role = $1 OR target_role IS NULL)`
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`

    const res = await query(sql, params)
    const unreadCount = res.rows.filter(r => !r.is_read).length

    return NextResponse.json({ success: true, unreadCount, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/notifications (Mark as read)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, mark_all_read, user_id } = body

    if (mark_all_read && user_id) {
      await query(`UPDATE system_notifications SET is_read = true WHERE recipient_id = $1 OR recipient_id IS NULL`, [user_id])
      return NextResponse.json({ success: true })
    }

    if (id) {
      await query(`UPDATE system_notifications SET is_read = true WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Notification ID or mark_all_read required' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
