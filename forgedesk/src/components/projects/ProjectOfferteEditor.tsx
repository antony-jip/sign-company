import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Save,
  X,
  Plus,
  Trash2,
  FileText,
  Pencil,
  Copy,
  ArrowUpDown,
} from 'lucide-react'
import {
  getOfferte,
  getOfferteItems,
  updateOfferte,
  updateOfferteItem,
  createOfferteItem,
  deleteOfferteItem,
} from '@/services/supabaseService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { formatCurrency } from '@/lib/utils'
import { round2 } from '@/utils/budgetUtils'
import type { Offerte, OfferteItem } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '../../utils/logger'

interface ProjectOfferteEditorProps {
  offerteId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface EditableItem extends OfferteItem {
  _isNew?: boolean
  _deleted?: boolean
}

export function ProjectOfferteEditor({ offerteId, open, onClose, onSaved }: ProjectOfferteEditorProps) {
  const { user } = useAuth()
  const { standaardBtw } = useAppSettings()
  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Editable offerte fields
  const [titel, setTitel] = useState('')
  const [status, setStatus] = useState<Offerte['status']>('concept')
  const [notities, setNotities] = useState('')
  const [voorwaarden, setVoorwaarden] = useState('')
  const [geldigTot, setGeldigTot] = useState('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [offerteData, itemsData] = await Promise.all([
        getOfferte(offerteId),
        getOfferteItems(offerteId),
      ])
      if (offerteData) {
        setOfferte(offerteData)
        setTitel(offerteData.titel)
        setStatus(offerteData.status || 'concept')
        setNotities(offerteData.notities || '')
        setVoorwaarden(offerteData.voorwaarden || '')
        setGeldigTot(offerteData.geldig_tot || '')
      }
      setItems(itemsData.map(i => ({ ...i })))
    } catch (err) {
      logger.error('Fout bij laden offerte:', err)
      toast.error('Kon offerte niet laden')
    } finally {
      setIsLoading(false)
    }
  }, [offerteId])

  useEffect(() => {
    if (open && offerteId) {
      fetchData()
    }
  }, [open, offerteId, fetchData])

  const handleUpdateItem = (index: number, field: keyof OfferteItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      // Recalculate totaal
      const bruto = item.aantal * item.eenheidsprijs
      item.totaal = bruto - bruto * (item.korting_percentage / 100)
      updated[index] = item
      return updated
    })
  }

  const handleAddItem = () => {
    const newItem: EditableItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      offerte_id: offerteId,
      beschrijving: '',
      aantal: 1,
      eenheidsprijs: 0,
      btw_percentage: standaardBtw,
      korting_percentage: 0,
      totaal: 0,
      volgorde: items.length + 1,
      created_at: new Date().toISOString(),
      _isNew: true,
    }
    setItems(prev => [...prev, newItem])
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => {
      const updated = [...prev]
      if (updated[index]._isNew) {
        updated.splice(index, 1)
      } else {
        updated[index] = { ...updated[index], _deleted: true }
      }
      return updated
    })
  }

  const handleDuplicateItem = (index: number) => {
    const source = items[index]
    const newItem: EditableItem = {
      ...source,
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      beschrijving: `${source.beschrijving} (kopie)`,
      volgorde: items.length + 1,
      _isNew: true,
      _deleted: false,
    }
    setItems(prev => {
      const updated = [...prev]
      updated.splice(index + 1, 0, newItem)
      return updated
    })
  }

  const calculateTotals = () => {
    const activeItems = items.filter(i => !i._deleted)
    const subtotaal = round2(activeItems.reduce((sum, item) => {
      const bruto = item.aantal * item.eenheidsprijs
      return sum + round2(bruto - bruto * (item.korting_percentage / 100))
    }, 0))
    const btwBedrag = round2(activeItems.reduce((sum, item) => {
      const bruto = item.aantal * item.eenheidsprijs
      const netto = round2(bruto - bruto * (item.korting_percentage / 100))
      return sum + round2(netto * (item.btw_percentage / 100))
    }, 0))
    return { subtotaal, btwBedrag, totaal: round2(subtotaal + btwBedrag) }
  }

  const handleSave = async () => {
    if (!offerte) return
    setIsSaving(true)
    try {
      const { subtotaal, btwBedrag, totaal } = calculateTotals()

      // Update offerte
      await updateOfferte(offerte.id, {
        titel,
        status,
        notities,
        voorwaarden,
        geldig_tot: geldigTot,
        subtotaal,
        btw_bedrag: btwBedrag,
        totaal,
      })

      // Delete removed items
      const deletedItems = items.filter(i => i._deleted && !i._isNew)
      await Promise.all(deletedItems.map(i => deleteOfferteItem(i.id)))

      // Update existing items
      const existingItems = items.filter(i => !i._deleted && !i._isNew)
      await Promise.all(existingItems.map((item, idx) =>
        updateOfferteItem(item.id, {
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: item.totaal,
          volgorde: idx + 1,
        })
      ))

      // Create new items
      const newItems = items.filter(i => !i._deleted && i._isNew)
      await Promise.all(newItems.map((item, idx) =>
        createOfferteItem({
          user_id: user?.id || '',
          offerte_id: offerteId,
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: item.totaal,
          volgorde: existingItems.length + idx + 1,
        })
      ))

      toast.success('Offerte bijgewerkt')
      onSaved()
      onClose()
    } catch (err) {
      logger.error('Fout bij opslaan offerte:', err)
      toast.error('Kon offerte niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const { subtotaal, btwBedrag, totaal } = calculateTotals()
  const activeItems = items.filter(i => !i._deleted)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-accent dark:text-primary" />
            Offerte Bewerken
          </DialogTitle>
          <DialogDescription>
            Pas de offerte aan en sla op. Wijzigingen worden direct doorgevoerd.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 space-y-2">
                <Label>Titel</Label>
                <Input value={titel} onChange={e => setTitel(e.target.value)} placeholder="Offerte titel..." />
              </div>
              <div className="space-y-2">
                <Label>Nummer</Label>
                <Input value={offerte?.nummer || ''} readOnly className="bg-background dark:bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as Offerte['status'])}
                  className="w-full text-sm border border-border dark:border-border rounded-md px-3 py-2 bg-card text-foreground dark:text-white h-9"
                >
                  <option value="concept">Concept</option>
                  <option value="verzonden">Verzonden</option>
                  <option value="bekeken">Bekeken</option>
                  <option value="goedgekeurd">Goedgekeurd</option>
                  <option value="afgewezen">Afgewezen</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Geldig tot</Label>
                <Input type="date" value={geldigTot} onChange={e => setGeldigTot(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent dark:text-primary" />
                    Offerte regels
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleAddItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Regel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Geen items. Klik op "+ Regel" om een item toe te voegen.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => {
                      if (item._deleted) return null
                      return (
                        <div key={item.id} className="bg-background dark:bg-muted/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                              <Input
                                value={item.beschrijving}
                                onChange={e => handleUpdateItem(index, 'beschrijving', e.target.value)}
                                placeholder="Beschrijving..."
                                className="text-sm"
                              />
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <Label className="text-2xs text-muted-foreground">Aantal</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.aantal}
                                    onChange={e => handleUpdateItem(index, 'aantal', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-2xs text-muted-foreground">Prijs</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={item.eenheidsprijs}
                                    onChange={e => handleUpdateItem(index, 'eenheidsprijs', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-2xs text-muted-foreground">BTW %</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.btw_percentage}
                                    onChange={e => handleUpdateItem(index, 'btw_percentage', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                  />
                                </div>
                                <div>
                                  <Label className="text-2xs text-muted-foreground">Korting %</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={item.korting_percentage}
                                    onChange={e => handleUpdateItem(index, 'korting_percentage', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 pt-1">
                              <span className="text-sm font-bold font-mono text-foreground whitespace-nowrap">
                                {formatCurrency(item.totaal)}
                              </span>
                              <div className="flex items-center gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-accent dark:text-primary"
                                  onClick={() => handleDuplicateItem(index)}
                                  title="Dupliceer regel"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => handleRemoveItem(index)}
                                  title="Verwijder regel"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-3 mt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotaal</span>
                    <span className="font-medium font-mono">{formatCurrency(subtotaal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">BTW</span>
                    <span className="font-medium font-mono">{formatCurrency(btwBedrag)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t pt-2">
                    <span>Totaal</span>
                    <span className="text-accent dark:text-primary font-mono">{formatCurrency(totaal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notities</Label>
                <Textarea
                  value={notities}
                  onChange={e => setNotities(e.target.value)}
                  placeholder="Notities..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Voorwaarden</Label>
                <Textarea
                  value={voorwaarden}
                  onChange={e => setVoorwaarden(e.target.value)}
                  placeholder="Voorwaarden..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Annuleren
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className=""
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
