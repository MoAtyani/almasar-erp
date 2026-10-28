import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/projects
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const state = searchParams.get('state')
    const department = searchParams.get('department')
    const search = searchParams.get('search')

    let sql = `
      SELECT p.*,
        (SELECT json_agg(o) FROM production_orders o WHERE o.project_id = p.id) as production_orders,
        (SELECT json_agg(d) FROM project_drawings d WHERE d.project_id = p.id) as drawings
      FROM panel_projects p
      WHERE 1=1
    `
    const params: any[] = []

    if (state && state !== 'all') {
      params.push(state)
      sql += ` AND p.state = $${params.length}`
    }

    if (department && department !== 'all') {
      params.push(department)
      sql += ` AND p.department = $${params.length}`
    }

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (p.reference ILIKE $${params.length} OR p.name ILIKE $${params.length} OR p.customer_name ILIKE $${params.length} OR p.company ILIKE $${params.length} OR p.job_order_number ILIKE $${params.length})`
    }

    sql += ` ORDER BY p.created_at DESC`

    const result = await query(sql, params)
    const formatted = result.rows.map((p: any) => ({
      ...p,
      overall_progress: Number(p.overall_progress) || 0,
      quotation_amount: Number(p.quotation_amount) || 0,
      total_points: Number(p.total_points) || 0
    }))
    return NextResponse.json({ success: true, data: formatted })
  } catch (error: any) {
    console.error('Error in GET /api/projects:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name,
      customer_name,
      company,
      customer_email,
      customer_phone,
      department = 'iron',
      location,
      date_delivery,
      description,
      job_order_number,
      quotation_amount,
      priority = 'medium',
      user_id
    } = body

    if (!name || !customer_name) {
      return NextResponse.json({ success: false, error: 'Name and Customer Name are required' }, { status: 400 })
    }

    // Generate unique project reference
    const countRes = await query('SELECT COUNT(*) FROM panel_projects')
    const count = parseInt(countRes.rows[0].count, 10) + 1
    const reference = `PRJ-2026-${String(count).padStart(4, '0')}`

    const insertSql = `
      INSERT INTO panel_projects (
        reference, name, customer_name, company, customer_email, customer_phone,
        department, location, date_delivery, description, job_order_number,
        quotation_amount, priority, state, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'new', $14)
      RETURNING *
    `
    const insertRes = await query(insertSql, [
      reference,
      name,
      customer_name,
      company || customer_name,
      customer_email || null,
      customer_phone || null,
      department || 'iron',
      location || null,
      date_delivery || null,
      description || null,
      job_order_number || `JO-MS-2026-${String(count).padStart(3, '0')}`,
      quotation_amount || 0,
      priority,
      user_id || null
    ])

    const newProject = insertRes.rows[0]

    // Create initial audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES ($1, 'create_project', 'panel_projects', $2, $3)
    `, [user_id || null, newProject.id, JSON.stringify(newProject)])

    // Notify Project Manager / Sales
    await query(`
      INSERT INTO system_notifications (target_role, title, title_ar, message, message_ar, category, link_url)
      VALUES ('project_manager', 'New Project Created', 'مشروع جديد تم إنشاؤه', 
              $1, $2, 'general', '/projects')
    `, [
      `New project ${newProject.reference} - ${newProject.name} created.`,
      `تم إنشاء المشروع الجديد ${newProject.reference} - ${newProject.name}.`
    ])

    return NextResponse.json({ success: true, data: newProject })
  } catch (error: any) {
    console.error('Error in POST /api/projects:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/projects
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, state, overall_progress, user_id, notes } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    const currentRes = await query('SELECT * FROM panel_projects WHERE id = $1', [id])
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }
    const current = currentRes.rows[0]

    let updateSql = 'UPDATE panel_projects SET updated_at = NOW()'
    const params: any[] = []

    if (state !== undefined) {
      params.push(state)
      updateSql += `, state = $${params.length}`
    }

    if (overall_progress !== undefined) {
      params.push(overall_progress)
      updateSql += `, overall_progress = $${params.length}`
    }

    params.push(id)
    updateSql += ` WHERE id = $${params.length} RETURNING *`

    const updateRes = await query(updateSql, params)
    const updated = updateRes.rows[0]

    // If project moved to planning / in_production and has no production orders yet, generate simultaneous orders
    if (state === 'planning' || state === 'in_production') {
      const ordersRes = await query('SELECT COUNT(*) FROM production_orders WHERE project_id = $1', [id])
      const orderCount = parseInt(ordersRes.rows[0].count, 10)
      if (orderCount === 0) {
        // Factory A
        await query(`
          INSERT INTO production_orders (order_number, project_id, department, item_description, quantity, requires_painting, stage, created_by)
          VALUES ($1, $2, 'factory_a', $3, 1, true, 'awaiting_acceptance', $4)
        `, [`ORD-FA-${updated.reference.replace('PRJ-', '')}`, id, `Enclosure Fabrication: ${updated.name}`, user_id || null])

        // Factory B
        await query(`
          INSERT INTO production_orders (order_number, project_id, department, item_description, quantity, requires_painting, stage, created_by)
          VALUES ($1, $2, 'factory_b', $3, 2, false, 'awaiting_acceptance', $4)
        `, [`ORD-FB-${updated.reference.replace('PRJ-', '')}`, id, `Standard Modular Chassis: ${updated.name}`, user_id || null])

        // Electrical
        await query(`
          INSERT INTO production_orders (order_number, project_id, department, item_description, quantity, requires_painting, stage, created_by)
          VALUES ($1, $2, 'electrical', $3, 1, false, 'awaiting_acceptance', $4)
        `, [`ORD-EL-${updated.reference.replace('PRJ-', '')}`, id, `Power Busbar & Control Wiring: ${updated.name}`, user_id || null])

        // Notification to factory heads
        await query(`
          INSERT INTO system_notifications (target_role, title, title_ar, message, message_ar, category, link_url)
          VALUES ('production_manager', 'Simultaneous Production Orders Created', 'تم إنشاء أوامر التصنيع المستقلة',
                  $1, $2, 'order_assigned', '/production')
        `, [
          `3 independent orders issued for Factory A, Factory B, and Electrical for ${updated.reference}.`,
          `تم إصدار 3 أوامر تشغيل مستقلة لمصنع أ، مصنع ب، والكهرباء للمشروع ${updated.reference}.`
        ])
      }
    }

    // Audit log
    await query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES ($1, 'update_project_state', 'panel_projects', $2, $3, $4)
    `, [user_id || null, id, JSON.stringify(current), JSON.stringify(updated)])

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error('Error in PATCH /api/projects:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/projects - Full Project Edit
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      name,
      customer_name,
      company,
      customer_email,
      customer_phone,
      department,
      location,
      date_start,
      date_delivery,
      description,
      quotation_amount,
      priority,
      state
    } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    const updateSql = `
      UPDATE panel_projects
      SET name = COALESCE($1, name),
          customer_name = COALESCE($2, customer_name),
          company = COALESCE($3, company),
          customer_email = COALESCE($4, customer_email),
          customer_phone = COALESCE($5, customer_phone),
          department = COALESCE($6, department),
          location = COALESCE($7, location),
          date_start = COALESCE($8, date_start),
          date_delivery = COALESCE($9, date_delivery),
          description = COALESCE($10, description),
          quotation_amount = COALESCE($11, quotation_amount),
          priority = COALESCE($12, priority),
          state = COALESCE($13, state),
          updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `
    const res = await query(updateSql, [
      name || null,
      customer_name || null,
      company || null,
      customer_email || null,
      customer_phone || null,
      department || null,
      location || null,
      date_start || null,
      date_delivery || null,
      description || null,
      quotation_amount !== undefined ? Number(quotation_amount) : null,
      priority || null,
      state || null,
      id
    ])

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PUT /api/projects:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/projects - Delete project and clean up relations
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Project ID is required' }, { status: 400 })
    }

    // Clean up dependencies
    await query('DELETE FROM technician_tasks WHERE project_id = $1', [id])
    await query('DELETE FROM production_orders WHERE project_id = $1', [id])
    await query('DELETE FROM purchase_orders WHERE project_id = $1', [id])
    await query('DELETE FROM panel_projects WHERE id = $1', [id])

    return NextResponse.json({ success: true, message: 'Project deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/projects:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

