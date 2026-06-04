import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Project } from '@/types'
import { getProjecten } from '@/services/projectService'

interface MaatjeKoppelSheetProps {
  aantal: number
  onKoppel: (projectId: string) => void | Promise<void>
  onSluiten: () => void
}

export function MaatjeKoppelSheet({ aantal, onKoppel, onSluiten }: MaatjeKoppelSheetProps) {
  const [projecten, setProjecten] = useState<Project[]>([])
  const [zoek, setZoek] = useState('')
  const [bezigId, setBezigId] = useState<string | null>(null)
  const [sleepY, setSleepY] = useState(0)
  const sleepStartRef = useRef<number | null>(null)
  // Negeer een achtergrond-tik vlak na openen: voorkomt dat de tik die de
  // sheet opende 'doorklikt' naar de verse achtergrond en 'm meteen sluit.
  const geopendRef = useRef(Date.now())

  const sluitViaAchtergrond = () => {
    if (Date.now() - geopendRef.current < 350) return
    onSluiten()
  }

  // Sleep de sheet naar beneden om te sluiten (mobiel).
  const grijpDown = (e: React.PointerEvent) => {
    sleepStartRef.current = e.clientY
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const grijpMove = (e: React.PointerEvent) => {
    if (sleepStartRef.current == null) return
    setSleepY(Math.max(0, e.clientY - sleepStartRef.current))
  }
  const grijpUp = () => {
    if (sleepStartRef.current == null) return
    sleepStartRef.current = null
    if (sleepY > 110) onSluiten()
    else setSleepY(0)
  }

  useEffect(() => {
    let actief = true
    getProjecten()
      .then((p) => { if (actief) setProjecten(p) })
      .catch((err) => { logger.error('Projecten laden mislukt:', err); toast.error('Kon projecten niet laden') })
    return () => { actief = false }
  }, [])

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const lijst = q
      ? projecten.filter((p) =>
          p.naam?.toLowerCase().includes(q) ||
          p.project_nummer?.toLowerCase().includes(q) ||
          p.klant_naam?.toLowerCase().includes(q))
      : projecten
    return lijst.slice(0, 50)
  }, [projecten, zoek])

  const kies = async (p: Project) => {
    setBezigId(p.id)
    try {
      await onKoppel(p.id)
    } finally {
      setBezigId(null)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/30 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:items-center sm:justify-center"
      onClick={sluitViaAchtergrond}
    >
      <div
        className="flex max-h-[80vh] w-full flex-col rounded-t-2xl bg-white p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.18)] animate-in slide-in-from-bottom-4 duration-300 sm:max-w-md sm:max-h-[70vh] sm:rounded-2xl sm:shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        style={{ transform: `translateY(${sleepY}px)`, transition: sleepStartRef.current != null ? 'none' : 'transform 0.2s ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={grijpDown}
          onPointerMove={grijpMove}
          onPointerUp={grijpUp}
          onPointerCancel={grijpUp}
          className="mx-auto -mt-1 mb-3 h-1.5 w-10 flex-shrink-0 cursor-grab touch-none rounded-full bg-[#E0DDD8] sm:hidden"
        />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#1A1A1A]">
            Koppel {aantal} maatje{aantal > 1 ? 's' : ''}
          </h2>
          <button type="button" onClick={onSluiten} aria-label="Sluiten" className="text-[#9B9B95] hover:text-[#1A1A1A]">
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9B9B95]" strokeWidth={1.75} />
          <input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek een project..."
            className="w-full rounded-lg bg-[#F8F7F5] py-2.5 pl-9 pr-3 text-[14px] text-[#1A1A1A] placeholder:text-[#9B9B95] focus:outline-none focus:ring-2 focus:ring-[#1A535C]"
          />
        </div>

        <div className="-mx-1 flex-1 overflow-y-auto">
          {gefilterd.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[#9B9B95]">Geen projecten gevonden.</p>
          ) : (
            gefilterd.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => kies(p)}
                disabled={bezigId !== null}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-[#F8F7F5] disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold text-[#1A1A1A]">{p.naam}</div>
                  <div className="truncate text-[12px] text-[#6B6B66]">
                    {p.project_nummer && <span className="font-mono">{p.project_nummer}</span>}
                    {p.project_nummer && p.klant_naam ? ' · ' : ''}
                    {p.klant_naam}
                  </div>
                </div>
                {bezigId === p.id && <span className="text-[12px] text-[#9B9B95]">Koppelen...</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
