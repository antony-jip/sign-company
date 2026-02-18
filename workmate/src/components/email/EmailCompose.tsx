import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  Paperclip,
  X,
  Clock,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Templates ───────────────────────────────────────────────────────

const templates = [
  {
    id: 'offerte-followup',
    label: 'Offerte follow-up',
    color: 'blue',
    onderwerp: 'Opvolging offerte',
    body: `Beste [naam],

Graag volg ik onze offerte [nummer] op die wij op [datum] hebben verstuurd.

Heeft u de offerte kunnen bekijken? Wij horen graag of u nog vragen heeft of dat we verdere toelichting kunnen geven.

Mocht u interesse hebben, dan plannen we graag een afspraak in om de details te bespreken.

Met vriendelijke groet,
[uw naam]`,
  },
  {
    id: 'project-update',
    label: 'Project update',
    color: 'emerald',
    onderwerp: 'Project update',
    body: `Beste [naam],

Hierbij een update over de voortgang van uw project [projectnaam].

Wat is er bereikt:
- [punt 1]
- [punt 2]

Volgende stappen:
- [stap 1]
- [stap 2]

Verwachte opleverdatum: [datum]

Met vriendelijke groet,
[uw naam]`,
  },
  {
    id: 'welkomst',
    label: 'Welkomst',
    color: 'violet',
    onderwerp: 'Welkom bij Sign Company',
    body: `Beste [naam],

Welkom bij Sign Company! Wij zijn verheugd om met u samen te werken.

Uw contactpersoon is [naam], bereikbaar via [telefoon] en [email].

De volgende stappen zijn:
1. Kennismakingsgesprek inplannen
2. Wensen en eisen inventariseren
3. Ontwerp voorstel opstellen

Wij kijken uit naar een prettige samenwerking!

Met vriendelijke groet,
[uw naam]`,
  },
  {
    id: 'betaalherinnering',
    label: 'Betaalherinnering',
    color: 'amber',
    onderwerp: 'Herinnering: openstaande factuur',
    body: `Beste [naam],

Uit onze administratie blijkt dat de volgende factuur nog niet is voldaan:

Factuurnummer: [nummer]
Factuurdatum: [datum]
Bedrag: [bedrag]
Vervaldatum: [vervaldatum]

Wij verzoeken u vriendelijk het openstaande bedrag binnen 7 dagen te voldoen op rekeningnummer [IBAN] o.v.v. het factuurnummer.

Met vriendelijke groet,
[uw naam]`,
  },
]

const templateColors: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  violet: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
}

// ─── Schedule options ────────────────────────────────────────────────

function getScheduleOptions() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const dayOfWeek = now.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  const nextMonday = new Date(now)
  nextMonday.setDate(now.getDate() + daysUntilMonday)
  const mondayStr = nextMonday.toISOString().split('T')[0]

  return [
    { label: 'Morgen 09:00', value: `${tomorrowStr}T09:00` },
    { label: 'Morgen 14:00', value: `${tomorrowStr}T14:00` },
    { label: 'Maandag 09:00', value: `${mondayStr}T09:00` },
  ]
}

// ─── Types ───────────────────────────────────────────────────────────

export interface ComposeData {
  to: string
  subject: string
  body: string
  scheduledAt?: string
}

interface EmailComposeProps {
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend: (data: ComposeData) => void
  onCancel: () => void
}

// ═════════════════════════════════════════════════════════════════════
// ─── Inline Compose Component ────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════

export function EmailCompose({
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
  onCancel,
}: EmailComposeProps) {
  const [to, setTo] = useState(defaultTo)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const scheduleRef = useRef<HTMLDivElement>(null)
  const toRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
    setBody(defaultBody)
  }, [defaultTo, defaultSubject, defaultBody])

  useEffect(() => {
    // Auto-focus the "to" field
    if (!defaultTo) {
      toRef.current?.focus()
    }
  }, [defaultTo])

  // Close schedule dropdown on outside click
  useEffect(() => {
    if (!showSchedule) return
    function handleClick(e: MouseEvent) {
      if (scheduleRef.current && !scheduleRef.current.contains(e.target as Node)) {
        setShowSchedule(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showSchedule])

  const handleTemplate = (tmpl: typeof templates[number]) => {
    if (!subject) setSubject(tmpl.onderwerp)
    setBody(tmpl.body)
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return
    setIsSending(true)
    try {
      onSend({ to: to.trim(), subject: subject.trim(), body, scheduledAt: scheduledAt || undefined })
    } finally {
      setIsSending(false)
    }
  }

  const scheduleOptions = getScheduleOptions()

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
        <h2 className="text-sm font-semibold text-foreground">Nieuwe email</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* ── Template chips ── */}
      <div className="px-5 pt-3 pb-2 flex flex-wrap gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mr-1 self-center">
          Template:
        </span>
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTemplate(t)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
              templateColors[t.color]
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Form fields ── */}
      <div className="px-5 space-y-0">
        <div className="flex items-center gap-2 py-2 border-b">
          <span className="text-xs font-medium text-muted-foreground w-12">Aan</span>
          <Input
            ref={toRef}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@voorbeeld.nl"
            className="border-0 shadow-none h-8 focus-visible:ring-0 px-0 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 py-2 border-b">
          <span className="text-xs font-medium text-muted-foreground w-12">Onderwerp</span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Onderwerp..."
            className="border-0 shadow-none h-8 focus-visible:ring-0 px-0 text-sm"
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-5 py-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Schrijf je bericht..."
          className="h-full min-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 px-0 text-sm leading-relaxed"
        />
      </div>

      {/* ── Footer / Actions ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs text-muted-foreground">
            <Paperclip className="w-3.5 h-3.5" />
            Bijlage
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {scheduledAt && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-md text-xs text-purple-700 dark:text-purple-300">
              <Clock className="w-3 h-3" />
              Ingepland
              <button onClick={() => setScheduledAt('')} className="ml-1 hover:text-purple-900">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="relative" ref={scheduleRef}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowSchedule(!showSchedule)}
            >
              <Clock className="w-3.5 h-3.5" />
              Inplannen
            </Button>
            {showSchedule && (
              <div className="absolute right-0 bottom-full mb-1 w-52 rounded-lg border bg-popover shadow-lg z-50 py-1">
                {scheduleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setScheduledAt(opt.value); setShowSchedule(false) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSend}
            disabled={!to.trim() || !subject.trim() || isSending}
            size="sm"
            className="gap-1.5 h-8"
          >
            <Send className="w-3.5 h-3.5" />
            {scheduledAt ? 'Inplannen' : 'Verstuur'}
          </Button>
        </div>
      </div>
    </div>
  )
}
