import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

// Ontvanger en afzender komen uit env, met de huidige waarden als default.
// Zet CONTACT_MAIL_FROM op een geverifieerd domein (bv. no-reply@signcompany.nl)
// zodra dat in Resend is geverifieerd — de resend.dev-afzender is alleen voor test.
const TO = process.env.CONTACT_INBOX || 'antony@signcompany.nl'
const FROM = process.env.CONTACT_MAIL_FROM || 'doen.team <onboarding@resend.dev>'

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Mailservice niet geconfigureerd' }, { status: 500 })
  }

  let body: { naam?: unknown; email?: unknown; bericht?: unknown; website?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  // Honeypot: als het verborgen veld gevuld is, is het vrijwel zeker een bot.
  // We doen alsof het gelukt is (200) zonder te mailen, zodat de bot niks leert.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const naam = typeof body.naam === 'string' ? body.naam.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const bericht = typeof body.bericht === 'string' ? body.bericht.trim() : ''

  if (!naam || naam.length > 200) {
    return NextResponse.json({ error: 'Naam ontbreekt of is te lang' }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
  }
  if (!bericht || bericht.length > 5000) {
    return NextResponse.json({ error: 'Bericht ontbreekt of is te lang' }, { status: 400 })
  }

  const resend = new Resend(apiKey)
  const subject = `Contact via doen.team — ${naam}`
  const text = `Naam: ${naam}\nEmail: ${email}\n\nBericht:\n${bericht}\n`
  const html = `
    <div style="font-family: ui-sans-serif, system-ui, sans-serif; color:#1A1A1A; line-height:1.55;">
      <p style="margin:0 0 12px;"><strong>Naam:</strong> ${escape(naam)}</p>
      <p style="margin:0 0 12px;"><strong>Email:</strong> <a href="mailto:${escape(email)}">${escape(email)}</a></p>
      <p style="margin:0 0 6px;"><strong>Bericht:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit;margin:0;padding:12px;background:#F3F2ED;border-radius:8px;">${escape(bericht)}</pre>
    </div>
  `.trim()

  const { error } = await resend.emails.send({
    from: FROM,
    to: [TO],
    replyTo: email,
    subject,
    text,
    html,
  })

  if (error) {
    return NextResponse.json({ error: 'Versturen mislukt' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
