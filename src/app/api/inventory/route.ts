import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/inventory
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const view = searchParams.get('view') || 'items' // 'items' | 'ledger' | 'material_requests'

    if (view === 'ledger') {
      const res = await query(`
        SELECT sl.*, itm.sku, itm.description as item_description, p.reference as project_reference,
          u.full_name as created_by_name
        FROM stock_ledger sl
        JOIN inventory_items itm ON sl.item_id = itm.id
        LEFT JOIN panel_projects p ON sl.project_id = p.id
        LEFT JOIN profiles u ON sl.created_by = u.id
        ORDER BY sl.created_at DESC
        LIMIT 100
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    if (view === 'material_requests') {
      const res = await query(`
        SELECT mr.*, p.reference as project_reference, p.name as project_name,
          (SELECT json_agg(mrl) FROM material_request_lines mrl WHERE mrl.request_id = mr.id) as lines
        FROM material_requests mr
        JOIN panel_projects p ON mr.project_id = p.id
        ORDER BY mr.created_at DESC
      `)
      return NextResponse.json({ success: true, data: res.rows })
    }

    // Default: items
    let sql = `SELECT * FROM inventory_items WHERE 1=1`
    const params: any[] = []
    if (category && category !== 'all') {
      params.push(category)
      sql += ` AND category = $${params.length}`
    }
    sql += ` ORDER BY sku ASC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/inventory (Add item or record stock ledger transaction)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action = 'item' } = body

    if (action === 'item') {
      const {
        sku,
        description,
        description_ar,
        category,
        uom = 'pcs',
        specifications,
        dimensions,
        warehouse_location,
        qty_on_hand = 0,
        reorder_threshold = 10,
        purchase_cost = 0
      } = body

      if (!sku || !description || !category) {
        return NextResponse.json({ success: false, error: 'SKU, description, and category are required' }, { status: 400 })
      }

      const res = await query(`
        INSERT INTO inventory_items (
          sku, description, description_ar, category, uom, specifications,
          dimensions, warehouse_location, qty_on_hand, reorder_threshold, purchase_cost
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [sku, description, description_ar || null, category, uom, specifications || null, dimensions || null, warehouse_location || null, qty_on_hand, reorder_threshold, purchase_cost])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    if (action === 'transaction') {
      const {
        item_id,
        transaction_type,
        quantity_change,
        project_id,
        reference_document,
        notes,
        user_id
      } = body

      if (!item_id || !transaction_type || quantity_change === undefined) {
        return NextResponse.json({ success: false, error: 'Item, transaction type, and quantity change are required' }, { status: 400 })
      }

      const itemRes = await query('SELECT * FROM inventory_items WHERE id = $1', [item_id])
      if (itemRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
      }
      const item = itemRes.rows[0]
      const currentQty = parseFloat(item.qty_on_hand)
      const change = parseFloat(quantity_change)
      const newQty = currentQty + change

      if (newQty < 0) {
        return NextResponse.json({ success: false, error: 'Cannot allocate beyond available stock quantity' }, { status: 400 })
      }

      // Update inventory item balance
      await query(`UPDATE inventory_items SET qty_on_hand = $1, updated_at = NOW() WHERE id = $2`, [newQty, item_id])

      // Record in immutable stock transaction ledger
      const ledgerRes = await query(`
        INSERT INTO stock_ledger (
          item_id, transaction_type, quantity_change, balance_before, balance_after,
          project_id, reference_document, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [item_id, transaction_type, change, currentQty, newQty, project_id || null, reference_document || null, notes || null, user_id || null])

      return NextResponse.json({ success: true, data: ledgerRes.rows[0] })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/inventory - Edit item or assign to user for a project
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body.id || body.item_id
    const action = body.action || 'edit'

    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
    }

    if (action === 'assign_to_project_user') {
      const { quantity, project_id, assigned_user_id, notes } = body
      const qtyNum = parseFloat(quantity)
      if (!qtyNum || qtyNum <= 0) {
        return NextResponse.json({ success: false, error: 'Valid quantity required' }, { status: 400 })
      }

      const itemRes = await query('SELECT * FROM inventory_items WHERE id = $1', [id])
      if (itemRes.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
      }
      const item = itemRes.rows[0]
      const currentQty = parseFloat(item.qty_on_hand)
      if (currentQty < qtyNum) {
        return NextResponse.json({ success: false, error: 'Insufficient stock in warehouse' }, { status: 400 })
      }

      const newQty = currentQty - qtyNum
      await query('UPDATE inventory_items SET qty_on_hand = $1, updated_at = NOW() WHERE id = $2', [newQty, id])

      // Record in stock ledger
      await query(`
        INSERT INTO stock_ledger (item_id, transaction_type, quantity_change, balance_before, balance_after, project_id, notes, created_by)
        VALUES ($1, 'goods_issued', $2, $3, $4, $5, $6, $7)
      `, [id, -qtyNum, currentQty, newQty, project_id || null, notes || 'Issued to technician for project', assigned_user_id || null])

      return NextResponse.json({ success: true, message: `Successfully assigned ${qtyNum} units to project`, balance: newQty })
    }

    // Default: Edit Item
    const {
      sku,
      description,
      description_ar,
      category,
      uom,
      purchase_cost,
      reorder_threshold,
      warehouse_location,
      supplier_name,
      qty_on_hand
    } = body

    const updateSql = `
      UPDATE inventory_items
      SET sku = COALESCE($1, sku),
          description = COALESCE($2, description),
          description_ar = COALESCE($3, description_ar),
          category = COALESCE($4, category),
          uom = COALESCE($5, uom),
          purchase_cost = COALESCE($6, purchase_cost),
          reorder_threshold = COALESCE($7, reorder_threshold),
          warehouse_location = COALESCE($8, warehouse_location),
          supplier_name = COALESCE($9, supplier_name),
          qty_on_hand = COALESCE($10, qty_on_hand),
          updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `
    const res = await query(updateSql, [
      sku || null,
      description || null,
      description_ar || null,
      category || null,
      uom || null,
      purchase_cost !== undefined ? Number(purchase_cost) : null,
      reorder_threshold !== undefined ? Number(reorder_threshold) : null,
      warehouse_location || null,
      supplier_name || null,
      qty_on_hand !== undefined ? Number(qty_on_hand) : null,
      id
    ])

    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in PUT /api/inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/inventory - Delete item
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
    }

    await query('DELETE FROM stock_ledger WHERE item_id = $1', [id])
    await query('DELETE FROM purchase_order_lines WHERE item_id = $1', [id])
    await query('DELETE FROM inventory_items WHERE id = $1', [id])

    return NextResponse.json({ success: true, message: 'Item deleted successfully' })
  } catch (error: any) {
    console.error('Error in DELETE /api/inventory:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

