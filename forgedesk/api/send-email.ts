import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createTransport } from 'nodemailer'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
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

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for send-email, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(20, '60 s'), prefix: 'rl:send-email', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] send-email id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] send-email id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

// Valideert dat een uit de body opgegeven storage-object bij de caller hoort.
// DB-gebaseerd (convention-onafhankelijk): het pad moet als storage_path in de
// org-gescopete brontabel staan. Tijdelijke offerte/mail-uploads leven onder
// email-bijlagen/{user_id}/ en worden op user_id gecheckt.
async function attachmentToegestaan(
  bucket: string,
  path: string,
  orgId: string | null,
  userId: string,
): Promise<boolean> {
  // Path-traversal / absolute paden altijd weigeren.
  if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) return false

  if (bucket === 'documenten') {
    const seg = path.split('/')
    // Tijdelijke mail-/offerte-uploads: email-bijlagen[-groot]/{user_id}/...
    if (seg[0] === 'email-bijlagen' || seg[0] === 'email-bijlagen-groot') return seg[1] === userId
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('documenten')
      .select('id')
      .eq('storage_path', path)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    return !!data
  }

  if (bucket === 'facturen') {
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('facturen')
      .select('id')
      .eq('pdf_storage_path', path)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    return !!data
  }

  if (bucket === 'factuur-bijlagen') {
    if (!orgId) return false
    const { data } = await supabaseAdmin
      .from('factuur_bijlagen')
      .select('id')
      .eq('storage_path', path)
      .eq('organisatie_id', orgId)
      .maybeSingle()
    return !!data
  }

  // Onbekende bucket: fail-closed.
  return false
}
interface EmailCredentials {
  gmail_address: string
  app_password: string
  smtp_host: string
  smtp_port: number
  imap_host: string
  imap_port: number
}

function decryptPassword(encrypted: string): string {
  if (encrypted.startsWith('b64:')) {
    return Buffer.from(encrypted.slice(4), 'base64').toString('utf8')
  }
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY
  if (!ENCRYPTION_KEY) {
    console.error('[decryptPassword] EMAIL_ENCRYPTION_KEY niet geconfigureerd')
    throw new Error('EMAIL_ENCRYPTION_KEY niet geconfigureerd — sla je wachtwoord opnieuw op in Instellingen > Email > Verbinding')
  }
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
    const [ivHex, encryptedHex] = encrypted.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('[decryptPassword] AES decryptie mislukt:', err)
    throw new Error('Wachtwoord ontsleutelen mislukt — sla je wachtwoord opnieuw op')
  }
}

async function getEmailCredentials(userId: string): Promise<EmailCredentials> {
  const { data, error } = await supabaseAdmin
    .from('user_email_settings')
    .select('gmail_address, encrypted_app_password, smtp_host, smtp_port, imap_host, imap_port')
    .eq('user_id', userId)
    .single()

  if (error || !data?.gmail_address || !data?.encrypted_app_password) {
    throw new Error('Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.')
  }

  return {
    gmail_address: data.gmail_address,
    app_password: decryptPassword(data.encrypted_app_password),
    smtp_host: data.smtp_host || 'smtp.gmail.com',
    smtp_port: data.smtp_port || 587,
    imap_host: data.imap_host || 'imap.gmail.com',
    imap_port: data.imap_port || 993,
  }
}

function extractBareEmail(address: string): string {
  const trimmed = address.trim()
  const match = trimmed.match(/<([^>]+)>/)
  return (match?.[1] || trimmed).toLowerCase()
}

export const config = { maxDuration: 30 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user_id = await verifyUser(req)

    if (!(await enforceRateLimit(user_id, res))) return

    let gmail_address: string, app_password: string, smtp_host: string, smtp_port: number
    try {
      const creds = await getEmailCredentials(user_id)
      gmail_address = creds.gmail_address
      app_password = creds.app_password
      smtp_host = creds.smtp_host
      smtp_port = creds.smtp_port
    } catch {
      gmail_address = req.body.gmail_address
      app_password = req.body.app_password
      smtp_host = req.body.smtp_host || 'smtp.gmail.com'
      smtp_port = req.body.smtp_port || 587
      if (!gmail_address || !app_password) {
        return res.status(400).json({ error: 'Geen email instellingen gevonden. Configureer je email in Instellingen > Integraties.' })
      }
    }

    const {
      to,
      cc,
      bcc,
      subject,
      body,
      html,
      attachments,
      opvolging_id,
      scheduledAt,
      wacht_op_reactie = false,
      // Threading: meegegeven door de frontend bij reply/forward
      in_reply_to,
      thread_id,
    } = req.body as {
      to: string
      cc?: string
      bcc?: string
      subject: string
      body?: string
      html?: string
      attachments?: Array<{ filename: string; content?: string; encoding?: 'base64'; storagePath?: string; bucket?: string; cleanupAfter?: boolean; size?: number }>
      opvolging_id?: string
      scheduledAt?: string
      wacht_op_reactie?: boolean
      in_reply_to?: string
      thread_id?: string
    }

    if (!to || !subject) {
      return res.status(400).json({ error: 'Ontvanger en onderwerp zijn verplicht' })
    }

    if (scheduledAt) {
      const verzendDatum = new Date(scheduledAt)
      if (Number.isNaN(verzendDatum.getTime())) {
        return res.status(400).json({ error: 'Ongeldige scheduledAt waarde' })
      }
      if (verzendDatum.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'scheduledAt moet in de toekomst liggen' })
      }

      const { data: ingepland, error: insertError } = await supabaseAdmin
        .from('ingeplande_berichten')
        .insert({
          user_id,
          ontvanger: to,
          cc: cc || null,
          bcc: bcc || null,
          onderwerp: subject,
          body: body || null,
          html: html || null,
          bijlagen: attachments || [],
          scheduled_at: verzendDatum.toISOString(),
          status: 'wachtend',
          in_reply_to: in_reply_to || null,
          thread_id: thread_id || null,
          wacht_op_reactie,
        })
        .select('id')
        .single()

      if (insertError || !ingepland) {
        console.error('[send-email] Ingepland bericht aanmaken mislukt:', insertError)
        return res.status(500).json({ error: 'Email inplannen mislukt' })
      }

      console.log('[send-email] Bericht ingepland:', ingepland.id, scheduledAt)
      return res.status(200).json({ success: true, message: 'Email ingepland', id: ingepland.id })
    }

    // Afzendernaam staat per-user op profiles (migratie 091); bedrijfsnaam als fallback.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('bedrijfsnaam, afzender_naam')
      .eq('id', user_id)
      .maybeSingle()

    const afzenderNaam = (profile?.afzender_naam || '').trim() || null
    const fromName = afzenderNaam || profile?.bedrijfsnaam?.trim() || null
    const fromAddress = fromName
      ? `"${fromName.replace(/"/g, '')}" <${gmail_address}>`
      : gmail_address

    const transporter = createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: { user: gmail_address, pass: app_password },
    })

    // Extraheer inline base64 data URIs uit de HTML en converteer ze naar
    // CID-attachments. Dit maakt de mail RFC-conform (multipart/related) en
    // voorkomt problemen met SMTP grootte-limieten.
    let processedHtml = html || ''
    const inlineAttachments: Array<{ filename: string; content: Buffer; cid: string; contentType: string; contentDisposition: 'inline' }> = []

    if (processedHtml) {
      let imgIndex = 0
      processedHtml = processedHtml.replace(
        /<img([^>]*)src="data:(image\/(png|jpeg|jpg|gif|webp|svg\+xml));base64,([^"]+)"([^>]*)>/gi,
        (_match, before, mimeType, ext, b64Data, after) => {
          const cid = `inline-${crypto.randomUUID()}@forgedesk`
          const extension = ext.replace('+xml', '').replace('jpeg', 'jpg')
          inlineAttachments.push({
            filename: `inline-${imgIndex++}.${extension}`,
            content: Buffer.from(b64Data, 'base64'),
            cid,
            contentType: mimeType,
            contentDisposition: 'inline',
          })
          return `<img${before}src="cid:${cid}"${after}>`
        }
      )
    }

    const mailOptions: Record<string, unknown> = {
      from: fromAddress,
      to,
      subject,
    }
    // Threading SMTP headers zodat ontvangers de mail correct threaden
    if (in_reply_to) {
      mailOptions.inReplyTo = in_reply_to
      mailOptions.references = in_reply_to
    }
    // Als er HTML is, gebruik die als primaire content. Plain text alleen als fallback.
    if (processedHtml) {
      mailOptions.html = processedHtml
      // Minimale plain text voor email clients zonder HTML support
      mailOptions.text = body || subject
    } else {
      mailOptions.text = body
    }
    if (cc) mailOptions.cc = cc
    if (bcc) mailOptions.bcc = bcc

    // Verwerk bijlagen: download van Supabase Storage of gebruik base64.
    // Per attachment kan een bucket meegegeven worden (default 'documenten' voor
    // backwards compat met portaal-upload flow). cleanupAfter regelt of het
    // storage-object na verzending verwijderd wordt — standaard alleen voor
    // documenten-bucket (tijdelijke portaal-uploads). Persistente bijlagen
    // (bv factuur-bijlagen, facturen) moeten NIET na verzending gewist worden.
    const cleanupTargets: Array<{ bucket: string; path: string }> = []
    const fileAttachments: Array<{ filename: string; content: Buffer }> = []
    if (attachments?.length) {
      // Ownership-check: storagePath/bucket komen uit de request-body. Zonder
      // validatie kan een geauthenticeerde user via service-role elk pad in elke
      // bucket downloaden (cross-tenant exfiltratie). We valideren daarom per
      // bucket dat het object bij de organisatie/user van de caller hoort.
      const { data: callerProfile } = await supabaseAdmin
        .from('profiles')
        .select('organisatie_id')
        .eq('id', user_id)
        .maybeSingle()
      const callerOrgId = (callerProfile?.organisatie_id as string | null) ?? null

      for (const a of attachments) {
        if (a.storagePath) {
          const bucket = a.bucket ?? 'documenten'
          if (!(await attachmentToegestaan(bucket, a.storagePath, callerOrgId, user_id))) {
            console.warn(`[send-email] Bijlage geweigerd: geen toegang tot ${bucket}/${a.storagePath}`)
            return res.status(403).json({ error: `Geen toegang tot bijlage "${a.filename}"` })
          }
          const { data, error: dlError } = await supabaseAdmin.storage
            .from(bucket)
            .download(a.storagePath)
          if (dlError || !data) {
            console.error(`[send-email] Storage download mislukt voor ${bucket}/${a.storagePath}:`, dlError)
            throw new Error(`Bijlage "${a.filename}" kon niet worden opgehaald`)
          }
          const buffer = Buffer.from(await data.arrayBuffer())
          fileAttachments.push({ filename: a.filename, content: buffer })
          const shouldCleanup = a.cleanupAfter ?? (bucket === 'documenten')
          if (shouldCleanup) cleanupTargets.push({ bucket, path: a.storagePath })
        } else if (a.content) {
          fileAttachments.push({ filename: a.filename, content: Buffer.from(a.content, 'base64') })
        }
      }
    }

    const allAttachments = [...inlineAttachments, ...fileAttachments]
    if (allAttachments.length) {
      mailOptions.attachments = allAttachments
    }

    const sendResult = await transporter.sendMail(mailOptions)
    const sentMessageId = sendResult.messageId || null

    // ─── Sla verzonden mail op in Supabase ───
    // Zo verschijnt ie in de conversatie-thread en is de volledige
    // heen-en-weer historie zichtbaar.
    const effectiveThreadId = thread_id || crypto.randomUUID()
    try {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('emails')
        .insert({
          user_id,
          message_id: sentMessageId,
          in_reply_to: in_reply_to || null,
          thread_id: effectiveThreadId,
          map: 'verzonden',
          imap_folder: 'SENT',
          from_address: gmail_address,
          from_name: fromName || '',
          van: fromAddress,
          aan: to,
          onderwerp: subject,
          body_html: html || null,
          body_text: body || subject,
          inhoud: html || body || '',
          datum: new Date().toISOString(),
          gelezen: true,
          bijlagen: attachments?.length || 0,
          has_attachments: (attachments?.length || 0) > 0,
          gmail_id: '',
          cached_at: new Date().toISOString(),
          wacht_op_reactie,
          beantwoord: false,
        })
        .select('id')
        .single()
      if (insertErr) throw insertErr

      // ─── Sales Inbox v1: vervangen-niet-stapelen ───
      // Als deze nieuwe mail wacht_op_reactie=true heeft, sluit eerdere
      // openstaande wacht-mails naar zelfde adres af zodat ze in de Wacht-tab
      // niet meer naast deze nieuwe staan. RLS-readiness: service_role
      // omzeilt RLS, dus user_id-filter expliciet.
      if (wacht_op_reactie && inserted?.id) {
        const bareEmail = extractBareEmail(to)
        if (bareEmail) {
          const { error: replaceErr } = await supabaseAdmin
            .from('emails')
            .update({
              wacht_op_reactie: false,
              vervangen_door_email_id: inserted.id,
            })
            .eq('user_id', user_id)
            .eq('wacht_op_reactie', true)
            .eq('beantwoord', false)
            .neq('id', inserted.id)
            .ilike('aan', `%${bareEmail}%`)
          if (replaceErr) {
            console.error('[send-email] Sales Inbox replace-logic mislukt:', replaceErr)
          }
        }
      }
    } catch (saveErr) {
      // Niet fataal — de mail IS al verstuurd, log de fout
      console.error('[send-email] Verzonden mail opslaan mislukt:', saveErr)
    }

    // Ruim tijdelijke bestanden op uit Storage. Email is al verzonden, dus niet
    // fataal — maar wel error-niveau, want hangende bijlagen lekken storage.
    // Per bucket gegroepeerd zodat we niet kruislings deleten.
    if (cleanupTargets.length > 0) {
      const byBucket = new Map<string, string[]>()
      for (const t of cleanupTargets) {
        const list = byBucket.get(t.bucket) ?? []
        list.push(t.path)
        byBucket.set(t.bucket, list)
      }
      for (const [bucket, paths] of byBucket) {
        supabaseAdmin.storage.from(bucket).remove(paths).catch((err) => {
          console.error(`[send-email] Storage cleanup mislukt voor bucket ${bucket}:`, err)
          Sentry.captureException(err, { tags: { phase: 'storage-cleanup', bucket } })
        })
      }
    }

    // Trigger auto-opvolging task als opvolging_id meegegeven is
    if (opvolging_id) {
      try {
        // Ownership-check vóór het triggeren: de opvolging moet van deze user
        // zijn (service-role bypasst RLS, dus app-laag afdwingen).
        const { data: opvolging } = await supabaseAdmin
          .from('email_opvolgingen')
          .select('id, user_id')
          .eq('id', opvolging_id)
          .maybeSingle()
        if (!opvolging || opvolging.user_id !== user_id) {
          console.warn('[send-email] Opvolging-trigger geweigerd: geen toegang tot opvolging', opvolging_id)
          return res.status(200).json({ success: true, message: 'Email verzonden' })
        }
        const { tasks } = await import("@trigger.dev/sdk/v3")
        await tasks.trigger("email-opvolging", { opvolgingId: opvolging_id })
        console.log('[send-email] Auto-opvolging task getriggerd:', opvolging_id)
      } catch (triggerErr) {
        // Niet fataal — email is al verstuurd, log de fout en rapporteer naar Sentry
        console.error('[send-email] Trigger.dev task starten mislukt:', triggerErr)
        Sentry.captureException(triggerErr, { tags: { phase: 'trigger-dev' } })
      }
    }

    return res.status(200).json({ success: true, message: 'Email verzonden' })
  } catch (error: unknown) {
    if ((error as Error).message === 'Niet geautoriseerd' || (error as Error).message === 'Ongeldige sessie') {
      return res.status(401).json({ error: (error as Error).message })
    }
    console.error('Email verzenden mislukt:', error)
    Sentry.captureException(error)
    const msg = error instanceof Error ? error.message : 'Email verzenden mislukt'
    return res.status(500).json({ error: msg })
  }
}
