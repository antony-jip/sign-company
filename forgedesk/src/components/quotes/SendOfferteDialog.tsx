import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Send, Loader2, FileText, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  updateOfferte,
  createPortaal,
  createPortaalItem,
  getPortaalItems,
} from '@/services/supabaseService'
import { sendEmail } from '@/services/gmailService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { generateOffertePDF } from '@/services/pdfService'
import { generateFollowUpEmail } from '@/services/followUpService'
import type { FollowUpContext } from '@/services/followUpService'
import { offerteTokenExpiry } from '@/lib/tokenExpiry'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { logWijziging } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import type { Offerte, OfferteItem, Klant, Project, OfferteActiviteit } from '@/types'

export type SendMode = 'eerste' | 'follow-up'

interface SendOfferteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerte: Offerte
  klant: Klant | null
  items: OfferteItem[]
  project?: Project | null
  userId: string
  mode: SendMode
  onSent: (updated: Offerte) => void
  onPortaalCreated?: (token: string) => void
  isTrialBlocked?: boolean
  onTrialBlocked?: () => void
  medewerkerNaam?: string
}

function resolveContactNaam(offerte: Offerte, klant: Klant | null): string {
  const cp = offerte.contactpersoon_id
    ? klant?.contactpersonen?.find((c) => c.id === offerte.contactpersoon_id)
    : klant?.contactpersonen?.find((c) => c.is_primair) || klant?.contactpersonen?.[0]
  return cp?.naam || klant?.contactpersoon || klant?.bedrijfsnaam || ''
}

function resolveContactEmail(offerte: Offerte, klant: Klant | null): string {
  const cp = offerte.contactpersoon_id
    ? klant?.contactpersonen?.find((c) => c.id === offerte.contactpersoon_id)
    : klant?.contactpersonen?.find((c) => c.is_primair) || klant?.contactpersonen?.[0]
  return cp?.email || klant?.email || ''
}

export function SendOfferteDialog({
  open,
  onOpenChange,
  offerte,
  klant,
  items,
  project,
  userId,
  mode,
  onSent,
  onPortaalCreated,
  isTrialBlocked,
  onTrialBlocked,
  medewerkerNaam,
}: SendOfferteDialogProps) {
  const { bedrijfsnaam, primaireKleur, emailHandtekening, handtekeningAfbeelding, handtekeningAfbeeldingGrootte, handtekeningAfbeeldingLink, profile } = useAppSettings()
  const documentStyle = useDocumentStyle()

  const [sendTo, setSendTo] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendBody, setSendBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [portaalToken, setPortaalToken] = useState<string | null>(null)
  const prefilledRef = useRef(false)

  const dagenOpen = offerte.verstuurd_op
    ? Math.floor((Date.now() - new Date(offerte.verstuurd_op).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const dagenTotVerlopen = offerte.geldig_tot
    ? Math.floor((new Date(offerte.geldig_tot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 30

  const buildFallbackFollowUp = useCallback((): { onderwerp: string; body: string } => {
    const naam = resolveContactNaam(offerte, klant)
    const voornaam = naam.split(' ')[0] || naam
    const bedrag = formatCurrency(offerte.totaal || 0)
    const pogingen = offerte.contact_pogingen || 0
    const aanhef = voornaam ? `Beste ${voornaam}` : 'Beste'
    let body: string
    if (dagenOpen <= 7) {
      body = `${aanhef},\n\nGraag wilde ik even informeren of u de offerte ${offerte.nummer} voor "${offerte.titel}" (${bedrag}) heeft kunnen bekijken.\n\n${offerte.geldig_tot ? `De offerte is geldig tot ${formatDate(offerte.geldig_tot)}.\n\n` : ''}Mocht u nog vragen hebben of iets willen bespreken, dan hoor ik het graag.`
    } else if (dagenOpen <= 14) {
      body = `${aanhef},\n\n${pogingen > 0 ? 'Ik kom nog even terug op ' : 'Ik wilde graag even opvolgen over '}onze offerte ${offerte.nummer} voor "${offerte.titel}" ter waarde van ${bedrag}.\n\nHeeft u de offerte kunnen bekijken? Ik help u graag als er nog vragen zijn.`
    } else if (dagenOpen <= 21) {
      body = `${aanhef},\n\nOnze offerte ${offerte.nummer} voor "${offerte.titel}" (${bedrag}) staat nu ${dagenOpen} dagen open.${offerte.geldig_tot && dagenTotVerlopen <= 7 ? ` Let op: de offerte verloopt over ${dagenTotVerlopen} dagen.` : ''}\n\nZijn er nog punten die u tegengehouden hebben? Ik denk graag met u mee over eventuele aanpassingen of alternatieven.`
    } else {
      body = `${aanhef},\n\n${pogingen > 1 ? `Ik heb u eerder ${pogingen}x benaderd` : 'Ik heb u eerder benaderd'} over offerte ${offerte.nummer} · "${offerte.titel}" (${bedrag}).\n\nIk begrijp dat prioriteiten kunnen verschuiven. Laat me weten of dit project nog actueel is, dan kijken we samen naar de volgende stap.`
    }
    return {
      onderwerp: pogingen > 0
        ? `Re: Offerte ${offerte.nummer} · ${offerte.titel}`
        : `Opvolging offerte ${offerte.nummer} · ${offerte.titel}`,
      body,
    }
  }, [offerte, klant, dagenOpen, dagenTotVerlopen])

  const generateFollowUp = useCallback(async () => {
    setIsGenerating(true)
    try {
      const naam = resolveContactNaam(offerte, klant)
      const voornaam = naam.split(' ')[0] || naam
      const context: FollowUpContext = {
        klantnaam: klant?.bedrijfsnaam || offerte.klant_naam || '',
        contactpersoon: voornaam,
        projectnaam: project?.naam,
        offerte_nummer: offerte.nummer,
        offerte_titel: offerte.titel,
        bedrag: offerte.totaal || 0,
        dagen_open: dagenOpen,
        geldig_tot: offerte.geldig_tot || '',
        dagen_tot_verlopen: dagenTotVerlopen,
        aantal_eerdere_followups: offerte.contact_pogingen || 0,
        status: offerte.status,
        bedrijfsnaam_afzender: bedrijfsnaam || '',
        afzender_naam: bedrijfsnaam || '',
      }
      const result = await generateFollowUpEmail(context)
      setSendSubject(result.onderwerp)
      setSendBody(result.body)
    } catch (err) {
      const fallback = buildFallbackFollowUp()
      setSendSubject(fallback.onderwerp)
      setSendBody(fallback.body)
    } finally {
      setIsGenerating(false)
    }
  }, [offerte, klant, project, bedrijfsnaam, dagenOpen, dagenTotVerlopen, buildFallbackFollowUp])

  useEffect(() => {
    if (!open) {
      prefilledRef.current = false
      return
    }
    if (prefilledRef.current) return
    prefilledRef.current = true

    const contactEmail = resolveContactEmail(offerte, klant)
    const contactNaam = resolveContactNaam(offerte, klant)
    setSendTo(contactEmail)

    if (mode === 'eerste') {
      setSendSubject(`Offerte ${offerte.nummer} · ${offerte.titel}`)
      setSendBody(
        `Beste ${contactNaam},\n\nHierbij ontvangt u onze offerte ${offerte.nummer} voor "${offerte.titel}".\n\nWij zien uw reactie graag tegemoet.`
      )
    } else {
      setSendSubject('')
      setSendBody('')
      generateFollowUp()
    }
  }, [open, mode, offerte, klant, generateFollowUp])

  const handleSend = useCallback(async () => {
    if (isTrialBlocked) {
      onOpenChange(false)
      onTrialBlocked?.()
      return
    }
    setIsSending(true)
    try {
      let publiekeUrl = ''
      let createdToken: string | null = null

      if (offerte.project_id) {
        const portaal = await createPortaal(offerte.project_id, userId)
        const bestaandeItems = await getPortaalItems(portaal.id)
        const bestaand = bestaandeItems.find((i) => i.type === 'offerte' && i.offerte_id === offerte.id)
        if (!bestaand) {
          await createPortaalItem({
            user_id: userId,
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
        createdToken = portaal.token
        setPortaalToken(portaal.token)
        onPortaalCreated?.(portaal.token)
      } else {
        let publiekToken = offerte.publiek_token
        if (!publiekToken) {
          publiekToken = crypto.randomUUID()
          await updateOfferte(offerte.id, {
            publiek_token: publiekToken,
            publiek_token_verloopt_op: offerteTokenExpiry(),
          })
        }
        publiekeUrl = `${window.location.origin}/offerte-bekijken/${publiekToken}`
      }

      const klantNaam = resolveContactNaam(offerte, klant)
      const { subject, html, text } = offerteVerzendTemplate({
        klantNaam,
        offerteNummer: offerte.nummer,
        offerteTitel: offerte.titel,
        totaalBedrag: formatCurrency(offerte.totaal),
        geldigTot: offerte.geldig_tot ? formatDate(offerte.geldig_tot) : '—',
        bedrijfsnaam: bedrijfsnaam || 'Uw bedrijf',
        primaireKleur,
        handtekening: emailHandtekening || undefined,
        handtekeningAfbeelding: handtekeningAfbeelding || undefined,
        handtekeningAfbeeldingGrootte: handtekeningAfbeeldingGrootte || undefined,
        handtekeningAfbeeldingLink: handtekeningAfbeeldingLink || undefined,
        logoUrl: profile?.logo_url || undefined,
        bekijkUrl: publiekeUrl,
        customBody: sendBody || undefined,
      })

      let attachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
      try {
        const doc = await generateOffertePDF(
          offerte,
          items,
          klant || ({} as Klant),
          { ...profile, primaireKleur: primaireKleur || '#2563eb' },
          documentStyle,
        )
        const pdfBase64 = doc.output('datauristring').split(',')[1]
        attachments = [{ filename: `${offerte.nummer}.pdf`, content: pdfBase64, encoding: 'base64' as const }]
      } catch (pdfErr) {
        logger.error('PDF genereren mislukt, email wordt zonder bijlage verstuurd:', pdfErr)
      }

      const plainText = sendBody || text
      try {
        await sendEmail(sendTo, sendSubject || subject, plainText, { html, attachments })
      } catch (err) {
        logger.error('Email verzenden mislukt:', err)
        toast.error('Offerte niet verstuurd: e-mail kon niet worden verzonden. Controleer je e-mailinstellingen en probeer opnieuw.')
        return
      }

      const now = new Date().toISOString()
      const activity: OfferteActiviteit = {
        datum: now,
        type: 'verstuurd',
        beschrijving: mode === 'follow-up'
          ? `Follow-up verstuurd naar ${sendTo}`
          : `Verstuurd naar ${sendTo}`,
        medewerker: medewerkerNaam || undefined,
      }

      const updates: Partial<Offerte> = {
        activiteiten: [...(offerte.activiteiten || []), activity],
      }
      if (mode === 'eerste') {
        updates.status = 'verzonden'
        updates.verstuurd_op = now
        updates.verstuurd_naar = sendTo
      } else {
        updates.contact_pogingen = (offerte.contact_pogingen || 0) + 1
        updates.laatste_contact = now
        updates.follow_up_datum = now.split('T')[0]
        updates.follow_up_status = 'afgerond'
      }

      const updated = await updateOfferte(offerte.id, updates)

      if (mode === 'follow-up') {
        try {
          await logWijziging({
            userId,
            entityType: 'offerte',
            entityId: offerte.id,
            actie: 'verstuurd',
            medewerkerNaam: medewerkerNaam || '',
            omschrijving: `Follow-up email verstuurd naar ${sendTo}`,
          })
        } catch {
          // Niet kritisch
        }
      }

      onSent(updated)
      onOpenChange(false)
      toast.success(
        mode === 'follow-up'
          ? `Follow-up verstuurd naar ${klant?.bedrijfsnaam || sendTo}`
          : 'Offerte verstuurd',
        mode === 'eerste' ? { description: `Email verstuurd naar ${sendTo}` } : undefined,
      )

      // Silence unused-var warning for createdToken (handler relies on closure side-effect)
      void createdToken
    } catch (err) {
      logger.error('Failed to send offerte:', err)
      toast.error('Kon offerte niet versturen')
    } finally {
      setIsSending(false)
    }
  }, [
    offerte, klant, items, userId, mode, sendTo, sendSubject, sendBody,
    bedrijfsnaam, primaireKleur, emailHandtekening, handtekeningAfbeelding,
    handtekeningAfbeeldingGrootte, handtekeningAfbeeldingLink, profile, documentStyle,
    isTrialBlocked, onTrialBlocked, onOpenChange, onPortaalCreated, onSent,
    medewerkerNaam,
  ])

  const publiekeLink = portaalToken
    ? `${window.location.origin}/portaal/${portaalToken}`
    : offerte.publiek_token
      ? `${window.location.origin}/offerte-bekijken/${offerte.publiek_token}`
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'follow-up' ? 'Follow-up versturen' : 'Offerte versturen'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'follow-up'
              ? `Verstuur opvolg-bericht voor ${offerte.nummer} met PDF bijlage.`
              : `Verstuur ${offerte.nummer} als email met PDF bijlage.`}
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
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Bericht</label>
              {mode === 'follow-up' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={generateFollowUp}
                  disabled={isGenerating || isSending}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  )}
                  Opnieuw genereren
                </Button>
              )}
            </div>
            <Textarea
              value={sendBody}
              onChange={(e) => setSendBody(e.target.value)}
              rows={mode === 'follow-up' ? 10 : 6}
              disabled={isGenerating}
              placeholder={isGenerating ? 'Bericht wordt gegenereerd…' : undefined}
            />
            {handtekeningAfbeelding && (
              <div className="pt-2">
                <img
                  src={handtekeningAfbeelding}
                  alt=""
                  style={{ maxHeight: handtekeningAfbeeldingGrootte || 64, maxWidth: 200, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>Bijlage: {offerte.nummer}.pdf (wordt automatisch gegenereerd)</span>
          </div>
          {publiekeLink && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Publieke link</label>
              <div className="flex items-center gap-2">
                <Input readOnly value={publiekeLink} className="text-xs font-mono bg-muted/30" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(publiekeLink)
                    toast.success(<>Link gekopieerd<span style={{ color: '#F15025' }}>.</span></>)
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(publiekeLink, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending || isGenerating || !sendTo}>
            {isSending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Versturen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
