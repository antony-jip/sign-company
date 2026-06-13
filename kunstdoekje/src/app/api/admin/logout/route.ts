import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, isSameOrigin } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Ongeldige oorsprong.' }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
