import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createKlant, updateKlant } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'
import type { Klant, KvkResultaat } from '@/types'
import { KvkZoekVeld } from '@/components/shared/KvkZoekVeld'
import supabase from '@/services/supabaseClient'

interface AddEditClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  klant?: Klant | null
  onSaved?: (klant: Klant) => void
}

const KLANT_LABEL_OPTIES = [
  { waarde: 'vooruit_betalen', label: 'Vooruit betalen', kleur: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  { waarde: 'niet_helpen', label: 'Niet helpen', kleur: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { waarde: 'voorrang', label: 'Voorrang klant', kleur: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { waarde: 'grote_klant', label: 'Grote klant', kleur: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { waarde: 'wanbetaler', label: 'Wanbetaler', kleur: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
] as const

interface FormData {
  bedrijfsnaam: string
  contactpersoon: string
  email: string
  telefoon: string
  adres: string
  postcode: string
  stad: string
  website: string
  kvk_nummer: string
  btw_nummer: string
  status: 'actief' | 'inactief' | 'prospect'
  tags: string
  notities: string
  klant_labels: string[]
  gepinde_notitie: string
}

const initialFormData: FormData = {
  bedrijfsnaam: '',
  contactpersoon: '',
  email: '',
  telefoon: '',
  adres: '',
  postcode: '',
  stad: '',
  website: '',
  kvk_nummer: '',
  btw_nummer: '',
  status: 'prospect',
  tags: '',
  notities: '',
  klant_labels: [],
  gepinde_notitie: '',
}

export function AddEditClient({ open, onOpenChange, klant, onSaved }: AddEditClientProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)

  // KVK inline autocomplete
  const [kvkSuggesties, setKvkSuggesties] = useState<Array<{
    kvkNummer: string; naam: string; adres: { straat: string; plaats: string }; postcode: string; type: string; vestigingsnummer?: string
  }>>([])
  const [kvkZoeken, setKvkZoeken] = useState(false)
  const [kvkDropdownOpen, setKvkDropdownOpen] = useState(false)
  const [kvkLoadingProfiel, setKvkLoadingProfiel] = useState(false)
  const kvkDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bedrijfsnaamRef = useRef<HTMLDivElement>(null)

  const zoekKvk = useCallback(async (naam: string) => {
    if (naam.length < 3) { setKvkSuggesties([]); setKvkDropdownOpen(false); return }
    setKvkZoeken(true)
    try {
      if (!supabase) throw new Error('no supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('no session')
      const res = await fetch(`/api/kvk-zoeken?q=${encodeURIComponent(naam)}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('KVK API error')
      const data = await res.json() as { resultaten: typeof kvkSuggesties }
      setKvkSuggesties(data.resultaten || [])
      setKvkDropdownOpen((data.resultaten || []).length > 0)
    } catch {
      setKvkSuggesties([])
      setKvkDropdownOpen(false)
    } finally {
      setKvkZoeken(false)
    }
  }, [])

  const selectKvkSuggestie = useCallback(async (result: typeof kvkSuggesties[0]) => {
    setKvkDropdownOpen(false)
    setKvkSuggesties([])
    setKvkLoadingProfiel(true)
    try {
      if (!supabase) throw new Error('no supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('no session')
      const res = await fetch(`/api/kvk-basisprofiel?kvknummer=${result.kvkNummer}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const profiel = await res.json() as { kvkNummer: string; naam: string; adres: { straat: string; huisnummer: string; postcode: string; stad: string } }
        const adresStr = [profiel.adres.straat, profiel.adres.huisnummer].filter(Boolean).join(' ')
        setFormData((prev: FormData) => ({
          ...prev,
          bedrijfsnaam: profiel.naam || prev.bedrijfsnaam,
          kvk_nummer: profiel.kvkNummer,
          adres: adresStr || prev.adres,
          postcode: profiel.adres.postcode || prev.postcode,
          stad: profiel.adres.stad || prev.stad,
        }))
        toast.success(`Gegevens ingevuld van ${profiel.naam}`, { duration: 2000 })
      } else {
        // Fallback: gebruik zoekresultaat
        setFormData((prev: FormData) => ({
          ...prev,
          bedrijfsnaam: result.naam || prev.bedrijfsnaam,
          kvk_nummer: result.kvkNummer,
          adres: result.adres.straat || prev.adres,
          stad: result.adres.plaats || prev.stad,
          postcode: result.postcode || prev.postcode,
        }))
        toast.success(`Gegevens ingevuld van ${result.naam}`, { duration: 2000 })
      }
    } catch {
      setFormData((prev: FormData) => ({
        ...prev,
        bedrijfsnaam: result.naam || prev.bedrijfsnaam,
        kvk_nummer: result.kvkNummer,
        adres: result.adres.straat || prev.adres,
        stad: result.adres.plaats || prev.stad,
        postcode: result.postcode || prev.postcode,
      }))
      toast.success(`Gegevens ingevuld van ${result.naam}`, { duration: 2000 })
    } finally {
      setKvkLoadingProfiel(false)
    }
  }, [])

  // Sluit dropdown bij klikken buiten
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bedrijfsnaamRef.current && !bedrijfsnaamRef.current.contains(e.target as Node)) {
        setKvkDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isEditing = !!klant

  useEffect(() => {
    if (klant) {
      setFormData({
        bedrijfsnaam: klant.bedrijfsnaam,
        contactpersoon: klant.contactpersoon,
        email: klant.email,
        telefoon: klant.telefoon,
        adres: klant.adres,
        postcode: klant.postcode,
        stad: klant.stad,
        website: klant.website,
        kvk_nummer: klant.kvk_nummer,
        btw_nummer: klant.btw_nummer,
        status: klant.status,
        tags: klant.tags.join(', '),
        notities: klant.notities,
        klant_labels: klant.klant_labels || [],
        gepinde_notitie: klant.gepinde_notitie || '',
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
  }, [klant, open])

  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.bedrijfsnaam.trim()) {
      newErrors.bedrijfsnaam = 'Bedrijfsnaam is verplicht'
    }
    if (!formData.contactpersoon.trim()) {
      newErrors.contactpersoon = 'Contactpersoon is verplicht'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is verplicht'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Ongeldig emailadres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSave() {
    if (!validate()) return

    if (!user?.id) {
      toast.error('Je moet ingelogd zijn om deze actie uit te voeren')
      return
    }

    setSaving(true)
    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const klantData = {
        user_id: user.id,
        bedrijfsnaam: formData.bedrijfsnaam.trim(),
        contactpersoon: formData.contactpersoon.trim(),
        email: formData.email.trim(),
        telefoon: formData.telefoon.trim(),
        adres: formData.adres.trim(),
        postcode: formData.postcode.trim(),
        stad: formData.stad.trim(),
        land: 'Nederland',
        website: formData.website.trim(),
        kvk_nummer: formData.kvk_nummer.trim(),
        btw_nummer: formData.btw_nummer.trim(),
        status: formData.status,
        tags: tagsArray,
        notities: formData.notities.trim(),
        contactpersonen: klant?.contactpersonen || [],
        klant_labels: formData.klant_labels,
        gepinde_notitie: formData.gepinde_notitie.trim(),
      }

      let savedKlant: Klant
      if (isEditing && klant) {
        savedKlant = await updateKlant(klant.id, klantData)
        toast.success('Klant bijgewerkt', {
          description: `${savedKlant.bedrijfsnaam} is succesvol bijgewerkt.`,
        })
      } else {
        savedKlant = await createKlant(klantData)
        toast.success('Klant aangemaakt', {
          description: `${savedKlant.bedrijfsnaam} is succesvol aangemaakt.`,
        })
      }

      onSaved?.(savedKlant)
      onOpenChange(false)
    } catch (error) {
      toast.error('Fout bij opslaan', {
        description: 'Er is een fout opgetreden. Probeer het opnieuw.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Klant Bewerken' : 'Nieuwe Klant'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Pas de gegevens van de klant aan.'
              : 'Vul de gegevens in om een nieuwe klant toe te voegen.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Row 1: Bedrijfsnaam + Contactpersoon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2" ref={bedrijfsnaamRef}>
              <Label htmlFor="bedrijfsnaam">
                Bedrijfsnaam <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="bedrijfsnaam"
                  value={formData.bedrijfsnaam}
                  onChange={(e) => {
                    const val = e.target.value
                    handleChange('bedrijfsnaam', val)
                    // Debounced KVK zoeken bij typen (alleen bij nieuw aanmaken)
                    if (!isEditing) {
                      if (kvkDebounce.current) clearTimeout(kvkDebounce.current)
                      if (val.length >= 3) {
                        kvkDebounce.current = setTimeout(() => zoekKvk(val), 500)
                      } else {
                        setKvkSuggesties([])
                        setKvkDropdownOpen(false)
                      }
                    }
                  }}
                  onFocus={() => {
                    if (kvkSuggesties.length > 0) setKvkDropdownOpen(true)
                  }}
                  placeholder="Naam van het bedrijf"
                  className={errors.bedrijfsnaam ? 'border-red-500' : ''}
                  autoComplete="off"
                />
                {/* Subtiele KVK indicator */}
                {kvkZoeken && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/50" />
                  </div>
                )}
                {kvkLoadingProfiel && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="text-[10px] text-muted-foreground">Ophalen...</span>
                  </div>
                )}
                {/* KVK suggesties dropdown */}
                {kvkDropdownOpen && kvkSuggesties.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 bg-muted/40 border-b border-border/50 flex items-center gap-1.5">
                      <Building2 className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">KvK Resultaten</span>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {kvkSuggesties.slice(0, 5).map((r) => (
                        <button
                          key={`${r.kvkNummer}-${r.vestigingsnummer || ''}`}
                          type="button"
                          onClick={() => selectKvkSuggestie(r)}
                          className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors border-b border-border/20 last:border-0"
                        >
                          <p className="text-[13px] font-medium text-foreground truncate">{r.naam}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {[r.adres.straat, r.postcode, r.adres.plaats].filter(Boolean).join(', ')}
                            {r.kvkNummer && <span className="ml-2 text-muted-foreground/50">KvK {r.kvkNummer}</span>}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {errors.bedrijfsnaam && (
                <p className="text-xs text-red-500">{errors.bedrijfsnaam}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactpersoon">
                Contactpersoon <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactpersoon"
                value={formData.contactpersoon}
                onChange={(e) => handleChange('contactpersoon', e.target.value)}
                placeholder="Naam contactpersoon"
                className={errors.contactpersoon ? 'border-red-500' : ''}
              />
              {errors.contactpersoon && (
                <p className="text-xs text-red-500">{errors.contactpersoon}</p>
              )}
            </div>
          </div>

          {/* Row 2: Email + Telefoon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@bedrijf.nl"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefoon">Telefoon</Label>
              <Input
                id="telefoon"
                type="tel"
                value={formData.telefoon}
                onChange={(e) => handleChange('telefoon', e.target.value)}
                placeholder="+31 6 12345678"
              />
            </div>
          </div>

          {/* Row 3: Adres + Postcode + Stad */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="adres">Adres</Label>
              <Input
                id="adres"
                value={formData.adres}
                onChange={(e) => handleChange('adres', e.target.value)}
                placeholder="Straat en huisnummer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => handleChange('postcode', e.target.value)}
                placeholder="1234 AB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stad">Stad</Label>
              <Input
                id="stad"
                value={formData.stad}
                onChange={(e) => handleChange('stad', e.target.value)}
                placeholder="Stad"
              />
            </div>
          </div>

          {/* Row 4: Website + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://www.bedrijf.nl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  handleChange('status', value as FormData['status'])
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecteer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="inactief">Inactief</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: KvK + BTW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KvkZoekVeld
              kvkNummer={formData.kvk_nummer}
              onKvkChange={(v) => handleChange('kvk_nummer', v)}
              onResultSelect={(r: KvkResultaat) => {
                setFormData((prev) => ({
                  ...prev,
                  bedrijfsnaam: r.bedrijfsnaam || prev.bedrijfsnaam,
                  adres: r.adres || prev.adres,
                  postcode: r.postcode || prev.postcode,
                  stad: r.stad || prev.stad,
                  btw_nummer: r.btw_nummer || prev.btw_nummer,
                  kvk_nummer: r.kvk_nummer,
                }))
              }}
            />
            <div className="space-y-2">
              <Label htmlFor="btw_nummer">BTW Nummer</Label>
              <Input
                id="btw_nummer"
                value={formData.btw_nummer}
                onChange={(e) => handleChange('btw_nummer', e.target.value)}
                placeholder="NL123456789B01"
              />
            </div>
          </div>

          {/* Row 6: Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="tech, premium, retail (komma-gescheiden)"
            />
            <p className="text-xs text-muted-foreground">
              Voer tags in, gescheiden door komma&apos;s
            </p>
          </div>

          {/* Row 7: Klant Labels */}
          <div className="space-y-2">
            <Label>Klant Labels</Label>
            <div className="flex flex-wrap gap-2">
              {KLANT_LABEL_OPTIES.map((opt) => {
                const isSelected = formData.klant_labels.includes(opt.waarde)
                return (
                  <button
                    key={opt.waarde}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        klant_labels: isSelected
                          ? prev.klant_labels.filter((l) => l !== opt.waarde)
                          : [...prev.klant_labels, opt.waarde],
                      }))
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? opt.kleur + ' border-current shadow-sm'
                        : 'bg-background dark:bg-foreground/80 text-muted-foreground dark:text-muted-foreground/60 border-border dark:border-border hover:border-border'
                    }`}
                  >
                    {isSelected && <span className="mr-1">&#10003;</span>}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Row 8: Gepinde Notitie */}
          <div className="space-y-2">
            <Label htmlFor="gepinde_notitie">Gepinde Notitie</Label>
            <Textarea
              id="gepinde_notitie"
              value={formData.gepinde_notitie}
              onChange={(e) => handleChange('gepinde_notitie', e.target.value)}
              placeholder="Belangrijke opmerking die altijd zichtbaar is..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Wordt als gele banner getoond op het klantprofiel
            </p>
          </div>

          {/* Row 9: Notities */}
          <div className="space-y-2">
            <Label htmlFor="notities">Notities</Label>
            <Textarea
              id="notities"
              value={formData.notities}
              onChange={(e) => handleChange('notities', e.target.value)}
              placeholder="Interne notities over deze klant..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Opslaan...' : isEditing ? 'Bijwerken' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
