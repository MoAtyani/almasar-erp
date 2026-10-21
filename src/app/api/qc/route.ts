import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/qc
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    let sql = `
      SELECT q.*,
        p.reference as project_reference, p.name as project_name,
        o.order_number, o.item_description,
        b.batch_number,
        insp.full_name as inspector_name
      FROM qc_queue q
      LEFT JOIN panel_projects p ON q.project_id = p.id
      LEFT JOIN production_orders o ON q.order_id = o.id
      LEFT JOIN production_batches b ON q.batch_id = b.id
      LEFT JOIN profiles insp ON q.inspected_by = insp.id
      WHERE 1=1
    `
    const params: any[] = []
    if (department && department !== 'all') {
      params.push(department)
      sql += ` AND q.department = $${params.length}`
    }
    if (status && status !== 'all') {
      params.push(status)
      sql += ` AND q.status = $${params.length}`
    }
    sql += ` ORDER BY q.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/qc:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/qc (Queue an item for inspection)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      department,
      order_id,
      batch_id,
      project_id,
      checklists = [],
      notes
    } = body

    const countRes = await query('SELECT COUNT(*) FROM qc_queue')
    const count = parseInt(countRes.rows[0].count, 10) + 1
    const inspectionNumber = `QC-2026-${String(count).padStart(4, '0')}`

    const res = await query(`
      INSERT INTO qc_queue (
        inspection_number, department, order_id, batch_id, project_id,
        status, checklists, notes
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
      RETURNING *
    `, [inspectionNumber, department, order_id || null, batch_id || null, project_id || null, JSON.stringify(checklists), notes || null])

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    console.error('Error in POST /api/qc:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PATCH /api/qc (Approve / Reject QC with checklists, defect severity, rework routing)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      id,
      decision, // 'passed' | 'failed' | 'reinspected'
      inspector_id,
      defect_category,
      defect_severity,
      notes,
      corrective_actions,
      test_results
    } = body

    if (!id || !decision) {
      return NextResponse.json({ success: false, error: 'Inspection ID and decision are required' }, { status: 400 })
    }

    const currentRes = await query('SELECT * FROM qc_queue WHERE id = $1', [id])
    if (currentRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 })
    }
    const current = currentRes.rows[0]

    let status = decision === 'passed' ? 'passed' : decision === 'failed' ? 'failed' : 'reinspected'

    const updateRes = await query(`
      UPDATE qc_queue SET
        status = $1,
        inspected_by = $2,
        inspected_at = NOW(),
        defect_category = $3,
        defect_severity = $4,
        notes = $5,
        corrective_actions = $6,
        test_results = $7
      WHERE id = $8
      RETURNING *
    `, [
      status,
      inspector_id || null,
      defect_category || null,
      defect_severity || null,
      notes || null,
      corrective_actions || null,
      JSON.stringify(test_results || {}),
      id
    ])

    const updatedQc = updateRes.rows[0]

    // If linked to production order, update the order according to QC decision
    if (current.order_id) {
      if (decision === 'passed') {
        if (current.department === 'painting') {
          // Paint QC approved -> manufacturing ready or assembly
          await query(`UPDATE production_orders SET stage = 'assembly', paint_status = 'painted' WHERE id = $1`, [current.order_id])
        } else {
          // Final QC approved -> ready for delivery or packing
          await query(`UPDATE production_orders SET stage = 'ready_for_delivery' WHERE id = $1`, [current.order_id])
        }

        // Notify team
        await query(`
          INSERT INTO system_notifications (target_role, title, title_ar, message, message_ar, category, link_url)
          VALUES ('production_manager', 'QC Inspection Approved', 'تمت الموافقة على فحص الجودة',
                  $1, $2, 'qc_approved', '/production')
        `, [
          `Order QC passed for inspection ${updatedQc.inspection_number}.`,
          `تم اجتياز فحص الجودة بنجاح للفحص ${updatedQc.inspection_number}.`
        ])
      } else if (decision === 'failed') {
        // Return item to rework stage
        await query(`
          UPDATE production_orders SET 
            stage = 'rework', 
            delay_reason = $1 
          WHERE id = $2
        `, [`Failed QC: ${defect_category || 'Defect found'} - ${notes || ''}`, current.order_id])

        // Log in status history
        await query(`
          INSERT INTO production_order_history (order_id, from_stage, to_stage, changed_by, comment)
          VALUES ($1, 'qc_inspection', 'rework', $2, $3)
        `, [current.order_id, inspector_id || null, `QC Rejected: ${defect_category} (${defect_severity}). Actions: ${corrective_actions}`])

        // Immediate escalation notification
        await query(`
          INSERT INTO system_notifications (target_role, title, title_ar, message, message_ar, category, link_url)
          VALUES ('production_manager', 'QC Inspection Failed - Rework Required', 'فشل فحص الجودة - مطلوب إعادة العمل',
                  $1, $2, 'qc_failed', '/qc')
        `, [
          `Critical rework required: ${defect_category} (${defect_severity}) on inspection ${updatedQc.inspection_number}.`,
          `مطلوب إجراء تصحيحي وإعادة عمل: ${defect_category} (${defect_severity}) في الفحص ${updatedQc.inspection_number}.`
        ])
      }
    }

    return NextResponse.json({ success: true, data: updatedQc })
  } catch (error: any) {
    console.error('Error in PATCH /api/qc:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
