import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/auth/logout
export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  response.cookies.delete('almasar_auth_user')
  return response
}
