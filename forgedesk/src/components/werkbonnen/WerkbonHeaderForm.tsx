import React from 'react'
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

const inputStyle = { backgroundColor: '#F8F7F5', border: '1px solid #EBEBEB' }
const labelClass = "text-[11px] font-semibold uppercase tracking-wider mb-1 block"
const labelColor = { color: '#9B9B95' }

export const WerkbonHeaderForm = React.memo(function WerkbonHeaderForm({
  klantId, projectId, offerteId, titel, datum,
  locatieAdres, locatieStad, locatiePostcode,
  contactNaam, contactTelefoon,
  klanten, projecten, offertes,
  onKlantChange, onFieldChange,
}: WerkbonHeaderFormProps) {
  const filteredOffertes = offertes.filter((o) => !klantId || o.klant_id === klantId)
  const filteredProjecten = projecten.filter((p) => !klantId || p.klant_id === klantId)

  return (
    <div className="space-y-5">
      {/* Section 1: Klant & details */}
      <div className="rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
        <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #C44830, #C4483060)' }} />
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
                    <SelectItem key={o.id} value={o.id}>{o.nummer} — {o.titel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Locatie + Contact — merged */}
      <div className="rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #EBEBEB' }}>
        <div className="h-[3px] rounded-t-xl" style={{ background: 'linear-gradient(90deg, #3A6B8C, #3A6B8C60)' }} />
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
          <div className="pt-2 border-t" style={{ borderColor: '#EBEBEB' }}>
            <span className={labelClass} style={labelColor}>Contact op locatie</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              defaultValue={contactNaam}
              onBlur={(e) => onFieldChange('contactNaam', e.target.value)}
              placeholder="Naam"
              className="h-9 text-[13px] rounded-lg"
              style={inputStyle}
            />
            <div className="flex gap-1.5">
              <Input
                defaultValue={contactTelefoon}
                onBlur={(e) => onFieldChange('contactTelefoon', e.target.value)}
                placeholder="06-12345678"
                type="tel"
                className="h-9 text-[13px] font-mono rounded-lg"
                style={inputStyle}
              />
              {contactTelefoon && (
                <a href={`tel:${contactTelefoon}`} className="inline-flex items-center justify-center shrink-0 rounded-lg h-9 w-9 hover:bg-[#F4F2EE] transition-colors" style={{ border: '1px solid #EBEBEB' }}>
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
