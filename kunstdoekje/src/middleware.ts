import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifySession } from '@/lib/admin-auth'

/**
 * Schermt /admin en /api/admin af. De login-route en login-pagina blijven open.
 * Zonder geldige sessie → redirect naar de loginpagina (UI) of 401 (API).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/admin/login'
  const isLoginApi = pathname === '/api/admin/login' || pathname === '/api/admin/logout'
  if (isLoginPage || isLoginApi) return NextResponse.next()

  const ok = await verifySession(req.cookies.get(ADMIN_COOKIE)?.value)
  if (ok) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/admin/login'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
