import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Search, Truck, Trash2, Pencil, Phone, Mail, Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { Leverancier, Uitgave, KvkResultaat } from '@/types'
import { KvkZoekVeld } from '@/components/shared/KvkZoekVeld'
import {
  getLeveranciers, createLeverancier, updateLeverancier, deleteLeverancier,
  getUitgavenByLeverancier,
} from '@/services/supabaseService'
import { round2 } from '@/utils/budgetUtils'

interface FormData {
  bedrijfsnaam: string
  contactpersoon: string
  email: string
  telefoon: string
  adres: string
  postcode: string
  stad: string
  website: string
  kvk_nummer: string
  btw_nummer: string
  iban: string
  categorie: string
  notitie: string
  actief: boolean
}

const EMPTY_FORM: FormData = {
  bedrijfsnaam: '', contactpersoon: '', email: '', telefoon: '',
  adres: '', postcode: '', stad: '', website: '',
  kvk_nummer: '', btw_nummer: '', iban: '', categorie: '', notitie: '',
  actief: true,
}

export function LeveranciersLayout() {
  const { user } = useAuth()
  const userId = user?.id || ''

  const [leveranciers, setLeveranciers] = useState<Leverancier[]>([])
  const [uitgavenCounts, setUitgavenCounts] = useState<Record<string, { count: number; totaal: number }>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM })
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Leverancier | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        setIsLoading(true)
        const levs = await getLeveranciers()
        if (cancelled) return
        setLeveranciers(levs)

        // Fetch uitgaven counts per leverancier
        const counts: Record<string, { count: number; totaal: number }> = {}
        for (const lev of levs) {
          try {
            const uitgaven = await getUitgavenByLeverancier(lev.id)
            if (cancelled) return
            counts[lev.id] = {
              count: uitgaven.length,
              totaal: round2(uitgaven.reduce((s, u) => s + u.bedrag_incl_btw, 0)),
            }
          } catch {
            counts[lev.id] = { count: 0, totaal: 0 }
          }
        }
        setUitgavenCounts(counts)
      } catch {
        if (!cancelled) toast.error('Fout bij laden leveranciers')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const gefilterd = useMemo(() => {
    if (!searchQuery.trim()) return leveranciers
    const q = searchQuery.toLowerCase()
    return leveranciers.filter((l) =>
      l.bedrijfsnaam.toLowerCase().includes(q) ||
      (l.contactpersoon || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    )
  }, [leveranciers, searchQuery])

  const openNieuw = useCallback(() => {
    setFormData({ ...EMPTY_FORM })
    setEditingId(null)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((l: Leverancier) => {
    setFormData({
      bedrijfsnaam: l.bedrijfsnaam,
      contactpersoon: l.contactpersoon || '',
      email: l.email || '',
      telefoon: l.telefoon || '',
      adres: l.adres || '',
      postcode: l.postcode || '',
      stad: l.stad || '',
      website: l.website || '',
      kvk_nummer: l.kvk_nummer || '',
      btw_nummer: l.btw_nummer || '',
      iban: l.iban || '',
      categorie: l.categorie || '',
      notitie: l.notitie || '',
      actief: l.actief,
    })
    setEditingId(l.id)
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    if (!formData.bedrijfsnaam.trim()) { toast.error('Bedrijfsnaam is verplicht'); return }
    try {
      setIsSaving(true)
      const data = {
        user_id: userId,
        bedrijfsnaam: formData.bedrijfsnaam.trim(),
        contactpersoon: formData.contactpersoon || undefined,
        email: formData.email || undefined,
        telefoon: formData.telefoon || undefined,
        adres: formData.adres || undefined,
        postcode: formData.postcode || undefined,
        stad: formData.stad || undefined,
        website: formData.website || undefined,
        kvk_nummer: formData.kvk_nummer || undefined,
        btw_nummer: formData.btw_nummer || undefined,
        iban: formData.iban || undefined,
        categorie: formData.categorie || undefined,
        notitie: formData.notitie || undefined,
        actief: formData.actief,
      }
      if (editingId) {
        const updated = await updateLeverancier(editingId, data)
        setLeveranciers((prev) => prev.map((l) => l.id === editingId ? { ...l, ...updated } : l))
        toast.success('Leverancier bijgewerkt')
      } else {
        const created = await createLeverancier(data as Parameters<typeof createLeverancier>[0])
        setLeveranciers((prev) => [...prev, created])
        toast.success('Leverancier aangemaakt')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Fout bij opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [formData, editingId, userId])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteLeverancier(deleteTarget.id)
      setLeveranciers((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      toast.success('Leverancier verwijderd')
    } catch {
      toast.error('Fout bij verwijderen')
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Leveranciers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Beheer je leveranciers en hun gegevens</p>
        </div>
        <Button onClick={openNieuw}><Plus className="h-4 w-4 mr-1" /> Nieuwe leverancier</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Zoek leverancier..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {gefilterd.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Truck className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Geen leveranciers</p>
            <Button className="mt-4" onClick={openNieuw}><Plus className="h-4 w-4 mr-1" /> Nieuwe leverancier</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {gefilterd.map((lev) => {
            const stats = uitgavenCounts[lev.id] || { count: 0, totaal: 0 }
            return (
              <Card key={lev.id} className={cn('hover:shadow-md transition-shadow', !lev.actief && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{lev.bedrijfsnaam}</h3>
                      {lev.contactpersoon && <p className="text-sm text-muted-foreground">{lev.contactpersoon}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(lev)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => { setDeleteTarget(lev); setDeleteDialogOpen(true) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {lev.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {lev.email}</div>}
                    {lev.telefoon && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {lev.telefoon}</div>}
                    {lev.website && <div className="flex items-center gap-1.5"><Globe className="h-3 w-3" /> {lev.website}</div>}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                    <span>{stats.count} uitgaven</span>
                    <span className="font-medium">{formatCurrency(stats.totaal)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Leverancier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Leverancier bewerken' : 'Nieuwe leverancier'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label>Bedrijfsnaam *</Label>
                <Input value={formData.bedrijfsnaam} onChange={(e) => setFormData((p) => ({ ...p, bedrijfsnaam: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Contactpersoon</Label><Input value={formData.contactpersoon} onChange={(e) => setFormData((p) => ({ ...p, contactpersoon: e.target.value }))} /></div>
                <div><Label>Categorie</Label>
                  <Select value={formData.categorie || 'none'} onValueChange={(v) => setFormData((p) => ({ ...p, categorie: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      <SelectItem value="materiaal">Materiaal</SelectItem>
                      <SelectItem value="diensten">Diensten</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="overig">Overig</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} /></div>
                <div><Label>Telefoon</Label><Input value={formData.telefoon} onChange={(e) => setFormData((p) => ({ ...p, telefoon: e.target.value }))} /></div>
              </div>
              <div><Label>Adres</Label><Input value={formData.adres} onChange={(e) => setFormData((p) => ({ ...p, adres: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Postcode</Label><Input value={formData.postcode} onChange={(e) => setFormData((p) => ({ ...p, postcode: e.target.value }))} /></div>
                <div><Label>Stad</Label><Input value={formData.stad} onChange={(e) => setFormData((p) => ({ ...p, stad: e.target.value }))} /></div>
              </div>
              <div><Label>Website</Label><Input value={formData.website} onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <KvkZoekVeld
                  kvkNummer={formData.kvk_nummer}
                  onKvkChange={(v) => setFormData((p) => ({ ...p, kvk_nummer: v }))}
                  onResultSelect={(r: KvkResultaat) => {
                    setFormData((p) => ({
                      ...p,
                      bedrijfsnaam: r.bedrijfsnaam || p.bedrijfsnaam,
                      adres: r.adres || p.adres,
                      postcode: r.postcode || p.postcode,
                      stad: r.stad || p.stad,
                      btw_nummer: r.btw_nummer || p.btw_nummer,
                      kvk_nummer: r.kvk_nummer,
                    }))
                  }}
                />
                <div><Label>BTW nummer</Label><Input value={formData.btw_nummer} onChange={(e) => setFormData((p) => ({ ...p, btw_nummer: e.target.value }))} /></div>
              </div>
              <div><Label>IBAN</Label><Input value={formData.iban} onChange={(e) => setFormData((p) => ({ ...p, iban: e.target.value }))} /></div>
              <div><Label>Notitie</Label><Input value={formData.notitie} onChange={(e) => setFormData((p) => ({ ...p, notitie: e.target.value }))} /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formData.actief} onChange={(e) => setFormData((p) => ({ ...p, actief: e.target.checked }))} className="rounded" />
                Actief
              </label>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Opslaan...' : 'Opslaan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leverancier verwijderen</DialogTitle>
            <DialogDescription>Weet je zeker dat je {deleteTarget?.bedrijfsnaam} wilt verwijderen?</DialogDescription>
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
