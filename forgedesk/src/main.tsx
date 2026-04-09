import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

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
  // Show fatal render errors on screen
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#991b1b;background:#fee2e2;min-height:100vh">
      <h1 style="font-size:20px;margin-bottom:12px">Fatal Render Error</h1>
      <pre style="white-space:pre-wrap">${err instanceof Error ? err.stack || err.message : String(err)}</pre>
    </div>`
  }
}
