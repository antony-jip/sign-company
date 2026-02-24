import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (err) {
  // Show fatal render errors on screen (using textContent to prevent XSS)
  const root = document.getElementById('root')
  if (root) {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding:24px;font-family:monospace;color:#991b1b;background:#fee2e2;min-height:100vh'
    const h1 = document.createElement('h1')
    h1.style.cssText = 'font-size:20px;margin-bottom:12px'
    h1.textContent = 'Fatal Render Error'
    const pre = document.createElement('pre')
    pre.style.cssText = 'white-space:pre-wrap'
    pre.textContent = err instanceof Error ? err.stack || err.message : String(err)
    wrapper.appendChild(h1)
    wrapper.appendChild(pre)
    root.innerHTML = ''
    root.appendChild(wrapper)
  }
}
