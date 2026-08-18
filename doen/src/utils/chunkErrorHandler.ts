// Detecteer Vite chunk-load failures (na een nieuwe Vercel deploy bestaat de
// oude chunk-hash niet meer; de SPA-rewrite serveert dan index.html terug en de
// browser klaagt over een text/html MIME type). Herstel = de pagina herladen,
// want React.lazy onthoudt een mislukte import en probeert die nooit opnieuw.

const HERSTEL_KEY = 'doen_chunk_herstel'
const MAX_POGINGEN = 2
const VENSTER_MS = 60_000

const MESSAGE_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Loading chunk',
  'Loading CSS chunk',
  'Importing a module script failed',
  'is not a valid JavaScript MIME type',
  'Unable to preload CSS',
]

function matchesMessage(message: string): boolean {
  return MESSAGE_PATTERNS.some(p => message.includes(p))
}

export function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) {
    return matchesMessage(error.message || '') || /ChunkLoadError/i.test(error.name)
  }
  if (typeof error === 'string') {
    return matchesMessage(error)
  }
  return false
}

interface HerstelBesluit {
  herlaad: boolean
  nieuweStaat: string
}

// Puur besluit, los van de browser: hooguit MAX_POGINGEN herlaadpogingen per
// tijdvenster. Een teller met tijdstempel in plaats van een vlag die na een
// paar seconden gewist wordt — anders bepaalt toeval (hoe snel de fout na het
// laden optreedt) of je een reload krijgt of het foutscherm.
export function beoordeelHerstel(opgeslagen: string | null, nu: number): HerstelBesluit {
  let pogingen = 0

  if (opgeslagen) {
    try {
      const staat = JSON.parse(opgeslagen) as { pogingen?: number; laatste?: number }
      const laatste = typeof staat.laatste === 'number' ? staat.laatste : 0
      if (nu - laatste < VENSTER_MS) {
        pogingen = typeof staat.pogingen === 'number' ? staat.pogingen : 0
      }
    } catch {
      pogingen = 0
    }
  }

  if (pogingen >= MAX_POGINGEN) {
    return { herlaad: false, nieuweStaat: JSON.stringify({ pogingen, laatste: nu }) }
  }

  return { herlaad: true, nieuweStaat: JSON.stringify({ pogingen: pogingen + 1, laatste: nu }) }
}

// Returnt true als er een reload loopt — de aanroeper hoeft dan geen foutscherm
// te tonen.
export function probeerHerstelNaChunkFout(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false

  let opgeslagen: string | null = null
  try {
    opgeslagen = sessionStorage.getItem(HERSTEL_KEY)
  } catch {
    // private mode → geen geheugen, dan is één poging het maximum wat we weten
  }

  const besluit = beoordeelHerstel(opgeslagen, Date.now())
  if (!besluit.herlaad) {
    console.warn('[chunk-reload] Herladen hielp niet, foutscherm wordt getoond')
    return false
  }

  try {
    sessionStorage.setItem(HERSTEL_KEY, besluit.nieuweStaat)
  } catch {
    // negeren — zonder opslag herladen we alsnog
  }

  console.warn('[chunk-reload] Stale bundle gedetecteerd, pagina wordt herladen')
  window.location.reload()
  return true
}

// Een chunk kan ook door een haperende verbinding mislukken in plaats van door
// een nieuwe deploy. React.lazy onthoudt zo'n mislukking definitief, dus geven
// we de import eerst zelf één herkansing voordat de boundary eraan te pas komt.
export function importMetHerkansing<T>(importFn: () => Promise<T>): Promise<T> {
  return importFn().catch((error: unknown) => {
    if (!isChunkLoadError(error)) throw error
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => importFn().then(resolve, reject), 400)
    })
  })
}

export function installChunkErrorHandler(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (probeerHerstelNaChunkFout(event.reason)) {
      event.preventDefault()
    }
  })

  window.addEventListener('error', (event) => {
    const subject: unknown = event.error ?? event.message
    if (probeerHerstelNaChunkFout(subject)) {
      event.preventDefault()
    }
  })
}
