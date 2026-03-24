import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react'
import {
  getKostenplaatsen,
  createKostenplaats,
  updateKostenplaats,
  deleteKostenplaats,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import type { Kostenplaats } from '@/types'
import { toast } from 'sonner'

interface KostenplaatsForm {
  code: string
  naam: string
  actief: boolean
}

const emptyForm: KostenplaatsForm = {
  code: '',
  naam: '',
  actief: true,
}

export function KostenplaatsenTab() {
  const { user } = useAuth()
  const [items, setItems] = useState<Kostenplaats[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<KostenplaatsForm>(emptyForm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getKostenplaatsen()
      setItems(data)
    } catch {
      toast.error('Fout bij ophalen kostenplaatsen')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleOpenEdit = (item: Kostenplaats) => {
    setEditingId(item.id)
    setForm({ code: item.code, naam: item.naam, actief: item.actief })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.naam.trim()) {
      toast.error('Vul code en naam in')
      return
    }

    try {
      if (editingId) {
        await updateKostenplaats(editingId, {
          code: form.code.trim(),
          naam: form.naam.trim(),
          actief: form.actief,
        })
        toast.success('Kostenplaats bijgewerkt')
      } else {
        await createKostenplaats({
          organisatie_id: user?.id || '',
          code: form.code.trim(),
          naam: form.naam.trim(),
          actief: form.actief,
        })
        toast.success('Kostenplaats aangemaakt')
      }
      setDialogOpen(false)
      fetchData()
    } catch {
      toast.error('Fout bij opslaan kostenplaats')
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteKostenplaats(deletingId)
      toast.success('Kostenplaats verwijderd')
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchData()
    } catch {
      toast.error('Fout bij verwijderen kostenplaats')
    }
  }

  const handleToggleActief = async (item: Kostenplaats) => {
    try {
      await updateKostenplaats(item.id, { actief: !item.actief })
      setItems((prev) => prev.map((k) => (k.id === item.id ? { ...k, actief: !k.actief } : k)))
    } catch {
      toast.error('Fout bij bijwerken status')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-petrol" />
              Kostenplaatsen
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Beheer kostenplaatsen voor facturen, offertes en projecten
            </p>
          </div>
          <Button size="sm" onClick={handleOpenCreate} className="bg-petrol hover:bg-petrol/90 text-white">
            <Plus className="h-4 w-4 mr-1" />
            Toevoegen
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Laden...</p>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nog geen kostenplaatsen aangemaakt</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Voorbeelden: HK - Hoofdkantoor, WP - Werkplaats, BU - Buitendienst
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-semibold text-sm text-petrol w-12">{item.code}</span>
                    <span className="text-sm truncate">{item.naam}</span>
                    {!item.actief && (
                      <Badge variant="secondary" className="text-2xs">Inactief</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Switch
                      checked={item.actief}
                      onCheckedChange={() => handleToggleActief(item)}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { setDeletingId(item.id); setDeleteDialogOpen(true) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aanmaken / Bewerken dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Kostenplaats bewerken' : 'Kostenplaats toevoegen'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Pas de gegevens aan' : 'Voeg een nieuwe kostenplaats toe voor je administratie'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Bijv. HK"
                className="font-mono"
                maxLength={10}
              />
            </div>
            <div>
              <Label className="text-xs">Naam</Label>
              <Input
                value={form.naam}
                onChange={(e) => setForm((f) => ({ ...f, naam: e.target.value }))}
                placeholder="Bijv. Hoofdkantoor"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.actief}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, actief: checked }))}
              />
              <Label className="text-sm">Actief</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} className="bg-petrol hover:bg-petrol/90 text-white">
              {editingId ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verwijder dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kostenplaats verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je deze kostenplaats wilt verwijderen? Bestaande facturen behouden hun kostenplaats-referentie.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
