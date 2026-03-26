import { useState, useEffect, useCallback } from 'react'
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
import { PortaalFeed } from '@/components/portaal/PortaalFeed'
import { PortaalItemToevoegen } from '@/components/portaal/PortaalItemToevoegen'
import { PortaalLightbox } from '@/components/portaal/PortaalLightbox'

interface ProjectPortaalTabProps {
  projectId: string
  projectNaam: string
}

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

  // ── Fetch portaal data ──────────────────────────────────────────────────
  const fetchPortaal = useCallback(async () => {
    try {
      const p = await getPortaalByProject(projectId)
      setPortaal(p)
      if (p) {
        let itms: PortaalItem[] = []
        try {
          const jwt = await getAuthToken()
          if (jwt) {
            const resp = await fetch(`/api/portaal-items-get?portaal_id=${encodeURIComponent(p.id)}`, {
              headers: { Authorization: `Bearer ${jwt}` },
            })
            if (resp.ok) {
              const { items: apiItems } = await resp.json()
              itms = (apiItems || []).map((item: Record<string, unknown>) => ({
                ...item,
                bestanden: (item.portaal_bestanden || []) as unknown[],
                reacties: (item.portaal_reacties || []) as unknown[],
              })) as PortaalItem[]
            } else {
              itms = await getPortaalItems(p.id)
            }
          } else {
            itms = await getPortaalItems(p.id)
          }
        } catch {
          itms = await getPortaalItems(p.id)
        }
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
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    )
    const { data } = await client.auth.getSession()
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

  // ── Item toevoegen handlers ──────────────────────────────────────────────
  async function handleAddOfferte(offerteId: string, emailNotify: boolean) {
    if (!portaal || !user?.id) return
    const offerte = offertes.find(o => o.id === offerteId)
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

    // Generate and attach PDF
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
    await fetchPortaal()
  }

  async function handleAddFactuur(factuurId: string, emailNotify: boolean) {
    if (!portaal || !user?.id) return
    const factuur = facturen.find(f => f.id === factuurId)
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
    await fetchPortaal()
  }

  async function handleAddTekening(titel: string, files: File[], emailNotify: boolean) {
    if (!portaal || !user?.id) return

    const newItem = await createPortaalItem({
      user_id: user.id,
      project_id: projectId,
      portaal_id: portaal.id,
      type: 'tekening',
      titel,
      status: 'verstuurd',
      zichtbaar_voor_klant: true,
      volgorde: 0,
    })

    for (const file of files) {
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

    if (emailNotify) sendEmailNotification(titel, titel)
    toast.success('Tekening gedeeld')
    await fetchPortaal()
  }

  async function handleAddAfbeelding(titel: string, file: File, emailNotify: boolean) {
    if (!portaal || !user?.id) return

    const path = `${user.id}/portaal/${portaal.id}/${Date.now()}_${file.name}`
    const url = await uploadFile(file, path)

    await createPortaalItem({
      user_id: user.id,
      project_id: projectId,
      portaal_id: portaal.id,
      type: 'afbeelding',
      titel,
      foto_url: url,
      bericht_type: 'foto',
      afzender: 'bedrijf',
      status: 'verstuurd',
      zichtbaar_voor_klant: true,
      volgorde: 0,
    })

    if (emailNotify) sendEmailNotification(titel, titel)
    toast.success('Afbeelding gedeeld')
    await fetchPortaal()
  }

  async function handleAddBericht(tekst: string, emailNotify: boolean) {
    if (!portaal || !user?.id) return

    await createPortaalItem({
      user_id: user.id,
      project_id: projectId,
      portaal_id: portaal.id,
      type: 'bericht',
      titel: 'Bericht',
      bericht_type: 'tekst',
      bericht_tekst: tekst,
      afzender: 'bedrijf',
      status: 'verstuurd',
      zichtbaar_voor_klant: true,
      volgorde: 0,
    })

    if (emailNotify) sendEmailNotification(tekst, 'Bericht')
    toast.success('Bericht verstuurd')
    await fetchPortaal()
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

  function formatDate(d: string) {
    return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d))
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
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

          {isActief && (
            <PortaalItemToevoegen
              offertes={offertes}
              facturen={facturen}
              onAddOfferte={handleAddOfferte}
              onAddFactuur={handleAddFactuur}
              onAddTekening={handleAddTekening}
              onAddAfbeelding={handleAddAfbeelding}
              onAddBericht={handleAddBericht}
            />
          )}

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

      {/* Notification banner */}
      {notificaties.length > 0 && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50/60 border border-amber-200/40">
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

      {/* Feed */}
      <PortaalFeed
        items={items}
        token={portaal.token}
        klantNaam=""
        bedrijfNaam={profile?.bedrijfsnaam}
        isPublic={false}
        onReactie={fetchPortaal}
        onImageClick={(url) => setLightboxUrl(url)}
      />

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
