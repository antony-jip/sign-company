import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Plus, UserPlus, Loader2, Trash2, Eye, Copy, Link, ExternalLink,
  ToggleLeft, ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'
import type { LeadFormulier, LeadInzending } from '@/types'
import {
  getLeadFormulieren, deleteLeadFormulier, updateLeadFormulier,
  getAllLeadInzendingen,
} from '@/services/supabaseService'

export function LeadCaptureLayout() {
  const navigate = useNavigate()
  const [formulieren, setFormulieren] = useState<LeadFormulier[]>([])
  const [inzendingen, setInzendingen] = useState<LeadInzending[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LeadFormulier | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [fData, iData] = await Promise.all([
          getLeadFormulieren().catch(() => []),
          getAllLeadInzendingen().catch(() => []),
        ])
        if (cancelled) return
        setFormulieren(fData)
        setInzendingen(iData)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const getInzendingenCount = useCallback((formulierId: string) => {
    return inzendingen.filter((i) => i.formulier_id === formulierId).length
  }, [inzendingen])

  const getNieuwCount = useCallback((formulierId: string) => {
    return inzendingen.filter((i) => i.formulier_id === formulierId && i.status === 'nieuw').length
  }, [inzendingen])

  const handleToggleActief = useCallback(async (form: LeadFormulier) => {
    try {
      const updated = await updateLeadFormulier(form.id, { actief: !form.actief })
      setFormulieren((prev) => prev.map((f) => f.id === updated.id ? updated : f))
      toast.success(updated.actief ? 'Formulier geactiveerd' : 'Formulier gedeactiveerd')
    } catch {
      toast.error('Fout bij wijzigen')
    }
  }, [])

  const handleCopyLink = useCallback((token: string) => {
    const link = `${window.location.origin}/formulier/${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link gekopieerd')
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteLeadFormulier(deleteTarget.id)
      setFormulieren((prev) => prev.filter((f) => f.id !== deleteTarget.id))
      toast.success('Formulier verwijderd')
    } catch {
      toast.error('Kon formulier niet verwijderen')
    }
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }, [deleteTarget])

  const nieuweLeads = inzendingen.filter((i) => i.status === 'nieuw').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Lead Capture</h1>
            <p className="text-sm text-muted-foreground">{formulieren.length} formulieren — {nieuweLeads} nieuwe leads</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/leads/inzendingen')} className="gap-1">
            <Eye className="h-4 w-4" /> Inzendingen {nieuweLeads > 0 && <Badge className="ml-1 bg-red-500 text-white text-2xs">{nieuweLeads}</Badge>}
          </Button>
          <Button onClick={() => navigate('/leads/formulieren/nieuw')} className="gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 border-0" size="sm">
            <Plus className="h-4 w-4" /> Nieuw formulier
          </Button>
        </div>
      </div>

      {/* Formulieren grid */}
      {formulieren.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16">
          <div className="rounded-full" style={{ width: '40px', height: '4px', backgroundColor: '#2A5580' }} />
          <p className="font-semibold" style={{ fontSize: '14px', color: '#191919' }}>Nog geen formulieren</p>
          <p style={{ fontSize: '12px', color: '#5A5A55' }}>Maak een lead-formulier aan om aanvragen te ontvangen.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/leads/formulieren/nieuw')}>
            <Plus className="h-4 w-4 mr-2" /> Eerste formulier aanmaken
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formulieren.map((form) => {
            const total = getInzendingenCount(form.id)
            const nieuw = getNieuwCount(form.id)
            return (
              <Card key={form.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{form.naam}</CardTitle>
                    <button onClick={() => handleToggleActief(form)} title={form.actief ? 'Deactiveren' : 'Activeren'}>
                      {form.actief ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground/60" />
                      )}
                    </button>
                  </div>
                  {form.beschrijving && <p className="text-xs text-muted-foreground mt-1">{form.beschrijving}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Inzendingen: </span>
                      <span className="font-semibold">{total}</span>
                    </div>
                    {nieuw > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-2xs">{nieuw} nieuw</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground/60">
                    <span>{form.velden.length} velden</span>
                    <span>{form.actief ? 'Actief' : 'Inactief'}</span>
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t border-border dark:border-border">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => navigate(`/leads/formulieren/${form.id}`)}>
                      <Eye className="h-3.5 w-3.5" /> Bewerken
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => handleCopyLink(form.publiek_token)}>
                      <Copy className="h-3.5 w-3.5" /> Link
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => window.open(`/formulier/${form.publiek_token}`, '_blank')}>
                      <ExternalLink className="h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-red-500" onClick={() => { setDeleteTarget(form); setDeleteDialogOpen(true) }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Formulier verwijderen?</DialogTitle>
            <DialogDescription>"{deleteTarget?.naam}" en alle inzendingen worden verwijderd.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete}>Verwijderen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
