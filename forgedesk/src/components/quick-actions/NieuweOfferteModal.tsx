import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createOfferte, createOfferteItem, updateOfferte, getKlanten, getCalculatieTemplates, getMedewerkers, createTaak } from '@/services/supabaseService'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { generateOffertePDF } from '@/services/pdfService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import type { Klant, OfferteItem, CalculatieTemplate, CalculatieRegel, Medewerker } from '@/types'
import { toast } from 'sonner'
import { round2 } from '@/utils/budgetUtils'
import { Building2, ChevronDown, Plus, X, Send, BookTemplate, Settings, Save, UserCircle, ListTodo } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface QuickRegel {
  id: string
  omschrijving: string
  aantal: number
  inkoop: string
  verkoop: string
  marge: number
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'
const inlineInputClass = 'w-full h-8 px-2 py-1 text-sm bg-transparent border-0 rounded focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:bg-background'

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

function formatEuro(n: number): string {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })
}

function berekenVerkoopVanInkoop(inkoop: number, margePerc: number): number {
  return round2(inkoop * (1 + margePerc / 100))
}

function berekenMarge(inkoop: number, verkoop: number): number {
  if (inkoop === 0) return 0
  return Math.round(((verkoop - inkoop) / inkoop) * 1000) / 10
}

function makeId(): string {
  return `qr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function NieuweOfferteModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { settings, bedrijfsnaam, primaireKleur, emailHandtekening, profile } = useAppSettings()
  const documentStyle = useDocumentStyle()
  const standaardMarge = settings.calculatie_standaard_marge ?? 35

  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantQuery, setKlantQuery] = useState('')
  const [selectedKlant, setSelectedKlant] = useState<Klant | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [titel, setTitel] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notitie, setNotitie] = useState('')
  const [showExtra, setShowExtra] = useState(false)
  const [regels, setRegels] = useState<QuickRegel[]>([])
  const [verzendEmail, setVerzendEmail] = useState('')
  const [emailTekst, setEmailTekst] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingMode, setSavingMode] = useState<'save' | 'create' | 'send'>('create')
  const [templates, setTemplates] = useState<CalculatieTemplate[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [toegewezenAan, setToegewezenAan] = useState('')
  const [maakTaak, setMaakTaak] = useState(false)
  const klantInputRef = useRef<HTMLInputElement>(null)

  // Snelkoppeling template IDs from settings
  const snelkoppelingIds = settings.snelofferte_templates || []

  useEffect(() => {
    if (open) {
      getKlanten().then(setKlanten).catch(() => {})
      getCalculatieTemplates().then(setTemplates).catch(() => {})
      getMedewerkers().then(m => setMedewerkers(m.filter(x => x.status === 'actief'))).catch(() => {})
    } else {
      setKlantQuery('')
      setSelectedKlant(null)
      setTitel('')
      setBedrag('')
      setDeadline('')
      setNotitie('')
      setShowExtra(false)
      setRegels([])
      setVerzendEmail('')
      setEmailTekst('')
      setShowTemplates(false)
      setToegewezenAan('')
      setMaakTaak(false)
    }
  }, [open])

  const filtered = klantQuery.trim().length > 0
    ? klanten.filter(k => k.bedrijfsnaam.toLowerCase().includes(klantQuery.toLowerCase()))
    : []

  // Active templates, prioritize snelkoppelingen
  const activeTemplates = useMemo(() => templates.filter(t => t.actief), [templates])
  const snelkoppelingen = useMemo(
    () => snelkoppelingIds.map(id => activeTemplates.find(t => t.id === id)).filter(Boolean) as CalculatieTemplate[],
    [snelkoppelingIds, activeTemplates]
  )

  // Calculate totals from regels
  const totalen = useMemo(() => {
    let totaalInkoop = 0
    let totaalVerkoop = 0
    regels.forEach(r => {
      totaalInkoop += round2(r.aantal * parseNum(r.inkoop))
      totaalVerkoop += round2(r.aantal * parseNum(r.verkoop))
    })
    const margeBedrag = round2(totaalVerkoop - totaalInkoop)
    const margePerc = totaalInkoop > 0 ? Math.round((margeBedrag / totaalInkoop) * 1000) / 10 : 0
    return { totaalInkoop, totaalVerkoop, margeBedrag, margePerc }
  }, [regels])

  const hasRegels = regels.length > 0
  const effectiefBedrag = hasRegels ? totalen.totaalVerkoop : parseNum(bedrag)

  function selectKlant(klant: Klant) {
    setSelectedKlant(klant)
    setKlantQuery(klant.bedrijfsnaam)
    setShowSuggestions(false)
    if (klant.email) setVerzendEmail(klant.email)
  }

  function clearKlant() {
    setSelectedKlant(null)
    setKlantQuery('')
    setVerzendEmail('')
    klantInputRef.current?.focus()
  }

  function addRegel() {
    setRegels(prev => [...prev, {
      id: makeId(),
      omschrijving: '',
      aantal: 1,
      inkoop: '',
      verkoop: '',
      marge: standaardMarge,
    }])
  }

  const updateRegel = useCallback((id: string, field: keyof QuickRegel, value: string | number) => {
    setRegels(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, [field]: value }

      if (field === 'inkoop') {
        const inkoop = parseNum(String(value))
        updated.verkoop = berekenVerkoopVanInkoop(inkoop, updated.marge).toFixed(2).replace('.', ',')
      } else if (field === 'marge') {
        const inkoop = parseNum(updated.inkoop)
        updated.verkoop = berekenVerkoopVanInkoop(inkoop, Number(value)).toFixed(2).replace('.', ',')
      } else if (field === 'verkoop') {
        const inkoop = parseNum(updated.inkoop)
        const verkoop = parseNum(String(value))
        updated.marge = berekenMarge(inkoop, verkoop)
      }

      return updated
    }))
  }, [])

  function removeRegel(id: string) {
    setRegels(prev => prev.filter(r => r.id !== id))
  }

  const laadTemplate = useCallback((template: CalculatieTemplate) => {
    if (regels.length > 0 && regels.some(r => r.omschrijving.trim())) {
      if (!window.confirm('Dit vervangt alle huidige regels. Doorgaan?')) return
    }
    const nieuweRegels: QuickRegel[] = template.regels.map((r: CalculatieRegel) => ({
      id: makeId(),
      omschrijving: r.product_naam,
      aantal: r.aantal,
      inkoop: r.inkoop_prijs.toFixed(2).replace('.', ','),
      verkoop: r.verkoop_prijs.toFixed(2).replace('.', ','),
      marge: r.marge_percentage,
    }))
    setRegels(nieuweRegels)
    if (template.beschrijving && !titel.trim()) {
      setTitel(template.naam)
    }
    setShowTemplates(false)
    if (!showExtra) setShowExtra(true)
  }, [regels, titel, showExtra])

  async function handleSubmit(e: React.FormEvent, mode: 'save' | 'create' | 'send' = 'create') {
    e.preventDefault()
    if (!selectedKlant || !titel.trim()) return
    if (mode === 'send' && !verzendEmail.trim()) return

    setSaving(true)
    setSavingMode(mode)
    try {
      // 1. Create offerte
      const offerte = await createOfferte({
        klant_id: selectedKlant.id,
        klant_naam: selectedKlant.bedrijfsnaam,
        titel: titel.trim(),
        nummer: '',
        status: mode === 'send' ? 'verzonden' : 'concept',
        subtotaal: effectiefBedrag,
        btw_bedrag: 0,
        totaal: effectiefBedrag,
        geldig_tot: deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: notitie.trim(),
        voorwaarden: '',
      })

      // 2. Create ONE offerte item with all regels as calculatie_regels
      let createdItem: OfferteItem | null = null
      const validRegels = regels.filter(r => r.omschrijving.trim())

      if (validRegels.length > 0) {
        const calcRegels: CalculatieRegel[] = validRegels.map(r => ({
          id: makeId(),
          product_naam: r.omschrijving.trim(),
          categorie: '',
          eenheid: 'stuks',
          aantal: r.aantal,
          inkoop_prijs: parseNum(r.inkoop),
          verkoop_prijs: parseNum(r.verkoop),
          marge_percentage: r.marge,
          korting_percentage: 0,
          nacalculatie: false,
          btw_percentage: 21,
          notitie: '',
        }))

        createdItem = await createOfferteItem({
          offerte_id: offerte.id,
          beschrijving: titel.trim(),
          aantal: 1,
          eenheidsprijs: totalen.totaalVerkoop,
          btw_percentage: 21,
          korting_percentage: 0,
          totaal: totalen.totaalVerkoop,
          volgorde: 0,
          soort: 'prijs',
          heeft_calculatie: true,
          calculatie_regels: calcRegels,
        })
      }

      // 3. Optionally create a task
      if (maakTaak) {
        await createTaak({
          titel: `Offerte afmaken: ${titel.trim()}`,
          beschrijving: `Offerte voor ${selectedKlant.bedrijfsnaam}${notitie.trim() ? `\n${notitie.trim()}` : ''}`,
          status: 'todo',
          prioriteit: 'medium',
          toegewezen_aan: toegewezenAan || '',
          klant_id: selectedKlant.id,
          offerte_id: offerte.id,
          deadline: deadline || undefined,
          geschatte_tijd: 0,
          bestede_tijd: 0,
        })
      }

      // 4. If send mode → generate PDF, send email
      if (mode === 'send') {
        const emailData = offerteVerzendTemplate({
          klantNaam: selectedKlant.contactpersoon || selectedKlant.bedrijfsnaam,
          offerteNummer: offerte.nummer || 'Concept',
          offerteTitel: offerte.titel,
          totaalBedrag: formatEuro(effectiefBedrag),
          geldigTot: offerte.geldig_tot,
          bedrijfsnaam: bedrijfsnaam || '',
          handtekening: emailHandtekening || '',
          logoUrl: profile?.logo_url || '',
          primaireKleur: primaireKleur || '#F15025',
        })

        const items: OfferteItem[] = createdItem ? [createdItem] : []
        let attachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
        try {
          const doc = generateOffertePDF(
            offerte,
            items,
            selectedKlant,
            { ...profile, primaireKleur: primaireKleur || '#F15025' } as Parameters<typeof generateOffertePDF>[3],
            documentStyle,
          )
          const pdfBase64 = doc.output('datauristring').split(',')[1]
          attachments = [{ filename: `${offerte.nummer || 'offerte'}.pdf`, content: pdfBase64, encoding: 'base64' as const }]
        } catch {
          // PDF generation failed, send without attachment
        }

        const bodyText = emailTekst.trim() || emailData.text

        try {
          await sendEmail(verzendEmail.trim(), emailData.subject, bodyText, {
            html: emailTekst.trim()
              ? `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap">${emailTekst.trim().replace(/\n/g, '<br>')}</div>`
              : emailData.html,
            attachments,
          })
        } catch {
          toast.error('Email verzenden mislukt, offerte is wel aangemaakt')
        }

        await updateOfferte(offerte.id, {
          status: 'verzonden',
          verstuurd_op: new Date().toISOString(),
          verstuurd_naar: verzendEmail.trim(),
        } as Parameters<typeof updateOfferte>[1])

        toast.success('Offerte aangemaakt en verzonden')
        onOpenChange(false)
        navigate(`/offertes/${offerte.id}`)
      } else if (mode === 'save') {
        // Save as concept, stay on current page
        toast.success(`Offerte opgeslagen als concept${maakTaak ? ' + taak aangemaakt' : ''}`)
        onOpenChange(false)
      } else {
        // Create and navigate
        toast.success('Offerte aangemaakt')
        onOpenChange(false)
        navigate(`/offertes/${offerte.id}`)
      }
    } catch {
      toast.error('Kon offerte niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = !!selectedKlant && !!titel.trim() && !saving

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${showExtra ? 'sm:max-w-[720px]' : 'sm:max-w-[560px]'} p-4 gap-2 transition-all`}>
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Nieuwe offerte</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => handleSubmit(e, 'create')} className="space-y-2">
          {/* Row 1: Klant + Titel */}
          <div className="flex gap-3">
            <div className="flex-[2] min-w-0 relative">
              <label className="text-[10px] text-muted-foreground mb-1 block">Klant</label>
              {selectedKlant ? (
                <div className="flex items-center h-9 px-3 py-1.5 text-sm border border-petrol/30 rounded-lg bg-petrol/5">
                  <Building2 className="h-3.5 w-3.5 text-petrol mr-2 shrink-0" />
                  <span className="truncate text-sm">{selectedKlant.bedrijfsnaam}</span>
                  <button
                    type="button"
                    onClick={clearKlant}
                    className="ml-auto text-muted-foreground hover:text-foreground text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={klantInputRef}
                    type="text"
                    value={klantQuery}
                    onChange={e => {
                      setKlantQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Zoek klant..."
                    autoFocus
                    className={inputClass}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filtered.slice(0, 6).map(k => (
                        <button
                          key={k.id}
                          type="button"
                          onMouseDown={() => selectKlant(k)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{k.bedrijfsnaam}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex-[3] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Titel</label>
              <input
                type="text"
                value={titel}
                onChange={e => setTitel(e.target.value)}
                placeholder="Bijv. Gevelreclame kantoorpand"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: Bedrag + Deadline + Button (compact mode) */}
          <div className="flex gap-3 items-end">
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Bedrag</label>
              <input
                type="text"
                inputMode="decimal"
                value={hasRegels ? totalen.totaalVerkoop.toFixed(2).replace('.', ',') : bedrag}
                onChange={e => !hasRegels && setBedrag(e.target.value)}
                readOnly={hasRegels}
                placeholder="0,00"
                className={`${inputClass} font-mono ${hasRegels ? 'bg-muted/50 text-muted-foreground' : ''}`}
              />
            </div>
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
            {!showExtra && (
              <button
                type="button"
                onClick={e => handleSubmit(e as unknown as React.FormEvent, 'save')}
                disabled={!canSubmit}
                className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                style={{ backgroundColor: '#F15025' }}
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            )}
          </div>

          {/* Toggle meer opties */}
          <button
            type="button"
            onClick={() => {
              setShowExtra(!showExtra)
              if (!showExtra && regels.length === 0) addRegel()
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
            Meer opties
          </button>

          {/* Extended section */}
          {showExtra && (
            <div className="space-y-3 pt-1">
              {/* Notitie */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Notitie</label>
                <input
                  type="text"
                  value={notitie}
                  onChange={e => setNotitie(e.target.value)}
                  placeholder="Interne notitie of opmerking..."
                  className={inputClass}
                />
              </div>

              {/* Quick calculatie regels */}
              <div className="border border-border rounded-lg overflow-hidden">
                {/* Template bar */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/40 border-b border-border/50 relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium border border-border rounded-md bg-background hover:bg-muted/50 transition-colors"
                  >
                    <BookTemplate className="h-3.5 w-3.5" />
                    Template laden
                  </button>

                  {/* Snelkoppeling chips */}
                  {snelkoppelingen.length > 0 && (
                    <div className="flex items-center gap-1 ml-1">
                      {snelkoppelingen.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => laadTemplate(t)}
                          className="px-2 py-0.5 text-[10px] font-medium border border-petrol/30 text-petrol rounded-full bg-petrol/5 hover:bg-petrol/10 transition-colors whitespace-nowrap"
                        >
                          {t.naam}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Template dropdown */}
                  {showTemplates && (
                    <div className="absolute z-50 top-full left-2 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                      {activeTemplates.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                          Geen templates beschikbaar
                        </div>
                      )}
                      {activeTemplates.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onMouseDown={() => laadTemplate(t)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border/30 last:border-0"
                        >
                          <span className="text-sm font-medium block">{t.naam}</span>
                          {t.beschrijving && (
                            <span className="text-[10px] text-muted-foreground">{t.beschrijving}</span>
                          )}
                        </button>
                      ))}
                      <div className="border-t border-border">
                        <button
                          type="button"
                          onMouseDown={() => {
                            onOpenChange(false)
                            navigate('/instellingen?tab=calculatie')
                          }}
                          className="w-full text-left px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                        >
                          <Settings className="h-3 w-3" />
                          Templates beheren
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column headers */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/20 text-[10px] text-muted-foreground font-medium border-b border-border/30">
                  <span className="flex-[3] px-2">Omschrijving</span>
                  <span className="flex-[0.7] px-1 text-right">Aantal</span>
                  <span className="flex-[1] px-1 text-right">Inkoop</span>
                  <span className="flex-[1] px-1 text-right">Verkoop</span>
                  <span className="flex-[0.7] px-1 text-right">Marge%</span>
                  <span className="flex-[1] px-2 text-right">Regeltotaal</span>
                  <span className="w-7" />
                </div>

                {/* Rows */}
                <div className="max-h-48 overflow-y-auto">
                  {regels.map(r => {
                    const regelTotal = r.aantal * parseNum(r.verkoop)
                    return (
                      <div key={r.id} className="flex items-center gap-1 px-1 border-t border-border/50">
                        <div className="flex-[3]">
                          <input
                            type="text"
                            value={r.omschrijving}
                            onChange={e => updateRegel(r.id, 'omschrijving', e.target.value)}
                            placeholder="Product of dienst"
                            className={inlineInputClass}
                          />
                        </div>
                        <div className="flex-[0.7]">
                          <input
                            type="number"
                            min={0}
                            value={r.aantal}
                            onChange={e => updateRegel(r.id, 'aantal', parseInt(e.target.value) || 0)}
                            className={`${inlineInputClass} font-mono text-right`}
                          />
                        </div>
                        <div className="flex-[1]">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={r.inkoop}
                            onChange={e => updateRegel(r.id, 'inkoop', e.target.value)}
                            placeholder="0,00"
                            className={`${inlineInputClass} font-mono text-right`}
                          />
                        </div>
                        <div className="flex-[1]">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={r.verkoop}
                            onChange={e => updateRegel(r.id, 'verkoop', e.target.value)}
                            placeholder="0,00"
                            className={`${inlineInputClass} font-mono text-right`}
                          />
                        </div>
                        <div className="flex-[0.7]">
                          <input
                            type="number"
                            value={Math.round(r.marge)}
                            onChange={e => updateRegel(r.id, 'marge', parseInt(e.target.value) || 0)}
                            className={`${inlineInputClass} font-mono text-right ${r.marge >= 30 ? 'text-green-600' : r.marge >= 0 ? 'text-amber-600' : 'text-red-500'}`}
                          />
                        </div>
                        <div className="flex-[1] px-2 text-right text-sm font-mono text-muted-foreground">
                          {formatEuro(regelTotal)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRegel(r.id)}
                          className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Footer: Add row + Totals */}
                <div className="border-t border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <button
                      type="button"
                      onClick={addRegel}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Regel toevoegen
                    </button>
                    {hasRegels && (
                      <div className="text-right text-[11px] space-y-0.5">
                        <div className="text-muted-foreground">
                          Inkoop {formatEuro(totalen.totaalInkoop)} &middot; Marge{' '}
                          <span className={totalen.margeBedrag >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                            {formatEuro(totalen.margeBedrag)} ({totalen.margePerc}%)
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          Verkooptotaal {formatEuro(totalen.totaalVerkoop)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Verzenden naar + email tekst */}
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Verzenden naar</label>
                  <input
                    type="email"
                    value={verzendEmail}
                    onChange={e => setVerzendEmail(e.target.value)}
                    placeholder="email@klant.nl"
                    className={`${inputClass} flex-1`}
                  />
                </div>
                {verzendEmail.trim() && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Berichttekst (optioneel)</label>
                    <textarea
                      value={emailTekst}
                      onChange={e => setEmailTekst(e.target.value)}
                      placeholder="Bijv. Hierbij onze offerte voor de besproken werkzaamheden..."
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                )}
              </div>

              {/* Taak checkbox + medewerker + Buttons */}
              <div className="space-y-2 pt-1">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <input
                      type="checkbox"
                      checked={maakTaak}
                      onChange={e => setMaakTaak(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-border accent-petrol"
                    />
                    <ListTodo className="h-3.5 w-3.5" />
                    <span className="text-[11px]">
                      Taak aanmaken{titel.trim() ? `: "Offerte afmaken: ${titel.trim()}"` : ''}
                    </span>
                  </label>
                  {maakTaak && (
                    <div className="ml-6 flex items-center gap-2">
                      <UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <select
                        value={toegewezenAan}
                        onChange={e => setToegewezenAan(e.target.value)}
                        className="h-8 px-2 py-1 text-[11px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol appearance-none cursor-pointer"
                      >
                        <option value="">Niet toegewezen</option>
                        {medewerkers.map(m => (
                          <option key={m.id} value={m.naam}>{m.naam}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={e => handleSubmit(e as unknown as React.FormEvent, 'save')}
                    disabled={!canSubmit}
                    className="h-9 px-3 text-sm font-medium border border-border rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5 hover:bg-muted/50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving && savingMode === 'save' ? 'Opslaan...' : 'Opslaan'}
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                    style={{ backgroundColor: '#F15025' }}
                  >
                    {saving && savingMode === 'create' ? 'Aanmaken...' : 'Offerte maken'}
                  </button>
                  <button
                    type="button"
                    onClick={e => handleSubmit(e as unknown as React.FormEvent, 'send')}
                    disabled={!canSubmit || !verzendEmail.trim()}
                    className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
                    style={{ backgroundColor: '#1A535C' }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {saving && savingMode === 'send' ? 'Verzenden...' : 'Maak & verzend'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
