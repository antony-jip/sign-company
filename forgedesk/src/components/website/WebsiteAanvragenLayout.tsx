import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import {
  Loader2, Eye, CheckCircle, MessageSquare, Mail, Phone, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { WebsiteAanvraag } from '@/types'
import { getWebsiteAanvragen, updateWebsiteAanvraag } from '@/services/supabaseService'
import { getCached, fetchQuery } from '@/lib/queryCache'

type FilterStatus = 'alle' | WebsiteAanvraag['status']

const STATUS_CONFIG: Record<WebsiteAanvraag['status'], { label: string; color: string }> = {
  nieuw: { label: 'Nieuw', color: 'bg-red-50/80 text-red-700 dark:bg-red-900/25 dark:text-red-400' },
  bekeken: { label: 'Bekeken', color: 'bg-amber-50/80 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400' },
  afgehandeld: { label: 'Afgehandeld', color: 'bg-wm-pale/25 text-accent dark:bg-accent/20 dark:text-wm-light' },
}

export function WebsiteAanvragenLayout() {
  const [aanvragen, setAanvragen] = useState<WebsiteAanvraag[]>(() => getCached<WebsiteAanvraag[]>('websiteAanvragen') ?? [])
  const [isLoading, setIsLoading] = useState(() => getCached('websiteAanvragen') === undefined)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedAanvraag, setSelectedAanvraag] = useState<WebsiteAanvraag | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const data = await fetchQuery('websiteAanvragen', getWebsiteAanvragen).catch(() => [])
        if (!cancelled) setAanvragen(data)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const gefilterd = useMemo(() => {
    let result = [...aanvragen]
    if (filterStatus !== 'alle') result = result.filter((a) => a.status === filterStatus)
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return result
  }, [aanvragen, filterStatus])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: aanvragen.length }
    for (const a of aanvragen) counts[a.status] = (counts[a.status] || 0) + 1
    return counts
  }, [aanvragen])

  const handleViewDetail = useCallback(async (aanvraag: WebsiteAanvraag) => {
    setSelectedAanvraag(aanvraag)
    setDetailDialogOpen(true)
    if (aanvraag.status === 'nieuw') {
      try {
        const updated = await updateWebsiteAanvraag(aanvraag.id, { status: 'bekeken' })
        setAanvragen((prev) => prev.map((a) => a.id === updated.id ? updated : a))
      } catch (err) { /* ignore */ }
    }
  }, [])

  const handleAfronden = useCallback(async (aanvraag: WebsiteAanvraag) => {
    try {
      const updated = await updateWebsiteAanvraag(aanvraag.id, { status: 'afgehandeld' })
      setAanvragen((prev) => prev.map((a) => a.id === updated.id ? updated : a))
      if (selectedAanvraag?.id === updated.id) setSelectedAanvraag(updated)
      toast.success('Aanvraag afgehandeld')
    } catch (err) {
      logger.error('Fout bij bijwerken:', err)
      toast.error('Fout bij bijwerken')
    }
  }, [selectedAanvraag])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Aanvragen</h1>
            <p className="text-sm text-muted-foreground">{statusCounts.nieuw || 0} nieuwe, {aanvragen.length} totaal · via signcompany.nl</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {(['alle', 'nieuw', 'bekeken', 'afgehandeld'] as FilterStatus[]).map((s) => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)} className="text-xs">
            {s === 'alle' ? 'Alle' : STATUS_CONFIG[s as WebsiteAanvraag['status']].label}
            <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
          </Button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          {gefilterd.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="rounded-full" style={{ width: '40px', height: '4px', backgroundColor: '#2A5580' }} />
              <p className="font-semibold" style={{ fontSize: '14px', color: '#191919' }}>Geen aanvragen gevonden</p>
              <p style={{ fontSize: '12px', color: '#5A5A55' }}>Aanvragen via de chat op signcompany.nl verschijnen hier.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {['Datum', 'Naam', 'Dienst', 'Contact', 'Status', ''].map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {gefilterd.map((aanvraag) => {
                  const cfg = STATUS_CONFIG[aanvraag.status]
                  return (
                    <tr key={aanvraag.id} className="group hover:bg-bg-hover transition-colors duration-150 cursor-pointer" onClick={() => handleViewDetail(aanvraag)}>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDateTime(aanvraag.created_at)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[#1A4A52] dark:text-foreground">{aanvraag.naam}</td>
                      <td className="px-4 py-3 text-sm">{aanvraag.dienst || '-'}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{aanvraag.email}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={aanvraag.status} label={cfg.label} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewDetail(aanvraag) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {aanvraag.status !== 'afgehandeld' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#F15025]" onClick={(e) => { e.stopPropagation(); handleAfronden(aanvraag) }}>
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

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aanvraag van {selectedAanvraag?.naam}</DialogTitle>
          </DialogHeader>
          {selectedAanvraag && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground/60">
                {formatDateTime(selectedAanvraag.created_at)}
                {selectedAanvraag.pagina_url && (
                  <>
                    {' · '}
                    <a href={selectedAanvraag.pagina_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                      {selectedAanvraag.pagina_url.replace(/^https?:\/\/(www\.)?/, '')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </div>
              {selectedAanvraag.dienst && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Dienst</p>
                  <p className="text-sm text-foreground">{selectedAanvraag.dienst}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Bericht</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAanvraag.bericht}</p>
              </div>
              <div className="flex flex-col gap-1 pt-2 border-t">
                <a href={`mailto:${selectedAanvraag.email}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:underline">
                  <Mail className="h-4 w-4 text-muted-foreground" />{selectedAanvraag.email}
                </a>
                {selectedAanvraag.telefoon && (
                  <a href={`tel:${selectedAanvraag.telefoon}`} className="inline-flex items-center gap-2 text-sm text-foreground hover:underline">
                    <Phone className="h-4 w-4 text-muted-foreground" />{selectedAanvraag.telefoon}
                  </a>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedAanvraag && selectedAanvraag.status !== 'afgehandeld' && (
              <Button onClick={() => handleAfronden(selectedAanvraag)} className="gap-1 bg-[#F15025] hover:bg-[#F15025]/90 text-white">
                <CheckCircle className="h-4 w-4" /> Afronden
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
