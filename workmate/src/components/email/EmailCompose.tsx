import React, { useState, useEffect } from 'react'
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
import { Send, Paperclip, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
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
}: EmailComposeProps) {
  const [to, setTo] = useState(defaultTo)
  const [cc, setCc] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [template, setTemplate] = useState('none')
  const [isSending, setIsSending] = useState(false)

  // Sync state when defaults change (reply/forward)
  useEffect(() => {
    setTo(defaultTo)
    setSubject(defaultSubject)
    setBody(defaultBody)
  }, [defaultTo, defaultSubject, defaultBody])

  const handleTemplateChange = (value: string) => {
    setTemplate(value)
    if (value !== 'none' && emailTemplates[value]) {
      const tmpl = emailTemplates[value]
      if (tmpl.onderwerp && !subject) setSubject(tmpl.onderwerp)
      setBody(tmpl.body)
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
      // Simulate sending
      await new Promise((resolve) => setTimeout(resolve, 800))
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
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
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
              className="min-h-[200px] resize-y"
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
            <Button
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim() || isSending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Verzenden...' : 'Verzenden'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
