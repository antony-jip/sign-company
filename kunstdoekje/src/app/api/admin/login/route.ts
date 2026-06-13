import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, SESSION_MAX_AGE, createSessionValue, isSameOrigin, verifyPassword } from '@/lib/admin-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  // CSRF: weiger cross-site POSTs
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Ongeldige oorsprong.' }, { status: 403 })
  }

  // Brute-force afremmen: max 8 pogingen per 15 minuten per IP
  const limit = rateLimit(`login:${clientIp(req)}`, 8, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Te veel pogingen. Probeer het later opnieuw.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'Server niet geconfigureerd (ADMIN_PASSWORD / ADMIN_SESSION_SECRET ontbreekt).' },
      { status: 500 },
    )
  }

  let password = ''
  try {
    const body = await req.json()
    password = String(body?.password ?? '')
  } catch {
    /* lege body */
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Onjuist wachtwoord.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, await createSessionValue(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
