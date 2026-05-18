'use client'

import { useEffect, useState } from 'react'

/**
 * Techy "terminal status bar" pinned at the very top of the footer.
 * Reads like a code-editor status strip — mono uppercase metadata
 * that ties the krant-style cream pages to the "doen." app feel.
 */
export default function SystemStatusBar() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      setTime(`${hh}:${mm}:${ss}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      aria-hidden
      className="w-full border-t border-b font-mono text-[9px] md:text-[10px] tracking-[0.18em] uppercase select-none"
      style={{
        backgroundColor: '#0B2E34',
        color: 'rgba(255,255,255,0.55)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="container-site py-1.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: '#7DD3A1', boxShadow: '0 0 6px #7DD3A1' }}
            />
            <span>{'>'} Verbinding · live</span>
          </span>
          <span className="hidden md:inline whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
            VOL_01 · NODE_HOME · EDITIE 2026
          </span>
        </div>
        <div className="flex items-center gap-3 md:gap-5 min-w-0">
          <span className="hidden md:inline whitespace-nowrap tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {time ?? '—:—:—'} UTC+1
          </span>
          <span className="whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.4)' }}>
            NL
          </span>
          <a
            href="mailto:info@signcompany.nl"
            className="whitespace-nowrap transition-colors hover:text-white"
          >
            info@signcompany.nl
          </a>
        </div>
      </div>
    </div>
  )
}
