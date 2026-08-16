import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ImapFlow } from 'imapflow'
import { createTransport } from 'nodemailer'
import { createClient } from '@supabase/supabase-js'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { lookup } from 'dns/promises'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
async function verifyUser(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Niet geautoriseerd')
  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) throw new Error('Ongeldige sessie')
  return user.id
}

export const config = { maxDuration: 30 }

// ── SSRF-bescherming ──────────────────────────────────────────────────────
// host/poort komen uit de request-body. Zonder guard kan een ingelogde
// gebruiker dit endpoint als poortscanner tegen het interne Vercel-/cloud-
// netwerk gebruiken (inclusief het metadata-adres 169.254.169.254). We staan
// alleen de bekende mailpoorten toe en weigeren hosts die naar een privé-,
// loopback- of link-local-adres resolven.
const TOEGESTANE_POORTEN = new Set([143, 993, 110, 995, 25, 465, 587])

function isPrivaatIp(ip: string): boolean {
  const schoon = ip.replace(/^::ffff:/i, '') // IPv4-mapped IPv6
  const v4 = schoon.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // link-local + metadata
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    return false
  }
  const l = schoon.toLowerCase()
  if (l === '::1' || l === '::') return true
  if (l.startsWith('fe80') || l.startsWith('fc') || l.startsWith('fd')) return true
  return false
}

async function valideerMailDoel(host: string, port: number): Promise<string | null> {
  if (!TOEGESTANE_POORTEN.has(Number(port))) return `Poort ${port} is niet toegestaan`
  if (!host || /[^a-z0-9.\-:[\]]/i.test(host)) return 'Ongeldige hostnaam'
  try {
    const adressen = await lookup(host, { all: true })
    if (!adressen.length) return 'Host kon niet worden opgezocht'
    if (adressen.some((a) => isPrivaatIp(a.address))) return 'Host verwijst naar een intern adres'
  } catch {
    return 'Host kon niet worden opgezocht'
  }
  return null
}

// ── Rate limiting (inline; Vercel bundelt geen lokale imports in api/) ──
const rlConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
if (!rlConfigured) {
  console.warn('[ratelimit] UPSTASH env vars missing for test-email-connection, requests will not be rate limited')
}
const ratelimit = rlConfigured
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, '60 s'), prefix: 'rl:test-email-connection', timeout: 2000 })
  : null

async function enforceRateLimit(identifier: string, res: VercelResponse): Promise<boolean> {
  if (!ratelimit) return true
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    if (success) return true
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
    console.warn(`[ratelimit-hit] test-email-connection id=${identifier} limit=${limit}`)
    res.setHeader('Retry-After', String(retryAfter))
    res.setHeader('X-RateLimit-Limit', String(limit))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.status(429).json({ error: 'Te veel verzoeken. Probeer het later opnieuw.' })
    return false
  } catch (err) {
    console.warn(`[ratelimit-error] test-email-connection id=${identifier} err=${(err as Error).message}`)
    return true
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let userId: string
  try {
    userId = await verifyUser(req)
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : 'Auth fout'
    console.error('[test-email-connection] Auth mislukt:', msg)
    return res.status(401).json({ imap_ok: false, smtp_ok: false, error: msg })
  }

  if (!(await enforceRateLimit(userId, res))) return

  try {
    const body = req.body || {}
    const gmail_address = body.gmail_address
    const app_password = body.app_password
    const smtp_host = body.smtp_host || 'smtp.gmail.com'
    const smtp_port = body.smtp_port || 587
    const imap_host = body.imap_host || 'imap.gmail.com'
    const imap_port = body.imap_port || 993

    if (!gmail_address || !app_password) {
      return res.status(400).json({
        imap_ok: false,
        smtp_ok: false,
        error: 'E-mailadres en app-wachtwoord zijn verplicht',
      })
    }

    const imapFout = await valideerMailDoel(String(imap_host), Number(imap_port))
    const smtpFout = await valideerMailDoel(String(smtp_host), Number(smtp_port))
    if (imapFout || smtpFout) {
      return res.status(400).json({
        imap_ok: false,
        smtp_ok: false,
        error: imapFout || smtpFout,
      })
    }

    console.log(`[test-email-connection] Testing ${gmail_address} — IMAP: ${imap_host}:${imap_port}, SMTP: ${smtp_host}:${smtp_port}`)

    // Test IMAP en SMTP parallel (sneller, past binnen Vercel timeout)
    const [imapResult, smtpResult] = await Promise.allSettled([
      testImap({ gmail_address, app_password, imap_host, imap_port }),
      testSmtp({ gmail_address, app_password, smtp_host, smtp_port }),
    ])

    const imap_ok = imapResult.status === 'fulfilled' && imapResult.value === true
    const smtp_ok = smtpResult.status === 'fulfilled' && smtpResult.value === true

    const errors: string[] = []
    if (imapResult.status === 'rejected') {
      const imapErr = imapResult.reason?.message || String(imapResult.reason) || 'Onbekende fout'
      console.error('[test-email-connection] IMAP fout:', imapErr)
      errors.push(`IMAP: ${imapErr}`)
    }
    if (smtpResult.status === 'rejected') {
      const smtpErr = smtpResult.reason?.message || String(smtpResult.reason) || 'Onbekende fout'
      console.error('[test-email-connection] SMTP fout:', smtpErr)
      errors.push(`SMTP: ${smtpErr}`)
    }

    if (imap_ok && smtp_ok) {
      console.log('[test-email-connection] Beide tests geslaagd')
    }

    return res.status(200).json({
      imap_ok,
      smtp_ok,
      error: errors.length > 0 ? errors.join('. ') : undefined,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Verbindingstest mislukt'
    console.error('[test-email-connection] Onverwachte fout:', error)
    return res.status(500).json({ imap_ok: false, smtp_ok: false, error: msg })
  }
}

async function testImap(opts: {
  gmail_address: string
  app_password: string
  imap_host: string
  imap_port: number
}): Promise<boolean> {
  const client = new ImapFlow({
    host: opts.imap_host,
    port: opts.imap_port,
    secure: opts.imap_port === 993,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    logger: false,
    emitLogs: false,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  })
  await client.connect()
  await client.logout()
  return true
}

async function testSmtp(opts: {
  gmail_address: string
  app_password: string
  smtp_host: string
  smtp_port: number
}): Promise<boolean> {
  const transporter = createTransport({
    host: opts.smtp_host,
    port: opts.smtp_port,
    secure: opts.smtp_port === 465,
    auth: { user: opts.gmail_address, pass: opts.app_password },
    connectionTimeout: 8000,
    socketTimeout: 8000,
  })
  await transporter.verify()
  return true
}
