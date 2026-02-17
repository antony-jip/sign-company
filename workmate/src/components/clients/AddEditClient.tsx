import React, { useState, useEffect } from 'react'
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
import { toast } from 'sonner'
import type { Klant } from '@/types'

interface AddEditClientProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  klant?: Klant | null
  onSaved?: (klant: Klant) => void
}

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
}

export function AddEditClient({ open, onOpenChange, klant, onSaved }: AddEditClientProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)

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

    setSaving(true)
    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const klantData = {
        user_id: 'u1',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Label htmlFor="bedrijfsnaam">
                Bedrijfsnaam <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bedrijfsnaam"
                value={formData.bedrijfsnaam}
                onChange={(e) => handleChange('bedrijfsnaam', e.target.value)}
                placeholder="Naam van het bedrijf"
                className={errors.bedrijfsnaam ? 'border-red-500' : ''}
              />
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
            <div className="space-y-2">
              <Label htmlFor="kvk_nummer">KvK Nummer</Label>
              <Input
                id="kvk_nummer"
                value={formData.kvk_nummer}
                onChange={(e) => handleChange('kvk_nummer', e.target.value)}
                placeholder="12345678"
              />
            </div>
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

          {/* Row 7: Notities */}
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
