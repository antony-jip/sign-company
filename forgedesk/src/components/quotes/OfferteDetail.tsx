import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  getOfferte,
  getOfferteItems,
  getKlant,
  updateOfferte,
  createOfferte,
  createOfferteItem,
  deleteOfferte,
  createPortaal,
  createPortaalItem,
  getPortaalByProject,
  getPortaalItems,
} from '@/services/supabaseService'
import type { Offerte, OfferteItem, Klant, OfferteActiviteit } from '@/types'
import { cn, formatCurrency, formatDate, formatDateTime, getStatusColor } from '@/lib/utils'
import { getStatusBadgeClass } from '@/utils/statusColors'
import { round2 } from '@/utils/budgetUtils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { generateOffertePDF } from '@/services/pdfService'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Pencil,
  FileText,
  Send,
  Copy,
  Trash2,
  Loader2,
  ExternalLink,
  Mail,
  Calendar,
  Building2,
  Check,
  X,
  ChevronDown,
  Receipt,
  Eye,
  ClipboardList,
} from 'lucide-react'
import { logger } from '../../utils/logger'
import { KlantStatusBadgeInline, KlantStatusWarning } from '@/components/shared/KlantStatusWarning'
import { AuditLogPanel } from '@/components/shared/AuditLogPanel'
import { logWijziging } from '@/utils/auditLogger'
import { WerkbonAanmaakDialog } from '@/components/werkbonnen/WerkbonAanmaakDialog'
import { PdfPreviewDialog } from '@/components/shared/PdfPreviewDialog'
import { VisualisatieGallery } from '@/components/visualizer/VisualisatieGallery'

const STATUS_LABELS: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verstuurd',
  bekeken: 'Bekeken',
  goedgekeurd: 'Akkoord',
  afgewezen: 'Afgewezen',
  verlopen: 'Verlopen',
  gefactureerd: 'Gefactureerd',
  wijziging_gevraagd: 'Wijziging gevraagd',
}

const STATUS_OPTIONS: Array<{ key: Offerte['status']; label: string }> = [
  { key: 'concept', label: 'Concept' },
  { key: 'verzonden', label: 'Verstuurd' },
  { key: 'bekeken', label: 'Bekeken' },
  { key: 'goedgekeurd', label: 'Akkoord' },
  { key: 'afgewezen', label: 'Afgewezen' },
  { key: 'verlopen', label: 'Verlopen' },
  { key: 'gefactureerd', label: 'Gefactureerd' },
  { key: 'wijziging_gevraagd', label: 'Wijziging gevraagd' },
]

const ACTIVITEIT_ICONS: Record<string, string> = {
  aangemaakt: '✏️',
  bewerkt: '📝',
  verstuurd: '📧',
  bekeken: '👁️',
  akkoord: '✅',
  afgewezen: '❌',
  gefactureerd: '💰',
  wijziging_gevraagd: '💬',
}

function calculateLineTotaal(item: { aantal: number; eenheidsprijs: number; korting_percentage: number }) {
  const bruto = item.aantal * item.eenheidsprijs
  return round2(bruto - bruto * (item.korting_percentage / 100))
}

export function OfferteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { pipelineStappen, bedrijfsnaam, primaireKleur, emailHandtekening, profile } = useAppSettings()
  const documentStyle = useDocumentStyle()

  const [offerte, setOfferte] = useState<Offerte | null>(null)
  const [items, setItems] = useState<OfferteItem[]>([])
  const [klant, setKlant] = useState<Klant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)

  // Edit form state
  const [editIntro, setEditIntro] = useState('')
  const [editOutro, setEditOutro] = useState('')
  const [editTitel, setEditTitel] = useState('')
  const [editNotities, setEditNotities] = useState('')

  // Send dialog state
  const [sendTo, setSendTo] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showWerkbonDialog, setShowWerkbonDialog] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [portaalToken, setPortaalToken] = useState<string | null>(null)

  // Fetch data
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      try {
        const fetchedOfferte = await getOfferte(id!)
        if (cancelled) return
        if (!fetchedOfferte) {
          setOfferte(null)
          setIsLoading(false)
          return
        }
        setOfferte(fetchedOfferte)

        const [fetchedKlant, fetchedItems] = await Promise.all([
          getKlant(fetchedOfferte.klant_id),
          getOfferteItems(fetchedOfferte.id),
        ])
        if (cancelled) return
        setKlant(fetchedKlant)
        setItems(fetchedItems)

        // Zoek portaal token op als de offerte aan een project gekoppeld is
        if (fetchedOfferte.project_id) {
          getPortaalByProject(fetchedOfferte.project_id)
            .then(p => { if (p && !cancelled) setPortaalToken(p.token) })
            .catch(() => {})
        }
      } catch (err) {
        logger.error('Failed to load offerte:', err)
        toast.error('Kon offerte niet laden')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [id])

  // Start editing
  const startEditing = useCallback(() => {
    if (!offerte) return
    setEditTitel(offerte.titel)
    setEditIntro(offerte.intro_tekst || '')
    setEditOutro(offerte.outro_tekst || '')
    setEditNotities(offerte.notities || '')
    setIsEditing(true)
  }, [offerte])

  // Save edits
  const saveEdits = useCallback(async () => {
    if (!offerte) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      const newActivity: OfferteActiviteit = {
        datum: now,
        type: 'bewerkt',
        beschrijving: 'Offerte bijgewerkt',
        medewerker: user?.email || undefined,
      }
      const updated = await updateOfferte(offerte.id, {
        titel: editTitel,
        intro_tekst: editIntro,
        outro_tekst: editOutro,
        notities: editNotities,
        activiteiten: [...(offerte.activiteiten || []), newActivity],
      })
      setOfferte(updated)
      setIsEditing(false)
      toast.success('Offerte bijgewerkt')
    } catch (err) {
      logger.error('Failed to save offerte:', err)
      toast.error('Kon offerte niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [offerte, editTitel, editIntro, editOutro, editNotities, user])

  // Status change
  const handleStatusChange = useCallback(async (newStatus: Offerte['status']) => {
    if (!offerte) return
    try {
      const now = new Date().toISOString()
      const updates: Partial<Offerte> = { status: newStatus }
      let actType: OfferteActiviteit['type'] = 'bewerkt'

      if (newStatus === 'goedgekeurd') {
        updates.akkoord_op = now
        actType = 'akkoord'
      } else if (newStatus === 'gefactureerd') {
        actType = 'gefactureerd'
      } else if (newStatus === 'afgewezen') {
        actType = 'afgewezen'
      } else if (newStatus === 'verzonden') {
        updates.verstuurd_op = now
        actType = 'verstuurd'
      }

      const newActivity: OfferteActiviteit = {
        datum: now,
        type: actType,
        beschrijving: `Status gewijzigd naar ${STATUS_LABELS[newStatus] || newStatus}`,
        medewerker: user?.email || undefined,
      }
      updates.activiteiten = [...(offerte.activiteiten || []), newActivity]

      const updated = await updateOfferte(offerte.id, updates)
      setOfferte(updated)
      setStatusOpen(false)
      // Audit log
      if (user?.id) {
        const naam = user.voornaam ? `${user.voornaam} ${user.achternaam || ''}`.trim() : user.email || ''
        logWijziging({ userId: user.id, entityType: 'offerte', entityId: offerte.id, actie: 'status_gewijzigd', medewerkerNaam: naam, veld: 'status', oudeWaarde: offerte.status, nieuweWaarde: newStatus })
      }
      toast.success(`Status bijgewerkt naar ${STATUS_LABELS[newStatus]}`)
    } catch (err) {
      logger.error('Failed to update status:', err)
      toast.error('Kon status niet bijwerken')
    }
  }, [offerte, user])

  // Open send dialog
  const openSendDialog = useCallback(() => {
    if (!offerte || !klant) return
    const selectedCp = offerte.contactpersoon_id
      ? klant.contactpersonen?.find(c => c.id === offerte.contactpersoon_id)
      : klant.contactpersonen?.find(c => c.is_primair) || klant.contactpersonen?.[0]
    const contactEmail = selectedCp?.email || klant.email || ''
    const contactNaam = selectedCp?.naam || klant.contactpersoon || klant.bedrijfsnaam
    setSendTo(contactEmail)
    setSendSubject(`Offerte ${offerte.nummer} — ${offerte.titel}`)
    setSendBody(
      `Beste ${contactNaam},\n\nHierbij ontvangt u onze offerte ${offerte.nummer} voor "${offerte.titel}".\n\nWij zien uw reactie graag tegemoet.\n\nMet vriendelijke groet,\n${bedrijfsnaam || 'Uw bedrijf'}`
    )
    setShowSendDialog(true)
  }, [offerte, klant, bedrijfsnaam])

  // Send offerte
  const handleSend = useCallback(async () => {
    if (!offerte || !user?.id) return
    setIsSending(true)
    try {
      // Gebruik portaal-systeem als de offerte aan een project gekoppeld is
      let publiekeUrl = ''

      if (offerte.project_id) {
        // Maak portaal aan of hergebruik bestaand portaal
        const portaal = await createPortaal(offerte.project_id, user.id)

        // Check of er al een portaal_item bestaat voor deze offerte
        const bestaandeItems = await getPortaalItems(portaal.id)
        const bestaandOfferteItem = bestaandeItems.find(
          (i) => i.type === 'offerte' && i.offerte_id === offerte.id
        )

        if (!bestaandOfferteItem) {
          await createPortaalItem({
            user_id: user.id,
            project_id: offerte.project_id,
            portaal_id: portaal.id,
            type: 'offerte',
            offerte_id: offerte.id,
            titel: `Offerte ${offerte.nummer}`,
            omschrijving: offerte.titel,
            label: formatCurrency(offerte.totaal),
            status: 'verstuurd',
            zichtbaar_voor_klant: true,
            bedrag: offerte.totaal,
            volgorde: 0,
          })
        }

        publiekeUrl = `${window.location.origin}/portaal/${portaal.token}`
        setPortaalToken(portaal.token)
      } else {
        // Fallback: offerte zonder project → gebruik oude publieke link
        let publiekToken = offerte.publiek_token
        if (!publiekToken) {
          publiekToken = crypto.randomUUID()
          await updateOfferte(offerte.id, { publiek_token: publiekToken })
          setOfferte({ ...offerte, publiek_token: publiekToken })
        }
        publiekeUrl = `${window.location.origin}/offerte-bekijken/${publiekToken}`
      }

      // Actually send the email
      const sendCp = offerte.contactpersoon_id
        ? klant?.contactpersonen?.find(c => c.id === offerte.contactpersoon_id)
        : null
      const { subject, html, text } = offerteVerzendTemplate({
        klantNaam: sendCp?.naam || klant?.contactpersoon || klant?.bedrijfsnaam || '',
        offerteNummer: offerte.nummer,
        offerteTitel: offerte.titel,
        totaalBedrag: formatCurrency(offerte.totaal),
        geldigTot: formatDate(offerte.geldig_tot),
        bedrijfsnaam: bedrijfsnaam || 'Uw bedrijf',
        primaireKleur,
        handtekening: emailHandtekening || undefined,
        logoUrl: profile?.logo_url || undefined,
        bekijkUrl: publiekeUrl,
      })

      // Genereer PDF bijlage
      let attachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
      try {
        const doc = generateOffertePDF(
          offerte,
          items,
          klant || {},
          { ...profile, primaireKleur: primaireKleur || '#2563eb' },
          documentStyle,
        )
        const pdfBase64 = doc.output('datauristring').split(',')[1]
        attachments = [{ filename: `${offerte.nummer}.pdf`, content: pdfBase64, encoding: 'base64' as const }]
      } catch (pdfErr) {
        logger.error('PDF genereren mislukt, email wordt zonder bijlage verstuurd:', pdfErr)
      }

      try {
        await sendEmail(sendTo, sendSubject || subject, text, { html, attachments })
      } catch {
        // Email sending failed (SMTP not configured), continue with status update
        toast.warning('Email niet verzonden (SMTP niet geconfigureerd). Status is wel bijgewerkt.')
      }

      const now = new Date().toISOString()
      const newActivity: OfferteActiviteit = {
        datum: now,
        type: 'verstuurd',
        beschrijving: `Verstuurd naar ${sendTo}`,
        medewerker: user?.email || undefined,
      }
      const updated = await updateOfferte(offerte.id, {
        status: 'verzonden',
        verstuurd_op: now,
        verstuurd_naar: sendTo,
        activiteiten: [...(offerte.activiteiten || []), newActivity],
      })
      setOfferte(updated)
      setShowSendDialog(false)
      toast.success('Offerte verstuurd', { description: `Email verstuurd naar ${sendTo}` })
    } catch (err) {
      logger.error('Failed to send offerte:', err)
      toast.error('Kon offerte niet versturen')
    } finally {
      setIsSending(false)
    }
  }, [offerte, klant, items, sendTo, sendSubject, user, bedrijfsnaam, primaireKleur, emailHandtekening, profile, documentStyle])

  // Duplicate offerte
  const handleDuplicate = useCallback(async () => {
    if (!offerte || !user?.id) return
    setIsDuplicating(true)
    try {
      const now = new Date().toISOString()
      const newActivity: OfferteActiviteit = {
        datum: now,
        type: 'aangemaakt',
        beschrijving: `Gedupliceerd van ${offerte.nummer}`,
        medewerker: user.email || undefined,
      }
      const newOfferte = await createOfferte({
        user_id: user.id,
        klant_id: offerte.klant_id,
        klant_naam: offerte.klant_naam,
        project_id: offerte.project_id,
        nummer: `${offerte.nummer}-kopie`,
        titel: `${offerte.titel} (kopie)`,
        status: 'concept',
        subtotaal: offerte.subtotaal,
        btw_bedrag: offerte.btw_bedrag,
        totaal: offerte.totaal,
        geldig_tot: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        notities: offerte.notities,
        voorwaarden: offerte.voorwaarden,
        intro_tekst: offerte.intro_tekst,
        outro_tekst: offerte.outro_tekst,
        activiteiten: [newActivity],
      })

      // Copy items
      for (const item of items) {
        await createOfferteItem({
          user_id: user?.id || '',
          offerte_id: newOfferte.id,
          beschrijving: item.beschrijving,
          aantal: item.aantal,
          eenheidsprijs: item.eenheidsprijs,
          btw_percentage: item.btw_percentage,
          korting_percentage: item.korting_percentage,
          totaal: item.totaal,
          volgorde: item.volgorde,
        })
      }

      toast.success('Offerte gedupliceerd')
      navigate(`/offertes/${newOfferte.id}/bewerken`)
    } catch (err) {
      logger.error('Failed to duplicate offerte:', err)
      toast.error('Kon offerte niet dupliceren')
    } finally {
      setIsDuplicating(false)
    }
  }, [offerte, items, user, navigate])

  // Delete offerte
  const handleDelete = useCallback(async () => {
    if (!offerte) return
    setIsDeleting(true)
    try {
      await deleteOfferte(offerte.id)
      toast.success('Offerte verwijderd')
      navigate('/offertes')
    } catch (err) {
      logger.error('Failed to delete offerte:', err)
      toast.error('Kon offerte niet verwijderen')
    } finally {
      setIsDeleting(false)
    }
  }, [offerte, navigate])

  // Create factuur from offerte — navigate to FactuurEditor with pre-fill
  const handleMaakFactuur = useCallback(() => {
    if (!offerte) return

    // Duplicate check: als offerte al een factuur heeft, navigeer daarheen
    if (offerte.geconverteerd_naar_factuur_id) {
      toast.info(`Offerte ${offerte.nummer} is al gefactureerd`)
      navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}/bewerken`)
      return
    }

    const params = new URLSearchParams({
      offerte_id: offerte.id,
      klant_id: offerte.klant_id,
      titel: offerte.titel,
    })
    if (offerte.project_id) params.set('project_id', offerte.project_id)
    navigate(`/facturen/nieuw?${params.toString()}`)
  }, [offerte, navigate])

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Offerte laden...</p>
        </div>
      </div>
    )
  }

  if (!offerte) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Offerte niet gevonden</p>
          <Button variant="outline" onClick={() => navigate('/offertes')}>
            Terug naar offertes
          </Button>
        </div>
      </div>
    )
  }

  // Calculate totals
  const subtotaal = round2(items.reduce((sum, item) => sum + calculateLineTotaal(item), 0))
  const btwGroups: Record<number, number> = {}
  items.forEach((item) => {
    const lineTotaal = calculateLineTotaal(item)
    const btwBedrag = round2(lineTotaal * (item.btw_percentage / 100))
    btwGroups[item.btw_percentage] = round2((btwGroups[item.btw_percentage] || 0) + btwBedrag)
  })
  const totaalBtw = round2(Object.values(btwGroups).reduce((sum, val) => sum + val, 0))
  const totaal = round2(subtotaal + totaalBtw)

  const activiteiten = [...(offerte.activiteiten || [])].sort(
    (a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()
  )

  return (
    <div className="max-w-5xl mx-auto space-y-4 mod-strip mod-strip-offertes">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/offertes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9B8EC4] mb-0.5">Offerte</p>
            <h1
              className="text-[26px] sm:text-[32px] font-extrabold tracking-[-0.04em] leading-none text-foreground cursor-pointer hover:text-primary transition-colors"
              title="Klik om nummer te kopiëren"
              onClick={() => {
                navigator.clipboard.writeText(offerte.nummer)
                toast.success('Offertenummer gekopieerd')
              }}
            >
              {offerte.nummer}
            </h1>
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="inline-flex items-center gap-1.5"
            >
              <Badge className={getStatusColor(offerte.status) + ' cursor-pointer'}>
                {STATUS_LABELS[offerte.status] || offerte.status}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Badge>
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleStatusChange(opt.key)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                      offerte.status === opt.key ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                Annuleren
              </Button>
              <Button size="sm" onClick={saveEdits} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Opslaan
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" />
                Bewerken
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/offertes/${offerte.id}/bewerken`)}
              >
                <FileText className="h-4 w-4 mr-1" />
                Calculatie bewerken
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPdfPreview(true)}>
                <Eye className="h-4 w-4 mr-1" />
                PDF Preview
              </Button>
              <Button size="sm" onClick={openSendDialog}>
                <Send className="h-4 w-4 mr-1" />
                Versturen
              </Button>
              {(portaalToken || offerte.publiek_token) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = portaalToken
                      ? `${window.location.origin}/portaal/${portaalToken}`
                      : `${window.location.origin}/offerte-bekijken/${offerte.publiek_token}`
                    navigator.clipboard.writeText(url)
                    toast.success('Offerte link gekopieerd naar klembord')
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Kopieer link
                </Button>
              )}
              {!offerte.geconverteerd_naar_factuur_id ? (
                <Button size="sm" onClick={handleMaakFactuur}>
                  <Receipt className="h-4 w-4 mr-1" />
                  Maak factuur
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
                  onClick={() => navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}`)}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  Bekijk factuur
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={isDuplicating}>
                {isDuplicating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                Dupliceren
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowWerkbonDialog(true)}>
                <ClipboardList className="h-4 w-4 mr-1" />
                Werkbon maken
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (items.length === 0) {
                    toast.error('Geen items om te kopiëren')
                    return
                  }
                  try {
                    const templates = items.map(({ id, user_id, offerte_id, created_at, updated_at, ...rest }) => ({
                      ...rest,
                      soort: 'prijs' as const,
                      extra_velden: rest.extra_velden || {},
                    }))
                    const key = 'forgedesk_clipboard_items'
                    localStorage.setItem(key, JSON.stringify(templates))
                    toast.success(`${templates.length} item${templates.length === 1 ? '' : 's'} gekopieerd — plak in een andere offerte`)
                  } catch {
                    toast.error('Kon items niet kopiëren')
                  }
                }}
              >
                <FileText className="h-4 w-4 mr-1" />
                Kopieer items
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Verwijderen
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status color strip */}
      <div className={`h-1 w-full rounded-t-lg ${getStatusBadgeClass(offerte.status)}`} style={{ border: 'none' }} />

      {/* Status pipeline */}
      {(() => {
        const pipelineSteps = [
          { key: 'concept', label: 'Concept' },
          { key: 'verzonden', label: 'Verstuurd' },
          { key: 'bekeken', label: 'Bekeken' },
          { key: 'goedgekeurd', label: 'Akkoord' },
          { key: 'gefactureerd', label: 'Gefactureerd' },
        ]
        const statusOrder = pipelineSteps.map(s => s.key)
        const currentIdx = statusOrder.indexOf(offerte.status)
        const isRejected = offerte.status === 'afgewezen'
        const isExpired = offerte.status === 'verlopen'
        const isModRequested = offerte.status === 'wijziging_gevraagd'

        return (
          <div className="flex items-center gap-0 py-3 px-2 overflow-x-auto scrollbar-hide bg-card rounded-xl border border-border/50">
            {pipelineSteps.map((step, idx) => {
              const isActive = step.key === offerte.status
              const isPast = currentIdx >= 0 && idx < currentIdx
              const isFuture = currentIdx >= 0 && idx > currentIdx

              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && (
                    <div className={cn(
                      'h-[2px] flex-1 min-w-4 sm:min-w-8 flex-shrink-0 transition-all duration-500 rounded-full',
                      isPast ? 'bg-[#9B8EC4]' : 'bg-border/60'
                    )} />
                  )}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <div className={cn(
                      'rounded-full border-2 transition-all duration-300',
                      isActive && 'w-4 h-4 bg-[#9B8EC4] border-[#9B8EC4] shadow-[0_0_12px_rgba(155,142,196,0.5)]',
                      isPast && 'w-3 h-3 bg-[#9B8EC4] border-[#9B8EC4]',
                      isFuture && 'w-3 h-3 bg-transparent border-border/60',
                      (isRejected || isExpired || isModRequested) && !isPast && 'w-3 h-3 bg-transparent border-border/60'
                    )} />
                    <span className={cn(
                      'text-[10px] whitespace-nowrap',
                      isActive ? 'font-bold text-[#9B8EC4]' : isPast ? 'font-medium text-muted-foreground' : 'text-muted-foreground/40'
                    )}>
                      {step.label}
                    </span>
                  </div>
                </React.Fragment>
              )
            })}
            {(isRejected || isExpired || isModRequested) && (
              <>
                <div className="h-[2px] w-6 sm:w-10 flex-shrink-0 bg-border" />
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2 scale-125',
                    isRejected && 'bg-red-400 border-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]',
                    isExpired && 'bg-amber-400 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]',
                    isModRequested && 'bg-blue-400 border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]'
                  )} />
                  <span className={cn(
                    'text-[10px] font-semibold whitespace-nowrap',
                    isRejected && 'text-red-500',
                    isExpired && 'text-amber-500',
                    isModRequested && 'text-blue-500'
                  )}>
                    {STATUS_LABELS[offerte.status]}
                  </span>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Client + Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Klant info */}
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
          <div className="section-header-pastel">
            <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680] flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5" />
              Klant
            </h3>
          </div>
          {klant ? (
            <div className="space-y-1.5">
              <p className="font-semibold text-foreground">{klant.bedrijfsnaam}<KlantStatusBadgeInline klant={klant} /></p>
              <p className="text-sm text-muted-foreground">{klant.contactpersoon}</p>
              {klant.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {klant.email}
                </p>
              )}
              {(klant.klant_labels || []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {klant.klant_labels!.map((label) => (
                    <Badge key={label} variant="secondary" className="text-[10px]">
                      {label.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate(`/klanten/${klant.id}`)}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
              >
                Bekijk klant
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Klant niet gevonden</p>
          )}
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
          <div className="section-header-pastel">
            <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680] flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Details
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Aangemaakt</span>
              <span className="font-medium text-foreground">{formatDate(offerte.created_at)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Geldig tot</span>
              <span className="font-medium text-foreground">{formatDate(offerte.geldig_tot)}</span>
            </div>
            {offerte.verstuurd_op && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Verstuurd op</span>
                <span className="font-medium text-foreground">{formatDateTime(offerte.verstuurd_op)}</span>
              </div>
            )}
            {offerte.akkoord_op && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Akkoord op</span>
                <span className="font-medium text-foreground">{formatDateTime(offerte.akkoord_op)}</span>
              </div>
            )}
            {offerte.project_id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Project</span>
                <button
                  onClick={() => navigate(`/projecten/${offerte.project_id}`)}
                  className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  Bekijk project
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
            {offerte.geconverteerd_naar_factuur_id && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Factuur</span>
                <button
                  onClick={() => navigate(`/facturen/${offerte.geconverteerd_naar_factuur_id}`)}
                  className="text-emerald-600 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Receipt className="h-3 w-3" />
                  Bekijk factuur
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Klant activiteit */}
        {(offerte.eerste_bekeken_op || offerte.geaccepteerd_door || offerte.wijziging_opmerking) && (
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
            <div className="section-header-pastel">
              <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680] flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" />
                Klant activiteit
              </h3>
            </div>
            <div className="space-y-2">
              {offerte.eerste_bekeken_op && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Eerste keer geopend</span>
                  <span className="font-medium text-foreground">{formatDateTime(offerte.eerste_bekeken_op)}</span>
                </div>
              )}
              {offerte.aantal_keer_bekeken != null && offerte.aantal_keer_bekeken > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aantal keer bekeken</span>
                  <span className="font-medium text-foreground">{offerte.aantal_keer_bekeken}x</span>
                </div>
              )}
              {offerte.geaccepteerd_door && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Geaccepteerd door</span>
                    <span className="font-medium text-emerald-600">{offerte.geaccepteerd_door}</span>
                  </div>
                  {offerte.geaccepteerd_op && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Geaccepteerd op</span>
                      <span className="font-medium text-foreground">{formatDateTime(offerte.geaccepteerd_op)}</span>
                    </div>
                  )}
                </>
              )}
              {offerte.wijziging_opmerking && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wijziging aangevraagd</span>
                    <span className="font-medium text-orange-600">{offerte.wijziging_ingediend_op ? formatDateTime(offerte.wijziging_ingediend_op) : 'Ja'}</span>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 text-sm text-orange-800 dark:text-orange-300 italic">
                    &ldquo;{offerte.wijziging_opmerking}&rdquo;
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Titel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-bold tracking-[-0.02em] text-foreground">
          {isEditing ? (
            <Input
              value={editTitel}
              onChange={(e) => setEditTitel(e.target.value)}
              className="text-lg font-semibold"
            />
          ) : (
            offerte.titel
          )}
        </h2>
      </div>

      {/* Intro tekst */}
      {(isEditing || offerte.intro_tekst) && (
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
          <div className="section-header-pastel">
            <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680]">
              Intro tekst
            </h3>
          </div>
          {isEditing ? (
            <Textarea
              value={editIntro}
              onChange={(e) => setEditIntro(e.target.value)}
              rows={3}
              placeholder="Geachte heer/mevrouw, graag bieden wij u het volgende aan..."
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offerte.intro_tekst}</p>
          )}
        </div>
      )}

      {/* Offerte Regels */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680]">Offerte Regels</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-bold text-[#8a8680] text-[11px] uppercase tracking-label w-10">#</th>
                <th className="text-left py-3 px-4 font-bold text-[#8a8680] text-[11px] uppercase tracking-label">Omschrijving</th>
                <th className="text-right py-3 px-4 font-bold text-[#8a8680] text-[11px] uppercase tracking-label w-20">Aantal</th>
                <th className="text-right py-3 px-4 font-bold text-[#8a8680] text-[11px] uppercase tracking-label w-28">Prijs</th>
                <th className="text-right py-3 px-4 font-bold text-[#8a8680] text-[11px] uppercase tracking-label w-16">BTW</th>
                <th className="text-right py-3 px-4 font-bold text-[#8a8680] text-[11px] uppercase tracking-label w-28">Totaal</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Geen regels
                  </td>
                </tr>
              )}
              {items
                .sort((a, b) => a.volgorde - b.volgorde)
                .map((item, idx) => {
                  const lineTotaal = calculateLineTotaal(item)
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border/50 ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="py-3 px-4 text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-4 text-foreground">
                        {item.beschrijving}
                        {item.korting_percentage > 0 && (
                          <span className="ml-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            (-{item.korting_percentage}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">{item.aantal}</td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">
                        {formatCurrency(item.eenheidsprijs)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                        {item.btw_percentage}%
                      </td>
                      <td className="py-3 px-4 text-right font-medium font-mono text-foreground">
                        {formatCurrency(lineTotaal)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-5 py-5 border-t border-border flex justify-end">
          <div className="w-80 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotaal</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(round2(subtotaal))}</span>
            </div>
            {Object.entries(btwGroups)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([pct, bedrag]) => (
                <div key={pct} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">BTW {pct}%</span>
                  <span className="font-semibold tabular-nums text-foreground">{formatCurrency(bedrag)}</span>
                </div>
              ))}
            <div className="totalen-groot mt-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Totaal incl. BTW</span>
                <span className="display-number display-number-md text-foreground">{formatCurrency(totaal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Outro tekst */}
      {(isEditing || offerte.outro_tekst) && (
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
          <div className="section-header-pastel">
            <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680]">
              Outro tekst
            </h3>
          </div>
          {isEditing ? (
            <Textarea
              value={editOutro}
              onChange={(e) => setEditOutro(e.target.value)}
              rows={3}
              placeholder="Wij hopen u hiermee een passend aanbod te doen..."
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offerte.outro_tekst}</p>
          )}
        </div>
      )}

      {/* Notities (edit mode) */}
      {isEditing && (
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
          <div className="section-header-pastel">
            <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680]">
              Notities
            </h3>
          </div>
          <Textarea
            value={editNotities}
            onChange={(e) => setEditNotities(e.target.value)}
            rows={3}
            placeholder="Interne notities..."
          />
        </div>
      )}

      {/* Notities (view mode) */}
      {!isEditing && offerte.notities && (
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
          <div className="section-header-pastel">
            <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680]">
              Notities
            </h3>
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offerte.notities}</p>
        </div>
      )}

      {/* Activiteit log */}
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
        <div className="section-header-pastel">
          <h3 className="text-[11px] font-bold uppercase tracking-label text-[#8a8680]">
            Activiteit
          </h3>
        </div>
        {activiteiten.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen activiteit geregistreerd</p>
        ) : (
          <div className="space-y-2">
            {activiteiten.map((act, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0"
              >
                <span className="text-base flex-shrink-0 mt-0.5">
                  {ACTIVITEIT_ICONS[act.type] || '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{act.beschrijving}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(act.datum)}
                    {act.medewerker && ` — ${act.medewerker}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signing Visualisaties */}
      <div className="rounded-xl border border-border bg-card p-5">
        <VisualisatieGallery offerte_id={offerte.id} klant_id={offerte.klant_id} />
      </div>

      {/* Audit Log */}
      <div className="rounded-xl border border-border bg-card p-5">
        <AuditLogPanel entityType="offerte" entityId={offerte.id} />
      </div>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Offerte versturen</DialogTitle>
            <DialogDescription>
              Verstuur {offerte.nummer} als email met PDF bijlage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Aan</label>
              <Input
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="email@bedrijf.nl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Onderwerp</label>
              <Input
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Bericht</label>
              <Textarea
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>Bijlage: {offerte.nummer}.pdf (wordt automatisch gegenereerd)</span>
            </div>
            {(portaalToken || offerte.publiek_token) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Publieke link</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={portaalToken
                      ? `${window.location.origin}/portaal/${portaalToken}`
                      : `${window.location.origin}/offerte-bekijken/${offerte.publiek_token}`}
                    className="text-xs font-mono bg-muted/30"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const url = portaalToken
                        ? `${window.location.origin}/portaal/${portaalToken}`
                        : `${window.location.origin}/offerte-bekijken/${offerte.publiek_token}`
                      navigator.clipboard.writeText(url)
                      toast.success('Link gekopieerd')
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const path = portaalToken
                        ? `/portaal/${portaalToken}`
                        : `/offerte-bekijken/${offerte.publiek_token}`
                      window.open(path, '_blank')
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)} disabled={isSending}>
              Annuleren
            </Button>
            <Button onClick={handleSend} disabled={isSending || !sendTo}>
              {isSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Versturen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offerte verwijderen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je {offerte.nummer} wilt verwijderen? Dit kan niet ongedaan gemaakt worden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Annuleren
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {offerte && (
        <WerkbonAanmaakDialog
          open={showWerkbonDialog}
          onOpenChange={setShowWerkbonDialog}
          offerte={offerte}
          items={items}
          klant={klant}
        />
      )}

      {/* PDF Preview Dialog */}
      {offerte && (
        <PdfPreviewDialog
          open={showPdfPreview}
          onOpenChange={setShowPdfPreview}
          title={`Offerte ${offerte.nummer}`}
          generatePdf={async () => {
            const doc = generateOffertePDF(
              offerte,
              items,
              klant || {},
              { ...profile, primaireKleur: primaireKleur || '#2563eb' },
              documentStyle,
            )
            return doc.output('blob')
          }}
        />
      )}
    </div>
  )
}
