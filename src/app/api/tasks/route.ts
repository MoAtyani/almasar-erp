import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employee_id')
    const department = searchParams.get('department')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')

    let sql = `
      SELECT t.*,
        p.reference as project_reference, p.name as project_name,
        emp.full_name as assigned_employee_name, emp.full_name_ar as assigned_employee_name_ar,
        sup.full_name as supervisor_name,
        (SELECT json_agg(tl ORDER BY tl.start_time DESC) FROM time_logs tl WHERE tl.task_id = t.id) as time_logs
      FROM technician_tasks t
      JOIN panel_projects p ON t.project_id = p.id
      LEFT JOIN profiles emp ON t.assigned_employee_id = emp.id
      LEFT JOIN profiles sup ON t.supervisor_id = sup.id
      WHERE 1=1
    `
    const params: any[] = []

    if (employeeId) {
      params.push(employeeId)
      sql += ` AND t.assigned_employee_id = $${params.length}`
    }
    if (department && department !== 'all') {
      params.push(department)
      sql += ` AND t.department = $${params.length}`
    }
    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND t.status = $${params.length}`
    }
    if (projectId) {
      params.push(projectId)
      sql += ` AND t.project_id = $${params.length}`
    }

    sql += ` ORDER BY t.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/tasks:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/tasks (Create / Assign task)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      project_id,
      order_id,
      department,
      title,
      description,
      required_deliverables,
      priority = 'medium',
      estimated_hours = 0,
      due_date,
      dependencies,
      required_skills = [],
      assigned_employee_id,
      assigned_team
    } = body

    if (!project_id || !title || !department) {
      return NextResponse.json({ success: false, error: 'Project, Title and Department are required' }, { status: 400 })
    }

    const countRes = await query('SELECT COUNT(*) FROM technician_tasks')
    const count = parseInt(countRes.rows[0].count, 10) + 1
    const taskCode = `TSK-2026-${String(count).padStart(4, '0')}`

    const insertSql = `
      INSERT INTO technician_tasks (
        task_code, project_id, order_id, department, title, description,
        required_deliverables, priority, estimated_hours, due_date,
        dependencies, required_skills, assigned_employee_id, assigned_team,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'assigned')
      RETURNING *
    `
    const res = await query(insertSql, [
      taskCode, project_id, order_id || null, department, title, description || null,
      required_deliverables || null, priority, estimated_hours, due_date || null,
      dependencies || null, required_skills, assigned_employee_id || null, assigned_team || null
    ])

    const newTask = res.rows[0]

    // Notify employee if assigned
    if (assigned_employee_id) {
      await query(`
        INSERT INTO system_notifications (recipient_id, title, title_ar, message, message_ar, category, link_url)
        VALUES ($1, 'New Task Assigned', 'مهمة عمل جديدة مسندة إليك', $2, $3, 'order_assigned', '/tasks')
      `, [
        assigned_employee_id,
        `Task ${taskCode}: ${title} has been assigned to you.`,
        `تم إسناد المهمة ${taskCode}: ${title} إليك.`
      ])
    }

    return NextResponse.json({ success: true, data: newTask })
  } catch (error: any) {
    console.error('Error in POST /api/tasks:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/tasks (Accept, update, complete, approve)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, action, user_id, completion_notes, supporting_evidence, points_awarded } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'Task ID and action are required' }, { status: 400 })
    }

    let updates: string[] = ['updated_at = NOW()']
    const params: any[] = []

    switch (action) {
      case 'accept':
        updates.push(`status = 'accepted'`, `accepted_at = NOW()`)
        break

      case 'start':
        updates.push(`status = 'in_progress'`, `actual_start = NOW()`)
        break

      case 'complete':
        updates.push(`status = 'completed'`, `actual_finish = NOW()`)
        if (completion_notes) {
          params.push(completion_notes)
          updates.push(`completion_notes = $${params.length}`)
        }
        if (supporting_evidence) {
          params.push(JSON.stringify(supporting_evidence))
          updates.push(`supporting_evidence = $${params.length}`)
        }
        break

      case 'supervisor_approve':
        updates.push(`status = 'verified'`, `supervisor_approved = true`, `supervisor_approved_at = NOW()`)
        params.push(user_id)
        updates.push(`supervisor_id = $${params.length}`)
        if (points_awarded) {
          params.push(points_awarded)
          updates.push(`points_awarded = $${params.length}`)
        }
        break

      case 'reassign':
        if (body.assigned_employee_id) {
          params.push(body.assigned_employee_id)
          updates.push(`assigned_employee_id = $${params.length}`, `status = 'assigned'`)
        }
        break

      default:
        return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
    }

    params.push(id)
    const sql = `UPDATE technician_tasks SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`
    const res = await query(sql, params)

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PATCH /api/tasks:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
