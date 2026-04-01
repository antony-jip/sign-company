import { useState, useCallback, useEffect } from 'react'
import { logger } from '../../utils/logger'
import { toast } from 'sonner'
import { Package, Loader2, FileText, ClipboardList, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import type { Offerte, OfferteItem, Klant } from '@/types'
import {
  createLeveringsbon, createLeveringsbonRegel, getOfferteItems,
} from '@/services/supabaseService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  klantId: string
  klant: Klant | null
  offertes: Offerte[]
}

export function PakbonVanProjectDialog({
  open, onOpenChange, projectId, klantId, klant, offertes,
}: Props) {
  const { user } = useAuth()
  const { navigateWithTab } = useNavigateWithTab()

  const [step, setStep] = useState<'keuze' | 'selectie'>('keuze')
  const [selectedOfferteId, setSelectedOfferteId] = useState('')
  const [offerteItems, setOfferteItems] = useState<OfferteItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  useEffect(() => {
    if (open) {
      setStep('keuze')
      setSelectedOfferteId('')
      setOfferteItems([])
      setSelectedIds(new Set())
    }
  }, [open])

  const handleOfferteSelect = useCallback(async (offerteId: string) => {
    setSelectedOfferteId(offerteId)
    if (!offerteId) return
    try {
      setIsLoadingItems(true)
      const items = await getOfferteItems(offerteId)
      setOfferteItems(items)
      setSelectedIds(new Set(items.map((i) => i.id)))
      setStep('selectie')
    } catch (err) {
      logger.error('Fout bij laden offerte items:', err)
      toast.error('Fout bij laden offerte items')
    } finally {
      setIsLoadingItems(false)
    }
  }, [])

  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const handleCreate = useCallback(async (mode: 'offerte' | 'los' | 'leeg') => {
    try {
      setIsCreating(true)

      const pakbon = await createLeveringsbon({
        klant_id: klantId,
        project_id: projectId,
        datum: new Date().toISOString().split('T')[0],
        status: 'concept',
        locatie_adres: klant?.adres || '',
        locatie_stad: klant?.stad || undefined,
        locatie_postcode: klant?.postcode || undefined,
        omschrijving: mode === 'leeg' ? 'Lege pakbon — ter plaatse invullen' : undefined,
      })

      if (mode === 'offerte' && selectedIds.size > 0) {
        const selected = offerteItems.filter((i) => selectedIds.has(i.id))
        for (let idx = 0; idx < selected.length; idx++) {
          const item = selected[idx]
          const afmeting = [item.breedte_mm, item.hoogte_mm].filter(Boolean).join(' × ')
          await createLeveringsbonRegel({
            leveringsbon_id: pakbon.id,
            omschrijving: item.beschrijving + (afmeting ? ` (${afmeting} mm)` : ''),
            aantal: item.aantal || 1,
            eenheid: 'stuk',
          })
        }
        toast.success(`Pakbon ${pakbon.leveringsbon_nummer} aangemaakt met ${selected.length} regels`)
      } else if (mode === 'leeg') {
        for (let i = 0; i < 8; i++) {
          await createLeveringsbonRegel({
            leveringsbon_id: pakbon.id,
            omschrijving: '',
            aantal: 0,
            eenheid: 'stuk',
          })
        }
        toast.success(`Lege pakbon ${pakbon.leveringsbon_nummer} aangemaakt`)
      } else {
        toast.success(`Pakbon ${pakbon.leveringsbon_nummer} aangemaakt`)
      }

      onOpenChange(false)
      navigateWithTab({
        path: `/leveringsbonnen/${pakbon.id}`,
        label: pakbon.leveringsbon_nummer || 'Pakbon',
        id: `/leveringsbonnen/${pakbon.id}`,
      })
    } catch (err) {
      logger.error('Fout bij aanmaken pakbon:', err)
      toast.error('Fout bij aanmaken pakbon')
    } finally {
      setIsCreating(false)
    }
  }, [user, selectedOfferteId, projectId, klantId, klant, selectedIds, offerteItems, onOpenChange, navigateWithTab])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pakbon maken
          </DialogTitle>
          <DialogDescription>
            Maak een pakbon / leveringsbon aan voor dit project
          </DialogDescription>
        </DialogHeader>

        {step === 'keuze' && (
          <div className="space-y-2 py-2">
            {offertes.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Neem items over uit een offerte zodat je precies weet wat er meegeleverd moet worden.
                </p>
                <Select value={selectedOfferteId} onValueChange={handleOfferteSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kies een offerte..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offertes.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <span className="flex items-center gap-2">
                          <FileText className="h-3 w-3" />
                          {o.nummer} — {o.titel}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingItems && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="border-t border-[#F0EFEC] my-1" />
              </div>
            )}

            <button
              onClick={() => handleCreate('los')}
              disabled={isCreating}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left hover:bg-[#F8F7F5] transition-colors border border-transparent hover:border-[#EBEBEB]"
            >
              <ClipboardList className="h-5 w-5 text-[#1A535C] mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-[#1A1A1A]">Losse pakbon</div>
                <div className="text-xs text-[#9B9B95] mt-0.5">Lege pakbon om zelf regels aan toe te voegen</div>
              </div>
            </button>

            <button
              onClick={() => handleCreate('leeg')}
              disabled={isCreating}
              className="w-full flex items-start gap-3 p-3 rounded-xl text-left hover:bg-[#F8F7F5] transition-colors border border-transparent hover:border-[#EBEBEB]"
            >
              <FileCheck className="h-5 w-5 text-[#6B6B66] mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-[#1A1A1A]">Lege pakbon (invulformulier)</div>
                <div className="text-xs text-[#9B9B95] mt-0.5">Pakbon met lege regels — handig om ter plaatse in te vullen</div>
              </div>
            </button>

            {isCreating && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#1A535C]" />
              </div>
            )}
          </div>
        )}

        {step === 'selectie' && (
          <>
            <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
              <div className="flex items-center gap-3 pb-2 border-b">
                <Checkbox
                  checked={selectedIds.size === offerteItems.length}
                  onCheckedChange={() => {
                    if (selectedIds.size === offerteItems.length) setSelectedIds(new Set())
                    else setSelectedIds(new Set(offerteItems.map((i) => i.id)))
                  }}
                />
                <span className="text-sm font-medium">Alles selecteren ({offerteItems.length} items)</span>
              </div>

              {offerteItems.map((item) => (
                <label key={item.id} className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2">
                  <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleItem(item.id)} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.beschrijving}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {item.aantal && <span>{item.aantal}×</span>}
                      {(item.breedte_mm || item.hoogte_mm) && (
                        <span>{item.breedte_mm || '?'} × {item.hoogte_mm || '?'} mm</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('keuze')}>Terug</Button>
              <Button onClick={() => handleCreate('offerte')} disabled={isCreating || selectedIds.size === 0}>
                {isCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
                Pakbon maken ({selectedIds.size})
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
