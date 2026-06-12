import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Offerte- / contactaanvraag (maatwerk, zakelijk, algemeen contact).
 * Slaat de aanvraag op in quote_requests. (Mailnotificatie via Resend = TODO.)
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }

  const email = (body.email as string)?.trim()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Geldig e-mailadres is verplicht' }, { status: 400 })
  }

  const type = ['maatwerk', 'zakelijk', 'contact'].includes(body.type as string)
    ? (body.type as string)
    : 'contact'

  const { error } = await supabaseAdmin().from('quote_requests').insert({
    type,
    email,
    naam: (body.naam as string) ?? null,
    telefoon: (body.telefoon as string) ?? null,
    bedrijf: (body.bedrijf as string) ?? null,
    bericht: (body.bericht as string) ?? null,
    gewenst_formaat: (body.gewenstFormaat as string) ?? null,
    fabric_key: (body.fabricKey as string) ?? null,
    upload_id: (body.uploadId as string) ?? null,
  })

  if (error) {
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
