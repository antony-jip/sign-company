import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Medewerker } from '@/types'

interface TeamCardProps {
  teamLeden: string[]
  medewerkers: Medewerker[]
  onChange: (ids: string[]) => Promise<void>
}

const AVATAR_TINTS = [
  'bg-[hsl(var(--status-green-bg))] text-[#3A7D52]',
  'bg-[hsl(var(--status-blue-bg))] text-[#3A5A9A]',
  'bg-[hsl(var(--status-amber-bg))] text-[#8A7A4A]',
  'bg-[hsl(var(--status-violet-bg))] text-[#6A5A8A]',
  'bg-muted text-foreground/70',
]

function tint(naam: string): string {
  return AVATAR_TINTS[(naam.charCodeAt(0) || 0) % AVATAR_TINTS.length]
}

function initiaal(naam: string): string {
  return (naam || '?').trim().charAt(0).toUpperCase() || '?'
}

export function TeamCard({ teamLeden, medewerkers, onChange }: TeamCardProps) {
  const [busy, setBusy] = useState(false)

  const toegewezen = teamLeden
    .map((id) => medewerkers.find((m) => m.id === id))
    .filter((m): m is Medewerker => !!m)
  const beschikbaar = medewerkers.filter((m) => m.status === 'actief' && !teamLeden.includes(m.id))

  async function muteer(ids: string[]) {
    if (busy) return
    setBusy(true)
    try {
      await onChange(ids)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="doen-slate-surface rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-heading text-[15px] font-bold text-foreground">
          Team<span className="text-flame">.</span>
        </h3>
        <span
          className="doen-subtitel"
        >
          wie werkt eraan?
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {toegewezen.map((m) => (
          <span
            key={m.id}
            className="group inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full bg-card border border-[rgba(26,83,92,0.12)] text-[12px] font-medium text-foreground"
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0 ${tint(m.naam)}`}>
              {initiaal(m.naam)}
            </span>
            {m.naam.split(' ')[0]}
            <button
              type="button"
              disabled={busy}
              onClick={() => muteer(teamLeden.filter((id) => id !== m.id))}
              title={`${m.naam} verwijderen`}
              aria-label={`${m.naam} verwijderen`}
              className="ml-0.5 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground/60 hover:bg-[hsl(var(--status-flame-bg))] hover:text-[#C03A18] transition-colors disabled:opacity-40"
            >
              <X className="h-3 w-3" strokeWidth={2.25} />
            </button>
          </span>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={busy || beschikbaar.length === 0}
              title="Teamlid toevoegen"
              className="inline-flex items-center gap-1 h-7 pl-1.5 pr-2.5 rounded-full border border-dashed border-[rgba(26,83,92,0.3)] text-[12px] font-medium text-foreground/70 hover:border-petrol hover:text-petrol transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
              {toegewezen.length === 0 ? 'Teamlid' : ''}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {beschikbaar.length === 0 ? (
              <DropdownMenuItem disabled>Iedereen toegewezen</DropdownMenuItem>
            ) : (
              beschikbaar.map((m) => (
                <DropdownMenuItem key={m.id} onClick={() => muteer([...teamLeden, m.id])}>
                  <span className={`mr-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold uppercase flex-shrink-0 ${tint(m.naam)}`}>
                    {initiaal(m.naam)}
                  </span>
                  {m.naam}
                  {m.functie ? <span className="ml-1.5 text-muted-foreground text-xs">· {m.functie}</span> : null}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
