import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { getKortingen, createKorting, updateKorting, deleteKorting } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Korting } from '@/types'
import { toast } from 'sonner'

const typeLabels: Record<string, string> = {
  percentage: 'Percentage',
  vast_bedrag: 'Vast Bedrag',
}

const typeColors: Record<string, string> = {
  percentage: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  vast_bedrag: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
}

const emptyForm: Omit<Korting, 'id' | 'user_id' | 'created_at'> = {
  naam: '',
  type: 'percentage',
  waarde: 0,
  voorwaarden: '',
  actief: true,
}

export function DiscountsSettings() {
  const { user } = useAuth()
  const [kortingen, setKortingen] = useState<Korting[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getKortingen()
      setKortingen(data)
    } catch (error) {
      toast.error('Fout bij ophalen kortingen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openNew = () => {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  const openEdit = (korting: Korting) => {
    setForm({
      naam: korting.naam,
      type: korting.type,
      waarde: korting.waarde,
      voorwaarden: korting.voorwaarden,
      actief: korting.actief,
    })
    setEditingId(korting.id)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.naam.trim()) {
      toast.error('Vul een naam in voor de korting')
      return
    }

    try {
      if (editingId) {
        await updateKorting(editingId, {
          naam: form.naam,
          type: form.type,
          waarde: form.waarde,
          voorwaarden: form.voorwaarden,
          actief: form.actief,
        })
        toast.success('Korting bijgewerkt')
      } else {
        await createKorting({
          user_id: user?.id ?? '',
          naam: form.naam,
          type: form.type,
          waarde: form.waarde,
          voorwaarden: form.voorwaarden,
          actief: form.actief,
        })
        toast.success('Korting aangemaakt')
      }

      setDialogOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      await fetchData()
    } catch (error) {
      toast.error('Fout bij opslaan korting')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteKorting(id)
      toast.success('Korting verwijderd')
      await fetchData()
    } catch (error) {
      toast.error('Fout bij verwijderen korting')
    }
  }

  const handleToggleActief = async (id: string) => {
    try {
      const korting = kortingen.find((k) => k.id === id)
      if (!korting) return
      await updateKorting(id, { actief: !korting.actief })
      await fetchData()
    } catch (error) {
      toast.error('Fout bij bijwerken korting')
    }
  }

  const formatWaarde = (korting: Korting) => {
    if (korting.type === 'percentage') {
      return `${korting.waarde}%`
    }
    return `\u20AC ${korting.waarde.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Kortingen</CardTitle>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 mt-1">
              Beheer kortingsregelingen voor uw klanten en offertes
            </p>
          </div>
          <Button onClick={openNew} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Nieuwe Korting
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground dark:text-muted-foreground/60">
            Laden...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border dark:border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                    Naam
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                    Type
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                    Waarde
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60 hidden md:table-cell">
                    Voorwaarden
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                    Actief
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground dark:text-muted-foreground/60">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody>
                {kortingen.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground dark:text-muted-foreground/60">
                      Geen kortingen gevonden
                    </td>
                  </tr>
                ) : (
                  kortingen.map((korting) => (
                    <tr
                      key={korting.id}
                      className="border-b border-border dark:border-border hover:bg-background dark:hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground dark:text-white">
                        {korting.naam}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={typeColors[korting.type]}>
                          {typeLabels[korting.type]}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground dark:text-white">
                        {formatWaarde(korting)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground dark:text-muted-foreground/60 hidden md:table-cell max-w-[250px] truncate">
                        {korting.voorwaarden || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <Switch
                            checked={korting.actief}
                            onCheckedChange={() => handleToggleActief(korting.id)}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/60 hover:text-blue-600"
                            onClick={() => openEdit(korting)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/60 hover:text-red-600"
                            onClick={() => handleDelete(korting.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Dialog for New / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Korting Bewerken' : 'Nieuwe Korting'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Pas de gegevens van deze korting aan.'
                : 'Voeg een nieuwe kortingsregeling toe.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="korting-naam">Naam *</Label>
              <Input
                id="korting-naam"
                value={form.naam}
                onChange={(e) => setForm((prev) => ({ ...prev, naam: e.target.value }))}
                placeholder="bijv. Vroegboekkorting"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="korting-type">Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      type: val as Korting['type'],
                    }))
                  }
                >
                  <SelectTrigger id="korting-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="vast_bedrag">Vast Bedrag</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="korting-waarde">
                  Waarde {form.type === 'percentage' ? '(%)' : '(\u20AC)'}
                </Label>
                <Input
                  id="korting-waarde"
                  type="number"
                  min={0}
                  step={form.type === 'percentage' ? 0.5 : 1}
                  value={form.waarde}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0)
                    setForm((prev) => ({
                      ...prev,
                      waarde: prev.type === 'percentage' ? Math.min(100, val) : val,
                    }))
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="korting-voorwaarden">Voorwaarden</Label>
              <Input
                id="korting-voorwaarden"
                value={form.voorwaarden}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, voorwaarden: e.target.value }))
                }
                placeholder="bijv. Bij bestellingen boven \u20AC10.000"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="korting-actief"
                checked={form.actief}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, actief: checked }))
                }
              />
              <Label htmlFor="korting-actief">Actief</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
