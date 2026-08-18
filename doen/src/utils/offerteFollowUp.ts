import type { Offerte } from '@/types'

export function isFollowUpNodig(offerte: Offerte): boolean {
  if (offerte.status !== 'verzonden' && offerte.status !== 'bekeken') return false

  const now = Date.now()
  const drieDagen = 3 * 24 * 60 * 60 * 1000

  if (offerte.verstuurd_op && (now - new Date(offerte.verstuurd_op).getTime()) > drieDagen) return true

  if (offerte.follow_up_datum) {
    const fud = new Date(offerte.follow_up_datum)
    if (fud.getTime() <= now) return true
  }

  if (offerte.geldig_tot) {
    const vijfDagen = 5 * 24 * 60 * 60 * 1000
    const verloopt = new Date(offerte.geldig_tot).getTime()
    if (verloopt - now <= vijfDagen && verloopt > now) return true
  }

  return false
}
