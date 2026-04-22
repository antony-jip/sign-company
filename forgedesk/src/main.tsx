import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        if (event.request.headers) {
          const h = event.request.headers as Record<string, string>
          for (const k of Object.keys(h)) {
            if (/authorization|cookie/i.test(k)) h[k] = '[Filtered]'
          }
        }
        if (event.request.cookies) event.request.cookies = '[Filtered]' as unknown as typeof event.request.cookies
      }
      if (event.user) {
        delete event.user.ip_address
        delete event.user.email
      }
      const SENSITIVE_KEY = /password|app_password|encrypted_app_password|betaal_token|payment_token|access_token|refresh_token|mollie_api_key|authorization|cookie|secret|api_key|to|cc|bcc|email/i
      const scrub = (val: unknown, depth = 0): unknown => {
        if (depth > 6 || val == null) return val
        if (Array.isArray(val)) return val.map(v => scrub(v, depth + 1))
        if (typeof val === 'object') {
          const out: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            out[k] = SENSITIVE_KEY.test(k) ? '[Filtered]' : scrub(v, depth + 1)
          }
          return out
        }
        return val
      }
      if (event.request?.data) event.request.data = scrub(event.request.data) as typeof event.request.data
      if (event.extra) event.extra = scrub(event.extra) as typeof event.extra
      if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts
      return event
    },
  })
}

// Suppress benign ResizeObserver loop error (browser noise, not a real bug)
const resizeObserverErr = (e: ErrorEvent) => {
  if (e.message?.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation()
  }
}
window.addEventListener('error', resizeObserverErr)

// Detecteer Vite chunk-load failures (na een nieuwe Vercel deploy bestaat de
// oude chunk hash niet meer). Bij eerste optreden: één keer auto-reloaden om
// de nieuwe bundle binnen te halen. SessionStorage flag voorkomt reload loop.
const CHUNK_RELOAD_KEY = 'forgedesk_chunk_reload_attempted'
function isChunkLoadError(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    message.includes('Importing a module script failed')
  )
}
function tryAutoReloadOnChunkError(message: string): boolean {
  if (!isChunkLoadError(message)) return false
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, Date.now().toString())
  } catch {
    // sessionStorage faalt → reload alsnog
  }
  console.warn('[chunk-reload] Stale bundle gedetecteerd, pagina wordt herladen')
  window.location.reload()
  return true
}

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (tryAutoReloadOnChunkError(message)) {
    event.preventDefault()
    return
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('AbortError')) return
  console.error('[Unhandled rejection]', message)
})

// Global error handler — vangt sync errors uit dynamic imports
window.addEventListener('error', (event) => {
  const message = event.message || (event.error instanceof Error ? event.error.message : '')
  if (tryAutoReloadOnChunkError(message)) {
    event.preventDefault()
  }
})

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  // Wis de chunk-reload flag zodra de app stabiel draait. Zonder deze cleanup
  // zou een tweede deploy in dezelfde tab geen auto-reload meer triggeren
  // omdat de flag uit de eerste reload blijft staan. De delay voorkomt een
  // reload loop als de app meteen na mount opnieuw crasht.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    } catch {
      // negeren — sessionStorage kan in private mode falen
    }
  }, 3000)
} catch (err) {
  Sentry.captureException(err)
  // Show fatal render errors on screen
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#991b1b;background:#fee2e2;min-height:100vh">
      <h1 style="font-size:20px;margin-bottom:12px">Fatal Render Error</h1>
      <pre style="white-space:pre-wrap">${err instanceof Error ? err.stack || err.message : String(err)}</pre>
    </div>`
  }
}
