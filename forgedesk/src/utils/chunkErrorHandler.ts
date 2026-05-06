// Detecteer Vite chunk-load failures (na een nieuwe Vercel deploy bestaat de
// oude chunk hash niet meer). Bij eerste optreden: één keer auto-reloaden om
// de nieuwe bundle binnen te halen. SessionStorage flag voorkomt reload loop.

const CHUNK_RELOAD_KEY = 'forgedesk_chunk_reload_attempted'

const MESSAGE_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Loading chunk',
  'Loading CSS chunk',
  'Importing a module script failed',
  'is not a valid JavaScript MIME type',
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

function tryAutoReload(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, Date.now().toString())
  } catch {
    // sessionStorage faalt (private mode) → reload alsnog
  }
  console.warn('[chunk-reload] Stale bundle gedetecteerd, pagina wordt herladen')
  window.location.reload()
  return true
}

export function installChunkErrorHandler(): void {
  window.addEventListener('unhandledrejection', (event) => {
    if (tryAutoReload(event.reason)) {
      event.preventDefault()
    }
  })

  window.addEventListener('error', (event) => {
    const subject: unknown = event.error ?? event.message
    if (tryAutoReload(subject)) {
      event.preventDefault()
    }
  })

  // Wis flag zodra app stabiel draait — anders triggert een tweede
  // stale-deploy in dezelfde tab geen auto-reload meer.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    } catch {
      // negeren — sessionStorage kan in private mode falen
    }
  }, 3000)
}
