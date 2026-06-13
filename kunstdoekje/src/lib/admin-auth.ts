/**
 * Lichte wachtwoord-beveiliging voor /admin. Eén wachtwoord (ADMIN_PASSWORD),
 * na inloggen een ondertekende cookie (HMAC-SHA256 met ADMIN_SESSION_SECRET).
 * Werkt zowel in de edge-middleware als in Node route handlers: alleen Web
 * Crypto + btoa, geen Node-only API's.
 */
export const ADMIN_COOKIE = 'kd_admin'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 dagen (seconden)

const enc = new TextEncoder()

function sessionSecret(): string {
  // Bewust GEEN fallback naar ADMIN_PASSWORD: de ondertekensleutel en het
  // wachtwoord horen onafhankelijk te zijn (eigen entropie, los te roteren).
  return process.env.ADMIN_SESSION_SECRET || ''
}

/**
 * Eenvoudige CSRF-bescherming voor admin POST-routes: weiger als er een
 * cross-site Origin meekomt. Ontbrekende Origin (CLI/server) is toegestaan.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.get('host')
  } catch {
    return false
  }
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return toBase64Url(sig)
}

/** Constante-tijd vergelijking om timing-lekken te voorkomen. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Maakt de cookie-waarde: "<expMs>.<handtekening>". */
export async function createSessionValue(): Promise<string> {
  const exp = Date.now() + SESSION_MAX_AGE * 1000
  const sig = await hmac(String(exp))
  return `${exp}.${sig}`
}

/** Geldig als de handtekening klopt én de sessie niet verlopen is. */
export async function verifySession(value: string | undefined): Promise<boolean> {
  if (!value || !sessionSecret()) return false
  const dot = value.indexOf('.')
  if (dot < 0) return false
  const expPart = value.slice(0, dot)
  const sigPart = value.slice(dot + 1)
  const exp = Number(expPart)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  const expected = await hmac(expPart)
  return safeEqual(expected, sigPart)
}

/** Wachtwoordcheck (constante tijd). */
export function verifyPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || ''
  if (!pw) return false
  return safeEqual(input, pw)
}
