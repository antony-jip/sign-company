import React, { useState } from 'react'
import { MapPin, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { Klant, Project, Offerte } from '@/types'

interface WerkbonHeaderFormProps {
  klantId: string
  projectId: string
  offerteId: string
  titel: string
  datum: string
  locatieAdres: string
  locatieStad: string
  locatiePostcode: string
  contactNaam: string
  contactTelefoon: string
  klanten: Klant[]
  projecten: Project[]
  offertes: Offerte[]
  onKlantChange: (klantId: string) => void
  onFieldChange: (field: string, value: string) => void
}

const inputStyle = { backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }
const labelClass = "text-[12px] font-medium mb-1.5 block"
const labelColor = { color: '#6B6B66' }

export const WerkbonHeaderForm = React.memo(function WerkbonHeaderForm({
  klantId, projectId, offerteId, titel, datum,
  locatieAdres, locatieStad, locatiePostcode,
  contactNaam, contactTelefoon,
  klanten, projecten, offertes,
  onKlantChange, onFieldChange,
}: WerkbonHeaderFormProps) {
  const filteredOffertes = offertes.filter((o) => !klantId || o.klant_id === klantId)
  const filteredProjecten = projecten.filter((p) => !klantId || p.klant_id === klantId)

  // Contactpersoon-picker bumpt deze counter zodat de naam/tel inputs remounten
  // met verse defaultValue. Tijdens typen blijft de counter gelijk, dus geen
  // focus-verlies per keystroke.
  const [pickerVersion, setPickerVersion] = useState(0)
  const selectedKlant = klanten.find((k) => k.id === klantId)
  const contactpersonen = selectedKlant?.contactpersonen || []
  const handleContactpersoonPick = (cpId: string) => {
    const cp = contactpersonen.find((c) => c.id === cpId)
    if (!cp) return
    onFieldChange('contactNaam', cp.naam || '')
    onFieldChange('contactTelefoon', cp.telefoon || '')
    setPickerVersion((v) => v + 1)
  }

  return (
    <div className="space-y-5">
      {/* Section 1: Klant & details */}
      <div className="rounded-xl" style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <div className="px-4 py-4 space-y-3">
          <div>
            <Label className={labelClass} style={labelColor}>Klant *</Label>
            <Select value={klantId} onValueChange={onKlantChange}>
              <SelectTrigger className="h-9 text-[13px] rounded-lg" style={inputStyle}><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
              <SelectContent>
                {klanten.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.bedrijfsnaam || k.contactpersoon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={labelClass} style={labelColor}>Titel</Label>
            <Input
              defaultValue={titel}
              onBlur={(e) => onFieldChange('titel', e.target.value)}
              placeholder="Bijv. Montage gevelreclame"
              className="h-9 text-[13px] rounded-lg"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className={labelClass} style={labelColor}>Datum</Label>
              <Input
                type="date"
                defaultValue={datum}
                onBlur={(e) => onFieldChange('datum', e.target.value)}
                className="h-9 text-[13px] font-mono rounded-lg"
                style={inputStyle}
              />
            </div>
            <div>
              <Label className={labelClass} style={labelColor}>Project</Label>
              <Select value={projectId} onValueChange={(v) => onFieldChange('projectId', v)}>
                <SelectTrigger className="h-9 text-[13px] rounded-lg" style={inputStyle}><SelectValue placeholder="Geen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {filteredProjecten.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredOffertes.length > 0 && (
            <div>
              <Label className={labelClass} style={labelColor}>Offerte</Label>
              <Select value={offerteId} onValueChange={(v) => onFieldChange('offerteId', v)}>
                <SelectTrigger className="h-9 text-[13px] rounded-lg" style={inputStyle}><SelectValue placeholder="Geen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {filteredOffertes.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nummer} · {o.titel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Locatie + Contact — merged */}
      <div className="rounded-xl" style={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className={labelClass} style={{ ...labelColor, marginBottom: 0 }}>Locatie</span>
            {(locatieAdres || locatieStad) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([locatieAdres, locatiePostcode, locatieStad].filter(Boolean).join(' '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#1A535C] hover:underline flex items-center gap-0.5 font-medium"
              >
                <MapPin className="h-3 w-3" /> Route
              </a>
            )}
          </div>
          <Input
            defaultValue={locatieAdres}
            onBlur={(e) => onFieldChange('locatieAdres', e.target.value)}
            placeholder="Straat + huisnummer"
            className="h-9 text-[13px] rounded-lg"
            style={inputStyle}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              defaultValue={locatiePostcode}
              onBlur={(e) => onFieldChange('locatiePostcode', e.target.value)}
              placeholder="1234 AB"
              className="h-9 text-[13px] font-mono rounded-lg"
              style={inputStyle}
            />
            <Input
              defaultValue={locatieStad}
              onBlur={(e) => onFieldChange('locatieStad', e.target.value)}
              placeholder="Stad"
              className="h-9 text-[13px] rounded-lg"
              style={inputStyle}
            />
          </div>

          {/* Contact on-site */}
          <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
            <span className={labelClass} style={labelColor}>Contact op locatie</span>
          </div>
          {contactpersonen.length > 0 && (
            <Select value="" onValueChange={handleContactpersoonPick}>
              <SelectTrigger className="h-9 text-[13px] rounded-lg" style={inputStyle}>
                <SelectValue placeholder="Kies contactpersoon..." />
              </SelectTrigger>
              <SelectContent>
                {contactpersonen.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id}>
                    {cp.naam}{cp.telefoon ? ` · ${cp.telefoon}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              key={`naam-${pickerVersion}`}
              defaultValue={contactNaam}
              onBlur={(e) => onFieldChange('contactNaam', e.target.value)}
              placeholder="Naam"
              className="h-9 text-[13px] rounded-lg"
              style={inputStyle}
            />
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9B9B95] pointer-events-none" />
                <Input
                  key={`tel-${pickerVersion}`}
                  defaultValue={contactTelefoon}
                  onBlur={(e) => onFieldChange('contactTelefoon', e.target.value)}
                  placeholder="06-12345678"
                  type="tel"
                  className="h-9 pl-8 text-[13px] font-mono rounded-lg"
                  style={inputStyle}
                />
              </div>
              {contactTelefoon && (
                <a href={`tel:${contactTelefoon}`} className="inline-flex items-center justify-center shrink-0 rounded-lg h-9 w-9 hover:bg-muted transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>
                  <Phone className="h-3.5 w-3.5 text-[#1A535C]" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
