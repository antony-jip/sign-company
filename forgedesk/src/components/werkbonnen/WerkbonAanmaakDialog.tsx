import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ClipboardList, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { useTrialGuard } from '@/hooks/useTrialGuard'
import { TrialGuardDialog } from '@/components/shared/TrialGuardDialog'
import type { Offerte, OfferteItem, Klant } from '@/types'
import {
  createWerkbon, createWerkbonItem, createWerkbonAfbeelding,
} from '@/services/supabaseService'
import { downloadFile } from '@/services/storageService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerte: Offerte
  items: OfferteItem[]
  klant: Klant | null
}

export function WerkbonAanmaakDialog({ open, onOpenChange, offerte, items, klant }: Props) {
  const { user } = useAuth()
  const { isBlocked: isTrialBlocked, showDialog: showTrialDialog, setShowDialog: setShowTrialDialog } = useTrialGuard()
  const { werkbonBriefpapier } = useAppSettings()
  const { navigateWithTab } = useNavigateWithTab()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(items.map((i) => i.id)))
  const [isCreating, setIsCreating] = useState(false)

  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }, [items, selectedIds.size])

  const handleCreate = useCallback(async () => {
    if (isTrialBlocked) {
      onOpenChange(false)
      setShowTrialDialog(true)
      return
    }
    if (selectedIds.size === 0) {
      toast.error('Selecteer minstens één item')
      return
    }

    try {
      setIsCreating(true)
      const userId = user?.id || ''

      // Maak werkbon aan
      const werkbon = await createWerkbon({
        user_id: userId,
        offerte_id: offerte.id,
        project_id: offerte.project_id || undefined,
        klant_id: offerte.klant_id,
        titel: offerte.titel ? `Werkbon - ${offerte.titel}` : undefined,
        datum: new Date().toISOString().split('T')[0],
        status: 'concept',
        locatie_adres: klant?.adres || undefined,
        locatie_stad: klant?.stad || undefined,
        locatie_postcode: klant?.postcode || undefined,
        toon_briefpapier: werkbonBriefpapier,
      })

      // Maak items aan vanuit geselecteerde offerte-items (GEEN prijzen)
      const selectedItems = items.filter((i) => selectedIds.has(i.id))
      for (let idx = 0; idx < selectedItems.length; idx++) {
        const offerteItem = selectedItems[idx]
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

        // Kopieer afbeeldingen van het offerte-item (resolve storage paths naar display URLs)
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

      toast.success(`Werkbon ${werkbon.werkbon_nummer} aangemaakt met ${selectedItems.length} items`)
      onOpenChange(false)
      navigateWithTab({
        path: `/werkbonnen/${werkbon.id}`,
        label: werkbon.werkbon_nummer || 'Werkbon',
        id: `/werkbonnen/${werkbon.id}`,
      })
    } catch (err) {
      toast.error('Fout bij aanmaken werkbon')
    } finally {
      setIsCreating(false)
    }
  }, [selectedIds, user, offerte, items, klant, werkbonBriefpapier, onOpenChange, navigateWithTab, isTrialBlocked, setShowTrialDialog])

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Werkbon maken
          </DialogTitle>
          <DialogDescription>
            Selecteer welke offerte-items op de werkbon komen. Prijzen worden niet overgenomen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
          {/* Alles selecteren */}
          <div className="flex items-center gap-3 pb-2 border-b">
            <Checkbox
              checked={selectedIds.size === items.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm font-medium">Alles selecteren ({items.length} items)</span>
          </div>

          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
            >
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => toggleItem(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.beschrijving}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {(item.breedte_mm || item.hoogte_mm) && (
                    <span>{item.breedte_mm || '?'} x {item.hoogte_mm || '?'} mm</span>
                  )}
                  {item.foto_url && <span>Foto</span>}
                  {item.bijlage_url && <span>Bijlage</span>}
                </div>
              </div>
            </label>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Geen offerte-items gevonden
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleCreate} disabled={isCreating || selectedIds.size === 0}>
            {isCreating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardList className="h-4 w-4 mr-1" />}
            Werkbon maken ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <TrialGuardDialog open={showTrialDialog} onOpenChange={setShowTrialDialog} />
    </>
  )
}
