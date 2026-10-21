import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/production/catalogue
export async function GET(req: NextRequest) {
  try {
    const res = await query('SELECT * FROM panel_catalogue ORDER BY panel_code ASC')
    return NextResponse.json({ success: true, data: res.rows })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/production/catalogue (Add new configurable panel dimensions)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      panel_code,
      name,
      name_ar,
      width_mm,
      height_mm,
      thickness_mm,
      material,
      technical_specs,
      standard_uom = 'unit'
    } = body

    if (!panel_code || !name || !width_mm || !height_mm) {
      return NextResponse.json({ success: false, error: 'Code, name, width, and height are required' }, { status: 400 })
    }

    const res = await query(`
      INSERT INTO panel_catalogue (
        panel_code, name, name_ar, width_mm, height_mm, thickness_mm, material, technical_specs, standard_uom
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [panel_code, name, name_ar || name, width_mm, height_mm, thickness_mm || 2.0, material || 'Steel', technical_specs || null, standard_uom])

    return NextResponse.json({ success: true, data: res.rows[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
