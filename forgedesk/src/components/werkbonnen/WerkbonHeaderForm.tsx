import React, { useCallback } from 'react'
import { MapPin, User, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-6">
      {/* Klant & Koppeling */}
      <Card>
        <CardHeader><CardTitle className="text-base">Klant & Koppeling</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Klant *</Label>
            <Select value={klantId} onValueChange={onKlantChange}>
              <SelectTrigger><SelectValue placeholder="Selecteer klant" /></SelectTrigger>
              <SelectContent>
                {klanten.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.bedrijfsnaam || k.contactpersoon}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Offerte (optioneel)</Label>
            <Select value={offerteId} onValueChange={(v) => onFieldChange('offerteId', v)}>
              <SelectTrigger><SelectValue placeholder="Geen offerte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen</SelectItem>
                {filteredOffertes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nummer} - {o.titel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Project (optioneel)</Label>
            <Select value={projectId} onValueChange={(v) => onFieldChange('projectId', v)}>
              <SelectTrigger><SelectValue placeholder="Geen project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen</SelectItem>
                {filteredProjecten.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.naam}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Titel</Label>
            <Input
              defaultValue={titel}
              onBlur={(e) => onFieldChange('titel', e.target.value)}
              placeholder="Bijv. Montage gevelreclame"
            />
          </div>
          <div>
            <Label>Datum</Label>
            <Input
              type="date"
              defaultValue={datum}
              onBlur={(e) => onFieldChange('datum', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Locatie */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Locatie</CardTitle>
            {(locatieAdres || locatieStad) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([locatieAdres, locatiePostcode, locatieStad].filter(Boolean).join(' '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <MapPin className="h-3 w-3" /> Navigeer
              </a>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Adres</Label>
            <Input
              defaultValue={locatieAdres}
              onBlur={(e) => onFieldChange('locatieAdres', e.target.value)}
              placeholder="Straat + huisnummer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Postcode</Label>
              <Input
                defaultValue={locatiePostcode}
                onBlur={(e) => onFieldChange('locatiePostcode', e.target.value)}
                placeholder="1234 AB"
              />
            </div>
            <div>
              <Label>Stad</Label>
              <Input
                defaultValue={locatieStad}
                onBlur={(e) => onFieldChange('locatieStad', e.target.value)}
                placeholder="Amsterdam"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contactpersoon op locatie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Contactpersoon op locatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Naam</Label>
            <Input
              defaultValue={contactNaam}
              onBlur={(e) => onFieldChange('contactNaam', e.target.value)}
              placeholder="Naam contactpersoon"
            />
          </div>
          <div>
            <Label>Telefoonnummer</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={contactTelefoon}
                onBlur={(e) => onFieldChange('contactTelefoon', e.target.value)}
                placeholder="06-12345678"
                type="tel"
              />
              {contactTelefoon && (
                <a href={`tel:${contactTelefoon}`} className="inline-flex items-center justify-center shrink-0 rounded-md border h-9 w-9 hover:bg-accent">
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
