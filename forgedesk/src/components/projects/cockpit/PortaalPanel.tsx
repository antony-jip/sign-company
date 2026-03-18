import { useState, useEffect } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getInitials } from '@/lib/utils'
import { ProjectPortaalTab } from '../ProjectPortaalTab'
import type { Klant } from '@/types'

interface PortaalPanelProps {
  projectId: string
  projectNaam: string
  klant: Klant | null
  defaultOpen?: boolean
  /** Inline mode: renders content directly without sidebar wrapper */
  inline?: boolean
}

export function PortaalPanel({ projectId, projectNaam, klant, defaultOpen = false, inline = false }: PortaalPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Auto-collapse on small screens (sidebar mode only)
  useEffect(() => {
    if (inline) return
    const mq = window.matchMedia('(max-width: 1024px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setIsOpen(false)
    }
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [inline])

  // Inline mode — just render the portaal content directly
  if (inline) {
    return (
      <div className="max-h-[500px] overflow-y-auto bg-[hsl(35,10%,98%)]">
        <ProjectPortaalTab projectId={projectId} projectNaam={projectNaam} />
      </div>
    )
  }

  // Sidebar mode (original)
  return (
    <>
      {/* Collapsed tab */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex-shrink-0 w-11 bg-gradient-to-b from-[#FFFFFE] to-[hsl(35,15%,97%)] border-r border-[hsl(35,15%,87%)] flex flex-col items-center justify-center gap-2.5 hover:from-emerald-50/30 hover:to-emerald-50/10 transition-all cursor-pointer group"
          title="Portaal openen"
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500/60" />
          <div className="relative">
            <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
          </div>
          <span
            className="text-[10px] font-semibold text-muted-foreground group-hover:text-emerald-700 tracking-wider transition-colors"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
          >
            Portaal
          </span>
        </button>
      )}

      {/* Expanded panel */}
      <div
        className={cn(
          'flex-shrink-0 bg-[#FFFFFE] border-r border-[hsl(35,15%,87%)] overflow-hidden transition-all duration-300 ease-out flex flex-col',
          isOpen ? 'w-[370px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        )}
        style={{ transitionProperty: 'width, opacity' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(35,15%,87%)] bg-gradient-to-r from-emerald-50/40 to-transparent flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span className="text-sm font-semibold text-foreground tracking-tight">Klantportaal</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Contact strip */}
        {klant && (
          <div className="px-3 py-2.5 border-b border-[hsl(35,15%,90%)] flex-shrink-0">
            <div className="flex items-center gap-2.5 bg-[hsl(35,15%,97%)] rounded-lg px-3 py-2">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-bold">{getInitials(klant.contactpersoon || klant.bedrijfsnaam || '')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">{klant.contactpersoon || klant.bedrijfsnaam}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  {klant.email && <span className="truncate">{klant.email}</span>}
                  {klant.email && klant.telefoon && <span className="text-muted-foreground/40">·</span>}
                  {klant.telefoon && <span className="font-mono text-[10px]">{klant.telefoon}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portaal content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[hsl(35,10%,98%)]">
          <ProjectPortaalTab projectId={projectId} projectNaam={projectNaam} />
        </div>
      </div>
    </>
  )
}
