import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Link2,
  Plus,
  Loader2,
  Bell,
  Copy,
  Calendar,
  Power,
  RefreshCw,
  Send,
  FileText,
  Image as ImageIcon,
  Receipt,
  ChevronDown,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import {
  getPortaalByProject,
  getPortaalItems,
  createPortaalItem,
  createPortaalBestand,
  getOffertesByProject,
  getFacturenByProject,
  getNotificaties,
  markNotificatieGelezen,
} from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur, Notificatie } from '@/types'
import { PortaalLightbox } from '@/components/portaal/PortaalLightbox'

interface ProjectPortaalTabProps {
  projectId: string
  projectNaam: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function dayLabel(ts: string): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Vandaag'
  if (d.toDateString() === yesterday.toDateString()) return 'Gisteren'
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long' }).format(d)
}

const STATUS_LABELS: Record<string, string> = {
  verstuurd: 'Verstuurd',
  bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd',
  revisie: 'Revisie',
  betaald: 'Betaald',
  vervangen: 'Vervangen',
}

const STATUS_COLORS: Record<string, string> = {
  verstuurd: '#F15025',
  bekeken: '#6A4A9A',
  goedgekeurd: '#2D6B48',
  revisie: '#C03A18',
  betaald: '#2D6B48',
  vervangen: '#A0A098',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectPortaalTab({ projectId, projectNaam }: ProjectPortaalTabProps) {
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [items, setItems] = useState<PortaalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [notificaties, setNotificaties] = useState<Notificatie[]>([])
  const [offertes, setOffertes] = useState<Offerte[]>([])
  const [facturen, setFacturen] = useState<Factuur[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Input state
  const [inputText, setInputText] = useState('')
  const [inputType, setInputType] = useState<'bericht' | 'notitie_intern' | 'offerte' | 'factuur' | 'tekening' | 'foto'>('bericht')
  const [emailNotify, setEmailNotify] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedOfferteId, setSelectedOfferteId] = useState('')
  const [selectedFactuurId, setSelectedFactuurId] = useState('')
  const [tekeningTitel, setTekeningTitel] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Fetch portaal data ──────────────────────────────────────────────────
  const fetchPortaal = useCallback(async () => {
    try {
      const p = await getPortaalByProject(projectId)
      setPortaal(p)
      if (p) {
        const itms = await getPortaalItems(p.id)
        setItems(itms)
        getOffertesByProject(projectId).then(setOffertes).catch(() => {})
        getFacturenByProject(projectId).then(setFacturen).catch(() => {})
      }
      try {
        const allNotifs = await getNotificaties()
        const portaalNotifs = allNotifs.filter(
          (n: Notificatie) => n.project_id === projectId &&
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

  useEffect(() => { fetchPortaal() }, [fetchPortaal])

  // Auto-scroll
  useEffect(() => {
    const t = setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    return () => clearTimeout(t)
  }, [items.length])

  // ── Real-time updates via Supabase subscription ────────────────────────
  useEffect(() => {
    if (!portaal) return
    let cancelled = false

    async function subscribe() {
      const { default: supabase } = await import('@/services/supabaseClient')
      if (!supabase || cancelled) return

      const channel = supabase
        .channel(`portaal-items-${portaal!.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portaal_items', filter: `portaal_id=eq.${portaal!.id}` }, () => { fetchPortaal() })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'portaal_reacties' }, () => { fetchPortaal() })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') fetchPortaal()
        })

      return channel
    }

    let channel: Awaited<ReturnType<typeof subscribe>> | undefined
    subscribe().then(c => { channel = c })

    const pollInterval = setInterval(() => { if (!cancelled) fetchPortaal() }, 10_000)

    function handleVisibility() {
      if (document.visibilityState === 'visible' && !cancelled) fetchPortaal()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      clearInterval(pollInterval)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (channel) {
        import('@/services/supabaseClient').then(({ default: supabase }) => {
          supabase?.removeChannel(channel!)
        })
      }
    }
  }, [portaal?.id, fetchPortaal])

  // ── Auth token helper ─────────────────────────────────────────────────
  async function getAuthToken() {
    const { default: supabase } = await import('@/services/supabaseClient')
    if (!supabase) return ''
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  // ── Portaal management ──────────────────────────────────────────────────
  async function handleCreatePortaal() {
    if (!user?.id) return
    setCreating(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/portaal-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      const token = await getAuthToken()
      const response = await fetch('/api/portaal-verlengen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  function copyLink() {
    if (!portaal) return
    const url = `${window.location.origin}/portaal/${portaal.token}`
    navigator.clipboard.writeText(url)
    toast.success('Portaallink gekopieerd')
  }

  // ── Email notification helper ──────────────────────────────────────────
  async function sendEmailNotification(content: string, titel: string) {
    try {
      const { getProject, getKlant, getPortaalInstellingen } = await import('@/services/supabaseService')
      const { sendEmail } = await import('@/services/gmailService')
      const { buildPortalEmailHtml, replaceEmailVariables } = await import('@/utils/emailTemplate')

      const project = await getProject(projectId)
      if (!project?.klant_id || !portaal) {
        toast.warning('Geen klant gekoppeld aan project')
        return
      }
      const klant = await getKlant(project.klant_id)
      const klantEmail = klant?.email || klant?.contactpersonen?.[0]?.email
      if (!klantEmail) {
        toast.warning('Klant heeft geen email adres')
        return
      }

      const bedrijfsnaam = profile?.bedrijfsnaam || ''
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const klantNaam = klant?.contactpersoon || klant?.contactpersonen?.[0]?.naam || klant?.bedrijfsnaam || 'klant'

      const instellingen = user?.id ? await getPortaalInstellingen(user.id) : null
      const vars: Record<string, string> = {
        klant_naam: klantNaam,
        project_naam: projectNaam,
        portaal_link: portaalUrl,
        bedrijfsnaam: bedrijfsnaam || '',
        item_type: titel,
        projectnaam: projectNaam,
        itemtitel: titel,
        klantNaam,
        portaalUrl,
      }

      const onderwerp = instellingen?.template_nieuw_item?.onderwerp
        ? replaceEmailVariables(instellingen.template_nieuw_item.onderwerp, vars)
        : `${bedrijfsnaam || 'Nieuw item'} — ${titel}`
      const heading = instellingen?.template_nieuw_item?.inhoud
        ? replaceEmailVariables(instellingen.template_nieuw_item.inhoud, vars)
        : `Er is een nieuw item gedeeld voor project ${projectNaam}.`

      const plainBody = [`Beste ${klantNaam},`, '', heading, '', content, '', `Bekijk het hier: ${portaalUrl}`, '', `Met vriendelijke groet,`, bedrijfsnaam || 'Het team'].join('\n')

      const htmlBody = buildPortalEmailHtml({
        heading,
        itemTitel: titel,
        beschrijving: content,
        ctaLabel: 'Bekijk in portaal →',
        ctaUrl: portaalUrl,
        bedrijfsnaam,
        logoUrl: profile?.logo_url || undefined,
        primaireKleur: profile?.primaireKleur || undefined,
      })

      await sendEmail(klantEmail, onderwerp, plainBody, { html: htmlBody })
      toast.success(`Email verstuurd naar ${klantEmail}`)
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : 'Onbekende fout'
      console.error('Email notificatie mislukt:', msg)
      toast.error(`Email niet verstuurd: ${msg}`)
    }
  }

  // ── Send handler ──────────────────────────────────────────────────────
  async function handleSend() {
    if (!portaal || !user?.id) return
    setSending(true)
    try {
      if (inputType === 'bericht' || inputType === 'notitie_intern') {
        if (!inputText.trim()) return
        await createPortaalItem({
          user_id: user.id,
          project_id: projectId,
          portaal_id: portaal.id,
          type: 'bericht',
          titel: inputType === 'notitie_intern' ? 'Interne notitie' : 'Bericht',
          bericht_type: inputType,
          bericht_tekst: inputText.trim(),
          afzender: 'bedrijf',
          status: 'verstuurd',
          zichtbaar_voor_klant: inputType !== 'notitie_intern',
          volgorde: 0,
        })
        if (inputType === 'bericht' && emailNotify) sendEmailNotification(inputText.trim(), 'Bericht')
        toast.success(inputType === 'notitie_intern' ? 'Notitie opgeslagen' : 'Bericht verstuurd')
      } else if (inputType === 'foto') {
        if (selectedFiles.length === 0) return
        const file = selectedFiles[0]
        const path = `${user.id}/portaal/${portaal.id}/${Date.now()}_${file.name}`
        const url = await uploadFile(file, path)
        await createPortaalItem({
          user_id: user.id,
          project_id: projectId,
          portaal_id: portaal.id,
          type: 'afbeelding',
          titel: inputText.trim() || file.name,
          foto_url: url,
          bericht_type: 'foto',
          afzender: 'bedrijf',
          status: 'verstuurd',
          zichtbaar_voor_klant: true,
          volgorde: 0,
        })
        if (emailNotify) sendEmailNotification(inputText.trim() || file.name, 'Foto')
        toast.success('Foto gedeeld')
      } else if (inputType === 'offerte') {
        if (!selectedOfferteId) return
        const offerte = offertes.find(o => o.id === selectedOfferteId)
        if (!offerte) return

        if (!offerte.publiek_token) {
          const { updateOfferte } = await import('@/services/supabaseService')
          const publiekToken = crypto.randomUUID()
          await updateOfferte(offerte.id, { publiek_token: publiekToken })
          offerte.publiek_token = publiekToken
        }

        const newItem = await createPortaalItem({
          user_id: user.id,
          project_id: projectId,
          portaal_id: portaal.id,
          type: 'offerte',
          titel: offerte.titel || `Offerte ${offerte.nummer}`,
          offerte_id: offerte.id,
          bedrag: offerte.totaal,
          status: 'verstuurd',
          zichtbaar_voor_klant: true,
          volgorde: 0,
        })

        try {
          const { getOfferteItems, getKlant, getProject, getDocumentStyle } = await import('@/services/supabaseService')
          const { generateOffertePDF } = await import('@/services/pdfService')
          const [offerteItems, project, docStyle] = await Promise.all([
            getOfferteItems(offerte.id),
            getProject(projectId),
            user?.id ? getDocumentStyle(user.id) : Promise.resolve(null),
          ])
          const klant = project?.klant_id ? await getKlant(project.klant_id) : null
          const doc = await generateOffertePDF(offerte, offerteItems, klant || {}, { ...profile, primaireKleur: docStyle?.primaire_kleur || '#2563eb' }, docStyle)
          const pdfBlob = doc.output('blob')
          const pdfFile = new File([pdfBlob], `${offerte.nummer}.pdf`, { type: 'application/pdf' })
          const pdfPath = `${user.id}/portaal/${portaal.id}/${Date.now()}_${offerte.nummer}.pdf`
          const pdfUrl = await uploadFile(pdfFile, pdfPath)
          await createPortaalBestand({
            portaal_item_id: newItem.id,
            bestandsnaam: `${offerte.nummer}.pdf`,
            mime_type: 'application/pdf',
            grootte: pdfBlob.size,
            url: pdfUrl,
            uploaded_by: 'bedrijf',
          })
        } catch (pdfErr) {
          console.warn('Offerte PDF genereren/uploaden mislukt:', pdfErr)
        }

        if (emailNotify) sendEmailNotification(`Offerte ${offerte.nummer}`, offerte.titel || `Offerte ${offerte.nummer}`)
        toast.success('Offerte gedeeld')
      } else if (inputType === 'factuur') {
        if (!selectedFactuurId) return
        const factuur = facturen.find(f => f.id === selectedFactuurId)
        if (!factuur) return

        await createPortaalItem({
          user_id: user.id,
          project_id: projectId,
          portaal_id: portaal.id,
          type: 'factuur',
          titel: `Factuur ${factuur.nummer}`,
          factuur_id: factuur.id,
          bedrag: factuur.totaal,
          mollie_payment_url: factuur.betaal_link || undefined,
          status: 'verstuurd',
          zichtbaar_voor_klant: true,
          volgorde: 0,
        })

        if (emailNotify) sendEmailNotification(`Factuur ${factuur.nummer}`, `Factuur ${factuur.nummer}`)
        toast.success('Factuur gedeeld')
      } else if (inputType === 'tekening') {
        if (selectedFiles.length === 0 || !tekeningTitel.trim()) return

        const newItem = await createPortaalItem({
          user_id: user.id,
          project_id: projectId,
          portaal_id: portaal.id,
          type: 'tekening',
          titel: tekeningTitel.trim(),
          status: 'verstuurd',
          zichtbaar_voor_klant: true,
          volgorde: 0,
        })

        for (const file of selectedFiles) {
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

        if (emailNotify) sendEmailNotification(tekeningTitel.trim(), tekeningTitel.trim())
        toast.success('Tekening gedeeld')
      }

      // Reset
      setInputText('')
      setSelectedFiles([])
      setTekeningTitel('')
      setSelectedOfferteId('')
      setSelectedFactuurId('')
      await fetchPortaal()
    } catch (err) {
      toast.error((err as Error).message || 'Fout bij verzenden')
    } finally {
      setSending(false)
    }
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="border-border/80">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // ── No portaal ──────────────────────────────────────────────────────────
  if (!portaal) {
    return (
      <Card className="border-border/80">
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

  // ── Active portaal ──────────────────────────────────────────────────────
  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen

  // Sort chronologically (oldest first)
  const sorted = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  // Track days for separators
  let lastDay = ''

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: 400 }}>
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shrink-0"
        style={{ backgroundColor: '#fff', border: '0.5px solid #E8E6E1' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: isActief ? '#2D6B48' : isVerlopen ? '#F15025' : '#A0A098' }}
          />
          <span className="text-sm font-medium" style={{ color: '#191919' }}>
            {isActief ? 'Actief' : isVerlopen ? 'Verlopen' : 'Inactief'}
          </span>
          <span className="text-xs" style={{ color: '#A0A098', fontFamily: "'DM Mono', monospace" }}>
            <Calendar className="w-3 h-3 inline mr-1" />
            Verloopt {formatDate(portaal.verloopt_op)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50"
            style={{ border: '0.5px solid #E8E6E1', color: '#5A5A55' }}
          >
            <Copy className="w-3.5 h-3.5" />
            Link kopiëren
          </button>

          {!isActief && (
            <button
              onClick={handleVerlengen}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: '#1A535C' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isVerlopen ? 'Heractiveren' : 'Verlengen'}
            </button>
          )}

          {isActief && (
            <button
              onClick={handleDeactiveer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-50"
              style={{ color: '#C44830' }}
              title="Portaal deactiveren"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Notification banner ────────────────────────────────────────── */}
      {notificaties.length > 0 && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 mt-3 rounded-lg bg-amber-50/60 border border-amber-200/40 shrink-0">
          <Bell className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-amber-700">
            {notificaties.length} nieuwe melding{notificaties.length !== 1 ? 'en' : ''} van klant
          </span>
          <button
            onClick={() => notificaties.forEach(n => markNotificatieGelezen(n.id))}
            className="ml-auto text-amber-600 hover:text-amber-800 underline"
          >
            Alles gelezen
          </button>
        </div>
      )}

      {/* ── Feed ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-3 px-1">
        {sorted.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: '#A0A098' }}>Nog geen items. Stuur een bericht via de input hieronder.</p>
          </div>
        )}

        {sorted.map((item) => {
          const day = new Date(item.created_at).toDateString()
          const showDay = day !== lastDay
          lastDay = day

          const isBubble = item.bericht_type === 'tekst' || item.bericht_type === 'notitie_intern'
          const isPhoto = item.bericht_type === 'foto'
          const isKlant = item.afzender === 'klant'
          const isIntern = item.bericht_type === 'notitie_intern'

          return (
            <div key={item.id}>
              {/* Day separator */}
              {showDay && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 border-t" style={{ borderColor: '#E8E6E1' }} />
                  <span className="text-xs font-medium" style={{ color: '#A0A098', fontFamily: "'DM Mono', monospace" }}>
                    {dayLabel(item.created_at)}
                  </span>
                  <div className="flex-1 border-t" style={{ borderColor: '#E8E6E1' }} />
                </div>
              )}

              {/* ── Text bubble ──────────────────────────────────────── */}
              {isBubble && (
                <div className={`flex ${isKlant ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className="rounded-xl px-4 py-2.5 max-w-[75%]"
                    style={
                      isIntern
                        ? { backgroundColor: '#FFFBEB', border: '0.5px solid #FDE68A' }
                        : isKlant
                          ? { backgroundColor: '#F5F5F0', border: '0.5px solid #E8E6E1' }
                          : { backgroundColor: '#E2F0F0', border: '0.5px solid #C0DBDB' }
                    }
                  >
                    {isIntern && <p className="text-xs font-medium mb-1" style={{ color: '#92400E' }}>Interne notitie</p>}
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#3A3A35', lineHeight: 1.6 }}>
                      {item.bericht_tekst || ''}
                    </p>
                    <div className="mt-1 text-right">
                      <span className="text-xs" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
                        {isKlant ? 'Klant' : (profile?.bedrijfsnaam || 'Jij')} · {formatTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Photo ────────────────────────────────────────────── */}
              {isPhoto && (
                <div className={`flex ${isKlant ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-[300px]">
                    {item.foto_url && (
                      <img
                        src={item.foto_url}
                        alt={item.titel}
                        className="cursor-pointer rounded-xl hover:opacity-90 transition-opacity"
                        onClick={() => setLightboxUrl(item.foto_url!)}
                      />
                    )}
                    {item.bericht_tekst && (
                      <p className="mt-1 text-sm whitespace-pre-wrap" style={{ color: '#3A3A35' }}>{item.bericht_tekst}</p>
                    )}
                    <div className="mt-1 text-right">
                      <span className="text-xs" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Card (offerte/factuur/tekening) ──────────────────── */}
              {!isBubble && !isPhoto && (
                <div className="rounded-xl p-4" style={{ backgroundColor: '#FEFDFB', border: '0.5px solid #E8E6E1' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#E8F2EC' }}>
                      {item.type === 'offerte' && <FileText className="h-4 w-4" style={{ color: '#4a7c5f' }} />}
                      {item.type === 'factuur' && <Receipt className="h-4 w-4" style={{ color: '#4a7c5f' }} />}
                      {item.type === 'tekening' && <ImageIcon className="h-4 w-4" style={{ color: '#4a7c5f' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium" style={{ color: '#191919' }}>{item.titel}</h4>
                      {item.bedrag != null && (
                        <p className="text-base font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {formatCurrency(item.bedrag)}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${STATUS_COLORS[item.status] || '#A0A098'}15`, color: STATUS_COLORS[item.status] || '#A0A098' }}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>

                  {/* Bestanden */}
                  {item.bestanden.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {item.bestanden.map((b) => (
                        <a
                          key={b.id}
                          href={b.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-50"
                          style={{ backgroundColor: '#F5F5F0' }}
                        >
                          <FileText className="h-3.5 w-3.5" style={{ color: '#A0A098' }} />
                          <span className="flex-1 truncate" style={{ color: '#3A3A35' }}>{b.bestandsnaam}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-right">
                    <span className="text-xs" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
                      {formatTime(item.created_at)}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Reacties van klant ────────────────────────────────── */}
              {(item.reacties || []).map((r) => (
                <div
                  key={r.id}
                  className="ml-6 mt-2 rounded-r-lg py-2.5 px-4"
                  style={{ borderLeft: '3px solid #F15025', backgroundColor: '#FAFAF8' }}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: r.type === 'goedkeuring' ? '#2D6B48' : r.type === 'revisie' ? '#6A4A9A' : '#5A5A55' }}
                    >
                      {r.type === 'goedkeuring' ? 'Goedgekeurd' : r.type === 'revisie' ? 'Revisie gevraagd' : 'Reactie'}
                    </span>
                    {r.klant_naam && <span className="text-xs" style={{ color: '#A0A098' }}>— {r.klant_naam}</span>}
                    <span className="text-xs ml-auto" style={{ color: '#C0BDB8', fontFamily: "'DM Mono', monospace" }}>
                      {formatTime(r.created_at)}
                    </span>
                  </div>
                  {r.bericht && (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#3A3A35', lineHeight: 1.5 }}>{r.bericht}</p>
                  )}
                </div>
              ))}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────── */}
      {isActief && (
        <div className="shrink-0 mt-3 rounded-xl p-3" style={{ backgroundColor: '#fff', border: '0.5px solid #E8E6E1' }}>
          {/* Type selector */}
          <div className="flex items-center gap-2 mb-2">
            <select
              value={inputType}
              onChange={(e) => {
                setInputType(e.target.value as typeof inputType)
                setSelectedFiles([])
                setTekeningTitel('')
                setSelectedOfferteId('')
                setSelectedFactuurId('')
              }}
              className="text-xs rounded-lg px-2 py-1.5 bg-gray-50 border-0 outline-none"
              style={{ color: '#5A5A55' }}
            >
              <option value="bericht">Bericht</option>
              <option value="notitie_intern">Interne notitie</option>
              <option value="foto">Foto</option>
              <option value="offerte">Offerte</option>
              <option value="factuur">Factuur</option>
              <option value="tekening">Tekening</option>
            </select>

            {inputType !== 'notitie_intern' && (
              <label className="flex items-center gap-1.5 text-xs ml-auto cursor-pointer" style={{ color: '#A0A098' }}>
                <input
                  type="checkbox"
                  checked={emailNotify}
                  onChange={(e) => setEmailNotify(e.target.checked)}
                  className="rounded"
                />
                Email klant
              </label>
            )}
          </div>

          {/* Type-specific inputs */}
          {(inputType === 'bericht' || inputType === 'notitie_intern') && (
            <div className="flex gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={inputType === 'notitie_intern' ? 'Interne notitie (niet zichtbaar voor klant)...' : 'Typ een bericht...'}
                className="flex-1 resize-none rounded-lg px-3 py-2 text-sm border-0 outline-none"
                style={{ backgroundColor: '#F5F5F0', color: '#3A3A35', minHeight: 40, maxHeight: 120 }}
                rows={1}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !inputText.trim()}
                className="self-end rounded-lg p-2 text-white disabled:opacity-40"
                style={{ backgroundColor: '#1A535C' }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          )}

          {inputType === 'foto' && (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="text-xs"
              />
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Bijschrift (optioneel)"
                className="rounded-lg px-3 py-2 text-sm border-0 outline-none"
                style={{ backgroundColor: '#F5F5F0', color: '#3A3A35' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || selectedFiles.length === 0}
                className="self-end rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: '#1A535C' }}
              >
                {sending ? 'Uploaden...' : 'Foto delen'}
              </button>
            </div>
          )}

          {inputType === 'offerte' && (
            <div className="flex gap-2">
              <select
                value={selectedOfferteId}
                onChange={(e) => setSelectedOfferteId(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm border-0 outline-none"
                style={{ backgroundColor: '#F5F5F0', color: '#3A3A35' }}
              >
                <option value="">Kies offerte...</option>
                {offertes.map(o => (
                  <option key={o.id} value={o.id}>{o.titel || `Offerte ${o.nummer}`} — {formatCurrency(o.totaal || 0)}</option>
                ))}
              </select>
              <button
                onClick={handleSend}
                disabled={sending || !selectedOfferteId}
                className="rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: '#1A535C' }}
              >
                {sending ? 'Delen...' : 'Offerte delen'}
              </button>
            </div>
          )}

          {inputType === 'factuur' && (
            <div className="flex gap-2">
              <select
                value={selectedFactuurId}
                onChange={(e) => setSelectedFactuurId(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-sm border-0 outline-none"
                style={{ backgroundColor: '#F5F5F0', color: '#3A3A35' }}
              >
                <option value="">Kies factuur...</option>
                {facturen.map(f => (
                  <option key={f.id} value={f.id}>Factuur {f.nummer} — {formatCurrency(f.totaal || 0)}</option>
                ))}
              </select>
              <button
                onClick={handleSend}
                disabled={sending || !selectedFactuurId}
                className="rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: '#1A535C' }}
              >
                {sending ? 'Delen...' : 'Factuur delen'}
              </button>
            </div>
          )}

          {inputType === 'tekening' && (
            <div className="flex flex-col gap-2">
              <input
                value={tekeningTitel}
                onChange={(e) => setTekeningTitel(e.target.value)}
                placeholder="Titel tekening"
                className="rounded-lg px-3 py-2 text-sm border-0 outline-none"
                style={{ backgroundColor: '#F5F5F0', color: '#3A3A35' }}
              />
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                className="text-xs"
              />
              <button
                onClick={handleSend}
                disabled={sending || selectedFiles.length === 0 || !tekeningTitel.trim()}
                className="self-end rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: '#1A535C' }}
              >
                {sending ? 'Uploaden...' : 'Tekening delen'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <PortaalLightbox
          images={[{ url: lightboxUrl, bestandsnaam: '' }]}
          startIndex={0}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  )
}
