import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createOfferte, createOfferteItem, updateOfferte, getKlanten } from '@/services/supabaseService'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { generateOffertePDF } from '@/services/pdfService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import type { Klant, OfferteItem } from '@/types'
import { toast } from 'sonner'
import { Building2, ChevronDown, Plus, X, Send } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface QuickRegel {
  id: string
  omschrijving: string
  aantal: number
  prijs: string
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'
const inlineInputClass = 'w-full h-8 px-2 py-1 text-sm bg-transparent border-0 rounded focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:bg-background'

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

function formatEuro(n: number): string {
  return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })
}

export function NieuweOfferteModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { bedrijfsnaam, primaireKleur, emailHandtekening, profile } = useAppSettings()
  const documentStyle = useDocumentStyle()

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
  const [saving, setSaving] = useState(false)
  const [savingMode, setSavingMode] = useState<'create' | 'send'>('create')
  const klantInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getKlanten().then(setKlanten).catch(() => {})
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
    }
  }, [open])

  const filtered = klantQuery.trim().length > 0
    ? klanten.filter(k => k.bedrijfsnaam.toLowerCase().includes(klantQuery.toLowerCase()))
    : []

  // Calculate subtotal from regels
  const subtotaal = regels.reduce((sum, r) => sum + r.aantal * parseNum(r.prijs), 0)
  const hasRegels = regels.length > 0
  const effectiefBedrag = hasRegels ? subtotaal : parseNum(bedrag)

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
    setRegels(prev => [...prev, { id: crypto.randomUUID(), omschrijving: '', aantal: 1, prijs: '' }])
  }

  function updateRegel(id: string, field: keyof QuickRegel, value: string | number) {
    setRegels(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  function removeRegel(id: string) {
    setRegels(prev => prev.filter(r => r.id !== id))
  }

  async function handleSubmit(e: React.FormEvent, mode: 'create' | 'send' = 'create') {
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

      // 2. Create offerte items from regels
      const createdItems: OfferteItem[] = []
      for (let i = 0; i < regels.length; i++) {
        const r = regels[i]
        if (!r.omschrijving.trim()) continue
        const item = await createOfferteItem({
          offerte_id: offerte.id,
          beschrijving: r.omschrijving.trim(),
          aantal: r.aantal,
          eenheidsprijs: parseNum(r.prijs),
          btw_percentage: 21,
          korting_percentage: 0,
          totaal: r.aantal * parseNum(r.prijs),
          volgorde: i,
          soort: 'prijs',
        })
        createdItems.push(item)
      }

      // 3. If send mode → generate PDF, send email
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

        let attachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
        try {
          const doc = generateOffertePDF(
            offerte,
            createdItems,
            selectedKlant,
            { ...profile, primaireKleur: primaireKleur || '#F15025' } as Parameters<typeof generateOffertePDF>[3],
            documentStyle,
          )
          const pdfBase64 = doc.output('datauristring').split(',')[1]
          attachments = [{ filename: `${offerte.nummer || 'offerte'}.pdf`, content: pdfBase64, encoding: 'base64' as const }]
        } catch {
          // PDF generation failed, send without attachment
        }

        try {
          await sendEmail(verzendEmail.trim(), emailData.subject, emailData.text, {
            html: emailData.html,
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
      } else {
        toast.success('Offerte aangemaakt')
      }

      onOpenChange(false)
      navigate(`/offertes/${offerte.id}`)
    } catch {
      toast.error('Kon offerte niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${showExtra ? 'sm:max-w-[640px]' : 'sm:max-w-[560px]'} p-4 gap-2 transition-all`}>
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
                value={hasRegels ? subtotaal.toFixed(2).replace('.', ',') : bedrag}
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
                type="submit"
                disabled={!selectedKlant || !titel.trim() || saving}
                className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
                style={{ backgroundColor: '#F15025' }}
              >
                {saving ? 'Aanmaken...' : 'Offerte maken'}
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
                {/* Header */}
                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/30 text-[10px] text-muted-foreground font-medium">
                  <span className="flex-[3] px-2">Omschrijving</span>
                  <span className="flex-[0.8] px-2 text-right">Aantal</span>
                  <span className="flex-[1] px-2 text-right">Prijs</span>
                  <span className="flex-[1] px-2 text-right">Totaal</span>
                  <span className="w-7" />
                </div>

                {/* Rows */}
                <div className="max-h-48 overflow-y-auto">
                  {regels.map(r => {
                    const regelTotal = r.aantal * parseNum(r.prijs)
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
                        <div className="flex-[0.8]">
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
                            value={r.prijs}
                            onChange={e => updateRegel(r.id, 'prijs', e.target.value)}
                            placeholder="0,00"
                            className={`${inlineInputClass} font-mono text-right`}
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

                {/* Add row + Subtotal */}
                <div className="flex items-center justify-between px-2 py-1.5 border-t border-border/50 bg-muted/20">
                  <button
                    type="button"
                    onClick={addRegel}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Regel toevoegen
                  </button>
                  {hasRegels && (
                    <span className="text-sm font-medium font-mono">
                      Subtotaal {formatEuro(subtotaal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Verzenden naar */}
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Verzenden naar</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={verzendEmail}
                    onChange={e => setVerzendEmail(e.target.value)}
                    placeholder="email@klant.nl"
                    className={`${inputClass} flex-1`}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!selectedKlant || !titel.trim() || saving}
                  className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                  style={{ backgroundColor: '#F15025' }}
                >
                  {saving && savingMode === 'create' ? 'Aanmaken...' : 'Offerte maken'}
                </button>
                <button
                  type="button"
                  onClick={e => handleSubmit(e as unknown as React.FormEvent, 'send')}
                  disabled={!selectedKlant || !titel.trim() || !verzendEmail.trim() || saving}
                  className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5"
                  style={{ backgroundColor: '#1A535C' }}
                >
                  <Send className="h-3.5 w-3.5" />
                  {saving && savingMode === 'send' ? 'Verzenden...' : 'Maak & verzend'}
                </button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
