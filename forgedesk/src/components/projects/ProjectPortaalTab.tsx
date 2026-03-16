import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Link2,
  Plus,
  Loader2,
  Bell,
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
  updatePortaalItem,
  getOffertesByProject,
  getFacturenByProject,
  getNotificaties,
  markNotificatieGelezen,
} from '@/services/supabaseService'
import { uploadFile } from '@/services/storageService'
import type { ProjectPortaal, PortaalItem, Offerte, Factuur, Notificatie } from '@/types'
import { PortaalChat } from '@/components/portaal/PortaalChat'
import { PortaalChatProgress } from '@/components/portaal/PortaalChatProgress'
import type { SendPayload } from '@/components/portaal/PortaalChatInput'

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

  // ── Fetch portaal data ──────────────────────────────────────────────────
  const fetchPortaal = useCallback(async () => {
    try {
      const p = await getPortaalByProject(projectId)
      setPortaal(p)
      if (p) {
        const itms = await getPortaalItems(p.id)
        setItems(itms)
        // Load offertes + facturen for the + menu
        getOffertesByProject(projectId).then(setOffertes).catch(() => {})
        getFacturenByProject(projectId).then(setFacturen).catch(() => {})
      }
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
  }, [fetchPortaal])

  // ── Real-time updates via Supabase subscription ────────────────────────
  useEffect(() => {
    if (!portaal) return
    let cancelled = false

    async function subscribe() {
      const { default: supabase } = await import('@/services/supabaseClient')
      if (!supabase || cancelled) return

      const channel = supabase
        .channel(`portaal-items-${portaal!.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'portaal_items',
            filter: `portaal_id=eq.${portaal!.id}`,
          },
          () => { fetchPortaal() }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'portaal_reacties',
          },
          () => { fetchPortaal() }
        )
        .subscribe((status) => {
          // On reconnect after disconnect, refetch data
          if (status === 'SUBSCRIBED') {
            fetchPortaal()
          }
        })

      return channel
    }

    let channel: Awaited<ReturnType<typeof subscribe>> | undefined
    subscribe().then(c => { channel = c })

    // Fallback polling every 10s in case Realtime disconnects silently
    const pollInterval = setInterval(() => {
      if (!cancelled) fetchPortaal()
    }, 10_000)

    // Refetch when tab becomes visible again (mobile resume)
    function handleVisibility() {
      if (document.visibilityState === 'visible' && !cancelled) {
        fetchPortaal()
      }
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

  // ── Portaal management ──────────────────────────────────────────────────
  async function getAuthToken() {
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    )
    const { data } = await client.auth.getSession()
    return data.session?.access_token || ''
  }

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

  async function handleActiveer() {
    await handleVerlengen()
  }

  function copyLink() {
    if (!portaal) return
    const url = `${window.location.origin}/portaal/${portaal.token}`
    navigator.clipboard.writeText(url)
    toast.success('Portaallink gekopieerd')
  }

  // ── Send handler (from chat input) ──────────────────────────────────────
  async function handleSend(payload: SendPayload) {
    if (!portaal || !user?.id) throw new Error('Sessie verlopen. Ververs de pagina.')

    let newItem: PortaalItem | null = null

    try {

    if (payload.kind === 'tekst') {
      newItem = await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'bericht',
        titel: 'Bericht',
        bericht_type: 'tekst',
        bericht_tekst: payload.tekst,
        afzender: 'bedrijf',
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      if (payload.emailNotify) sendEmailNotification(payload.tekst, 'Bericht')
    } else if (payload.kind === 'notitie_intern') {
      newItem = await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'bericht',
        titel: 'Interne notitie',
        bericht_type: 'notitie_intern',
        bericht_tekst: payload.tekst,
        afzender: 'bedrijf',
        status: 'verstuurd',
        zichtbaar_voor_klant: false,
        volgorde: 0,
      })
    } else if (payload.kind === 'foto') {
      const path = `${user.id}/portaal/${portaal.id}/${Date.now()}_${payload.file.name}`
      const url = await uploadFile(payload.file, path)
      newItem = await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'bericht',
        titel: payload.caption || 'Foto',
        bericht_type: 'foto',
        foto_url: url,
        bericht_tekst: payload.caption,
        afzender: 'bedrijf',
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      if (payload.emailNotify) sendEmailNotification('Nieuwe foto gedeeld', 'Foto')
    } else if (payload.kind === 'offerte') {
      const offerte = offertes.find(o => o.id === payload.offerteId)
      if (!offerte) return
      // Zorg dat de offerte een publiek_token heeft zodat de klant hem kan bekijken
      if (!offerte.publiek_token) {
        const { updateOfferte } = await import('@/services/supabaseService')
        const publiekToken = crypto.randomUUID()
        await updateOfferte(offerte.id, { publiek_token: publiekToken })
        offerte.publiek_token = publiekToken
      }
      newItem = await createPortaalItem({
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
      // Genereer offerte PDF en koppel als bestand
      try {
        const { getOfferteItems, getKlant, getProject } = await import('@/services/supabaseService')
        const { generateOffertePDF } = await import('@/services/pdfService')
        const { getDocumentStyle } = await import('@/services/supabaseService')

        const [offerteItems, project, docStyle] = await Promise.all([
          getOfferteItems(offerte.id),
          getProject(projectId),
          user?.id ? getDocumentStyle(user.id) : Promise.resolve(null),
        ])
        const klant = project?.klant_id ? await getKlant(project.klant_id) : null

        const doc = generateOffertePDF(
          offerte,
          offerteItems,
          klant || {},
          { ...profile, primaireKleur: docStyle?.primaire_kleur || '#2563eb' },
          docStyle,
        )
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
        // Niet blokkeren — offerte is al gedeeld via de publiek_token link
      }
      if (payload.emailNotify) sendEmailNotification(`Offerte ${offerte.nummer}`, offerte.titel || `Offerte ${offerte.nummer}`)
    } else if (payload.kind === 'factuur') {
      const factuur = facturen.find(f => f.id === payload.factuurId)
      if (!factuur) return
      newItem = await createPortaalItem({
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
      if (payload.emailNotify) sendEmailNotification(`Factuur ${factuur.nummer}`, `Factuur ${factuur.nummer}`)
    } else if (payload.kind === 'tekening') {
      newItem = await createPortaalItem({
        user_id: user.id,
        project_id: projectId,
        portaal_id: portaal.id,
        type: 'tekening',
        titel: payload.titel,
        status: 'verstuurd',
        zichtbaar_voor_klant: true,
        volgorde: 0,
      })
      // Upload files
      for (const file of payload.files) {
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
      if (payload.emailNotify) sendEmailNotification(payload.titel, payload.titel)
    }

    toast.success('Verstuurd')
    await fetchPortaal()

    } catch (err) {
      console.error('Fout bij versturen:', err)
      toast.error('Versturen mislukt. Probeer het opnieuw.')
      throw err // Re-throw so PortaalChatInput can also handle it
    }
  }

  // ── Email notification (fire-and-forget) ────────────────────────────────
  async function sendEmailNotification(content: string, titel: string) {
    try {
      const { getProject, getKlant, getPortaalInstellingen } = await import('@/services/supabaseService')
      const { sendEmail } = await import('@/services/gmailService')

      // Check setting: email_naar_klant_bij_nieuw_item
      if (user?.id) {
        const instellingen = await getPortaalInstellingen(user.id)
        if (instellingen.email_naar_klant_bij_nieuw_item === false) return
      }

      const project = await getProject(projectId)
      if (!project?.klant_id || !portaal) return
      const klant = await getKlant(project.klant_id)
      const klantEmail = klant?.email || klant?.contactpersonen?.[0]?.email
      if (!klantEmail) return
      const bedrijfsnaam = profile?.bedrijfsnaam || ''
      const logoUrl = profile?.logo_url || ''
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const klantNaam = klant?.contactpersoon || klant?.bedrijfsnaam || 'klant'

      const plainBody = [
        `Beste ${klantNaam},`,
        '',
        `Er is een nieuw item gedeeld voor project ${projectNaam}.`,
        '',
        content,
        '',
        `Bekijk het hier: ${portaalUrl}`,
        '',
        `Met vriendelijke groet,`,
        bedrijfsnaam || 'Het team',
      ].join('\n')

      const logoHtml = logoUrl
        ? `<img src="${logoUrl}" alt="${bedrijfsnaam}" style="max-height:40px;margin-bottom:16px;" /><br/>`
        : ''

      const htmlBody = `${logoHtml}
        <p>Beste ${klantNaam},</p>
        <p>Er is een nieuw item gedeeld voor project <strong>${projectNaam}</strong>.</p>
        <p>${content}</p>
        <p><a href="${portaalUrl}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;border-radius:6px;text-decoration:none;">Bekijk in portaal</a></p>
        <p>Met vriendelijke groet,<br/>${bedrijfsnaam || 'Het team'}</p>`

      await sendEmail(
        klantEmail,
        `${bedrijfsnaam || 'Nieuw item'} — ${titel}`,
        plainBody,
        { html: htmlBody }
      )
    } catch {
      // Email faalt silently
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

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[400px]">
      {/* Compact progress header */}
      <div className="space-y-2 mb-3">
        <PortaalChatProgress
          items={items}
          portaal={portaal}
          onCopyLink={copyLink}
          onVerlengen={handleVerlengen}
          onDeactiveer={handleDeactiveer}
          onActiveer={handleActiveer}
        />

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
      </div>

      {/* Chat timeline + input */}
      <PortaalChat
        items={items}
        isPublic={false}
        bedrijfNaam={profile?.bedrijfsnaam}
        offertes={offertes}
        facturen={facturen}
        onSend={isActief ? handleSend : undefined}
        disabled={!isActief}
      />
    </div>
  )
}
