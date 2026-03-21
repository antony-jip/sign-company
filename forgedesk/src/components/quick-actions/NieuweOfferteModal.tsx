import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createOfferte, getKlanten } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const inputClass = 'w-full h-9 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-petrol/20 focus:border-petrol'

export function NieuweOfferteModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [klanten, setKlanten] = useState<Klant[]>([])
  const [klantQuery, setKlantQuery] = useState('')
  const [selectedKlant, setSelectedKlant] = useState<Klant | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [titel, setTitel] = useState('')
  const [bedrag, setBedrag] = useState('')
  const [deadline, setDeadline] = useState('')
  const [saving, setSaving] = useState(false)
  const klantInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      getKlanten().then(setKlanten).catch(() => {})
    } else {
      setKlantQuery('')
      setSelectedKlant(null)
      setTitel('')
      setBedrag('')
      setDeadline('')
    }
  }, [open])

  const filtered = klantQuery.trim().length > 0
    ? klanten.filter(k => k.bedrijfsnaam.toLowerCase().includes(klantQuery.toLowerCase()))
    : []

  function selectKlant(klant: Klant) {
    setSelectedKlant(klant)
    setKlantQuery(klant.bedrijfsnaam)
    setShowSuggestions(false)
  }

  function clearKlant() {
    setSelectedKlant(null)
    setKlantQuery('')
    klantInputRef.current?.focus()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedKlant || !titel.trim()) return

    const bedragNum = bedrag ? parseFloat(bedrag.replace(',', '.')) || 0 : 0
    setSaving(true)
    try {
      const offerte = await createOfferte({
        klant_id: selectedKlant.id,
        klant_naam: selectedKlant.bedrijfsnaam,
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
            <div className="flex-[2] min-w-0 relative">
              <label className="text-[10px] text-muted-foreground mb-1 block">Klant</label>
              {selectedKlant ? (
                <div className="flex items-center h-9 px-3 py-1.5 text-sm border border-petrol/30 rounded-lg bg-petrol/5">
                  <Building2 className="h-3.5 w-3.5 text-petrol mr-2 shrink-0" />
                  <span className="truncate text-sm">{selectedKlant.bedrijfsnaam}</span>
                  <button
                    type="button"
                    onClick={clearKlant}
                    className="ml-auto text-muted-foreground hover:text-foreground text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <input
                    ref={klantInputRef}
                    type="text"
                    value={klantQuery}
                    onChange={e => {
                      setKlantQuery(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder="Zoek klant..."
                    autoFocus
                    className={inputClass}
                  />
                  {showSuggestions && filtered.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filtered.slice(0, 6).map(k => (
                        <button
                          key={k.id}
                          type="button"
                          onMouseDown={() => selectKlant(k)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                        >
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{k.bedrijfsnaam}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex-[3] min-w-0">
              <label className="text-[10px] text-muted-foreground mb-1 block">Titel</label>
              <input
                type="text"
                value={titel}
                onChange={e => setTitel(e.target.value)}
                placeholder="Bijv. Gevelreclame kantoorpand"
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
              disabled={!selectedKlant || !titel.trim() || saving}
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
