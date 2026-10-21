import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
export const dynamic = 'force-dynamic'

// GET /api/dashboard/live
export async function GET(req: NextRequest) {
  try {
    // 1. Project Stages
    const projectStagesRes = await query(`
      SELECT state, COUNT(*) as count 
      FROM panel_projects 
      GROUP BY state
    `)

    // 2. Production Orders by Department & Stage
    const ordersRes = await query(`
      SELECT 
        department,
        stage,
        COUNT(*) as count
      FROM production_orders
      GROUP BY department, stage
    `)

    // Key Order KPI counters
    const kpiRes = await query(`
      SELECT
        COUNT(*) as total_open_orders,
        COUNT(*) FILTER (WHERE stage = 'awaiting_acceptance') as awaiting_acceptance,
        COUNT(*) FILTER (WHERE stage = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE stage = 'qc_inspection') as awaiting_qc,
        COUNT(*) FILTER (WHERE stage = 'painting') as awaiting_painting,
        COUNT(*) FILTER (WHERE stage = 'rework') as requiring_rework,
        COUNT(*) FILTER (WHERE stage = 'ready_for_delivery') as ready_for_delivery,
        COUNT(*) FILTER (WHERE stage = 'packed') as packed,
        COUNT(*) FILTER (WHERE stage = 'dispatched') as dispatched,
        COUNT(*) FILTER (WHERE deadline < NOW() AND stage NOT IN ('ready_for_delivery', 'packed', 'dispatched')) as overdue_orders
      FROM production_orders
    `)

    // 3. Active QC Queue & Failures
    const qcRes = await query(`
      SELECT 
        COUNT(*) as total_inspections,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_inspections,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_inspections,
        COUNT(*) FILTER (WHERE status = 'passed') as passed_inspections
      FROM qc_queue
    `)

    // 4. Warehouse Shortages
    const shortagesRes = await query(`
      SELECT id, sku, description, qty_on_hand, qty_reserved, qty_available, reorder_threshold
      FROM inventory_items
      WHERE qty_available <= reorder_threshold
      ORDER BY qty_available ASC
      LIMIT 10
    `)

    // 5. Purchase Requests Awaiting Approval
    const prAwaitingRes = await query(`
      SELECT COUNT(*) as count
      FROM purchase_requests
      WHERE status = 'submitted'
    `)

    // 6. Overdue Supplier Deliveries
    const overdueDeliveriesRes = await query(`
      SELECT po_number, supplier_name, expected_delivery_date, total_amount
      FROM purchase_orders
      WHERE expected_delivery_date < CURRENT_DATE 
        AND status NOT IN ('fully_received', 'cancelled')
      ORDER BY expected_delivery_date ASC
      LIMIT 5
    `)

    // 7. Field External Assignments currently in progress
    const activeFieldRes = await query(`
      SELECT id, assignment_ref, client_name, site_location, status, expected_duration_hours, actual_arrival
      FROM field_assignments
      WHERE status IN ('confirmed', 'in_progress')
      ORDER BY visit_date ASC
    `)

    // 8. Department Workloads & Bottlenecks
    const workloadRes = await query(`
      SELECT 
        o.department,
        COUNT(o.id) as active_count,
        COUNT(o.id) FILTER (WHERE o.stage = 'rework') as rework_count,
        COUNT(o.id) FILTER (WHERE o.deadline < NOW()) as overdue_count
      FROM production_orders o
      WHERE o.stage NOT IN ('ready_for_delivery', 'packed', 'dispatched')
      GROUP BY o.department
    `)

    // 9. Recent Critical Activity Feeds (Orders, QC, Field)
    const recentActivityRes = await query(`
      SELECT 
        'order' as type,
        o.order_number as ref,
        o.department,
        o.stage as status,
        o.item_description as title,
        p.reference as project_ref,
        o.updated_at as timestamp
      FROM production_orders o
      JOIN panel_projects p ON o.project_id = p.id
      ORDER BY o.updated_at DESC
      LIMIT 8
    `)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      kpis: kpiRes.rows[0],
      projectStages: projectStagesRes.rows,
      departmentOrders: ordersRes.rows,
      qcMetrics: qcRes.rows[0],
      shortages: shortagesRes.rows,
      purchaseRequestsAwaiting: parseInt(prAwaitingRes.rows[0].count, 10),
      overdueDeliveries: overdueDeliveriesRes.rows,
      activeFieldAssignments: activeFieldRes.rows,
      departmentWorkload: workloadRes.rows,
      recentActivity: recentActivityRes.rows
    })
  } catch (error: any) {
    console.error('Error in GET /api/dashboard/live:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
