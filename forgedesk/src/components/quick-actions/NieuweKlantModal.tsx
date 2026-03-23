import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createKlant, getKlanten, updateKlant } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { toast } from 'sonner'
import { ChevronDown, Building2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'

export function NieuweKlantModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [selectedKlant, setSelectedKlant] = useState<Klant | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [contactpersoon, setContactpersoon] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [showExtra, setShowExtra] = useState(false)
  const [adres, setAdres] = useState('')
  const [postcode, setPostcode] = useState('')
  const [stad, setStad] = useState('')
  const [website, setWebsite] = useState('')
  const [kvkNummer, setKvkNummer] = useState('')
  const [btwNummer, setBtwNummer] = useState('')
  const [saving, setSaving] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getKlanten().then(setKlanten).catch(() => {})
    } else {
      resetForm()
    }
  }, [open])

  function resetForm() {
    setBedrijfsnaam('')
    setSelectedKlant(null)
    setContactpersoon('')
    setEmail('')
    setTelefoon('')
    setShowExtra(false)
    setAdres('')
    setPostcode('')
    setStad('')
    setWebsite('')
    setKvkNummer('')
    setBtwNummer('')
  }

  const filtered = bedrijfsnaam.trim().length > 0
    ? klanten.filter(k => k.bedrijfsnaam.toLowerCase().includes(bedrijfsnaam.toLowerCase()))
    : []

  function selectExisting(klant: Klant) {
    setSelectedKlant(klant)
    setBedrijfsnaam(klant.bedrijfsnaam)
    setShowSuggestions(false)
  }

  function clearSelection() {
    setSelectedKlant(null)
    setBedrijfsnaam('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (selectedKlant) {
      // Add contact person to existing company
      if (!contactpersoon.trim()) return
      setSaving(true)
      try {
        const existing = selectedKlant.contactpersonen || []
        await updateKlant(selectedKlant.id, {
          contactpersonen: [
            ...existing,
            {
              id: crypto.randomUUID(),
              naam: contactpersoon.trim(),
              functie: '',
              email: email.trim(),
              telefoon: telefoon.trim(),
              is_primair: existing.length === 0,
            },
          ],
        })
        toast.success(`Contactpersoon toegevoegd aan ${selectedKlant.bedrijfsnaam}`)
        onOpenChange(false)
        navigate(`/klanten/${selectedKlant.id}`)
      } catch {
        toast.error('Kon contactpersoon niet toevoegen')
      } finally {
        setSaving(false)
      }
    } else {
      // Create new company
      if (!bedrijfsnaam.trim()) return
      setSaving(true)
      try {
        const klant = await createKlant({
          bedrijfsnaam: bedrijfsnaam.trim(),
          contactpersoon: contactpersoon.trim(),
          email: email.trim(),
          telefoon: telefoon.trim(),
          adres: adres.trim(),
          postcode: postcode.trim(),
          stad: stad.trim(),
          land: 'Nederland',
          website: website.trim(),
          kvk_nummer: kvkNummer.trim(),
          btw_nummer: btwNummer.trim(),
          status: 'actief',
          tags: [],
          notities: '',
          contactpersonen: contactpersoon.trim() ? [{
            id: crypto.randomUUID(),
            naam: contactpersoon.trim(),
            functie: '',
            email: email.trim(),
            telefoon: telefoon.trim(),
            is_primair: true,
          }] : [],
        })
        toast.success('Klant toegevoegd')
        onOpenChange(false)
        navigate(`/klanten/${klant.id}`)
      } catch {
        toast.error('Kon klant niet toevoegen')
      } finally {
        setSaving(false)
      }
    }
  }

  const isExistingMode = !!selectedKlant
  const canSubmit = isExistingMode ? contactpersoon.trim() : bedrijfsnaam.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-4 gap-2">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">
            {isExistingMode ? 'Contactpersoon toevoegen' : 'Nieuwe klant'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Row 1: Bedrijfsnaam + Contactpersoon */}
          <div className="flex gap-3">
            <div className="flex-[3] min-w-0 relative">
              <label className="text-[10px] text-muted-foreground mb-1 block">Bedrijfsnaam</label>
              {isExistingMode ? (
                <div className="flex items-center h-9 px-3 py-1.5 text-sm border border-petrol/30 rounded-lg bg-petrol/5">
                  <Building2 className="h-3.5 w-3.5 text-petrol mr-2 shrink-0" />
                  <span className="truncate text-sm">{selectedKlant.bedrijfsnaam}</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="ml-auto text-muted-foreground hover:text-foreground text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    value={bedrijfsnaam}
                    onChange={e => {
                      setBedrijfsnaam(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Bedrijfsnaam"
                    autoFocus
                    className={inputClass}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto"
                    >
                      {filtered.slice(0, 6).map(k => (
                        <button
                          key={k.id}
                          type="button"
                          onMouseDown={() => selectExisting(k)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{k.bedrijfsnaam}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">bestaand</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">
                Contactpersoon{isExistingMode && ' *'}
              </label>
              <input
                type="text"
                value={contactpersoon}
                onChange={e => setContactpersoon(e.target.value)}
                placeholder="Naam contactpersoon"
                autoFocus={isExistingMode}
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: Email + Telefoon + Button */}
          <div className="flex gap-3 items-end">
            <div className="flex-[3] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@bedrijf.nl"
                className={inputClass}
              />
            </div>
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Telefoon</label>
              <input
                type="tel"
                value={telefoon}
                onChange={e => setTelefoon(e.target.value)}
                placeholder="06-12345678"
                className={`${inputClass} font-mono`}
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: '#1A535C' }}
            >
              {saving ? 'Bezig...' : isExistingMode ? 'Toevoegen' : 'Toevoegen'}
            </button>
          </div>

          {/* Expandable extra info (only for new companies) */}
          {!isExistingMode && (
            <>
              <button
                type="button"
                onClick={() => setShowExtra(!showExtra)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-0.5"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showExtra ? 'rotate-180' : ''}`} />
                Meer info (adres, KVK, BTW)
              </button>

              {showExtra && (
                <div className="space-y-2 pt-1">
                  {/* Adres row */}
                  <div className="flex gap-3">
                    <div className="flex-[4] min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Adres</label>
                      <input
                        type="text"
                        value={adres}
                        onChange={e => setAdres(e.target.value)}
                        placeholder="Straat en huisnummer"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex-[1.5] min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Postcode</label>
                      <input
                        type="text"
                        value={postcode}
                        onChange={e => setPostcode(e.target.value)}
                        placeholder="1234 AB"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div className="flex-[2] min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Stad</label>
                      <input
                        type="text"
                        value={stad}
                        onChange={e => setStad(e.target.value)}
                        placeholder="Stad"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {/* KVK / BTW / Website row */}
                  <div className="flex gap-3">
                    <div className="flex-[2] min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">KVK-nummer</label>
                      <input
                        type="text"
                        value={kvkNummer}
                        onChange={e => setKvkNummer(e.target.value)}
                        placeholder="12345678"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div className="flex-[2] min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">BTW-nummer</label>
                      <input
                        type="text"
                        value={btwNummer}
                        onChange={e => setBtwNummer(e.target.value)}
                        placeholder="NL123456789B01"
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                    <div className="flex-[3] min-w-0">
                      <label className="text-[10px] text-muted-foreground mb-1 block">Website</label>
                      <input
                        type="text"
                        value={website}
                        onChange={e => setWebsite(e.target.value)}
                        placeholder="www.bedrijf.nl"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
