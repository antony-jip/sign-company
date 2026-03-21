import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createKlant } from '@/services/supabaseService'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NieuweKlantModal({ open, onOpenChange }: Props) {
  const [bedrijfsnaam, setBedrijfsnaam] = useState('')
  const [contactpersoon, setContactpersoon] = useState('')
  const [email, setEmail] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bedrijfsnaam.trim()) return

    setSaving(true)
    try {
      await createKlant({
        bedrijfsnaam: bedrijfsnaam.trim(),
        contactpersoon: contactpersoon.trim(),
        email: email.trim(),
        telefoon: telefoon.trim(),
        adres: '',
        postcode: '',
        stad: '',
        land: 'Nederland',
        website: '',
        kvk_nummer: '',
        btw_nummer: '',
        status: 'actief',
        tags: [],
        notities: '',
        contactpersonen: [],
      })
      toast.success('Klant toegevoegd')
      onOpenChange(false)
      setBedrijfsnaam('')
      setContactpersoon('')
      setEmail('')
      setTelefoon('')
    } catch (err) {
      toast.error('Kon klant niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nieuwe klant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bedrijfsnaam *</label>
            <input
              type="text"
              value={bedrijfsnaam}
              onChange={e => setBedrijfsnaam(e.target.value)}
              placeholder="Bedrijfsnaam"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Contactpersoon</label>
            <input
              type="text"
              value={contactpersoon}
              onChange={e => setContactpersoon(e.target.value)}
              placeholder="Naam contactpersoon"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@bedrijf.nl"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefoon</label>
              <input
                type="tel"
                value={telefoon}
                onChange={e => setTelefoon(e.target.value)}
                placeholder="06-12345678"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={!bedrijfsnaam.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1A535C' }}
            >
              {saving ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
