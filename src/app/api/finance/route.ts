import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// Helper: Verify caller has finance or owner role server-side
async function verifyFinanceAccess(userId?: string | null): Promise<boolean> {
  if (!userId) return false
  const res = await query('SELECT role FROM profiles WHERE id = $1', [userId])
  if (res.rows.length === 0) return false
  const role = res.rows[0].role
  return role === 'company_owner' || role === 'finance_officer' || role === 'system_admin'
}

// GET /api/finance (Restricted Expenses & Reports)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const category = searchParams.get('category')
    const projectId = searchParams.get('project_id')
    const view = searchParams.get('view') // 'expenses' | 'summary' | 'salaries' | 'advances'

    // Server-side permission check (Spec 4.1: Enforce on server, not merely hiding menu items)
    const isAuthorized = await verifyFinanceAccess(userId)
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Access Denied: You do not have permission to view sensitive financial data.'
      }, { status: 403 })
    }

    if (view === 'salaries') {
      const salRes = await query(`
        SELECT s.*, emp.full_name as employee_name, emp.full_name_ar as employee_name_ar, emp.department
        FROM employee_salaries s
        JOIN profiles emp ON s.employee_id = emp.id
        ORDER BY s.period_month DESC, emp.full_name ASC
      `)
      return NextResponse.json({ success: true, data: salRes.rows })
    }

    if (view === 'advances') {
      const advRes = await query(`
        SELECT a.*, emp.full_name as employee_name, emp.full_name_ar as employee_name_ar
        FROM employee_advances a
        JOIN profiles emp ON a.employee_id = emp.id
        ORDER BY a.request_date DESC
      `)
      return NextResponse.json({ success: true, data: advRes.rows })
    }

    if (view === 'summary') {
      const catSummary = await query(`
        SELECT category, COUNT(*) as count, ROUND(SUM(amount), 2) as total_amount
        FROM financial_expenses
        GROUP BY category
        ORDER BY total_amount DESC
      `)
      const projectSummary = await query(`
        SELECT p.reference, p.name, ROUND(SUM(e.amount), 2) as total_expense
        FROM financial_expenses e
        JOIN panel_projects p ON e.project_id = p.id
        GROUP BY p.id, p.reference, p.name
        ORDER BY total_expense DESC
      `)
      return NextResponse.json({
        success: true,
        byCategory: catSummary.rows,
        byProject: projectSummary.rows
      })
    }

    // Default: list expenses
    let sql = `
      SELECT e.*, p.reference as project_reference, p.name as project_name
      FROM financial_expenses e
      LEFT JOIN panel_projects p ON e.project_id = p.id
      WHERE 1=1
    `
    const params: any[] = []
    if (category && category !== 'all') {
      params.push(category)
      sql += ` AND e.category = $${params.length}`
    }
    if (projectId) {
      params.push(projectId)
      sql += ` AND e.project_id = $${params.length}`
    }
    sql += ` ORDER BY e.transaction_date DESC, e.created_at DESC`

    const res = await query(sql, params)
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    console.error('Error in GET /api/finance:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/finance (Record expense, salary, or advance)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, action = 'expense' } = body

    const isAuthorized = await verifyFinanceAccess(user_id)
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: 'Access Denied: Only authorized finance personnel or company owner can post financial transactions.'
      }, { status: 403 })
    }

    if (action === 'expense') {
      const {
        category,
        description,
        amount,
        currency = 'SAR',
        tax_amount = 0,
        supplier_or_employee,
        project_id,
        po_id,
        department,
        payment_method = 'bank_transfer',
        receipt_url
      } = body

      if (!category || !description || !amount) {
        return NextResponse.json({ success: false, error: 'Category, description, and amount are required' }, { status: 400 })
      }

      const countRes = await query('SELECT COUNT(*) FROM financial_expenses')
      const count = parseInt(countRes.rows[0].count, 10) + 1
      const transactionRef = `TX-2026-${String(count).padStart(5, '0')}`

      const insertSql = `
        INSERT INTO financial_expenses (
          transaction_ref, category, description, amount, currency, tax_amount,
          supplier_or_employee, project_id, po_id, department, payment_method,
          payment_status, receipt_url, entered_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13)
        RETURNING *
      `
      const res = await query(insertSql, [
        transactionRef, category, description, amount, currency, tax_amount,
        supplier_or_employee || null, project_id || null, po_id || null,
        department || null, payment_method, receipt_url || null, user_id
      ])

      // Log in audit trail
      await query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES ($1, 'create_financial_expense', 'financial_expenses', $2, $3)
      `, [user_id, res.rows[0].id, JSON.stringify(res.rows[0])])

      return NextResponse.json({ success: true, data: res.rows[0] })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Error in POST /api/finance:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
