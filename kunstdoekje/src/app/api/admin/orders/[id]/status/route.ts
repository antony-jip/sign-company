import { NextResponse } from 'next/server'
import { setOrderStatus, type OrderStatus } from '@/lib/admin-data'
import { isSameOrigin } from '@/lib/admin-auth'

export const runtime = 'nodejs'

const ALLOWED: OrderStatus[] = ['open', 'pending', 'paid', 'failed', 'expired', 'canceled', 'refunded']

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Ongeldige oorsprong.' }, { status: 403 })
  }
  let status = ''
  try {
    const body = await req.json()
    status = String(body?.status ?? '')
  } catch {
    /* lege body */
  }
  if (!ALLOWED.includes(status as OrderStatus)) {
    return NextResponse.json({ ok: false, error: 'Onbekende status' }, { status: 400 })
  }
  await setOrderStatus(params.id, status as OrderStatus)
  return NextResponse.json({ ok: true })
}
