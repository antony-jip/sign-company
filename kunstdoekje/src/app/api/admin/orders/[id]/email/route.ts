import { NextResponse } from 'next/server'
import { getOrder } from '@/lib/admin-data'
import { sendCustomerMessage } from '@/lib/email'
import { isSameOrigin } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: 'Ongeldige oorsprong.' }, { status: 403 })
  }

  let subject = ''
  let message = ''
  try {
    const body = await req.json()
    subject = String(body?.subject ?? '').trim()
    message = String(body?.message ?? '').trim()
  } catch {
    /* lege body */
  }
  if (!subject || !message) {
    return NextResponse.json({ ok: false, error: 'Onderwerp en bericht zijn verplicht.' }, { status: 400 })
  }

  const data = await getOrder(params.id)
  if (!data) return NextResponse.json({ ok: false, error: 'Bestelling niet gevonden.' }, { status: 404 })

  const result = await sendCustomerMessage(data.order, subject, message)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }
  return NextResponse.json({ ok: true, to: data.order.email })
}
