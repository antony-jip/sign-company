import { Resend } from 'resend'
import { COMPANY } from '@/lib/company'
import type { OrderItemRow, OrderRow } from '@/lib/admin-data'

const eur = (c: number) => '€ ' + (c / 100).toFixed(2).replace('.', ',')

/** HTML-escape voor klant-gestuurde velden (naam, adres, opmerking, snapshots). */
const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** Escape + behoud regelafbrekingen (voor handgeschreven berichten). */
const nl2brEsc = (text: string): string => esc(text).replace(/\r?\n/g, '<br>')

function configRegel(it: OrderItemRow): string {
  const parts: string[] = []
  if (it.format_snapshot) parts.push(it.format_snapshot)
  if (it.fabric_snapshot) parts.push(it.fabric_snapshot)
  parts.push(it.met_lijst ? (it.frame_snapshot ? `frame ${it.frame_snapshot}` : 'met frame') : 'los doek')
  return parts.filter(Boolean).join(' · ')
}

function itemRows(items: OrderItemRow[]): string {
  return items
    .map(
      (it) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">
            <b>${it.aantal}× ${esc(it.titel_snapshot ?? 'Kunstdoek')}</b><br>
            <span style="color:#8b7a6b;font-size:13px">${esc(configRegel(it))}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${eur(it.line_total_cents)}</td>
        </tr>`,
    )
    .join('')
}

function shell(title: string, inner: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#3a3127">
    <div style="font-size:22px;font-weight:bold">${COMPANY.merk}</div>
    <div style="font-size:12px;color:#8b7a6b;margin-bottom:4px">${COMPANY.onderdeelVan}</div>
    <div style="height:2px;background:#b8941e;margin:10px 0 20px"></div>
    <h2 style="font-size:18px;margin:0 0 12px">${esc(title)}</h2>
    ${inner}
    <div style="margin-top:24px;font-size:11px;color:#a29684;border-top:1px solid #eee;padding-top:10px">
      ${COMPANY.merk} · ${COMPANY.adres}, ${COMPANY.postcode} ${COMPANY.plaats} · ${COMPANY.telefoon} · ${COMPANY.email}
    </div>
  </div>`
}

function totalsBlock(order: OrderRow): string {
  return `<table style="width:100%;font-size:14px;margin-top:12px">
    <tr><td style="color:#8b7a6b;padding:2px 0">Subtotaal</td><td style="text-align:right">${eur(order.subtotal_cents)}</td></tr>
    <tr><td style="color:#8b7a6b;padding:2px 0">Verzending</td><td style="text-align:right">${order.shipping_cents ? eur(order.shipping_cents) : 'Gratis'}</td></tr>
    <tr><td style="font-weight:bold;padding-top:6px;border-top:1px solid #ddd">Totaal</td><td style="text-align:right;font-weight:bold;padding-top:6px;border-top:1px solid #ddd">${eur(order.total_cents)}</td></tr>
  </table>`
}

/**
 * Verstuurt bij een betaalde bestelling een melding naar de eigenaar én een
 * bevestiging naar de klant. Stil overslaan als Resend niet is geconfigureerd.
 * Alle klant-gestuurde velden worden ge-escaped (geen HTML-injectie).
 */
export async function sendPaidOrderEmails(order: OrderRow, items: OrderItemRow[]): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('RESEND_API_KEY niet ingesteld — bevestigingsmails overgeslagen.')
    return
  }
  const resend = new Resend(key)
  const from = process.env.MAIL_FROM || 'Kunstdoekje <onboarding@resend.dev>'
  const notify = process.env.ORDER_NOTIFY_EMAIL || COMPANY.email
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://kunstdoekje.nl'

  const adresBlok = `${esc(order.naam)}<br>${esc(order.adres)}<br>${esc(order.postcode)} ${esc(order.plaats)}<br>${esc(order.land)}<br>${esc(order.email)}${order.telefoon ? '<br>' + esc(order.telefoon) : ''}`
  const rows = itemRows(items)

  const adminHtml = shell(
    `Nieuwe bestelling · ${order.order_number}`,
    `<p style="font-size:14px">Er is zojuist een bestelling betaald${order.betaalmethode ? ` via <b>${esc(order.betaalmethode)}</b>` : ''}.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
     ${totalsBlock(order)}
     <p style="font-size:14px;margin-top:16px"><b>Bezorgadres</b><br>${adresBlok}</p>
     ${order.opmerking ? `<p style="font-size:14px"><b>Opmerking:</b> ${esc(order.opmerking)}</p>` : ''}
     <p style="margin-top:18px"><a href="${baseUrl}/admin/orders/${order.id}" style="background:#3a3127;color:#fff;text-decoration:none;padding:10px 18px;border-radius:3px;font-size:13px">Bekijk in beheer</a></p>`,
  )

  const klantHtml = shell(
    'Bedankt voor je bestelling',
    `<p style="font-size:14px">Hoi ${esc(order.naam)}, we hebben je betaling ontvangen. Je bestelling <b>${order.order_number}</b> wordt voor je gemaakt en op fluweel of decostof geprint in Nederland.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">${rows}</table>
     ${totalsBlock(order)}
     <p style="font-size:14px;margin-top:16px"><b>Bezorgadres</b><br>${adresBlok}</p>
     <p style="font-size:13px;color:#8b7a6b;margin-top:16px">Vragen? Mail ons gerust op ${COMPANY.email} o.v.v. ${order.order_number}.</p>`,
  )

  const results = await Promise.allSettled([
    resend.emails.send({ from, to: notify, subject: `🛎️ Nieuwe bestelling ${order.order_number} · ${eur(order.total_cents)}`, html: adminHtml }),
    resend.emails.send({ from, to: order.email, subject: `Bevestiging van je bestelling ${order.order_number}`, html: klantHtml }),
  ])
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`Bestel-e-mail ${i === 0 ? '(eigenaar)' : '(klant)'} faalde:`, r.reason)
  })
}

/**
 * Verstuurt een handmatig bericht vanuit de admin naar de klant van een order,
 * in de Kunstdoekje-huisstijl. Reply-to staat op je eigen inbox.
 */
export async function sendCustomerMessage(
  order: OrderRow,
  subject: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY is niet ingesteld op de server.' }
  const resend = new Resend(key)
  const from = process.env.MAIL_FROM || 'Kunstdoekje <onboarding@resend.dev>'
  const replyTo = process.env.ORDER_NOTIFY_EMAIL || COMPANY.email

  const html = shell(
    subject,
    `<p style="font-size:14px">${nl2brEsc(message)}</p>
     <p style="font-size:13px;color:#8b7a6b;margin-top:18px">Je bestelling: <b>${order.order_number}</b></p>`,
  )

  try {
    await resend.emails.send({ from, to: order.email, replyTo, subject, html })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Versturen mislukt.' }
  }
}
