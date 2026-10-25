import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/sales
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'leads'
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    if (view === 'templates') {
      const res = await query(`
        SELECT * FROM project_templates ORDER BY created_at ASC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    if (view === 'deliveries') {
      const res = await query(`
        SELECT dn.*, p.reference as project_reference, p.name as project_name, p.customer_name
        FROM delivery_notes dn
        JOIN panel_projects p ON dn.project_id = p.id
        ORDER BY dn.created_at DESC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    let sql = `
      SELECT l.*, 
        COALESCE(l.product_category, 'electrical_panels') as product_category,
        COALESCE(l.sales_status, 'under_manufacturing') as sales_status,
        COALESCE(l.outcome, 'won') as outcome,
        p.reference as linked_project_reference, 
        sp.full_name as salesperson_name
      FROM crm_leads l
      LEFT JOIN panel_projects p ON l.project_id = p.id
      LEFT JOIN profiles sp ON l.salesperson_id = sp.id
      WHERE 1=1
    `
    const params: any[] = []

    if (category && category !== 'all') {
      params.push(category)
      sql += ` AND l.product_category = $${params.length}`
    }

    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND l.sales_status = $${params.length}`
    }

    sql += ` ORDER BY l.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/sales:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/sales
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'create_lead' } = body

    if (action === 'create_template') {
      const { template_name, template_name_ar, category, description, specs, estimated_cost } = body
      const id = `tpl-${Date.now()}`
      const res = await query(`
        INSERT INTO project_templates (id, template_name, template_name_ar, category, description, specs, estimated_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [id, template_name, template_name_ar || template_name, category || 'electrical_panels', description || '', typeof specs === 'string' ? specs : JSON.stringify(specs || {}), estimated_cost || 0])
      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    if (action === 'create_lead' || action === 'create_sales_order') {
      const {
        name,
        customer_name,
        customer_email,
        customer_phone,
        company,
        expected_revenue,
        probability,
        description,
        salesperson_id,
        product_category = 'electrical_panels',
        outcome = 'won',
        sales_status = 'under_manufacturing',
        is_template = false,
        template_name
      } = body

      const countRes = await query('SELECT COUNT(*) FROM crm_leads')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const ref = `REF-2026-${String(count).padStart(4, '0')}`

      const res = await query(`
        INSERT INTO crm_leads (
          reference, name, customer_name, customer_email, customer_phone,
          company, expected_revenue, probability, state, description, salesperson_id,
          product_category, outcome, sales_status, is_template, template_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'won', $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
        ref,
        name,
        customer_name,
        customer_email || null,
        customer_phone || null,
        company || customer_name,
        expected_revenue ? parseFloat(expected_revenue) : 0,
        probability ? parseInt(probability, 10) : 100,
        description || null,
        salesperson_id || null,
        product_category,
        outcome,
        sales_status,
        Boolean(is_template),
        template_name || null
      ])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    if (action === 'convert_to_project') {
      const { lead_id, user_id } = body
      const leadRes = await query('SELECT * FROM crm_leads WHERE id = $1', [lead_id])
      if (leadRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
      }
      const lead = leadRes.rows[0]

      const countRes = await query('SELECT COUNT(*) FROM panel_projects')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const ref = `PRJ-2026-${String(count).padStart(4, '0')}`

      const projRes = await query(`
        INSERT INTO panel_projects (
          reference, name, customer_name, customer_email, customer_phone,
          description, quotation_amount, state, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'planning', $8)
        RETURNING *
      `, [ref, lead.name, lead.customer_name, lead.customer_email, lead.customer_phone, lead.description, lead.expected_revenue, user_id || null])

      const project = projRes.rows[0]
      await query(`UPDATE crm_leads SET state = 'won', project_id = $1 WHERE id = $2`, [project.id, lead_id])

      return NextResponse.json({ success: true, project })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/sales:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/sales
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, sales_status, outcome, product_category, name, customer_name, company, expected_revenue, description } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    }

    const updates: string[] = ['updated_at = NOW()']
    const params: any[] = [id]

    if (sales_status !== undefined) {
      params.push(sales_status)
      updates.push(`sales_status = $${params.length}`)
    }
    if (outcome !== undefined) {
      params.push(outcome)
      updates.push(`outcome = $${params.length}`)
    }
    if (product_category !== undefined) {
      params.push(product_category)
      updates.push(`product_category = $${params.length}`)
    }
    if (name !== undefined) {
      params.push(name)
      updates.push(`name = $${params.length}`)
    }
    if (customer_name !== undefined) {
      params.push(customer_name)
      updates.push(`customer_name = $${params.length}`)
    }
    if (company !== undefined) {
      params.push(company)
      updates.push(`company = $${params.length}`)
    }
    if (expected_revenue !== undefined) {
      params.push(parseFloat(expected_revenue) || 0)
      updates.push(`expected_revenue = $${params.length}`)
    }
    if (description !== undefined) {
      params.push(description)
      updates.push(`description = $${params.length}`)
    }

    const res = await query(`
      UPDATE crm_leads 
      SET ${updates.join(', ')} 
      WHERE id = $1 
      RETURNING *
    `, params)

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PATCH /api/sales:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/sales
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID parameter is required' }, { status: 400 })
    }

    await query('DELETE FROM crm_leads WHERE id = $1', [id])
    return NextResponse.json({ success: true, message: 'Deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/sales:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
