import { useState, useEffect } from 'react'
import { MessageCircle, X, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getInitials } from '@/lib/utils'
import { ProjectPortaalTab } from '../ProjectPortaalTab'
import type { Klant } from '@/types'

interface PortaalPanelProps {
  projectId: string
  projectNaam: string
  klant: Klant | null
  defaultOpen?: boolean
}

export function PortaalPanel({ projectId, projectNaam, klant, defaultOpen = false }: PortaalPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setIsOpen(false)
    }
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <>
      {/* Collapsed tab */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex-shrink-0 w-10 bg-[#FFFFFE] border-r border-[hsl(35,15%,87%)] flex flex-col items-center justify-center gap-2 hover:bg-[hsl(35,15%,97%)] transition-colors cursor-pointer"
          title="Portaal openen"
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span
            className="text-[10px] font-semibold text-muted-foreground tracking-wider"
            style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
          >
            Portaal
          </span>
        </button>
      )}

      {/* Expanded panel */}
      <div
        className={cn(
          'flex-shrink-0 bg-[#FFFFFE] border-r border-[hsl(35,15%,87%)] overflow-hidden transition-all duration-250 ease-out flex flex-col',
          isOpen ? 'w-[370px] opacity-100' : 'w-0 opacity-0 pointer-events-none'
        )}
        style={{ transitionProperty: 'width, opacity' }}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(35,15%,87%)] flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-foreground">Klantportaal</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Contact strip */}
        {klant && (
          <div className="px-4 py-3 border-b border-[hsl(35,15%,87%)] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{getInitials(klant.contactpersoon || klant.bedrijfsnaam || '')}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{klant.contactpersoon || klant.bedrijfsnaam}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {klant.email && <span className="truncate">{klant.email}</span>}
                  {klant.telefoon && <span className="font-mono">{klant.telefoon}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portaal content - reuse existing component */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ProjectPortaalTab projectId={projectId} projectNaam={projectNaam} />
        </div>
      </div>
    </>
  )
}
