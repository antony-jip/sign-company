/**
 * Lichte in-memory rate-limiter (per server-instance). Voldoende om brute-force
 * op de admin-login flink af te remmen. Voor zwaardere garanties over meerdere
 * instances heen: vervang door een gedeelde store (bv. Upstash Ratelimit).
 */
type Bucket = { count: number; reset: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  b.count++
  if (b.count > max) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}

/** Beste-poging client-IP uit de gangbare proxy-headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'onbekend'
}
