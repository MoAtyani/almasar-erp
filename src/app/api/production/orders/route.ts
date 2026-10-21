import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/production/orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const stage = searchParams.get('stage')
    const projectId = searchParams.get('project_id')

    let sql = `
      SELECT o.*, 
        p.reference as project_reference, 
        p.name as project_name, 
        p.customer_name,
        emp.full_name as assigned_employee_name,
        acc.full_name as accepted_by_name,
        (SELECT json_agg(h ORDER BY h.created_at DESC) FROM production_order_history h WHERE h.order_id = o.id) as status_history
      FROM production_orders o
      JOIN panel_projects p ON o.project_id = p.id
      LEFT JOIN profiles emp ON o.assigned_employee_id = emp.id
      LEFT JOIN profiles acc ON o.accepted_by = acc.id
      WHERE 1=1
    `
    const params: any[] = []

    if (department && department !== 'all') {
      params.push(department)
      sql += ` AND o.department = $${params.length}`
    }

    if (stage && stage !== 'all') {
      params.push(stage)
      sql += ` AND o.stage = $${params.length}`
    }

    if (projectId) {
      params.push(projectId)
      sql += ` AND o.project_id = $${params.length}`
    }

    sql += ` ORDER BY o.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/production/orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/production/orders (Create order)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      project_id,
      department,
      item_description,
      quantity = 1,
      requires_painting = false,
      planned_start,
      deadline,
      assigned_employee_id,
      user_id
    } = body

    if (!project_id || !department || !item_description) {
      return NextResponse.json({ success: false, error: 'Project, department and description are required' }, { status: 400 })
    }

    const countRes = await query('SELECT COUNT(*) FROM production_orders WHERE department = $1', [department])
    const count = parseInt(countRes.rows[0].count, 10) + 1
    const deptPrefix = department === 'factory_a' ? 'FA' : department === 'factory_b' ? 'FB' : 'EL'
    const orderNumber = `ORD-${deptPrefix}-2026-${String(count).padStart(3, '0')}`

    const insertSql = `
      INSERT INTO production_orders (
        order_number, project_id, department, item_description, quantity,
        requires_painting, planned_start, deadline, assigned_employee_id,
        stage, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'awaiting_acceptance', $10)
      RETURNING *
    `
    const res = await query(insertSql, [
      orderNumber, project_id, department, item_description, quantity,
      requires_painting, planned_start || null, deadline || null,
      assigned_employee_id || null, user_id || null
    ])

    const order = res.rows[0]

    // Record initial status history
    await query(`
      INSERT INTO production_order_history (order_id, from_stage, to_stage, changed_by, comment)
      VALUES ($1, NULL, 'awaiting_acceptance', $2, 'Order created and issued to department')
    `, [order.id, user_id || null])

    return NextResponse.json({ success: true, data: order })
  } catch (error: any) {
    console.error('Error in POST /api/production/orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/production/orders (Transition order stages, accept, start, complete, paint, QC)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, action, user_id, comment, requires_painting, delay_reason, notes } = body

    if (!id || !action) {
      return NextResponse.json({ success: false, error: 'Order ID and action are required' }, { status: 400 })
    }

    const currentRes = await query('SELECT * FROM production_orders WHERE id = $1', [id])
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    const order = currentRes.rows[0]
    const fromStage = order.stage
    let toStage = order.stage
    let updateFields: string[] = ['updated_at = NOW()']
    const params: any[] = []

    switch (action) {
      case 'accept':
        toStage = 'accepted'
        params.push(user_id || null)
        updateFields.push(`accepted_at = NOW()`, `accepted_by = $${params.length}`, `stage = 'accepted'`)
        break

      case 'start_work':
        toStage = 'in_progress'
        updateFields.push(`actual_start = NOW()`, `stage = 'in_progress'`)
        break

      case 'complete_manufacturing':
        toStage = 'manufacturing_complete'
        updateFields.push(`actual_completion = NOW()`, `stage = 'manufacturing_complete'`)
        break

      case 'send_to_paint':
        toStage = 'painting'
        updateFields.push(`stage = 'painting'`, `paint_status = 'in_painting'`)
        // Also queue in QC for paint inspection
        await query(`
          INSERT INTO qc_queue (inspection_number, department, order_id, project_id, status, notes)
          VALUES ($1, 'painting', $2, $3, 'pending', 'Paint thickness, adhesion and color RAL inspection')
        `, [`QC-PNT-${order.order_number}`, order.id, order.project_id])
        break

      case 'bypass_painting':
        // Allowed when painting is optional or not required
        toStage = 'ready_for_delivery'
        updateFields.push(`stage = 'ready_for_delivery'`, `requires_painting = false`)
        break

      case 'mark_ready_delivery':
        toStage = 'ready_for_delivery'
        updateFields.push(`stage = 'ready_for_delivery'`)
        break

      case 'pack':
        toStage = 'packed'
        updateFields.push(`stage = 'packed'`)
        break

      case 'dispatch':
        toStage = 'dispatched'
        updateFields.push(`stage = 'dispatched'`)
        break

      case 'send_to_qc':
        toStage = 'qc_inspection'
        updateFields.push(`stage = 'qc_inspection'`)
        // Queue in QC
        await query(`
          INSERT INTO qc_queue (inspection_number, department, order_id, project_id, status, notes)
          VALUES ($1, $2, $3, $4, 'pending', 'Comprehensive electrical and dielectric FAT testing')
        `, [`QC-${order.order_number}`, order.department, order.id, order.project_id])
        break

      case 'report_delay':
        if (delay_reason) {
          params.push(delay_reason)
          updateFields.push(`delay_reason = $${params.length}`)
        }
        break

      default:
        return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 })
    }

    params.push(id)
    const sql = `UPDATE production_orders SET ${updateFields.join(', ')} WHERE id = $${params.length} RETURNING *`
    const res = await query(sql, params)
    const updated = res.rows[0]

    // Record history
    await query(`
      INSERT INTO production_order_history (order_id, from_stage, to_stage, changed_by, comment)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, fromStage, toStage, user_id || null, comment || `Action: ${action}`])

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error in PATCH /api/production/orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
