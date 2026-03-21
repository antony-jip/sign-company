import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createKlant } from '@/services/supabaseService'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'

export function NieuweKlantModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
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
      const klant = await createKlant({
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
      navigate(`/klanten/${klant.id}`)
    } catch {
      toast.error('Kon klant niet toevoegen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-4 gap-2">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Nieuwe klant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-[3] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Bedrijfsnaam</label>
              <input
                type="text"
                value={bedrijfsnaam}
                onChange={e => setBedrijfsnaam(e.target.value)}
                placeholder="Bedrijfsnaam"
                autoFocus
                className={inputClass}
              />
            </div>
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Contactpersoon</label>
              <input
                type="text"
                value={contactpersoon}
                onChange={e => setContactpersoon(e.target.value)}
                placeholder="Naam contactpersoon"
                className={inputClass}
              />
            </div>
          </div>
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
              disabled={!bedrijfsnaam.trim() || saving}
              className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: '#1A535C' }}
            >
              {saving ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
