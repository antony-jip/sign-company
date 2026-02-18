import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Paperclip, Sparkles, ChevronDown, ChevronUp, Clock, CalendarClock } from 'lucide-react'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { createEmail } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend?: (data: { to: string; subject: string; body: string; scheduledAt?: string }) => void
}

const emailTemplates: Record<string, { onderwerp: string; body: string }> = {
  none: { onderwerp: '', body: '' },
  'offerte-followup': {
    onderwerp: 'Opvolging offerte',
    body: `Beste [naam],

Graag volg ik onze offerte [nummer] op die wij op [datum] hebben verstuurd.

Heeft u de offerte kunnen bekijken? Wij horen graag of u nog vragen heeft of dat we verdere toelichting kunnen geven.

Mocht u interesse hebben, dan plannen we graag een afspraak in om de details te bespreken.

Met vriendelijke groet,
[uw naam]`,
  },
  'project-update': {
    onderwerp: 'Project update',
    body: `Beste [naam],

Hierbij een update over de voortgang van uw project [projectnaam].

Wat is er bereikt:
- [punt 1]
- [punt 2]
- [punt 3]

Volgende stappen:
- [stap 1]
- [stap 2]

Verwachte opleverdatum: [datum]

Heeft u vragen? Neem gerust contact op.

Met vriendelijke groet,
[uw naam]`,
  },
  welkomstbericht: {
    onderwerp: 'Welkom bij Sign Company',
    body: `Beste [naam],

Welkom bij Sign Company! Wij zijn verheugd om met u samen te werken.

Uw contactpersoon is [naam contactpersoon], bereikbaar via [telefoonnummer] en [emailadres].

De volgende stappen zijn:
1. Kennismakingsgesprek inplannen
2. Wensen en eisen inventariseren
3. Ontwerp voorstel opstellen

Wij kijken uit naar een prettige samenwerking!

Met vriendelijke groet,
[uw naam]`,
  },
  betaalherinnering: {
    onderwerp: 'Herinnering: openstaande factuur',
    body: `Beste [naam],

Uit onze administratie blijkt dat de volgende factuur nog niet is voldaan:

Factuurnummer: [nummer]
Factuurdatum: [datum]
Bedrag: [bedrag]
Vervaldatum: [vervaldatum]

Wij verzoeken u vriendelijk het openstaande bedrag binnen 7 dagen te voldoen op rekeningnummer [IBAN] o.v.v. het factuurnummer.

Mocht de betaling reeds zijn verricht, dan kunt u deze herinnering als niet verzonden beschouwen.

Met vriendelijke groet,
[uw naam]`,
  },
}

export function EmailCompose({
  open,
  onOpenChange,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
}: EmailComposeProps) {
  const { emailHandtekening, bedrijfsnaam } = useAppSettings()
  const { user } = useAuth()

  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(() => {
    // Append signature if available
    if (emailHandtekening && !defaultBody) {
      return `\n\n--\n${emailHandtekening}`
    }
    return defaultBody
  })
  const [template, setTemplate] = useState('none')
  const [isSending, setIsSending] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [scheduleOption, setScheduleOption] = useState<string>('now')
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('09:00')
  const scheduleDropdownRef = useRef<HTMLDivElement>(null)

  // Sync state when defaults change (reply/forward)
  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
    setBody(defaultBody)
  }, [defaultTo, defaultSubject, defaultBody])

  // Close schedule dropdown when clicking outside
  useEffect(() => {
    if (!showScheduleDropdown) return
    function handleClickOutside(e: MouseEvent) {
      if (scheduleDropdownRef.current && !scheduleDropdownRef.current.contains(e.target as Node)) {
        setShowScheduleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showScheduleDropdown])

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    if (value !== 'none' && emailTemplates[value]) {
      const tmpl = emailTemplates[value]
      if (tmpl.onderwerp && !subject) setSubject(tmpl.onderwerp)
      const signature = emailHandtekening ? `\n\n--\n${emailHandtekening}` : ''
      setBody(tmpl.body + signature)
    }
  }

  const getNextMonday = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    return nextMonday
  }

  const handleScheduleSelect = (option: string) => {
    setScheduleOption(option)

    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    switch (option) {
      case 'now':
        setScheduledAt('')
        break
      case 'tomorrow-9':
        setScheduledAt(`${tomorrowStr}T09:00`)
        break
      case 'tomorrow-14':
        setScheduledAt(`${tomorrowStr}T14:00`)
        break
      case 'next-monday': {
        const monday = getNextMonday()
        const mondayStr = monday.toISOString().split('T')[0]
        setScheduledAt(`${mondayStr}T09:00`)
        break
      }
      case 'custom':
        // Will be set via custom inputs
        if (customDate && customTime) {
          setScheduledAt(`${customDate}T${customTime}`)
        } else {
          setScheduledAt('')
        }
        break
    }

    if (option !== 'custom') {
      setShowScheduleDropdown(false)
    }
  }

  const handleCustomDateTimeChange = (date: string, time: string) => {
    setCustomDate(date)
    setCustomTime(time)
    if (date && time) {
      setScheduledAt(`${date}T${time}`)
    }
  }

  const handleAiGenerate = () => {
    // Placeholder for AI generation
    alert('Configureer OpenAI API key voor AI tekst generatie')
  }

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return
    setIsSending(true)

    try {
      // Save to email storage
      await createEmail({
        user_id: user?.id || 'demo',
        gmail_id: '',
        van: user?.email || 'ik@' + (bedrijfsnaam || 'bedrijf').toLowerCase().replace(/\s/g, '') + '.nl',
        aan: to.trim(),
        onderwerp: subject.trim(),
        inhoud: body,
        datum: new Date().toISOString(),
        gelezen: true,
        starred: false,
        labels: ['verzonden'],
        bijlagen: 0,
        map: 'verzonden',
        scheduled_at: scheduledAt || undefined,
      })

      onSend?.({ to: to.trim(), subject: subject.trim(), body, scheduledAt: scheduledAt || undefined })
      resetAndClose()
    } catch (error) {
      console.error('Verzenden mislukt:', error)
    } finally {
      setIsSending(false)
    }
  }

  const resetAndClose = () => {
    setTo(defaultTo)
    setCc('')
    setShowCc(false)
    setSubject(defaultSubject)
    setBody(defaultBody)
    setTemplate('none')
    setScheduledAt('')
    setShowScheduleDropdown(false)
    setScheduleOption('now')
    setCustomDate('')
    setCustomTime('09:00')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nieuwe email</DialogTitle>
          <DialogDescription>
            Stel een nieuw bericht op en verstuur het.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Template selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Template</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen template</SelectItem>
                <SelectItem value="offerte-followup">Offerte follow-up</SelectItem>
                <SelectItem value="project-update">Project update</SelectItem>
                <SelectItem value="welkomstbericht">Welkomstbericht</SelectItem>
                <SelectItem value="betaalherinnering">Betaalherinnering</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* To field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Aan</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => setShowCc(!showCc)}
              >
                CC {showCc ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
            </div>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@voorbeeld.nl"
              type="email"
            />
          </div>

          {/* CC field */}
          {showCc && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">CC</Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@voorbeeld.nl"
                type="email"
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Onderwerp</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Onderwerp van de email..."
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Bericht</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20"
                onClick={handleAiGenerate}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Genereren
              </Button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Schrijf uw bericht hier..."
              className="min-h-[300px] resize-y"
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <Paperclip className="w-4 h-4" />
            Bijlage toevoegen
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetAndClose}>
              Annuleren
            </Button>
            <div className="relative" ref={scheduleDropdownRef}>
              <div className="flex">
                <Button
                  onClick={handleSend}
                  disabled={!to.trim() || !subject.trim() || isSending}
                  className="gap-2 rounded-r-none"
                >
                  {scheduledAt ? (
                    <>
                      <Clock className="w-4 h-4" />
                      {isSending ? 'Inplannen...' : 'Inplannen'}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isSending ? 'Verzenden...' : 'Verzenden'}
                    </>
                  )}
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                  onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                  type="button"
                >
                  <CalendarClock className="w-4 h-4" />
                </Button>
              </div>
              {showScheduleDropdown && (
                <div className="absolute right-0 bottom-full mb-2 w-72 rounded-md border bg-popover p-2 shadow-md z-50">
                  <div className="space-y-1">
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${scheduleOption === 'now' ? 'bg-accent font-medium' : ''}`}
                      onClick={() => handleScheduleSelect('now')}
                    >
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Nu verzenden
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${scheduleOption === 'tomorrow-9' ? 'bg-accent font-medium' : ''}`}
                      onClick={() => handleScheduleSelect('tomorrow-9')}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Morgen 09:00
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${scheduleOption === 'tomorrow-14' ? 'bg-accent font-medium' : ''}`}
                      onClick={() => handleScheduleSelect('tomorrow-14')}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Morgen 14:00
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${scheduleOption === 'next-monday' ? 'bg-accent font-medium' : ''}`}
                      onClick={() => handleScheduleSelect('next-monday')}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        Volgende week maandag 09:00
                      </div>
                    </button>
                    <div className="border-t my-1" />
                    <button
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent ${scheduleOption === 'custom' ? 'bg-accent font-medium' : ''}`}
                      onClick={() => handleScheduleSelect('custom')}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" />
                        Aangepaste datum/tijd
                      </div>
                    </button>
                    {scheduleOption === 'custom' && (
                      <div className="px-3 py-2 space-y-2">
                        <div>
                          <Label className="text-xs">Datum</Label>
                          <Input
                            type="date"
                            value={customDate}
                            onChange={(e) => handleCustomDateTimeChange(e.target.value, customTime)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tijd</Label>
                          <Input
                            type="time"
                            value={customTime}
                            onChange={(e) => handleCustomDateTimeChange(customDate, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
