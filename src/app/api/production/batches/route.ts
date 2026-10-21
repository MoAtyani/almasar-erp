import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/production/batches
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage')

    let sql = `
      SELECT b.*,
        c.panel_code, c.name as panel_name, c.name_ar as panel_name_ar,
        c.width_mm, c.height_mm, c.thickness_mm, c.material,
        p.reference as project_reference, p.name as project_name,
        emp.full_name as responsible_name
      FROM production_batches b
      JOIN panel_catalogue c ON b.panel_id = c.id
      LEFT JOIN panel_projects p ON b.linked_project_id = p.id
      LEFT JOIN profiles emp ON b.responsible_employee_id = emp.id
      WHERE 1=1
    `
    const params: any[] = []
    if (stage && stage !== 'all') {
      params.push(stage)
      sql += ` AND b.stage = $${params.length}`
    }
    sql += ` ORDER BY b.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/production/batches:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/production/batches (Create new Factory B batch)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      panel_id,
      planned_quantity,
      scheduled_completion,
      linked_project_id,
      is_stock_replenishment = true,
      assigned_team,
      responsible_employee_id,
      user_id
    } = body

    if (!panel_id || !planned_quantity) {
      return NextResponse.json({ success: false, error: 'Panel and planned quantity are required' }, { status: 400 })
    }

    const countRes = await query('SELECT COUNT(*) FROM production_batches')
    const count = parseInt(countRes.rows[0].count, 10) + 1
    const batchNumber = `BAT-FB-2026-${String(count).padStart(3, '0')}`

    const insertSql = `
      INSERT INTO production_batches (
        batch_number, panel_id, planned_quantity, actual_quantity,
        scheduled_completion, linked_project_id, is_stock_replenishment,
        assigned_team, responsible_employee_id, stage
      ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, 'batch_created')
      RETURNING *
    `
    const res = await query(insertSql, [
      batchNumber, panel_id, planned_quantity,
      scheduled_completion || null, linked_project_id || null,
      is_stock_replenishment, assigned_team || 'Factory B Standard Line',
      responsible_employee_id || null
    ])

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in POST /api/production/batches:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/production/batches (Update batch stage, partial quantities, skip paint)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      stage,
      painted_qty,
      assembled_qty,
      packed_qty,
      dispatched_qty,
      rejected_qty,
      rework_qty,
      skip_painting,
      skip_painting_reason
    } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Batch ID is required' }, { status: 400 })
    }

    let updates: string[] = ['updated_at = NOW()']
    const params: any[] = []

    if (stage) {
      params.push(stage)
      updates.push(`stage = $${params.length}`)
    }
    if (painted_qty !== undefined) {
      params.push(painted_qty)
      updates.push(`painted_qty = $${params.length}`)
    }
    if (assembled_qty !== undefined) {
      params.push(assembled_qty)
      updates.push(`assembled_qty = $${params.length}`)
    }
    if (packed_qty !== undefined) {
      params.push(packed_qty)
      updates.push(`packed_qty = $${params.length}`)
    }
    if (dispatched_qty !== undefined) {
      params.push(dispatched_qty)
      updates.push(`dispatched_qty = $${params.length}`)
    }
    if (rejected_qty !== undefined) {
      params.push(rejected_qty)
      updates.push(`rejected_quantity = $${params.length}`)
    }
    if (rework_qty !== undefined) {
      params.push(rework_qty)
      updates.push(`rework_quantity = $${params.length}`)
    }
    if (skip_painting !== undefined) {
      params.push(skip_painting)
      updates.push(`skip_painting = $${params.length}`)
    }
    if (skip_painting_reason) {
      params.push(skip_painting_reason)
      updates.push(`skip_painting_reason = $${params.length}`)
    }

    params.push(id)
    const sql = `UPDATE production_batches SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`
    const res = await query(sql, params)

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PATCH /api/production/batches:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
