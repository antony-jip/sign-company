import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createOfferte, getKlanten } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'

export function NieuweOfferteModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantId, setKlantId] = useState('')
  const [titel, setTitel] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [deadline, setDeadline] = useState('')
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
    const bedragNum = bedrag ? parseFloat(bedrag.replace(',', '.')) || 0 : 0
    setSaving(true)
    try {
      const offerte = await createOfferte({
        klant_id: klantId,
        klant_naam: klant?.bedrijfsnaam || '',
        titel: titel.trim(),
        nummer: '',
        status: 'concept',
        subtotaal: bedragNum,
        btw_bedrag: 0,
        totaal: bedragNum,
        geldig_tot: deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: '',
        voorwaarden: '',
      })
      toast.success('Offerte aangemaakt')
      onOpenChange(false)
      setKlantId('')
      setTitel('')
      setBedrag('')
      setDeadline('')
      navigate(`/offertes/${offerte.id}`)
    } catch {
      toast.error('Kon offerte niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-4 gap-2">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Nieuwe offerte</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Klant</label>
              <select
                value={klantId}
                onChange={e => setKlantId(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecteer klant...</option>
                {klanten.map(k => (
                  <option key={k.id} value={k.id}>{k.bedrijfsnaam}</option>
                ))}
              </select>
            </div>
            <div className="flex-[3] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Titel</label>
              <input
                type="text"
                value={titel}
                onChange={e => setTitel(e.target.value)}
                placeholder="Bijv. Gevelreclame kantoorpand"
                autoFocus
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-[2] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Bedrag</label>
              <input
                type="text"
                inputMode="decimal"
                value={bedrag}
                onChange={e => setBedrag(e.target.value)}
                placeholder="0,00"
                className={`${inputClass} font-mono`}
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
            <button
              type="submit"
              disabled={!klantId || !titel.trim() || saving}
              className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              style={{ backgroundColor: '#F15025' }}
            >
              {saving ? 'Aanmaken...' : 'Offerte maken'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
