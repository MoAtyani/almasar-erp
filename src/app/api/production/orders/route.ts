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
      user_id,
      cover_type = 'standard',
      receipt_status = 'receiving',
      is_new_type = false,
      required_measurement = '',
      fixed_measurements = '',
      cable_tray_bend = '',
      details_notes = ''
    } = body

    if (!project_id || !department || !item_description) {
      return NextResponse.json({ success: false, error: 'Project, department and description are required' }, { status: 400 })
    }

    const countRes = await query('SELECT COUNT(*) FROM production_orders WHERE department = $1', [department])
    const count = parseInt(countRes.rows[0].count, 10) + 1
    
    let deptPrefix = 'ORD'
    if (department === 'factory_a') deptPrefix = 'FA'
    else if (department === 'factory_b') deptPrefix = 'FB'
    else if (department === 'electrical') deptPrefix = 'EL'
    else if (department === 'casting') deptPrefix = 'CAST'
    else if (department === 'laser') deptPrefix = 'LAS'
    else if (department === 'painting') deptPrefix = 'PNT'

    const orderNumber = `ORD-${deptPrefix}-2026-${String(count).padStart(3, '0')}`

    const initialStage = department === 'casting' ? (receipt_status === 'completed' ? 'completed' : 'receiving')
      : department === 'laser' ? 'awaiting_materials'
      : department === 'painting' ? 'receiving'
      : 'awaiting_acceptance'

    const insertSql = `
      INSERT INTO production_orders (
        order_number, project_id, department, item_description, quantity,
        requires_painting, planned_start, deadline, assigned_employee_id,
        stage, created_by, cover_type, receipt_status, is_new_type,
        required_measurement, fixed_measurements, cable_tray_bend, details_notes, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `
    const res = await query(insertSql, [
      orderNumber, project_id, department, item_description, quantity,
      requires_painting, planned_start || null, deadline || null,
      assigned_employee_id || null, initialStage, user_id || null,
      cover_type, receipt_status, Boolean(is_new_type),
      required_measurement, fixed_measurements, cable_tray_bend, details_notes, details_notes
    ])

    const order = res.rows[0]

    // Record initial status history
    try {
      await query(`
        INSERT INTO production_order_history (order_id, from_stage, to_stage, changed_by, comment)
        VALUES ($1, NULL, $2, $3, 'Order created and registered in department')
      `, [order.id, initialStage, user_id || null])
    } catch (e) {
      // ignore history err
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error: any) {
    console.error('Error in POST /api/production/orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/production/orders
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id, action, user_id, comment, requires_painting, delay_reason, notes,
      receipt_status, stage, cover_type, is_new_type, required_measurement,
      fixed_measurements, cable_tray_bend, details_notes, quantity, deadline, item_description
    } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    const currentRes = await query('SELECT * FROM production_orders WHERE id = $1', [id])
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }
    const order = currentRes.rows[0]
    let toStage = order.stage
    const updateFields: string[] = ['updated_at = NOW()']
    const params: any[] = [id]

    // Casting department actions
    if (action === 'update_casting_status') {
      const nextReceipt = receipt_status || (order.receipt_status === 'receiving' ? 'completed' : 'receiving')
      const nextStage = nextReceipt === 'completed' ? 'completed' : 'receiving'
      params.push(nextReceipt)
      updateFields.push(`receipt_status = $${params.length}`)
      params.push(nextStage)
      updateFields.push(`stage = $${params.length}`)
      if (cover_type) {
        params.push(cover_type)
        updateFields.push(`cover_type = $${params.length}`)
      }
      if (notes) {
        params.push(notes)
        updateFields.push(`notes = $${params.length}`)
      }
    }
    // Laser department actions
    else if (action === 'update_laser_status') {
      const nextStage = stage || (order.stage === 'awaiting_materials' ? 'material_inspection' : 'ready_for_delivery')
      params.push(nextStage)
      updateFields.push(`stage = $${params.length}`)
      if (notes) {
        params.push(notes)
        updateFields.push(`notes = $${params.length}`)
      }
    }
    // Painting department actions
    else if (action === 'update_painting_status') {
      const nextReceipt = receipt_status || (order.receipt_status === 'receiving' ? 'showroom_notified' : 'ready_for_delivery')
      const nextStage = nextReceipt
      params.push(nextReceipt)
      updateFields.push(`receipt_status = $${params.length}`)
      params.push(nextStage)
      updateFields.push(`stage = $${params.length}`)
      if (notes) {
        params.push(notes)
        updateFields.push(`notes = $${params.length}`)
      }
    }
    // General Stage Transitions
    else if (action === 'accept') {
      toStage = 'accepted'
      params.push(user_id || null)
      updateFields.push(`accepted_at = NOW()`, `accepted_by = $${params.length}`, `stage = 'accepted'`)
    } else if (action === 'start_work') {
      toStage = 'in_progress'
      updateFields.push(`actual_start = NOW()`, `stage = 'in_progress'`)
    } else if (action === 'complete_manufacturing') {
      toStage = 'manufacturing_complete'
      updateFields.push(`actual_completion = NOW()`, `stage = 'manufacturing_complete'`)
    } else if (action === 'mark_ready_delivery') {
      toStage = 'ready_for_delivery'
      updateFields.push(`stage = 'ready_for_delivery'`)
    } else if (action === 'edit_order') {
      if (item_description !== undefined) {
        params.push(item_description)
        updateFields.push(`item_description = $${params.length}`)
      }
      if (quantity !== undefined) {
        params.push(quantity)
        updateFields.push(`quantity = $${params.length}`)
      }
      if (deadline !== undefined) {
        params.push(deadline || null)
        updateFields.push(`deadline = $${params.length}`)
      }
      if (notes !== undefined) {
        params.push(notes)
        updateFields.push(`notes = $${params.length}`)
      }
      if (cover_type !== undefined) {
        params.push(cover_type)
        updateFields.push(`cover_type = $${params.length}`)
      }
      if (required_measurement !== undefined) {
        params.push(required_measurement)
        updateFields.push(`required_measurement = $${params.length}`)
      }
      if (fixed_measurements !== undefined) {
        params.push(fixed_measurements)
        updateFields.push(`fixed_measurements = $${params.length}`)
      }
      if (cable_tray_bend !== undefined) {
        params.push(cable_tray_bend)
        updateFields.push(`cable_tray_bend = $${params.length}`)
      }
      if (stage !== undefined) {
        params.push(stage)
        updateFields.push(`stage = $${params.length}`)
      }
    }

    const updateSql = `
      UPDATE production_orders
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `
    const res = await query(updateSql, params)
    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PATCH /api/production/orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/production/orders
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 })
    }

    await query('DELETE FROM production_order_history WHERE order_id = $1', [id])
    await query('DELETE FROM production_orders WHERE id = $1', [id])
    return NextResponse.json({ success: true, message: 'Order deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/production/orders:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
