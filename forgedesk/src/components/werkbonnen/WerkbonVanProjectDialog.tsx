import { useState, useCallback, useEffect } from 'react'
import { logger } from '../../utils/logger'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import type { Offerte, OfferteItem, Klant, MontageAfspraak } from '@/types'
import {
  createWerkbon, createWerkbonItem, createWerkbonAfbeelding,
  getOfferteItems, updateMontageAfspraak,
} from '@/services/supabaseService'
import { downloadFile } from '@/services/storageService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  klantId: string
  klant: Klant | null
  offertes: Offerte[]
  montageAfspraak?: MontageAfspraak | null
}

export function WerkbonVanProjectDialog({
  open, onOpenChange, projectId, klantId, klant, offertes, montageAfspraak,
}: Props) {
  const { user } = useAuth()
  const { werkbonBriefpapier } = useAppSettings()
  const { navigateWithTab } = useNavigateWithTab()

  const [step, setStep] = useState<'keuze' | 'selectie'>('keuze')
  const [selectedOfferteId, setSelectedOfferteId] = useState('')
  const [offerteItems, setOfferteItems] = useState<OfferteItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  // Reset bij openen
  useEffect(() => {
    if (open) {
      setStep(offertes.length > 0 ? 'keuze' : 'keuze')
      setSelectedOfferteId('')
      setOfferteItems([])
      setSelectedIds(new Set())
    }
  }, [open, offertes.length])

  // Laad offerte items bij selectie
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

  const handleCreate = useCallback(async (metItems: boolean) => {
    try {
      setIsCreating(true)
      const userId = user?.id || ''

      const werkbon = await createWerkbon({
        user_id: userId,
        offerte_id: metItems && selectedOfferteId ? selectedOfferteId : undefined,
        project_id: projectId,
        klant_id: klantId,
        montage_afspraak_id: montageAfspraak?.id,
        titel: montageAfspraak?.titel || undefined,
        datum: montageAfspraak?.datum || new Date().toISOString().split('T')[0],
        status: 'concept',
        locatie_adres: montageAfspraak?.locatie || klant?.adres || undefined,
        locatie_stad: klant?.stad || undefined,
        locatie_postcode: klant?.postcode || undefined,
        toon_briefpapier: werkbonBriefpapier,
      })

      // Koppel werkbon aan montage afspraak (bidirectioneel)
      if (montageAfspraak?.id) {
        await updateMontageAfspraak(montageAfspraak.id, { werkbon_id: werkbon.id })
      }

      // Items overnemen uit offerte
      if (metItems && selectedIds.size > 0) {
        const selected = offerteItems.filter((i) => selectedIds.has(i.id))
        for (let idx = 0; idx < selected.length; idx++) {
          const offerteItem = selected[idx]
          const werkbonItem = await createWerkbonItem({
            user_id: userId,
            werkbon_id: werkbon.id,
            volgorde: idx + 1,
            omschrijving: offerteItem.beschrijving,
            afmeting_breedte_mm: offerteItem.breedte_mm,
            afmeting_hoogte_mm: offerteItem.hoogte_mm,
            interne_notitie: offerteItem.interne_notitie || undefined,
            offerte_item_id: offerteItem.id,
          })

          // Resolve storage paths naar display URLs
          if (offerteItem.foto_url) {
            let resolvedUrl = offerteItem.foto_url
            if (!resolvedUrl.startsWith('data:') && !resolvedUrl.startsWith('http')) {
              try { resolvedUrl = await downloadFile(resolvedUrl) } catch (err) { /* skip */ }
            }
            if (resolvedUrl) {
              await createWerkbonAfbeelding({
                werkbon_item_id: werkbonItem.id,
                url: resolvedUrl,
                type: 'foto',
                omschrijving: 'Productfoto',
              })
            }
          }
          if (offerteItem.bijlage_url && offerteItem.bijlage_type?.startsWith('image/')) {
            let resolvedUrl = offerteItem.bijlage_url
            if (!resolvedUrl.startsWith('data:') && !resolvedUrl.startsWith('http')) {
              try { resolvedUrl = await downloadFile(resolvedUrl) } catch (err) { /* skip */ }
            }
            if (resolvedUrl) {
              await createWerkbonAfbeelding({
                werkbon_item_id: werkbonItem.id,
                url: resolvedUrl,
                type: 'tekening',
                omschrijving: offerteItem.bijlage_naam || 'Bijlage',
              })
            }
          }
        }
        toast.success(`Werkbon ${werkbon.werkbon_nummer} aangemaakt met ${selected.length} items`)
      } else {
        toast.success(`Werkbon ${werkbon.werkbon_nummer} aangemaakt`)
      }

      onOpenChange(false)
      navigateWithTab({
        path: `/werkbonnen/${werkbon.id}`,
        label: werkbon.werkbon_nummer || 'Werkbon',
        id: `/werkbonnen/${werkbon.id}`,
      })
    } catch (err) {
      logger.error('Fout bij aanmaken werkbon:', err)
      toast.error('Fout bij aanmaken werkbon')
    } finally {
      setIsCreating(false)
    }
  }, [
    user, selectedOfferteId, projectId, klantId, klant, montageAfspraak,
    werkbonBriefpapier, selectedIds, offerteItems, onOpenChange, navigateWithTab,
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Werkbon maken
          </DialogTitle>
          <DialogDescription>
            {montageAfspraak
              ? `Werkbon voor montage "${montageAfspraak.titel}"`
              : 'Maak een werkbon aan voor dit project'}
          </DialogDescription>
        </DialogHeader>

        {step === 'keuze' && (
          <div className="space-y-4 py-2">
            {offertes.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Wil je items overnemen uit een offerte? Prijzen worden niet overgenomen.
                </p>
                <div>
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
                </div>
                {isLoadingItems && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xs text-muted-foreground">of</span>
                </div>
                <Button variant="outline" className="w-full" onClick={() => handleCreate(false)} disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Lege werkbon aanmaken (zonder offerte items)
                </Button>
              </>
            ) : (
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Geen offertes gekoppeld aan dit project. Er wordt een lege werkbon aangemaakt.
                </p>
                <Button onClick={() => handleCreate(false)} disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1" />}
                  Werkbon aanmaken
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'selectie' && (
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
                    {(item.breedte_mm || item.hoogte_mm) && (
                      <span>{item.breedte_mm || '?'} × {item.hoogte_mm || '?'} mm</span>
                    )}
                    {item.foto_url && <span>Foto</span>}
                    {item.bijlage_url && <span>Bijlage</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        {step === 'selectie' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('keuze')}>Terug</Button>
            <Button onClick={() => handleCreate(true)} disabled={isCreating || selectedIds.size === 0}>
              {isCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1" />}
              Werkbon maken ({selectedIds.size})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
