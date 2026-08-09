import supabase from '@/services/supabaseClient'
import { logger } from '@/utils/logger'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushStatus =
  | 'kan-niet'        // browser ondersteunt het niet
  | 'installeer-eerst' // iOS in Safari-tab: push werkt daar niet
  | 'geweigerd'       // toestemming staat op blocked, niet meer te vragen
  | 'uit'
  | 'aan'

/** Base64url uit de VAPID-sleutel naar de bytes die PushManager verwacht. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normaal = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const ruw = window.atob(normaal)
  const bytes = new Uint8Array(ruw.length)
  for (let i = 0; i < ruw.length; i++) bytes[i] = ruw.charCodeAt(i)
  return bytes
}

/**
 * Draait de app als geïnstalleerde app? Op iOS is dat bepalend: Safari levert
 * pas een PushManager als de site aan het beginscherm is toegevoegd. In een
 * gewone tab bestaat de API simpelweg niet, hoe modern de iPhone ook is.
 */
export function draaitAlsApp(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function pushOndersteund(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function pushStatus(): Promise<PushStatus> {
  if (!pushOndersteund()) {
    return isIOS() && !draaitAlsApp() ? 'installeer-eerst' : 'kan-niet'
  }
  if (Notification.permission === 'denied') return 'geweigerd'
  try {
    const registratie = await navigator.serviceWorker.getRegistration()
    const abonnement = await registratie?.pushManager.getSubscription()
    return abonnement ? 'aan' : 'uit'
  } catch {
    return 'uit'
  }
}

async function registreerWorker(): Promise<ServiceWorkerRegistration> {
  const bestaand = await navigator.serviceWorker.getRegistration()
  if (bestaand) return bestaand
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

/**
 * Vraagt toestemming, abonneert en slaat het abonnement op.
 *
 * De toestemmingsvraag stellen we bewust hier — achter een schakelaar die
 * uitlegt waarvoor het is. Bij het opstarten vragen levert een weigering op, en
 * een weigering is in de meeste browsers permanent.
 */
export async function zetPushAan(): Promise<{ ok: boolean; status: PushStatus; melding?: string }> {
  if (!pushOndersteund()) {
    const status = isIOS() && !draaitAlsApp() ? 'installeer-eerst' : 'kan-niet'
    return {
      ok: false,
      status,
      melding: status === 'installeer-eerst'
        ? 'Voeg doen. eerst toe aan je beginscherm; in een Safari-tabblad staat Apple meldingen niet toe.'
        : 'Deze browser ondersteunt geen meldingen.',
    }
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, status: 'uit', melding: 'Meldingen zijn nog niet geconfigureerd op de server.' }
  }

  const toestemming = await Notification.requestPermission()
  if (toestemming !== 'granted') {
    return {
      ok: false,
      status: toestemming === 'denied' ? 'geweigerd' : 'uit',
      melding: 'Je browser blokkeert meldingen voor doen. Zet ze aan in de browserinstellingen.',
    }
  }

  try {
    const registratie = await registreerWorker()
    await navigator.serviceWorker.ready

    const bestaand = await registratie.pushManager.getSubscription()
    const abonnement = bestaand ?? await registratie.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })

    const rauw = abonnement.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!rauw.endpoint || !rauw.keys?.p256dh || !rauw.keys?.auth) {
      return { ok: false, status: 'uit', melding: 'Kon geen geldig abonnement maken.' }
    }

    const { data: sessie } = await supabase!.auth.getUser()
    const userId = sessie?.user?.id
    if (!userId) return { ok: false, status: 'uit', melding: 'Niet ingelogd.' }

    const { error } = await supabase!
      .from('push_abonnementen')
      .upsert({
        user_id: userId,
        endpoint: rauw.endpoint,
        p256dh: rauw.keys.p256dh,
        auth: rauw.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
    if (error) throw error

    return { ok: true, status: 'aan' }
  } catch (err) {
    logger.error('[push] aanzetten mislukt:', err)
    return { ok: false, status: 'uit', melding: 'Kon meldingen niet inschakelen.' }
  }
}

/** Zegt het abonnement op en ruimt de rij op. */
export async function zetPushUit(): Promise<void> {
  try {
    const registratie = await navigator.serviceWorker.getRegistration()
    const abonnement = await registratie?.pushManager.getSubscription()
    if (!abonnement) return
    const endpoint = abonnement.endpoint
    await abonnement.unsubscribe()
    await supabase!.from('push_abonnementen').delete().eq('endpoint', endpoint)
  } catch (err) {
    logger.warn('[push] uitzetten mislukt:', err)
  }
}
