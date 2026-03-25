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

// Global unhandled promise rejection handler
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
  // Show fatal render errors on screen
  const root = document.getElementById('root')
  if (root) {
    root.innerHTML = `<div style="padding:24px;font-family:monospace;color:#991b1b;background:#fee2e2;min-height:100vh">
      <h1 style="font-size:20px;margin-bottom:12px">Fatal Render Error</h1>
      <pre style="white-space:pre-wrap">${err instanceof Error ? err.stack || err.message : String(err)}</pre>
    </div>`
  }
}
