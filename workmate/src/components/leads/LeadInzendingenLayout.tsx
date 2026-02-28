import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, Eye, CheckCircle, Inbox, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn, formatDateTime } from '@/lib/utils'
import type { LeadInzending, LeadFormulier } from '@/types'
import {
  getAllLeadInzendingen, getLeadFormulieren, updateLeadInzending,
} from '@/services/supabaseService'

type FilterStatus = 'alle' | LeadInzending['status']

const STATUS_CONFIG: Record<LeadInzending['status'], { label: string; color: string }> = {
  nieuw: { label: 'Nieuw', color: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400' },
  bekeken: { label: 'Bekeken', color: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400' },
  verwerkt: { label: 'Verwerkt', color: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light' },
}

export function LeadInzendingenLayout() {
  const navigate = useNavigate()
  const [inzendingen, setInzendingen] = useState<LeadInzending[]>([])
  const [formulieren, setFormulieren] = useState<LeadFormulier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedInzending, setSelectedInzending] = useState<LeadInzending | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [iData, fData] = await Promise.all([
          getAllLeadInzendingen().catch(() => []),
          getLeadFormulieren().catch(() => []),
        ])
        if (cancelled) return
        setInzendingen(iData)
        setFormulieren(fData)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const getFormulierNaam = useCallback((id: string) => {
    return formulieren.find((f) => f.id === id)?.naam || '-'
  }, [formulieren])

  const getFormulierVelden = useCallback((id: string) => {
    return formulieren.find((f) => f.id === id)?.velden || []
  }, [formulieren])

  const gefilterd = useMemo(() => {
    let result = [...inzendingen]
    if (filterStatus !== 'alle') result = result.filter((i) => i.status === filterStatus)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [inzendingen, filterStatus])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: inzendingen.length }
    for (const i of inzendingen) counts[i.status] = (counts[i.status] || 0) + 1
    return counts
  }, [inzendingen])

  const handleViewDetail = useCallback(async (inz: LeadInzending) => {
    setSelectedInzending(inz)
    setDetailDialogOpen(true)
    if (inz.status === 'nieuw') {
      try {
        const updated = await updateLeadInzending(inz.id, { status: 'bekeken' })
        setInzendingen((prev) => prev.map((i) => i.id === updated.id ? updated : i))
      } catch { /* ignore */ }
    }
  }, [])

  const handleMarkVerwerkt = useCallback(async (inz: LeadInzending) => {
    try {
      const updated = await updateLeadInzending(inz.id, { status: 'verwerkt' })
      setInzendingen((prev) => prev.map((i) => i.id === updated.id ? updated : i))
      if (selectedInzending?.id === updated.id) setSelectedInzending(updated)
      toast.success('Gemarkeerd als verwerkt')
    } catch {
      toast.error('Fout bij bijwerken')
    }
  }, [selectedInzending])

  // Extract naam and email from form data
  const getLeadInfo = useCallback((inz: LeadInzending) => {
    const velden = getFormulierVelden(inz.formulier_id)
    const naamVeld = velden.find((v) => v.type === 'tekst' && v.volgorde === 1)
    const emailVeld = velden.find((v) => v.type === 'email')
    return {
      naam: naamVeld ? inz.data[naamVeld.id] || '-' : '-',
      email: emailVeld ? inz.data[emailVeld.id] || '-' : '-',
    }
  }, [getFormulierVelden])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lead Inzendingen</h1>
            <p className="text-sm text-muted-foreground">{statusCounts.nieuw || 0} nieuwe, {inzendingen.length} totaal</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 flex-wrap">
        {(['alle', 'nieuw', 'bekeken', 'verwerkt'] as FilterStatus[]).map((s) => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)} className="text-xs">
            {s === 'alle' ? 'Alle' : STATUS_CONFIG[s as LeadInzending['status']].label}
            <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          {gefilterd.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <UserPlus className="h-10 w-10 opacity-30" />
              <p className="text-sm">Geen inzendingen gevonden</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Datum', 'Formulier', 'Naam', 'Email', 'Status', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {gefilterd.map((inz) => {
                  const info = getLeadInfo(inz)
                  const cfg = STATUS_CONFIG[inz.status]
                  return (
                    <tr key={inz.id} className="group hover:bg-muted/30 cursor-pointer" onClick={() => handleViewDetail(inz)}>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(inz.created_at)}</td>
                      <td className="px-4 py-3 text-sm">{getFormulierNaam(inz.formulier_id)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{info.naam}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{info.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className={cn('text-[11px]', cfg.color)}>{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewDetail(inz) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {inz.status !== 'verwerkt' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-accent dark:text-wm-light" onClick={(e) => { e.stopPropagation(); handleMarkVerwerkt(inz) }}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Lead details</DialogTitle>
          </DialogHeader>
          {selectedInzending && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground/60">
                {formatDateTime(selectedInzending.created_at)} — {getFormulierNaam(selectedInzending.formulier_id)}
              </div>
              {getFormulierVelden(selectedInzending.formulier_id)
                .sort((a, b) => a.volgorde - b.volgorde)
                .map((veld) => (
                  <div key={veld.id}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{veld.label}</p>
                    <p className="text-sm text-foreground">{selectedInzending.data[veld.id] || '-'}</p>
                  </div>
                ))}
              {selectedInzending.deal_id && (
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setDetailDialogOpen(false); navigate(`/deals/${selectedInzending.deal_id}`) }}>
                    Bekijk deal
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedInzending && selectedInzending.status !== 'verwerkt' && (
              <Button onClick={() => handleMarkVerwerkt(selectedInzending)} className="gap-1 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90">
                <CheckCircle className="h-4 w-4" /> Markeer verwerkt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
