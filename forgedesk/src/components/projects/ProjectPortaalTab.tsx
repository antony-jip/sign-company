import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Link2,
  Copy,
  Plus,
  ExternalLink,
  FileText,
  Image,
  Receipt,
  MessageSquare,
  Eye,
  EyeOff,
  Clock,
  CheckCircle2,
  RotateCcw,
  CreditCard,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Upload,
  Calendar,
  AlertCircle,
  Bell,
  Send,
  Reply,
  GripVertical,
  ChevronDown,
  ChevronRight,
  StickyNote,
  UserCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  getPortaalByProject,
  getPortaalItems,
  createPortaalItem,
  createPortaalReactie,
  updatePortaalItem,
  deletePortaalItem,
  createPortaalBestand,
  getOffertesByProject,
  getFacturenByProject,
  getNotificaties,
  markNotificatieGelezen,
  getMedewerkers,
} from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur, Notificatie, Medewerker } from '@/types'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

interface ProjectPortaalTabProps {
  projectId: string
  projectNaam: string
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  offerte: FileText,
  tekening: Image,
  factuur: Receipt,
  bericht: MessageSquare,
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  verstuurd: { label: 'Verstuurd', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: Clock },
  bekeken: { label: 'Bekeken', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Eye },
  goedgekeurd: { label: 'Goedgekeurd', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CheckCircle2 },
  revisie: { label: 'Revisie', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300', icon: RotateCcw },
  betaald: { label: 'Betaald', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300', icon: CreditCard },
  vervangen: { label: 'Vervangen', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: AlertCircle },
}

export function ProjectPortaalTab({ projectId, projectNaam }: ProjectPortaalTabProps) {
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [items, setItems] = useState<PortaalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Item toevoegen state
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemType, setItemType] = useState<'offerte' | 'tekening' | 'factuur' | 'bericht'>('bericht')
  const [itemTitel, setItemTitel] = useState('')
  const [itemOmschrijving, setItemOmschrijving] = useState('')
  const [itemLabel, setItemLabel] = useState('')
  const [selectedOfferteId, setSelectedOfferteId] = useState('')
  const [selectedFactuurId, setSelectedFactuurId] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  // Tekening upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])

  // Dropdown data
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])

  // Notificaties voor dit project
  const [notificaties, setNotificaties] = useState<Notificatie[]>([])

  // Inline reply state
  const [replyItemId, setReplyItemId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySending, setReplySending] = useState(false)

  // Checklist redesign state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const fetchPortaal = useCallback(async () => {
    try {
      const p = await getPortaalByProject(projectId)
      setPortaal(p)
      if (p) {
        const itms = await getPortaalItems(p.id)
        setItems(itms)
      }
      // Haal portaal-gerelateerde notificaties op voor dit project
      try {
        const allNotifs = await getNotificaties()
        const portaalNotifs = allNotifs.filter(
          n => n.project_id === projectId &&
            ['portaal_goedkeuring', 'portaal_revisie', 'portaal_bericht', 'portaal_bekeken'].includes(n.type) &&
            !n.gelezen
        )
        setNotificaties(portaalNotifs)
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Fout bij ophalen portaal:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchPortaal()
    getMedewerkers().then(setMedewerkers).catch(() => {})
  }, [fetchPortaal])

  async function handleCreatePortaal() {
    if (!user?.id) return
    setCreating(true)
    try {
      const response = await fetch('/api/portaal-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@supabase/supabase-js')).createClient(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          ).auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ project_id: projectId }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon portaal niet aanmaken')
      }
      toast.success('Klantportaal aangemaakt')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  async function handleVerlengen() {
    if (!portaal) return
    try {
      const response = await fetch('/api/portaal-verlengen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@supabase/supabase-js')).createClient(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          ).auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({ portaal_id: portaal.id }),
      })
      if (!response.ok) throw new Error('Kon portaal niet verlengen')
      toast.success('Portaal verlengd met 30 dagen')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDeactiveer() {
    if (!portaal) return
    try {
      const { deactiveerPortaal } = await import('@/services/supabaseService')
      await deactiveerPortaal(portaal.id)
      toast.success('Portaal gedeactiveerd')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleActiveer() {
    if (!portaal) return
    // Re-activate by extending
    await handleVerlengen()
  }

  function copyLink() {
    if (!portaal) return
    const url = `${window.location.origin}/portaal/${portaal.token}`
    navigator.clipboard.writeText(url)
    toast.success('Portaallink gekopieerd')
  }

  function openItemDialog(type: 'offerte' | 'tekening' | 'factuur' | 'bericht') {
    setItemType(type)
    setItemTitel('')
    setItemOmschrijving('')
    setItemLabel('')
    setSelectedOfferteId('')
    setSelectedFactuurId('')
    setUploadFiles([])

    // Laad data voor dropdowns
    if (type === 'offerte') {
      getOffertesByProject(projectId).then(setOffertes)
    } else if (type === 'factuur') {
      getFacturenByProject(projectId).then(setFacturen)
    }

    setItemDialogOpen(true)
  }

  async function handleSaveItem() {
    if (!portaal || !user?.id) return

    if (itemType === 'offerte' && !selectedOfferteId) {
      toast.error('Selecteer een offerte')
      return
    }
    if (itemType === 'factuur' && !selectedFactuurId) {
      toast.error('Selecteer een factuur')
      return
    }
    if (itemType === 'tekening' && uploadFiles.length === 0) {
      toast.error('Upload minimaal één bestand')
      return
    }
    if (!itemTitel.trim() && itemType === 'bericht') {
      toast.error('Titel is verplicht')
      return
    }

    setSavingItem(true)
    try {
      // Build titel from selection if needed
      let titel = itemTitel.trim()
      let offerte_id: string | undefined
      let factuur_id: string | undefined
      let bedrag: number | undefined
      let mollie_payment_url: string | undefined

      if (itemType === 'offerte') {
        const offerte = offertes.find(o => o.id === selectedOfferteId)
        if (!titel && offerte) titel = offerte.titel || `Offerte ${offerte.offerte_nummer}`
        offerte_id = selectedOfferteId
      } else if (itemType === 'factuur') {
        const factuur = facturen.find(f => f.id === selectedFactuurId)
        if (!titel && factuur) titel = `Factuur ${factuur.factuur_nummer}`
        factuur_id = selectedFactuurId
        bedrag = factuur?.totaal_incl_btw
        mollie_payment_url = factuur?.betaal_link || undefined
      } else if (itemType === 'tekening') {
        if (!titel) titel = uploadFiles[0]?.name || 'Tekening'
      }

      if (!titel) {
        toast.error('Titel is verplicht')
        setSavingItem(false)
        return
      }

      const newItem = await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: itemType,
        titel,
        omschrijving: itemOmschrijving || undefined,
        label: itemLabel || undefined,
        offerte_id,
        factuur_id,
        bedrag,
        mollie_payment_url,
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })

      // Upload bestanden bij tekening
      if (itemType === 'tekening' && uploadFiles.length > 0) {
        for (const file of uploadFiles) {
          const path = `${user.id}/portaal/${portaal.id}/${Date.now()}_${file.name}`
          const url = await uploadFile(file, path)
          await createPortaalBestand({
            portaal_item_id: newItem.id,
            bestandsnaam: file.name,
            mime_type: file.type,
            grootte: file.size,
            url,
            thumbnail_url: file.type.startsWith('image/') ? url : undefined,
            uploaded_by: 'bedrijf',
          })
        }
      }

      toast.success('Item toegevoegd aan portaal')
      setItemDialogOpen(false)

      // Email naar klant (niet-blokkerend)
      try {
        const { getProject, getKlant } = await import('@/services/supabaseService')
        const { sendEmail } = await import('@/services/gmailService')
        const project = await getProject(projectId)
        if (project?.klant_id) {
          const klant = await getKlant(project.klant_id)
          const klantEmail = klant?.email || klant?.contactpersonen?.[0]?.email
          if (klantEmail && portaal) {
            const bedrijfsnaam = profile?.bedrijfsnaam || ''
            const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
            sendEmail(
              klantEmail,
              `${bedrijfsnaam || 'Nieuw item'} — ${titel}`,
              [
                `Er is een nieuw item gedeeld voor project ${projectNaam}.`,
                '',
                titel,
                itemOmschrijving || '',
                '',
                `Bekijk het hier: ${portaalUrl}`,
              ].filter(Boolean).join('\n')
            ).catch(() => {}) // Niet-blokkerend
          }
        }
      } catch {
        // Email faalt silently
      }

      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message || 'Kon item niet toevoegen')
    } finally {
      setSavingItem(false)
    }
  }

  async function handleDeleteItem(itemId: string) {
    try {
      await deletePortaalItem(itemId)
      toast.success('Item verborgen voor klant')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleReply(itemId: string) {
    if (!replyText.trim() || !portaal) return
    setReplySending(true)
    try {
      // Maak een nieuw bericht-item als reactie op het portaal
      await createPortaalItem({
        user_id: user!.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'bericht',
        titel: 'Reactie',
        omschrijving: replyText.trim(),
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })

      // Reset item status als het revisie was → verstuurd (nieuwe versie onderweg)
      const item = items.find(i => i.id === itemId)
      if (item?.status === 'revisie') {
        await updatePortaalItem(itemId, { status: 'verstuurd' })
      }

      setReplyText('')
      setReplyItemId(null)
      toast.success('Reactie verstuurd')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setReplySending(false)
    }
  }

  function toggleExpand(itemId: string) {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  async function handleSaveNote(itemId: string) {
    try {
      await updatePortaalItem(itemId, { notitie: noteText })
      setEditingNoteId(null)
      toast.success('Notitie opgeslagen')
      await fetchPortaal()
    } catch {
      toast.error('Kon notitie niet opslaan')
    }
  }

  async function handleAssign(itemId: string, medewerkerUuid: string) {
    try {
      await updatePortaalItem(itemId, { toegewezen_aan: medewerkerUuid || undefined })
      toast.success('Toewijzing bijgewerkt')
      await fetchPortaal()
    } catch {
      toast.error('Kon niet toewijzen')
    }
  }

  async function handleDrop(targetIndex: number) {
    if (draggedId === null) return
    const currentItems = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const draggedIndex = currentItems.findIndex(i => i.id === draggedId)
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedId(null)
      return
    }
    const [moved] = currentItems.splice(draggedIndex, 1)
    currentItems.splice(targetIndex, 0, moved)
    // Update sort_order for all items
    for (let i = 0; i < currentItems.length; i++) {
      if (currentItems[i].sort_order !== i) {
        updatePortaalItem(currentItems[i].id, { sort_order: i }).catch(() => {})
      }
    }
    setItems(currentItems.map((item, i) => ({ ...item, sort_order: i })))
    setDraggedId(null)
  }

  async function handleMarkNotifGelezen(notifId: string) {
    try {
      await markNotificatieGelezen(notifId)
      setNotificaties(prev => prev.filter(n => n.id !== notifId))
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <Card className="border-border/80 dark:border-border/80">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // Geen portaal — toon aanmaken knop
  if (!portaal) {
    return (
      <Card className="border-border/80 dark:border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Link2 className="h-3.5 w-3.5 text-white" />
            </div>
            Klantportaal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Maak een klantportaal aan om offertes, tekeningen en facturen te delen.
          </p>
          <Button size="sm" onClick={handleCreatePortaal} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Portaal aanmaken
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen

  // Progress tracking
  const goedgekeurdCount = items.filter(i => i.status === 'goedgekeurd').length
  const sortedItems = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const progressPct = items.length > 0 ? Math.round((goedgekeurdCount / items.length) * 100) : 0

  return (
    <>
      <div className="space-y-4">
        {/* 4.5 Portaal header */}
        <Card className="border-border/80">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Link2 className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{projectNaam}</span>
                    <Badge className={cn(
                      'text-2xs px-1.5',
                      isActief
                        ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    )}>
                      {isActief ? 'Actief' : isVerlopen ? 'Verlopen' : 'Gedeactiveerd'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Geldig tot {formatDate(portaal.verloopt_op)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={copyLink}>
                  <Copy className="h-3 w-3 mr-1" />
                  Link kopiëren
                </Button>
                {isVerlopen || !portaal.actief ? (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleActiveer}>
                    <Power className="h-3 w-3 mr-1" />
                    Heractiveren
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleVerlengen}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Verlengen
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={handleDeactiveer}>
                      <PowerOff className="h-3 w-3 mr-1" />
                      Deactiveren
                    </Button>
                  </>
                )}
                <a
                  href={`${window.location.origin}/portaal/${portaal.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center h-7 px-2 text-xs rounded-md border hover:bg-muted transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Notificatie-banner — subtiel */}
            {notificaties.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/40">
                <Bell className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-amber-700 dark:text-amber-400">
                  {notificaties.length} nieuwe melding{notificaties.length !== 1 ? 'en' : ''} van klant
                </span>
                <button
                  onClick={() => notificaties.forEach(n => handleMarkNotifGelezen(n.id))}
                  className="ml-auto text-amber-600 hover:text-amber-800 underline"
                >
                  Alles gelezen
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4.1 Progress indicator */}
        {items.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Voortgang: {goedgekeurdCount}/{items.length} items goedgekeurd</span>
              <span className="font-mono text-muted-foreground">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* 4.2 Items als draggable cards */}
        <div className="space-y-2">
          {sortedItems.map((item, idx) => {
            const TypeIcon = TYPE_ICONS[item.type] || FileText
            const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.verstuurd
            const StatusIcon = config.icon
            const isExpanded = expandedItems.has(item.id)
            const isGoedgekeurd = item.status === 'goedgekeurd'
            const hasRevisie = item.reacties?.some(r => r.type === 'revisie')
            const hasBericht = item.reacties?.some(r => r.type === 'bericht')
            const assignedMw = medewerkers.find(m => m.id === item.toegewezen_aan)

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedId(item.id)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDrop={() => handleDrop(idx)}
                onDragEnd={() => setDraggedId(null)}
                className={cn(
                  'bg-white dark:bg-card border border-border rounded-md shadow-sm transition-all',
                  draggedId === item.id && 'opacity-50',
                  isGoedgekeurd && 'bg-green-50/30 dark:bg-green-950/10'
                )}
              >
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer group"
                  onClick={() => toggleExpand(item.id)}
                >
                  {/* Drag handle */}
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 hover:text-muted-foreground cursor-grab flex-shrink-0" />

                  {/* Checkbox */}
                  <div className={cn(
                    'h-5 w-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isGoedgekeurd
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-border hover:border-muted-foreground/50'
                  )}>
                    {isGoedgekeurd && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </div>

                  {/* Type icon */}
                  <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                  {/* Title + optional description */}
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-sm font-medium truncate block',
                      isGoedgekeurd && 'line-through text-muted-foreground'
                    )}>
                      {item.titel}
                    </span>
                    {item.omschrijving && !isExpanded && (
                      <span className="text-xs text-muted-foreground truncate block">{item.omschrijving}</span>
                    )}
                  </div>

                  {/* Assigned */}
                  {assignedMw && (
                    <span className="text-2xs text-muted-foreground flex items-center gap-0.5 flex-shrink-0" title={`Toegewezen aan ${assignedMw.naam}`}>
                      <UserCircle className="h-3 w-3" />
                      {assignedMw.naam.split(' ')[0]}
                    </span>
                  )}

                  {/* Status badge */}
                  <Badge className={cn(config.color, 'text-2xs px-1.5 flex items-center gap-0.5 flex-shrink-0')}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {config.label}
                  </Badge>

                  {/* Expand chevron */}
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border/60 px-3 py-3 space-y-3 bg-muted/20">
                    {/* Omschrijving */}
                    {item.omschrijving && (
                      <p className="text-xs text-muted-foreground">{item.omschrijving}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-2xs text-muted-foreground">
                      <span>{formatDate(item.created_at)}</span>
                      {item.bekeken_op && (
                        <span className="flex items-center gap-0.5 text-blue-500">
                          <Eye className="h-2.5 w-2.5" />
                          Bekeken {formatDate(item.bekeken_op)}
                        </span>
                      )}
                      {item.label && (
                        <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{item.label}</span>
                      )}
                    </div>

                    {/* Bestanden */}
                    {item.bestanden && item.bestanden.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Bestanden</span>
                        {item.bestanden.map((b) => (
                          <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <FileText className="h-3 w-3" />
                            {b.bestandsnaam}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Reacties */}
                    {item.reacties && item.reacties.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Klant reacties</span>
                        {item.reacties.map((reactie) => (
                          <div key={reactie.id} className={cn(
                            'flex items-start gap-1.5 text-2xs rounded px-2 py-1.5',
                            reactie.type === 'goedkeuring' ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                            : reactie.type === 'revisie' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                          )}>
                            {reactie.type === 'goedkeuring' ? <CheckCircle2 className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              : reactie.type === 'revisie' ? <RotateCcw className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              : <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />}
                            <div className="flex-1">
                              <span className="font-medium">
                                {reactie.type === 'goedkeuring' ? 'Goedgekeurd' : reactie.type === 'revisie' ? 'Revisie' : 'Bericht'}
                                {reactie.klant_naam && ` — ${reactie.klant_naam}`}
                              </span>
                              {reactie.bericht && <p className="mt-0.5">{reactie.bericht}</p>}
                              <span className="text-muted-foreground/60">{formatDate(reactie.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 4.3 Inline acties */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Notitie toevoegen */}
                      {editingNoteId === item.id ? (
                        <div className="flex items-end gap-1.5 w-full">
                          <Textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveNote(item.id) }
                            }}
                            placeholder="Interne notitie..."
                            rows={1}
                            className="text-xs min-h-[32px] resize-none flex-1"
                            autoFocus
                          />
                          <Button size="sm" className="h-8 px-2 text-xs" onClick={() => handleSaveNote(item.id)}>Opslaan</Button>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setEditingNoteId(null)}>Annuleer</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingNoteId(item.id); setNoteText(item.notitie || '') }}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <StickyNote className="h-3 w-3" />
                          {item.notitie ? 'Notitie bewerken' : 'Notitie toevoegen'}
                        </button>
                      )}

                      {/* Toewijzen */}
                      {editingNoteId !== item.id && (
                        <Select
                          value={item.toegewezen_aan || ''}
                          onValueChange={(val) => handleAssign(item.id, val)}
                        >
                          <SelectTrigger className="h-7 w-auto text-xs gap-1 border-none shadow-none text-muted-foreground hover:text-foreground px-1">
                            <UserCircle className="h-3 w-3" />
                            <SelectValue placeholder="Toewijzen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Niet toegewezen</SelectItem>
                            {medewerkers.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.naam}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Reageren */}
                      {isActief && (hasRevisie || hasBericht) && replyItemId !== item.id && editingNoteId !== item.id && (
                        <button
                          onClick={() => { setReplyItemId(item.id); setReplyText('') }}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <Reply className="h-3 w-3" />
                          Reageren
                        </button>
                      )}

                      {/* Verwijderen */}
                      {editingNoteId !== item.id && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                          title="Verbergen voor klant"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Notitie weergave */}
                    {item.notitie && editingNoteId !== item.id && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-amber-50/50 dark:bg-amber-950/10 rounded px-2 py-1.5 border border-amber-200/30">
                        <StickyNote className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                        {item.notitie}
                      </div>
                    )}

                    {/* Inline reply */}
                    {replyItemId === item.id && (
                      <div className="flex items-end gap-1.5">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (replyText.trim()) handleReply(item.id) }
                          }}
                          placeholder="Typ een reactie naar de klant..."
                          rows={1}
                          className="text-xs min-h-[32px] resize-none"
                          autoFocus
                        />
                        <Button size="sm" className="h-8 w-8 p-0 flex-shrink-0" disabled={replySending || !replyText.trim()} onClick={() => handleReply(item.id)}>
                          {replySending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground flex-shrink-0" onClick={() => setReplyItemId(null)}>
                          Annuleer
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 4.4 Toevoegen onderaan */}
        {isActief && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openItemDialog('offerte')}>
              <Plus className="h-3 w-3 mr-1" />
              Offerte
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openItemDialog('tekening')}>
              <Plus className="h-3 w-3 mr-1" />
              Tekening
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openItemDialog('factuur')}>
              <Plus className="h-3 w-3 mr-1" />
              Factuur
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openItemDialog('bericht')}>
              <Plus className="h-3 w-3 mr-1" />
              Bericht
            </Button>
          </div>
        )}
      </div>

      {/* Item toevoegen dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {itemType === 'offerte' && <FileText className="h-5 w-5 text-blue-500" />}
              {itemType === 'tekening' && <Image className="h-5 w-5 text-emerald-500" />}
              {itemType === 'factuur' && <Receipt className="h-5 w-5 text-amber-500" />}
              {itemType === 'bericht' && <MessageSquare className="h-5 w-5 text-purple-500" />}
              {{
                offerte: 'Offerte delen',
                tekening: 'Tekening uploaden',
                factuur: 'Factuur delen',
                bericht: 'Bericht sturen',
              }[itemType]}
            </DialogTitle>
            <DialogDescription>
              Dit item wordt zichtbaar op het klantportaal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {itemType === 'offerte' && (
              <div>
                <Label className="text-sm">Offerte</Label>
                <Select value={selectedOfferteId} onValueChange={setSelectedOfferteId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecteer offerte..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offertes.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.offerte_nummer} — {o.titel || 'Geen titel'} ({formatCurrency(o.totaal_incl_btw || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemType === 'factuur' && (
              <div>
                <Label className="text-sm">Factuur</Label>
                <Select value={selectedFactuurId} onValueChange={setSelectedFactuurId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecteer factuur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facturen.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.factuur_nummer} — {formatCurrency(f.totaal_incl_btw || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemType === 'tekening' && (
              <div>
                <Label className="text-sm">Bestanden</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {uploadFiles.length > 0
                      ? `${uploadFiles.length} bestand(en) geselecteerd`
                      : 'Klik om bestanden te selecteren'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) setUploadFiles(Array.from(e.target.files))
                  }}
                />
              </div>
            )}

            <div>
              <Label className="text-sm">Titel{itemType !== 'offerte' && itemType !== 'factuur' ? ' *' : ' (optioneel)'}</Label>
              <Input
                value={itemTitel}
                onChange={(e) => setItemTitel(e.target.value)}
                placeholder={
                  itemType === 'offerte' ? 'Wordt overgenomen van offerte'
                    : itemType === 'factuur' ? 'Wordt overgenomen van factuur'
                    : itemType === 'tekening' ? 'Bijv. Ontwerp voorgevel v2'
                    : 'Titel van het bericht'
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Omschrijving</Label>
              <Textarea
                value={itemOmschrijving}
                onChange={(e) => setItemOmschrijving(e.target.value)}
                placeholder="Optionele toelichting..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Label (optioneel)</Label>
              <Input
                value={itemLabel}
                onChange={(e) => setItemLabel(e.target.value)}
                placeholder="Bijv. Concept, Definitief, Revisie 2"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Toevoegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
