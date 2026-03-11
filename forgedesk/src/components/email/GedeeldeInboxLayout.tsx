import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Users, UserPlus, MessageSquare, Send, AlertCircle,
  CheckCircle2, Clock, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatDateTime, getInitials } from '@/lib/utils'
import type { Email, Medewerker, InternEmailNotitie } from '@/types'
import {
  getGedeeldeEmails, getMedewerkers, updateEmailToewijzing,
  updateEmailTicketStatus, addInterneNotitie,
} from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'

// ─── Configs ────────────────────────────────────────────────────────

type TicketStatus = NonNullable<Email['ticket_status']>
type Prioriteit = NonNullable<Email['prioriteit_inbox']>
type Categorie = NonNullable<Email['categorie_inbox']>

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
  in_behandeling: { label: 'In behandeling', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
  wacht_op_klant: { label: 'Wacht op klant', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  afgerond: { label: 'Afgerond', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
}

const PRIORITEIT_CONFIG: Record<Prioriteit, { label: string; color: string }> = {
  laag: { label: 'Laag', color: 'bg-muted text-muted-foreground' },
  normaal: { label: 'Normaal', color: 'bg-blue-100 text-blue-600' },
  hoog: { label: 'Hoog', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
}

const CATEGORIE_CONFIG: Record<Categorie, { label: string }> = {
  offerte_aanvraag: { label: 'Offerte aanvraag' },
  klacht: { label: 'Klacht' },
  informatie: { label: 'Informatie' },
  support: { label: 'Support' },
  overig: { label: 'Overig' },
}

type FilterStatus = 'alle' | TicketStatus

// ─── Component ──────────────────────────────────────────────────────

export function GedeeldeInboxLayout() {
  const { user } = useAuth()
  const [emails, setEmails] = useState<Email[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('alle')
  const [filterMedewerker, setFilterMedewerker] = useState<string>('alle')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [notitieText, setNotitieText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // ── Data laden ──
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const [eData, mData] = await Promise.all([
          getGedeeldeEmails().catch(() => []),
          getMedewerkers().catch(() => []),
        ])
        if (cancelled) return
        setEmails(eData)
        setMedewerkers(mData)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  // ── Helpers ──
  const getMedewerkerNaam = useCallback((id: string) => {
    return medewerkers.find((m) => m.id === id)?.naam || 'Niet toegewezen'
  }, [medewerkers])

  const getMedewerkerInitials = useCallback((id: string) => {
    const m = medewerkers.find((mw) => mw.id === id)
    return m ? getInitials(m.naam) : '?'
  }, [medewerkers])

  // ── Filters ──
  const filtered = useMemo(() => {
    let result = [...emails]
    if (filterStatus !== 'alle') result = result.filter((e) => e.ticket_status === filterStatus)
    if (filterMedewerker !== 'alle') result = result.filter((e) => e.toegewezen_aan === filterMedewerker)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((e) =>
        e.onderwerp.toLowerCase().includes(q) ||
        e.van.toLowerCase().includes(q) ||
        e.aan.toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      // Urgent eerst
      const priOrder: Record<string, number> = { urgent: 0, hoog: 1, normaal: 2, laag: 3 }
      const pa = priOrder[a.prioriteit_inbox || 'normaal'] ?? 2
      const pb = priOrder[b.prioriteit_inbox || 'normaal'] ?? 2
      if (pa !== pb) return pa - pb
      return new Date(b.datum).getTime() - new Date(a.datum).getTime()
    })
    return result
  }, [emails, filterStatus, filterMedewerker, searchQuery])

  // ── Status tellingen ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alle: emails.length }
    for (const e of emails) {
      const s = e.ticket_status || 'open'
      counts[s] = (counts[s] || 0) + 1
    }
    return counts
  }, [emails])

  // ── Acties ──
  const handleToewijzen = useCallback(async (emailId: string, medewerkerId: string) => {
    try {
      const updated = await updateEmailToewijzing(emailId, medewerkerId)
      setEmails((prev) => prev.map((e) => e.id === updated.id ? updated : e))
      if (selectedEmail?.id === updated.id) setSelectedEmail(updated)
      toast.success(`Toegewezen aan ${getMedewerkerNaam(medewerkerId)}`)
    } catch {
      toast.error('Fout bij toewijzen')
    }
  }, [selectedEmail, getMedewerkerNaam])

  const handleStatusWijziging = useCallback(async (emailId: string, status: TicketStatus) => {
    try {
      const updated = await updateEmailTicketStatus(emailId, status)
      setEmails((prev) => prev.map((e) => e.id === updated.id ? updated : e))
      if (selectedEmail?.id === updated.id) setSelectedEmail(updated)
      toast.success(`Status gewijzigd naar ${STATUS_CONFIG[status].label}`)
    } catch {
      toast.error('Fout bij statuswijziging')
    }
  }, [selectedEmail])

  const handleAddNotitie = useCallback(async () => {
    if (!selectedEmail || !notitieText.trim() || !user) return
    setIsSavingNote(true)
    try {
      const notitie: InternEmailNotitie = {
        id: crypto.randomUUID(),
        medewerker_id: user.id,
        medewerker_naam: user.user_metadata?.voornaam
          ? `${user.user_metadata.voornaam} ${user.user_metadata.achternaam || ''}`.trim()
          : user.email?.split('@')[0] || 'Gebruiker',
        tekst: notitieText.trim(),
        datum: new Date().toISOString(),
      }
      const updated = await addInterneNotitie(selectedEmail.id, notitie)
      setEmails((prev) => prev.map((e) => e.id === updated.id ? updated : e))
      setSelectedEmail(updated)
      setNotitieText('')
      toast.success('Notitie toegevoegd')
    } catch {
      toast.error('Fout bij opslaan notitie')
    } finally {
      setIsSavingNote(false)
    }
  }, [selectedEmail, notitieText, user])

  const handleOpenDetail = useCallback((email: Email) => {
    setSelectedEmail(email)
    setDetailOpen(true)
    setNotitieText('')
  }, [])

  // ── Render helpers ──
  function extractSenderName(from: string): string {
    const match = from.match(/^([^<]+)/)
    return match ? match[1].trim() : from
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em]">Gedeelde Inbox</h2>
            <p className="text-sm text-muted-foreground">
              {statusCounts.open || 0} open, {emails.length} totaal
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filters */}
        <div className="flex gap-1">
          {(['alle', 'open', 'in_behandeling', 'wacht_op_klant', 'afgerond'] as FilterStatus[]).map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className="text-xs h-8"
            >
              {s === 'alle' ? 'Alle' : STATUS_CONFIG[s as TicketStatus].label}
              <span className="ml-1 opacity-70">({statusCounts[s] || 0})</span>
            </Button>
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Medewerker filter */}
        <Select value={filterMedewerker} onValueChange={setFilterMedewerker}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Medewerker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle medewerkers</SelectItem>
            {medewerkers.filter((m) => m.status === 'actief').map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Zoeken */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoeken..."
          className="w-48 h-8 text-xs"
        />
      </div>

      {/* Ticket lijst */}
      <Card>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">Geen tickets gevonden</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((email) => {
              const status = email.ticket_status || 'open'
              const cfg = STATUS_CONFIG[status]
              const StatusIcon = cfg.icon
              const prioriteit = email.prioriteit_inbox || 'normaal'
              const priCfg = PRIORITEIT_CONFIG[prioriteit]
              const notitieCount = email.interne_notities?.length || 0

              return (
                <div
                  key={email.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleOpenDetail(email)}
                >
                  {/* Prioriteit indicator */}
                  <div className={cn(
                    'w-1.5 h-10 rounded-full flex-shrink-0',
                    prioriteit === 'urgent' ? 'bg-red-500' :
                    prioriteit === 'hoog' ? 'bg-orange-500' :
                    prioriteit === 'normaal' ? 'bg-blue-400' : 'bg-border'
                  )} />

                  {/* Toegewezen avatar */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {email.toegewezen_aan
                      ? getMedewerkerInitials(email.toegewezen_aan)
                      : <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {extractSenderName(email.van)}
                      </span>
                      {email.categorie_inbox && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {CATEGORIE_CONFIG[email.categorie_inbox].label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground/80 truncate">{email.onderwerp}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {email.inhoud?.replace(/<[^>]*>/g, '').substring(0, 80)}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {notitieCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {notitieCount}
                      </div>
                    )}
                    <Badge variant="secondary" className={cn('text-[10px]', cfg.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTime(email.datum)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Ticket detail
            </DialogTitle>
          </DialogHeader>

          {selectedEmail && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Email info */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{selectedEmail.onderwerp}</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Van: <strong className="text-foreground">{extractSenderName(selectedEmail.van)}</strong></span>
                  <span>·</span>
                  <span>{formatDateTime(selectedEmail.datum)}</span>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-sm max-h-[200px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.inhoud || '' }}
                />
              </div>

              {/* Acties */}
              <div className="grid grid-cols-2 gap-3">
                {/* Toewijzen */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Toewijzen aan</label>
                  <Select
                    value={selectedEmail.toegewezen_aan || ''}
                    onValueChange={(v) => handleToewijzen(selectedEmail.id, v)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecteer medewerker" />
                    </SelectTrigger>
                    <SelectContent>
                      {medewerkers.filter((m) => m.status === 'actief').map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                  <Select
                    value={selectedEmail.ticket_status || 'open'}
                    onValueChange={(v) => handleStatusWijziging(selectedEmail.id, v as TicketStatus)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(STATUS_CONFIG) as [TicketStatus, typeof STATUS_CONFIG[TicketStatus]][]).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Prioriteit + Categorie badges */}
              <div className="flex items-center gap-2">
                {selectedEmail.prioriteit_inbox && (
                  <Badge variant="secondary" className={cn('text-xs', PRIORITEIT_CONFIG[selectedEmail.prioriteit_inbox].color)}>
                    {PRIORITEIT_CONFIG[selectedEmail.prioriteit_inbox].label}
                  </Badge>
                )}
                {selectedEmail.categorie_inbox && (
                  <Badge variant="outline" className="text-xs">
                    {CATEGORIE_CONFIG[selectedEmail.categorie_inbox].label}
                  </Badge>
                )}
                {selectedEmail.toegewezen_aan && (
                  <Badge variant="secondary" className="text-xs">
                    <UserPlus className="h-3 w-3 mr-1" />
                    {getMedewerkerNaam(selectedEmail.toegewezen_aan)}
                  </Badge>
                )}
              </div>

              {/* Interne notities */}
              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Interne notities
                  <span className="text-xs text-muted-foreground font-normal">(niet zichtbaar voor klant)</span>
                </h4>

                {/* Bestaande notities */}
                <div className="space-y-2 mb-3">
                  {(selectedEmail.interne_notities || [])
                    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())
                    .map((notitie) => (
                      <div key={notitie.id} className="flex gap-2 p-2 bg-muted/50 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                          {getInitials(notitie.medewerker_naam)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{notitie.medewerker_naam}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDateTime(notitie.datum)}</span>
                          </div>
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{notitie.tekst}</p>
                        </div>
                      </div>
                    ))}
                  {(!selectedEmail.interne_notities || selectedEmail.interne_notities.length === 0) && (
                    <p className="text-xs text-muted-foreground italic">Nog geen notities</p>
                  )}
                </div>

                {/* Nieuwe notitie */}
                <div className="flex gap-2">
                  <Textarea
                    value={notitieText}
                    onChange={(e) => setNotitieText(e.target.value)}
                    placeholder="Schrijf een interne notitie..."
                    className="text-sm min-h-[60px] flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleAddNotitie}
                    disabled={!notitieText.trim() || isSavingNote}
                    className="self-end h-9 w-9"
                  >
                    {isSavingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
