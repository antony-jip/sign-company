import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'
import { installChunkErrorHandler } from './utils/chunkErrorHandler'

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

installChunkErrorHandler()

// Filter netwerk-ruis uit console; chunk-errors zijn al afgehandeld door
// installChunkErrorHandler en worden hier niet dubbel gelogd omdat hun
// message altijd "Failed to fetch" als substring bevat.
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('AbortError')) return
  console.error('[Unhandled rejection]', message)
})

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
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
