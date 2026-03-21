import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createOfferte, getKlanten } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NieuweOfferteModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantId, setKlantId] = useState('')
  const [titel, setTitel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      getKlanten().then(setKlanten).catch(() => {})
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!klantId || !titel.trim()) return

    const klant = klanten.find(k => k.id === klantId)
    setSaving(true)
    try {
      const offerte = await createOfferte({
        klant_id: klantId,
        klant_naam: klant?.bedrijfsnaam || '',
        titel: titel.trim(),
        nummer: '',
        status: 'concept',
        subtotaal: 0,
        btw_bedrag: 0,
        totaal: 0,
        geldig_tot: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: '',
        voorwaarden: '',
      })
      toast.success('Offerte aangemaakt')
      onOpenChange(false)
      setKlantId('')
      setTitel('')
      navigate(`/offertes/${offerte.id}`)
    } catch (err) {
      toast.error('Kon offerte niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nieuwe offerte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Klant *</label>
            <select
              value={klantId}
              onChange={e => setKlantId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            >
              <option value="">Selecteer klant...</option>
              {klanten.map(k => (
                <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Titel / onderwerp *</label>
            <input
              type="text"
              value={titel}
              onChange={e => setTitel(e.target.value)}
              placeholder="Bijv. Gevelreclame kantoorpand"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol"
            />
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
              disabled={!klantId || !titel.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#F15025' }}
            >
              {saving ? 'Aanmaken...' : 'Aanmaken'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
