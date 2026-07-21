import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/node'

// ── Sentry init (inline; Vercel bundelt geen lokale modules in api/) ──
if (process.env.SENTRY_DSN && !Sentry.getClient()) {
  const SENS = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
  const scrub = (v: unknown, d = 0): unknown => {
    if (d > 6 || v == null) return v
    if (Array.isArray(v)) return v.map(x => scrub(x, d + 1))
    if (typeof v === 'object') {
      const o: Record<string, unknown> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = SENS.test(k) ? '[Filtered]' : scrub(val, d + 1)
      return o
    }
    return v
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) for (const k of Object.keys(event.request.headers)) if (/authorization|cookie/i.test(k)) (event.request.headers as Record<string, string>)[k] = '[Filtered]'
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.user) { delete event.user.ip_address; delete event.user.email }
      return event
    },
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const MOLLIE_API_KEY = process.env.MOLLIE_API_KEY_LIVE || process.env.MOLLIE_API_KEY_TEST || ''

// €79 ex btw, afgeschreven bedrag is incl 21% btw
const ABONNEMENT_BEDRAG = '95.59'
const BTW_PERCENTAGE = 21

// Profiel waar de factuurgegevens van doen. zelf op staan (bedrijfsnaam, adres,
// KVK, btw-nummer, IBAN, logo). Overschrijfbaar zonder deploy via de env-var.
const DOEN_FACTUUR_PROFIEL_ID =
  process.env.DOEN_FACTUUR_PROFIEL_ID || 'ce6843e3-5cd9-4043-9461-55071bc91eb7'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const FACTUUR_AFZENDER = process.env.DOEN_FACTUUR_AFZENDER || 'doen. <noreply@doen.team>'
// Antwoorden op een noreply-adres verdwijnen. Wie op zijn factuur reageert
// komt zo alsnog bij een gelezen postbus terecht.
const FACTUUR_ANTWOORD = process.env.DOEN_FACTUUR_ANTWOORD || 'hello@doen.team'

const PETROL: [number, number, number] = [26, 83, 92]
const FLAME: [number, number, number] = [241, 80, 37]
const INKT: [number, number, number] = [26, 26, 26]
const GRIJS: [number, number, number] = [120, 120, 115]

interface MolliePayment {
  id: string
  status: string
  paidAt?: string
  customerId?: string
  subscriptionId?: string
  amount?: { value?: string; currency?: string }
  metadata?: {
    type?: string
    user_id?: string
    pakket_id?: string
    credits?: string
    organisatie_id?: string
  } | null
}

interface Factuurpartij {
  bedrijfsnaam: string
  adres: string
  postcode: string
  plaats: string
  email: string
  telefoon: string
  kvk: string
  btw: string
  iban: string
  logoUrl: string
}

const leegBedrijf = (): Factuurpartij => ({
  bedrijfsnaam: '', adres: '', postcode: '', plaats: '',
  email: '', telefoon: '', kvk: '', btw: '', iban: '', logoUrl: '',
})

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function euro(n: number): string {
  return `\u20AC ${n.toFixed(2).replace('.', ',')}`
}

function datumNl(d: Date): string {
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Eén maand vooruit, geklemd op de laatste dag van de doelmaand
// (31 jan → 28/29 feb), als YYYY-MM-DD voor Mollie's startDate.
function eenMaandLater(vanaf: Date): string {
  const jaar = vanaf.getUTCFullYear()
  const maand = vanaf.getUTCMonth()
  const dag = vanaf.getUTCDate()
  const laatsteDagDoelmaand = new Date(Date.UTC(jaar, maand + 2, 0)).getUTCDate()
  const doel = new Date(Date.UTC(jaar, maand + 1, Math.min(dag, laatsteDagDoelmaand)))
  return doel.toISOString().slice(0, 10)
}

// ─── Abonnementsfactuur ───
// Mollie incasseert wel maar factureert niet. Elke geslaagde incasso krijgt
// hier een factuur met eigen nummer, als PDF in de mail. Idempotent op het
// payment-id: Mollie levert webhooks at-least-once.

async function haalPartijen(organisatieId: string): Promise<{
  doen: Factuurpartij
  klant: Factuurpartij
  ontvangerEmail: string
} | null> {
  const supabase = getSupabase()

  const { data: doenProfiel } = await supabase
    .from('profiles')
    .select('bedrijfsnaam, bedrijfs_adres, bedrijfs_email, bedrijfs_telefoon, kvk_nummer, btw_nummer, iban, logo_url')
    .eq('id', DOEN_FACTUUR_PROFIEL_ID)
    .maybeSingle()

  if (!doenProfiel) {
    console.error(`[factuur] afzenderprofiel ${DOEN_FACTUUR_PROFIEL_ID} niet gevonden`)
    Sentry.captureMessage('Factuurafzender niet gevonden, er worden geen facturen verstuurd', {
      level: 'error',
      extra: { profielId: DOEN_FACTUUR_PROFIEL_ID },
    })
    return null
  }

  const { data: org } = await supabase
    .from('organisaties')
    .select('naam, adres, postcode, plaats, kvk_nummer, btw_nummer, eigenaar_id')
    .eq('id', organisatieId)
    .maybeSingle()

  if (!org) {
    console.error(`[factuur] organisatie ${organisatieId} niet gevonden`)
    Sentry.captureMessage('Factuur zonder organisatie', { level: 'error', extra: { organisatieId } })
    return null
  }

  // Ontvanger: bij voorkeur de eigenaar, anders het oudste profiel in de org.
  let ontvanger: { email?: string; bedrijfs_email?: string } | null = null
  if (org.eigenaar_id) {
    const { data } = await supabase
      .from('profiles')
      .select('email, bedrijfs_email')
      .eq('id', org.eigenaar_id)
      .maybeSingle()
    ontvanger = data
  }
  if (!ontvanger?.email && !ontvanger?.bedrijfs_email) {
    const { data } = await supabase
      .from('profiles')
      .select('email, bedrijfs_email')
      .eq('organisatie_id', organisatieId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    ontvanger = data
  }

  const ontvangerEmail = (ontvanger?.bedrijfs_email || ontvanger?.email || '').trim()
  if (!ontvangerEmail) {
    console.error(`[factuur] geen ontvanger-e-mail voor org ${organisatieId}`)
    Sentry.captureMessage('Factuur kan niet verstuurd worden, geen e-mailadres', {
      level: 'error', extra: { organisatieId },
    })
    return null
  }

  return {
    doen: {
      ...leegBedrijf(),
      bedrijfsnaam: doenProfiel.bedrijfsnaam || 'doen.',
      adres: doenProfiel.bedrijfs_adres || '',
      email: doenProfiel.bedrijfs_email || '',
      telefoon: doenProfiel.bedrijfs_telefoon || '',
      kvk: doenProfiel.kvk_nummer || '',
      btw: doenProfiel.btw_nummer || '',
      iban: doenProfiel.iban || '',
      logoUrl: doenProfiel.logo_url || '',
    },
    klant: {
      ...leegBedrijf(),
      bedrijfsnaam: org.naam || '',
      adres: org.adres || '',
      postcode: org.postcode || '',
      plaats: org.plaats || '',
      kvk: org.kvk_nummer || '',
      btw: org.btw_nummer || '',
    },
    ontvangerEmail,
  }
}

interface FactuurRegels {
  nummer: string
  datum: Date
  periodeStart: Date
  periodeEind: Date
  bedragExcl: number
  btwBedrag: number
  bedragIncl: number
}

async function bouwFactuurPdf(
  doen: Factuurpartij,
  klant: Factuurpartij,
  f: FactuurRegels,
): Promise<string> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const paginaBreedte = 210
  const links = 18
  const rechts = paginaBreedte - 18
  let y = 20

  // Briefhoofd: logo links, factuurgegevens rechts.
  let logoData = doen.logoUrl
  if (logoData && !logoData.startsWith('data:image')) {
    // profiles.logo_url is in de praktijk vaak een storage-URL; ophalen en
    // omzetten zodat het logo ook dan op de factuur komt.
    try {
      const resp = await fetch(logoData)
      const type = resp.headers.get('content-type') || 'image/png'
      if (resp.ok && type.startsWith('image/')) {
        const buf = Buffer.from(await resp.arrayBuffer())
        logoData = `data:${type};base64,${buf.toString('base64')}`
      } else {
        logoData = ''
      }
    } catch {
      logoData = ''
    }
  }

  if (logoData && logoData.startsWith('data:image')) {
    try {
      const props = doc.getImageProperties(logoData)
      const maxHoogte = 14
      const breedte = (props.width / props.height) * maxHoogte
      doc.addImage(logoData, 'PNG', links, y - 4, Math.min(breedte, 45), maxHoogte)
    } catch {
      // Logo mag de factuur nooit tegenhouden
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(...INKT)
    doc.text('doen', links, y + 5)
    doc.setTextColor(...FLAME)
    doc.text('.', links + doc.getTextWidth('doen'), y + 5)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...PETROL)
  doc.text('Factuur', rechts, y + 2, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRIJS)
  doc.text(f.nummer, rechts, y + 8, { align: 'right' })
  doc.text(datumNl(f.datum), rechts, y + 13, { align: 'right' })

  y += 30

  // Afzender en ontvanger naast elkaar.
  doc.setFontSize(8)
  doc.setTextColor(...GRIJS)
  doc.text('VAN', links, y)
  doc.text('AAN', links + 90, y)
  y += 5

  doc.setFontSize(9.5)
  doc.setTextColor(...INKT)
  const kolom = (regels: string[], x: number) => {
    let ry = y
    for (const r of regels.filter(Boolean)) {
      doc.text(r, x, ry)
      ry += 4.6
    }
    return ry
  }

  const vanEind = kolom([
    doen.bedrijfsnaam,
    doen.adres,
    doen.email,
    doen.kvk ? `KVK ${doen.kvk}` : '',
    doen.btw ? `BTW ${doen.btw}` : '',
  ], links)

  const aanEind = kolom([
    klant.bedrijfsnaam,
    klant.adres,
    [klant.postcode, klant.plaats].filter(Boolean).join('  '),
    klant.btw ? `BTW ${klant.btw}` : '',
  ], links + 90)

  y = Math.max(vanEind, aanEind) + 10

  // Regeltabel met één regel: het abonnement.
  doc.setDrawColor(...PETROL)
  doc.setLineWidth(0.4)
  doc.setFontSize(8)
  doc.setTextColor(...PETROL)
  doc.setFont('helvetica', 'bold')
  doc.text('OMSCHRIJVING', links, y)
  doc.text('BEDRAG', rechts, y, { align: 'right' })
  y += 2
  doc.line(links, y, rechts, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...INKT)
  doc.text('doen. abonnement', links, y)
  doc.text(euro(f.bedragExcl), rechts, y, { align: 'right' })
  y += 5
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIJS)
  doc.text(`Periode ${datumNl(f.periodeStart)} t/m ${datumNl(f.periodeEind)}`, links, y)
  y += 12

  // Totalen, uitgelijnd rechts.
  const labelX = rechts - 55
  doc.setFontSize(9.5)
  doc.setTextColor(...GRIJS)
  doc.text('Subtotaal excl. btw', labelX, y)
  doc.setTextColor(...INKT)
  doc.text(euro(f.bedragExcl), rechts, y, { align: 'right' })
  y += 6

  doc.setTextColor(...GRIJS)
  doc.text(`BTW ${BTW_PERCENTAGE}%`, labelX, y)
  doc.setTextColor(...INKT)
  doc.text(euro(f.btwBedrag), rechts, y, { align: 'right' })
  y += 4

  doc.setDrawColor(225, 225, 228)
  doc.setLineWidth(0.3)
  doc.line(labelX, y, rechts, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...PETROL)
  doc.text('Totaal incl. btw', labelX, y)
  doc.text(euro(f.bedragIncl), rechts, y, { align: 'right' })
  y += 16

  // Betaalstatus: voorkomt dat iemand het bedrag nog een keer overmaakt.
  doc.setFillColor(232, 242, 236)
  doc.roundedRect(links, y - 5, rechts - links, 14, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(58, 125, 82)
  doc.text('Voldaan', links + 5, y + 1)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIJS)
  doc.text(
    `Automatisch ge\u00EFncasseerd op ${datumNl(f.datum)}. U hoeft niets te doen.`,
    links + 5, y + 5.5,
  )
  y += 22

  doc.setFontSize(8)
  doc.setTextColor(...GRIJS)
  const voet = [
    doen.bedrijfsnaam,
    doen.adres,
    doen.iban ? `IBAN ${doen.iban}` : '',
    doen.kvk ? `KVK ${doen.kvk}` : '',
    doen.btw ? `BTW ${doen.btw}` : '',
  ].filter(Boolean).join('  ·  ')
  doc.text(voet, paginaBreedte / 2, 285, { align: 'center' })

  return doc.output('datauristring').split(',')[1]
}

async function maakEnVerstuurFactuur(payment: MolliePayment, organisatieId: string): Promise<void> {
  const supabase = getSupabase()

  // Al verstuurd? Klaar. Bestaat de rij wel maar is de mail nooit vertrokken
  // (timeout of Resend-storing), dan pakken we hem hier weer op in plaats van
  // de klant zonder factuur achter te laten.
  const { data: bestaand } = await supabase
    .from('abonnement_facturen')
    .select('id, nummer, datum, periode_start, periode_eind, bedrag_excl, btw_bedrag, bedrag_incl, verstuurd_op')
    .eq('mollie_payment_id', payment.id)
    .maybeSingle()
  if (bestaand?.verstuurd_op) return

  const partijen = await haalPartijen(organisatieId)
  if (!partijen) return

  const betaaldOp = payment.paidAt ? new Date(payment.paidAt) : new Date()
  const periodeEindIso = eenMaandLater(betaaldOp)
  const periodeEind = new Date(periodeEindIso)
  periodeEind.setUTCDate(periodeEind.getUTCDate() - 1)

  // Het werkelijk geincasseerde bedrag, niet de constante: als de prijs ooit
  // wijzigt moet de factuur het bedrag tonen dat de klant echt betaald heeft.
  const bedragIncl = r2(Number(payment.amount?.value ?? ABONNEMENT_BEDRAG))
  const bedragExcl = r2(bedragIncl / (1 + BTW_PERCENTAGE / 100))
  const btwBedrag = r2(bedragIncl - bedragExcl)

  let factuurId: string
  let nummer: string

  if (bestaand) {
    factuurId = bestaand.id
    nummer = bestaand.nummer
    console.log(`[factuur] ${nummer} bestond al zonder verzending, opnieuw geprobeerd`)
  } else {
    const { data: nummerData, error: nummerError } = await supabase
      .rpc('volgend_abonnement_factuurnummer')
    if (nummerError || !nummerData) {
      console.error('[factuur] nummer ophalen mislukt:', nummerError)
      Sentry.captureException(nummerError || new Error('Geen factuurnummer'), { extra: { paymentId: payment.id } })
      return
    }
    nummer = String(nummerData)

    const { data: rij, error: insertError } = await supabase
      .from('abonnement_facturen')
      .insert({
        organisatie_id: organisatieId,
        nummer,
        mollie_payment_id: payment.id,
        datum: betaaldOp.toISOString().slice(0, 10),
        bedrag_excl: bedragExcl,
        btw_percentage: BTW_PERCENTAGE,
        btw_bedrag: btwBedrag,
        bedrag_incl: bedragIncl,
        periode_start: betaaldOp.toISOString().slice(0, 10),
        periode_eind: periodeEind.toISOString().slice(0, 10),
      })
      .select('id')
      .single()

    if (insertError) {
      // 23505 = unique violation: een parallelle levering was ons voor. Het
      // getrokken nummer is dan verbrand; loggen zodat het gat verklaarbaar is.
      if (insertError.code === '23505') {
        console.log(`[factuur] nummer ${nummer} vervalt, parallelle levering was eerder voor payment ${payment.id}`)
      } else {
        console.error('[factuur] opslaan mislukt:', insertError)
        Sentry.captureException(insertError, { extra: { paymentId: payment.id, nummer } })
      }
      return
    }
    factuurId = rij.id
  }

  const pdfBase64 = await bouwFactuurPdf(partijen.doen, partijen.klant, {
    nummer,
    datum: betaaldOp,
    periodeStart: betaaldOp,
    periodeEind,
    bedragExcl,
    btwBedrag,
    bedragIncl,
  })

  const pdfPad = `${organisatieId}/${nummer}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('abonnement-facturen')
    .upload(pdfPad, Buffer.from(pdfBase64, 'base64'), {
      contentType: 'application/pdf',
      upsert: true,
    })
  if (uploadError) {
    console.warn('[factuur] PDF opslaan mislukt, mail gaat wel door:', uploadError.message)
  } else {
    // Direct koppelen, niet pas na de mail: anders staat er bij een
    // mailstoring wel een PDF in de bucket waar niets naar verwijst.
    await supabase
      .from('abonnement_facturen')
      .update({ pdf_pad: pdfPad })
      .eq('id', factuurId)
  }

  if (!RESEND_API_KEY) {
    console.warn('[factuur] RESEND_API_KEY ontbreekt, factuur niet gemaild')
    return
  }

  const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;font-size:15px;line-height:1.7;color:#333">
  <p>Beste ${partijen.klant.bedrijfsnaam || 'klant'},</p>
  <p>
    Hierbij de factuur voor je doen.-abonnement over de periode
    ${datumNl(betaaldOp)} t/m ${datumNl(periodeEind)}.
  </p>
  <p>
    Het bedrag van <strong>${euro(bedragIncl)} incl. btw</strong>
    (${euro(bedragExcl)} excl. btw, ${euro(btwBedrag)} btw) is automatisch
    van je rekening afgeschreven. Je hoeft niets te doen.
  </p>
  <p style="color:#666;font-size:13px">
    De factuur zit als PDF bij deze mail. Je vindt al je facturen ook terug in
    doen. onder Instellingen &rsaquo; Financieel &rsaquo; Abonnement.
  </p>
  <p>Met vriendelijke groet,<br/>${partijen.doen.bedrijfsnaam}</p>
</div>`

  try {
    const mailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FACTUUR_AFZENDER,
        reply_to: FACTUUR_ANTWOORD,
        to: [partijen.ontvangerEmail],
        subject: `Factuur ${nummer} · doen. abonnement`,
        html,
        attachments: [{ filename: `${nummer}.pdf`, content: pdfBase64 }],
      }),
    })
    if (!mailResponse.ok) {
      const body = await mailResponse.text()
      console.error('[factuur] mailen mislukt:', mailResponse.status, body)
      Sentry.captureException(new Error(`Factuurmail faalde: ${mailResponse.status}`), {
        extra: { nummer, organisatieId },
      })
      return
    }
  } catch (err) {
    console.error('[factuur] mailen mislukt:', err)
    Sentry.captureException(err, { extra: { nummer, organisatieId } })
    return
  }

  await supabase
    .from('abonnement_facturen')
    .update({ verstuurd_op: new Date().toISOString(), verstuurd_naar: partijen.ontvangerEmail })
    .eq('id', factuurId)

  console.log(`[factuur] ${nummer} verstuurd naar ${partijen.ontvangerEmail}`)
}

// ─── Credits: eenmalige Studio-aankoop ───
async function handleCredits(payment: MolliePayment, res: VercelResponse) {
  if (payment.status !== 'paid') {
    console.log(`[billing-webhook] credits payment ${payment.id} status=${payment.status}, geen actie`)
    return res.status(200).json({ received: true })
  }

  const userId = payment.metadata?.user_id
  const pakketId = payment.metadata?.pakket_id
  const credits = parseInt(payment.metadata?.credits || '0', 10)

  if (!userId || !credits) {
    console.warn(`[billing-webhook] credits payment ${payment.id} zonder user/credits metadata`)
    return res.status(200).json({ received: true })
  }

  const supabase = getSupabase()

  // Atomair + idempotent: de RPC claimt het payment-id (UNIQUE-index), telt de
  // credits bij en logt de transactie in één transactie. Bij een duplicate
  // webhook is het id al geclaimd → RPC geeft null terug, geen dubbele credits.
  const { data: nieuwSaldo, error: koopError } = await supabase.rpc('visualizer_credits_koop', {
    p_user: userId,
    p_credits: credits,
    p_session_id: payment.id,
    p_payment_intent: null,
    p_beschrijving: `Mollie betaling · ${pakketId} pakket (${credits} credits)`,
  })

  if (koopError) {
    console.error(`[billing-webhook] credits bijschrijven mislukt voor user ${userId}, payment ${payment.id}:`, koopError)
    Sentry.captureException(koopError, { extra: { paymentId: payment.id } })
    return res.status(500).json({ error: 'Credits bijschrijven mislukt' })
  }

  if (nieuwSaldo === null) {
    console.log(`[billing-webhook] payment ${payment.id} al verwerkt, skip`)
  } else {
    console.log(`[billing-webhook] credits bijgeschreven: user=${userId}, +${credits}, saldo=${nieuwSaldo}`)
  }
  return res.status(200).json({ received: true })
}

// ─── Abonnement: eerste betaling (mandaat + maand 1) ───
async function handleAbonnementStart(payment: MolliePayment, webhookUrl: string, res: VercelResponse) {
  const organisatieId = payment.metadata?.organisatie_id
  if (!organisatieId) {
    console.warn(`[billing-webhook] abonnement payment ${payment.id} zonder organisatie_id`)
    return res.status(200).json({ received: true })
  }

  if (payment.status !== 'paid') {
    console.log(`[billing-webhook] eerste betaling ${payment.id} status=${payment.status} voor org ${organisatieId}, geen actie`)
    return res.status(200).json({ received: true })
  }

  if (!payment.customerId) {
    console.error(`[billing-webhook] eerste betaling ${payment.id} zonder customerId`)
    Sentry.captureException(new Error('Mollie first payment zonder customerId'), { extra: { paymentId: payment.id } })
    return res.status(200).json({ received: true })
  }

  const supabase = getSupabase()
  const claim = `pending_${payment.id}`

  // Claim de subscription-slot vóór het aanmaken: Mollie levert webhooks
  // at-least-once en een dubbele subscription betekent dubbele incasso's.
  // Een achtergebleven pending-claim van een eerdere (gecrashte) poging mag
  // overgenomen worden; alleen een echt subscription-id blokkeert.
  // Twee losse pogingen in plaats van één or-filter: PostgREST verwerkt een
  // or-filter op een UPDATE niet en geeft dan "column
  // organisaties.mollie_subscription_id does not exist", ook al bestaat de
  // kolom. Elke poging is op zichzelf atomair, dus de claim blijft veilig.
  const claimPoging = (filter: 'leeg' | 'pending') => {
    const q = supabase
      .from('organisaties')
      .update({ mollie_subscription_id: claim })
      .eq('id', organisatieId)
    return (filter === 'leeg'
      ? q.is('mollie_subscription_id', null)
      : q.like('mollie_subscription_id', 'pending%')
    ).select('id')
  }

  let { data: geclaimd, error: claimError } = await claimPoging('leeg')

  // Achtergebleven pending-claim van een eerdere (gecrashte) poging overnemen.
  if (!claimError && (!geclaimd || geclaimd.length === 0)) {
    ({ data: geclaimd, error: claimError } = await claimPoging('pending'))
  }

  if (claimError) {
    console.error(`[billing-webhook] claim mislukt voor org ${organisatieId}:`, claimError)
    Sentry.captureException(claimError, { extra: { paymentId: payment.id } })
    return res.status(500).json({ error: 'Database update mislukt' })
  }

  if (!geclaimd || geclaimd.length === 0) {
    // Org heeft al een echt subscription-id: dubbele betaling zonder activering.
    // Geld is geïnd; alert zodat er handmatig gerefund kan worden.
    console.warn(`[billing-webhook] org ${organisatieId} heeft al een subscription, dubbele eerste betaling ${payment.id}`)
    Sentry.captureMessage('Dubbele eerste abonnementsbetaling zonder activering', {
      level: 'warning',
      extra: { paymentId: payment.id, organisatieId },
    })
    return res.status(200).json({ received: true })
  }

  const mollieHeaders = {
    'Authorization': `Bearer ${MOLLIE_API_KEY}`,
    'Content-Type': 'application/json',
  }

  // Adopteer een al bestaande lopende subscription (eerdere run die na de
  // create crashte, of een parallelle duplicate delivery) in plaats van een
  // tweede aan te maken.
  let subscriptionId: string | null = null
  let zelfAangemaakt = false
  const bestaandeResponse = await fetch(
    `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions?limit=250`,
    { headers: mollieHeaders }
  )
  if (bestaandeResponse.ok) {
    const bestaande = await bestaandeResponse.json() as {
      _embedded?: { subscriptions?: Array<{ id: string; status: string; metadata?: { organisatie_id?: string } | null }> }
    }
    const lopend = bestaande._embedded?.subscriptions?.find(
      s => ['active', 'pending'].includes(s.status) && s.metadata?.organisatie_id === organisatieId
    )
    if (lopend) {
      console.log(`[billing-webhook] bestaande subscription ${lopend.id} geadopteerd voor org ${organisatieId}`)
      subscriptionId = lopend.id
    }
  } else {
    console.error(`[billing-webhook] subscriptions ophalen mislukt: ${bestaandeResponse.status}`)
    return res.status(502).json({ error: 'Subscriptions ophalen bij Mollie mislukt' })
  }

  if (!subscriptionId) {
    const startDatum = eenMaandLater(payment.paidAt ? new Date(payment.paidAt) : new Date())

    const subscriptionResponse = await fetch(
      `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions`,
      {
        method: 'POST',
        // Mollie dedupliceert hiermee parallelle duplicate deliveries van
        // dezelfde payment
        headers: { ...mollieHeaders, 'Idempotency-Key': `sub_${payment.id}` },
        body: JSON.stringify({
          amount: { currency: 'EUR', value: ABONNEMENT_BEDRAG },
          interval: '1 month',
          startDate: startDatum,
          description: 'doen. abonnement',
          webhookUrl,
          metadata: { type: 'abonnement_termijn', organisatie_id: organisatieId },
        }),
      }
    )

    if (!subscriptionResponse.ok) {
      const errorBody = await subscriptionResponse.text()
      console.error(`[billing-webhook] subscription aanmaken mislukt voor org ${organisatieId}:`, subscriptionResponse.status, errorBody)
      Sentry.captureException(new Error(`Mollie subscription aanmaken faalde: ${subscriptionResponse.status}`), {
        extra: { paymentId: payment.id, organisatieId },
      })
      // Claim vrijgeven zodat de Mollie-retry opnieuw kan proberen
      await supabase
        .from('organisaties')
        .update({ mollie_subscription_id: null })
        .eq('id', organisatieId)
        .eq('mollie_subscription_id', claim)
      return res.status(500).json({ error: 'Subscription aanmaken mislukt' })
    }

    const subscription = await subscriptionResponse.json() as { id: string }
    subscriptionId = subscription.id
    zelfAangemaakt = true
  }

  // Alleen activeren als we de claim nog vasthouden. Zonder deze voorwaarde kan
  // een parallelle levering van een ándere eerste betaling onze claim hebben
  // overgenomen; wie dan het laatst schrijft wint, en het verliezende
  // abonnement blijft bij Mollie doorlopen zonder dat wij het nog kennen.
  const { data: geactiveerd, error: updateError } = await supabase
    .from('organisaties')
    .update({
      abonnement_status: 'actief',
      is_betaald: true,
      mollie_customer_id: payment.customerId,
      mollie_subscription_id: subscriptionId,
      abonnement_actief_tot: null,
    })
    .eq('id', organisatieId)
    .eq('mollie_subscription_id', claim)
    .select('id')

  if (updateError) {
    // Subscription bestaat al bij Mollie; de retry adopteert hem en probeert
    // deze update opnieuw
    console.error(`[billing-webhook] activeren mislukt voor org ${organisatieId}:`, updateError)
    Sentry.captureException(updateError, { extra: { paymentId: payment.id, subscriptionId } })
    return res.status(500).json({ error: 'Abonnement activeren mislukt' })
  }

  if (!geactiveerd || geactiveerd.length === 0) {
    // Claim kwijtgeraakt aan een parallelle run. Een abonnement dat wij in deze
    // run zelf hebben aangemaakt moet weg, anders incasseert Mollie straks twee
    // keer per maand op dezelfde klant.
    console.warn(`[billing-webhook] claim verloren voor org ${organisatieId}, payment ${payment.id}`)
    if (zelfAangemaakt && payment.customerId) {
      await fetch(
        `https://api.mollie.com/v2/customers/${payment.customerId}/subscriptions/${subscriptionId}`,
        { method: 'DELETE', headers: mollieHeaders }
      ).catch(err => console.error('[billing-webhook] overtollige subscription opruimen mislukt:', err))
    }
    Sentry.captureMessage('Eerste abonnementsbetaling verloor de claim', {
      level: 'warning',
      extra: { paymentId: payment.id, organisatieId, subscriptionId, zelfAangemaakt },
    })
    return res.status(200).json({ received: true })
  }

  console.log(`[billing-webhook] abonnement actief: org=${organisatieId}, subscription=${subscriptionId}`)

  // De eerste maand loopt via de checkout, niet via de subscription. Zonder
  // deze aanroep zou de klant juist zijn eerste factuur missen. Een fout hier
  // mag de activering nooit terugdraaien.
  try {
    await maakEnVerstuurFactuur(payment, organisatieId)
  } catch (err) {
    console.error('[billing-webhook] eerste factuur mislukt:', err)
    Sentry.captureException(err, { extra: { paymentId: payment.id, organisatieId } })
  }

  return res.status(200).json({ received: true })
}

// ─── Abonnement: maandelijkse termijn-incasso ───
async function handleAbonnementTermijn(payment: MolliePayment, res: VercelResponse) {
  const subscriptionId = payment.subscriptionId
  if (!subscriptionId) {
    console.warn(`[billing-webhook] termijn payment ${payment.id} zonder subscriptionId`)
    return res.status(200).json({ received: true })
  }

  const supabase = getSupabase()

  if (payment.status === 'paid') {
    const { data: bijgewerkt, error } = await supabase
      .from('organisaties')
      .update({ abonnement_status: 'actief', is_betaald: true })
      .eq('mollie_subscription_id', subscriptionId)
      .select('id')
    if (error) {
      Sentry.captureException(error, { extra: { paymentId: payment.id, subscriptionId } })
      return res.status(500).json({ error: 'Database update mislukt' })
    }
    console.log(`[billing-webhook] termijn betaald: subscription=${subscriptionId}`)

    const organisatieId = bijgewerkt?.[0]?.id
    if (organisatieId) {
      try {
        await maakEnVerstuurFactuur(payment, organisatieId)
      } catch (err) {
        console.error('[billing-webhook] maandfactuur mislukt:', err)
        Sentry.captureException(err, { extra: { paymentId: payment.id, subscriptionId } })
      }
    } else {
      // Er is geïncasseerd maar geen organisatie meer gekoppeld, bijvoorbeeld
      // omdat er net is opgezegd. Dat is geld zonder factuur; niet stil laten.
      console.error(`[billing-webhook] termijn ${payment.id} zonder gekoppelde organisatie`)
      Sentry.captureMessage('Incasso zonder gekoppelde organisatie', {
        level: 'error', extra: { paymentId: payment.id, subscriptionId },
      })
    }
  } else if (['failed', 'expired', 'canceled', 'charged_back'].includes(payment.status)) {
    const { error } = await supabase
      .from('organisaties')
      .update({ abonnement_status: 'verlopen', is_betaald: false })
      .eq('mollie_subscription_id', subscriptionId)
    if (error) {
      Sentry.captureException(error, { extra: { paymentId: payment.id, subscriptionId } })
      return res.status(500).json({ error: 'Database update mislukt' })
    }
    console.warn(`[billing-webhook] termijn mislukt (${payment.status}): subscription=${subscriptionId}, status naar verlopen`)
  } else {
    console.log(`[billing-webhook] termijn payment ${payment.id} status=${payment.status}, geen actie`)
  }

  return res.status(200).json({ received: true })
}

// Mollie post `id=tr_...` als application/x-www-form-urlencoded. Vercel parst
// dat normaal naar een object, maar bij een afwijkende content-type komt de
// body als string binnen. Beide afhandelen, want dit pad mag niet stilvallen.
function leesPaymentId(body: unknown): string | null {
  if (typeof body === 'string') {
    const params = new URLSearchParams(body)
    return params.get('id')
  }
  if (body && typeof body === 'object') {
    const id = (body as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // Mollie's payment-webhook stuurt geen signature: de body is alleen
    // `id=tr_...` en verder niets. De beveiliging zit erin dat we die id
    // hieronder bij Mollie opvragen met onze eigen API-key en de status
    // daarvan volgen. Een vervalste POST kan dus nooit iets op betaald zetten,
    // hooguit een echte betaling opnieuw laten verwerken (en dat is idempotent).

    const paymentId = leesPaymentId(req.body)
    if (!paymentId || !/^tr_[a-zA-Z0-9]+$/.test(paymentId)) {
      return res.status(400).json({ error: 'Ongeldig of ontbrekend Payment ID' })
    }

    if (!MOLLIE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[billing-webhook] Mollie of Supabase niet geconfigureerd')
      return res.status(500).json({ error: 'Webhook niet geconfigureerd' })
    }

    // De payload is alleen een id; de payment zelf is de bron van waarheid
    const paymentResponse = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MOLLIE_API_KEY}` },
    })

    if (paymentResponse.status === 404) {
      console.warn(`[billing-webhook] payment ${paymentId} niet gevonden bij Mollie`)
      return res.status(200).json({ received: true })
    }
    if (!paymentResponse.ok) {
      const errorBody = await paymentResponse.text()
      console.error(`[billing-webhook] payment ophalen mislukt: ${paymentResponse.status}`, errorBody)
      return res.status(502).json({ error: 'Payment ophalen bij Mollie mislukt' })
    }

    const payment = await paymentResponse.json() as MolliePayment

    const host = req.headers.host || 'app.doen.team'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const webhookUrl = `${protocol}://${host}/api/billing-webhook`

    switch (payment.metadata?.type) {
      case 'credits':
        return await handleCredits(payment, res)
      case 'abonnement':
        return await handleAbonnementStart(payment, webhookUrl, res)
      case 'abonnement_termijn':
        return await handleAbonnementTermijn(payment, res)
      default:
        console.log(`[billing-webhook] payment ${payment.id} zonder bekend metadata.type, skip`)
        return res.status(200).json({ received: true })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Onbekende fout'
    console.error('[billing-webhook] fout:', message)
    Sentry.captureException(error)
    return res.status(500).json({ error: message })
  }
}
