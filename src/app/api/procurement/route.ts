import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/procurement
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'orders' // 'requests' | 'orders'

    if (view === 'requests') {
      const res = await query(`
        SELECT pr.*, p.reference as project_reference, p.name as project_name,
          (SELECT json_agg(prl) FROM purchase_request_lines prl WHERE prl.pr_id = pr.id) as lines,
          app.full_name as approved_by_name
        FROM purchase_requests pr
        LEFT JOIN panel_projects p ON pr.project_id = p.id
        LEFT JOIN profiles app ON pr.approved_by = app.id
        ORDER BY pr.created_at DESC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    if (view === 'project_costs') {
      const res = await query(`
        SELECT 
          p.id as project_id, p.reference as project_reference, p.name as project_name,
          p.customer_name, p.quotation_amount,
          COALESCE(SUM(po.total_amount), 0) as total_procurement_cost,
          COUNT(po.id) as po_count,
          COALESCE(
            json_agg(
              json_build_object(
                'po_id', po.id,
                'po_number', po.po_number,
                'supplier_name', po.supplier_name,
                'amount', po.total_amount,
                'status', po.status
              )
            ) FILTER (WHERE po.id IS NOT NULL), '[]'
          ) as orders
        FROM panel_projects p
        LEFT JOIN purchase_orders po ON po.project_id = p.id
        GROUP BY p.id, p.reference, p.name, p.customer_name, p.quotation_amount
        ORDER BY total_procurement_cost DESC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    // Default: purchase orders with lines
    const res = await query(`
      SELECT po.*, 
        COALESCE(po.po_number, 'PO-2026-0001') as reference,
        COALESCE(po.status, 'confirmed') as state,
        po.expected_delivery_date as expected_date,
        p.reference as project_reference, p.name as project_name,
        (SELECT json_agg(pol) FROM purchase_order_lines pol WHERE pol.po_id = po.id) as lines
      FROM purchase_orders po
      LEFT JOIN panel_projects p ON po.project_id = p.id
      ORDER BY po.created_at DESC
    `)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/procurement:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/procurement
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'PO ID is required' }, { status: 400 })
    }
    await query('DELETE FROM purchase_order_lines WHERE po_id = $1', [id])
    await query('DELETE FROM purchase_orders WHERE id = $1', [id])
    return NextResponse.json({ success: true, message: 'Purchase order deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/procurement:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/procurement (Create PR, Create PO, or Receive goods)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create_pr') {
      const { origin, project_id, department, justification, priority = 'medium', required_by_date, lines = [], user_id } = body
      const countRes = await query('SELECT COUNT(*) FROM purchase_requests')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const prNumber = `PR-2026-${String(count).padStart(4, '0')}`

      const prRes = await query(`
        INSERT INTO purchase_requests (pr_number, origin, project_id, department, justification, priority, required_by_date, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'submitted', $8)
        RETURNING *
      `, [prNumber, origin, project_id || null, department, justification || null, priority, required_by_date || null, user_id || null])

      const pr = prRes.rows[0]
      for (const line of lines) {
        await query(`
          INSERT INTO purchase_request_lines (pr_id, item_id, item_description, specifications, quantity, uom)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [pr.id, line.item_id || null, line.item_description, line.specifications || null, line.quantity, line.uom || 'pcs'])
      }

      return NextResponse.json({ success: true, data: pr })
    }

    if (action === 'create_po') {
      const { pr_id, project_id, supplier_name, supplier_contact, expected_delivery_date, lines = [], user_id } = body
      const countRes = await query('SELECT COUNT(*) FROM purchase_orders')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const poNumber = `PO-2026-${String(count).padStart(4, '0')}`

      let totalAmount = 0
      for (const line of lines) {
        totalAmount += (parseFloat(line.quantity) * parseFloat(line.unit_price))
      }

      const poRes = await query(`
        INSERT INTO purchase_orders (po_number, pr_id, project_id, supplier_name, supplier_contact, expected_delivery_date, total_amount, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)
        RETURNING *
      `, [poNumber, pr_id || null, project_id || null, supplier_name, supplier_contact || null, expected_delivery_date || null, totalAmount, user_id || null])

      const po = poRes.rows[0]
      for (const line of lines) {
        await query(`
          INSERT INTO purchase_order_lines (po_id, item_id, item_description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [po.id, line.item_id || null, line.item_description, line.quantity, line.unit_price, line.quantity * line.unit_price])
      }

      if (pr_id) {
        await query(`UPDATE purchase_requests SET status = 'po_created' WHERE id = $1`, [pr_id])
      }

      return NextResponse.json({ success: true, data: po })
    }

    if (action === 'receive_goods') {
      const { po_id, line_id, received_quantity, damaged_quantity = 0, user_id } = body
      if (!po_id || !line_id || !received_quantity) {
        return NextResponse.json({ success: false, error: 'PO ID, Line ID, and Received Quantity are required' }, { status: 400 })
      }

      // Update PO line received quantity
      const lineRes = await query(`
        UPDATE purchase_order_lines SET
          received_quantity = received_quantity + $1
        WHERE id = $2 AND po_id = $3
        RETURNING *
      `, [received_quantity, line_id, po_id])

      const line = lineRes.rows[0]

      // If line has item_id, update stock ledger
      if (line.item_id) {
        const itemRes = await query('SELECT qty_on_hand FROM inventory_items WHERE id = $1', [line.item_id])
        const prevQty = parseFloat(itemRes.rows[0].qty_on_hand)
        const newQty = prevQty + parseFloat(received_quantity)

        await query('UPDATE inventory_items SET qty_on_hand = $1 WHERE id = $2', [newQty, line.item_id])
        await query(`
          INSERT INTO stock_ledger (item_id, transaction_type, quantity_change, balance_before, balance_after, reference_document, notes, created_by)
          VALUES ($1, 'goods_received', $2, $3, $4, $5, $6, $7)
        `, [line.item_id, received_quantity, prevQty, newQty, `PO Receipt: ${po_id}`, `Received: ${received_quantity}, Damaged: ${damaged_quantity}`, user_id || null])
      }

      // Check if all lines are fully received
      const allLines = await query('SELECT quantity, received_quantity FROM purchase_order_lines WHERE po_id = $1', [po_id])
      const allDone = allLines.rows.every(l => parseFloat(l.received_quantity) >= parseFloat(l.quantity))
      const poStatus = allDone ? 'fully_received' : 'partially_received'
      await query('UPDATE purchase_orders SET status = $1 WHERE id = $2', [poStatus, po_id])

      return NextResponse.json({ success: true, poStatus, line })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/procurement:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
