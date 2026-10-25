import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/auth/me
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get('almasar_auth_user')
    if (cookie?.value) {
      const user = JSON.parse(cookie.value)
      return NextResponse.json({ success: true, user })
    }
    return NextResponse.json({ success: false, user: null }, { status: 401 })
  } catch (error: any) {
    return NextResponse.json({ success: false, user: null })
  }
}
