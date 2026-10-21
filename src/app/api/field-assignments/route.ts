import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/field-assignments
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('client')

    let sql = `
      SELECT fa.*,
        p.reference as project_reference, p.name as project_name
      FROM field_assignments fa
      LEFT JOIN panel_projects p ON fa.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND fa.status = $${params.length}`
    }
    if (clientId) {
      params.push(`%${clientId}%`)
      sql += ` AND fa.client_name ILIKE $${params.length}`
    }

    sql += ` ORDER BY fa.visit_date DESC, fa.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/field-assignments:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/field-assignments (Create assignment)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      client_name,
      project_id,
      site_location,
      address,
      visit_date,
      planned_time,
      assigned_personnel = [],
      electrical_department_involved = true,
      job_requirements,
      work_description,
      expected_duration_hours = 4,
      required_equipment,
      user_id
    } = body

    if (!client_name || !site_location || !visit_date || !work_description) {
      return NextResponse.json({ success: false, error: 'Client, location, date, and description required' }, { status: 400 })
    }

    const countRes = await query('SELECT COUNT(*) FROM field_assignments')
    const count = parseInt(countRes.rows[0].count, 10) + 1
    const assignmentRef = `FLD-2026-${String(count).padStart(4, '0')}`

    const insertSql = `
      INSERT INTO field_assignments (
        assignment_ref, client_name, project_id, site_location, address,
        visit_date, planned_time, assigned_personnel, electrical_department_involved,
        job_requirements, work_description, expected_duration_hours,
        required_equipment, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'scheduled', $14)
      RETURNING *
    `
    const res = await query(insertSql, [
      assignmentRef, client_name, project_id || null, site_location, address || null,
      visit_date, planned_time || null, assigned_personnel, electrical_department_involved,
      job_requirements || null, work_description, expected_duration_hours,
      required_equipment || null, user_id || null
    ])

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in POST /api/field-assignments:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/field-assignments (Update status, arrival/departure, work completed)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      status, // 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'follow_up_required'
      actual_arrival,
      actual_departure,
      work_completed,
      issues_found,
      materials_used,
      recommendations,
      follow_up_actions
    } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Assignment ID is required' }, { status: 400 })
    }

    let updates: string[] = ['updated_at = NOW()']
    const params: any[] = []

    if (status) {
      params.push(status)
      updates.push(`status = $${params.length}`)
      if (status === 'in_progress') {
        updates.push(`actual_arrival = COALESCE(actual_arrival, NOW())`)
      } else if (status === 'completed') {
        updates.push(`actual_departure = COALESCE(actual_departure, NOW())`)
      }
    }

    if (work_completed) {
      params.push(work_completed)
      updates.push(`work_completed = $${params.length}`)
    }
    if (issues_found) {
      params.push(issues_found)
      updates.push(`issues_found = $${params.length}`)
    }
    if (materials_used) {
      params.push(materials_used)
      updates.push(`materials_used = $${params.length}`)
    }
    if (recommendations) {
      params.push(recommendations)
      updates.push(`recommendations = $${params.length}`)
    }
    if (follow_up_actions) {
      params.push(follow_up_actions)
      updates.push(`follow_up_actions = $${params.length}`)
    }

    params.push(id)
    const sql = `UPDATE field_assignments SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`
    const res = await query(sql, params)

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PATCH /api/field-assignments:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
