import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/sales
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'leads' // 'leads' | 'deliveries'

    if (view === 'deliveries') {
      const res = await query(`
        SELECT dn.*, p.reference as project_reference, p.name as project_name, p.customer_name
        FROM delivery_notes dn
        JOIN panel_projects p ON dn.project_id = p.id
        ORDER BY dn.created_at DESC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    const res = await query(`
      SELECT l.*, p.reference as linked_project_reference, sp.full_name as salesperson_name
      FROM crm_leads l
      LEFT JOIN panel_projects p ON l.project_id = p.id
      LEFT JOIN profiles sp ON l.salesperson_id = sp.id
      ORDER BY l.created_at DESC
    `)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/sales:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/sales (Create lead, convert lead to project, create delivery note)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create_lead') {
      const { name, customer_name, customer_email, customer_phone, company, expected_revenue, probability, description, salesperson_id } = body
      const countRes = await query('SELECT COUNT(*) FROM crm_leads')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const ref = `LEAD-2026-${String(count).padStart(4, '0')}`

      const res = await query(`
        INSERT INTO crm_leads (reference, name, customer_name, customer_email, customer_phone, company, expected_revenue, probability, state, description, salesperson_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'lead', $9, $10)
        RETURNING *
      `, [ref, name, customer_name, customer_email || null, customer_phone || null, company || null, expected_revenue || 0, probability || 50, description || null, salesperson_id || null])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    if (action === 'convert_to_project') {
      const { lead_id, user_id } = body
      const leadRes = await query('SELECT * FROM crm_leads WHERE id = $1', [lead_id])
      if (leadRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 })
      }
      const lead = leadRes.rows[0]

      // Generate project
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

      // Link lead to project and mark won / sales_order
      await query(`UPDATE crm_leads SET state = 'won', project_id = $1 WHERE id = $2`, [project.id, lead_id])

      return NextResponse.json({ success: true, project })
    }

    if (action === 'create_delivery_note') {
      const { project_id, scheduled_date, items_summary, recipient_name, delivery_notes, user_id } = body
      const countRes = await query('SELECT COUNT(*) FROM delivery_notes')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const dnNumber = `DN-2026-${String(count).padStart(4, '0')}`

      const res = await query(`
        INSERT INTO delivery_notes (dn_number, project_id, scheduled_date, status, items_summary, recipient_name, delivery_notes, dispatched_by)
        VALUES ($1, $2, $3, 'ready_dispatch', $4, $5, $6, $7)
        RETURNING *
      `, [dnNumber, project_id, scheduled_date || null, items_summary || 'Manufactured electrical panels', recipient_name || null, delivery_notes || null, user_id || null])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/sales:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
