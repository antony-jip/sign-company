import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { X, RefreshCw, Send, Loader2, Paperclip } from 'lucide-react'
import { generateFollowUpEmail, sendFollowUpEmail } from '@/services/followUpService'
import type { FollowUpContext, FollowUpEmailResult } from '@/services/followUpService'
import { updateOfferte, getPortaalByProject, getOfferteItems } from '@/services/supabaseService'
import { offerteVerzendTemplate } from '@/services/emailTemplateService'
import { generateOffertePDF } from '@/services/pdfService'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { useDocumentStyle } from '@/hooks/useDocumentStyle'
import { formatCurrency, formatDate } from '@/lib/utils'
import { logWijziging } from '@/utils/auditLogger'
import { logger } from '@/utils/logger'
import { cn } from '@/lib/utils'
import type { Offerte, Klant, Project, OfferteItem } from '@/types'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

interface FollowUpMailPanelProps {
  offerte: Offerte
  klant: Klant | null
  project: Project | null
  profile: { voornaam: string; achternaam: string; bedrijfsnaam: string } | null
  userId: string
  onClose: () => void
  onSent: () => void
}

export function FollowUpMailPanel({
  offerte,
  klant,
  project,
  profile,
  userId,
  onClose,
  onSent,
}: FollowUpMailPanelProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [to, setTo] = useState('')
  const [onderwerp, setOnderwerp] = useState('')
  const [body, setBody] = useState('')
  const [portaalLink, setPortaalLink] = useState(true)
  const [portaalUrl, setPortaalUrl] = useState<string | null>(null)
  const [bijlage, setBijlage] = useState(false)
  const [bijlagen, setBijlagen] = useState<File[]>([])
  const [items, setItems] = useState<OfferteItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { bedrijfsnaam, primaireKleur, emailHandtekening, profile: appProfile } = useAppSettings()
  const documentStyle = useDocumentStyle()

  // Laad offerte items (nodig voor PDF bijlage)
  useEffect(() => {
    if (offerte.id.startsWith('demo-')) return
    let cancelled = false
    getOfferteItems(offerte.id)
      .then((fetched) => { if (!cancelled) setItems(fetched) })
      .catch((err) => logger.error('Kon offerte items niet laden:', err))
    return () => { cancelled = true }
  }, [offerte.id])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setBijlagen((prev) => [...prev, ...Array.from(e.target.files!)])
      e.target.value = '' // reset zodat hetzelfde bestand opnieuw gekozen kan worden
    }
  }

  // Calculate days
  const dagenOpen = offerte.verstuurd_op
    ? Math.floor((Date.now() - new Date(offerte.verstuurd_op).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const dagenTotVerlopen = offerte.geldig_tot
    ? Math.floor((new Date(offerte.geldig_tot).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 30

  // Pre-fill email
  useEffect(() => {
    if (klant) {
      const primaryContact = klant.contactpersonen?.find((c) => c.is_primair)
      setTo(primaryContact?.email || klant.email || '')
    }
  }, [klant])

  // Check portaal
  useEffect(() => {
    async function checkPortaal() {
      if (offerte.project_id) {
        const portaal = await getPortaalByProject(offerte.project_id)
        if (portaal?.token) {
          setPortaalUrl(`${window.location.origin}/portaal/${portaal.token}`)
        } else {
          setPortaalLink(false)
        }
      } else {
        setPortaalLink(false)
      }
    }
    checkPortaal()
  }, [offerte.project_id])

  // Slimme fallback template die de offerte-context begrijpt
  const buildFallbackEmail = useCallback((): FollowUpEmailResult => {
    const contactpersoon = klant?.contactpersonen?.find((c) => c.is_primair)?.naam || klant?.contactpersoon || ''
    const voornaam = contactpersoon.split(' ')[0] || contactpersoon
    const afzender = profile?.voornaam || ''
    const bedrijf = profile?.bedrijfsnaam || ''
    const bedrag = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(offerte.totaal || 0)
    const pogingen = offerte.contact_pogingen || 0

    let aanhef = voornaam ? `Beste ${voornaam}` : 'Beste'
    let body: string

    if (dagenOpen <= 7) {
      // Vriendelijke check-in
      body = `${aanhef},

Graag wilde ik even informeren of u de offerte ${offerte.nummer} voor "${offerte.titel}" (${bedrag}) heeft kunnen bekijken.

${offerte.geldig_tot ? `De offerte is geldig tot ${new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(offerte.geldig_tot))}.` : ''}

Mocht u nog vragen hebben of iets willen bespreken, dan hoor ik het graag. U kunt de offerte ook direct online bekijken en goedkeuren via deze link: [PORTAAL_LINK]

${afzender}
${bedrijf}`
    } else if (dagenOpen <= 14) {
      // Iets directer
      body = `${aanhef},

${pogingen > 0 ? 'Ik kom nog even terug op ' : 'Ik wilde graag even opvolgen over '}onze offerte ${offerte.nummer} voor "${offerte.titel}" ter waarde van ${bedrag}.

Heeft u de offerte kunnen bekijken? Ik help u graag als er nog vragen zijn over de specificaties of mogelijkheden. We kunnen ook telefonisch even doornemen wat de beste aanpak is.

Bekijk de offerte direct online: [PORTAAL_LINK]

${afzender}
${bedrijf}`
    } else if (dagenOpen <= 21) {
      // Urgenter
      body = `${aanhef},

Onze offerte ${offerte.nummer} voor "${offerte.titel}" (${bedrag}) staat nu ${dagenOpen} dagen open.${offerte.geldig_tot && dagenTotVerlopen <= 7 ? ` Let op: de offerte verloopt over ${dagenTotVerlopen} dagen.` : ''}

Zijn er nog punten die u tegengehouden hebben? Ik denk graag met u mee over eventuele aanpassingen of alternatieven.

U kunt de offerte hier direct bekijken en goedkeuren: [PORTAAL_LINK]

${afzender}
${bedrijf}`
    } else {
      // Laatste poging
      body = `${aanhef},

${pogingen > 1 ? `Ik heb u eerder ${pogingen}x benaderd` : 'Ik heb u eerder benaderd'} over offerte ${offerte.nummer} — "${offerte.titel}" (${bedrag}).

Ik begrijp dat prioriteiten kunnen verschuiven. Laat me weten of dit project nog actueel is, dan kijken we samen naar de volgende stap. Als de huidige offerte niet meer aansluit, maak ik graag een aangepast voorstel.

${afzender}
${bedrijf}`
    }

    return {
      onderwerp: pogingen > 0
        ? `Re: Offerte ${offerte.nummer} — ${offerte.titel}`
        : `Opvolging offerte ${offerte.nummer} — ${offerte.titel}`,
      body,
    }
  }, [offerte, klant, profile, dagenOpen, dagenTotVerlopen])

  const generate = useCallback(async () => {
    setIsGenerating(true)
    try {
      const contactpersoon = klant?.contactpersonen?.find((c) => c.is_primair)?.naam || klant?.contactpersoon || ''
      const voornaam = contactpersoon.split(' ')[0] || contactpersoon

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
        bedrijfsnaam_afzender: profile?.bedrijfsnaam || '',
        afzender_naam: profile?.voornaam || '',
      }

      const result = await generateFollowUpEmail(context)
      setOnderwerp(result.onderwerp)
      setBody(result.body)
    } catch (err) {
      // Fallback: genereer contextbewuste template zonder AI
      const fallback = buildFallbackEmail()
      setOnderwerp(fallback.onderwerp)
      setBody(fallback.body)
    } finally {
      setIsGenerating(false)
    }
  }, [offerte, klant, project, profile, dagenOpen, dagenTotVerlopen, buildFallbackEmail])

  // Generate on mount
  useEffect(() => { generate() }, [generate])

  async function handleSend() {
    if (!to) {
      toast.error('Vul een email adres in')
      return
    }

    setIsSending(true)
    try {
      // Replace portal link placeholder
      let finalBody = body
      if (portaalLink && portaalUrl) {
        finalBody = finalBody.replace(/\[PORTAAL_LINK\]/g, portaalUrl)
      } else {
        // Remove the placeholder line if portal link is disabled
        finalBody = finalBody.replace(/[^\n]*\[PORTAAL_LINK\][^\n]*/g, '').replace(/\n{3,}/g, '\n\n')
      }

      const isDemo = offerte.id.startsWith('demo-')

      if (isDemo) {
        // Demo modus: simuleer verzending
        await new Promise((r) => setTimeout(r, 800))
      } else {
        // Bouw branded HTML template met de AI-body als customBody
        const bekijkUrl = portaalLink && portaalUrl ? portaalUrl : undefined
        const klantNaam = klant?.contactpersonen?.find((c) => c.is_primair)?.naam
          || klant?.contactpersoon
          || klant?.bedrijfsnaam
          || ''
        const { html } = offerteVerzendTemplate({
          klantNaam,
          offerteNummer: offerte.nummer,
          offerteTitel: offerte.titel,
          totaalBedrag: formatCurrency(offerte.totaal || 0),
          geldigTot: offerte.geldig_tot ? formatDate(offerte.geldig_tot) : '—',
          bedrijfsnaam: bedrijfsnaam || 'Uw bedrijf',
          primaireKleur,
          handtekening: emailHandtekening || undefined,
          logoUrl: appProfile?.logo_url || undefined,
          bekijkUrl,
          customBody: finalBody,
        })

        // Bouw attachments: PDF van de offerte + door user toegevoegde bestanden
        const attachments: Array<{ filename: string; content: string; encoding: 'base64' }> = []
        if (bijlage && items.length > 0) {
          try {
            const doc = await generateOffertePDF(
              offerte,
              items,
              klant || {} as Klant,
              { ...appProfile, primaireKleur: primaireKleur || '#2563eb' },
              documentStyle,
            )
            const pdfBase64 = doc.output('datauristring').split(',')[1]
            attachments.push({ filename: `Offerte ${offerte.nummer} - ${offerte.titel}.pdf`, content: pdfBase64, encoding: 'base64' })
          } catch (pdfErr) {
            logger.error('PDF genereren mislukt, email wordt zonder offerte-PDF verstuurd:', pdfErr)
          }
        }
        for (const file of bijlagen) {
          try {
            const b64 = await fileToBase64(file)
            attachments.push({ filename: file.name, content: b64, encoding: 'base64' })
          } catch (err) {
            logger.error(`Kon bijlage "${file.name}" niet inladen:`, err)
            toast.error(`Bijlage "${file.name}" kon niet worden meegestuurd`)
          }
        }

        // Send email
        await sendFollowUpEmail({
          to,
          subject: onderwerp,
          body: finalBody,
          html,
          attachments: attachments.length > 0 ? attachments : undefined,
        })

        // Update offerte
        await updateOfferte(offerte.id, {
          contact_pogingen: (offerte.contact_pogingen || 0) + 1,
          laatste_contact: new Date().toISOString(),
          follow_up_datum: new Date().toISOString().split('T')[0],
          follow_up_status: 'afgerond',
        })

        // Audit log
        try {
          await logWijziging({
            userId,
            entityType: 'offerte',
            entityId: offerte.id,
            actie: 'verstuurd',
            medewerkerNaam: profile ? `${profile.voornaam} ${profile.achternaam}` : '',
            omschrijving: `Follow-up email verstuurd naar ${to}`,
          })
        } catch (err) {
          // Non-critical
        }
      }

      toast.success(`Follow-up verstuurd naar ${klant?.bedrijfsnaam || to}`)
      onSent()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verzenden mislukt')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[500px] bg-card border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Follow-up mail</h2>
            <p className="text-sm text-muted-foreground font-mono">{offerte.nummer}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-mod-email-text" />
              <p className="text-sm text-muted-foreground">AI genereert follow-up mail...</p>
            </div>
          ) : (
            <>
              {/* To */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Aan</label>
                <Input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="email@voorbeeld.nl"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Onderwerp</label>
                <Input
                  value={onderwerp}
                  onChange={(e) => setOnderwerp(e.target.value)}
                />
              </div>

              {/* Body */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bericht</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Voeg portaal link toe</label>
                  <Switch
                    checked={portaalLink}
                    onCheckedChange={setPortaalLink}
                    disabled={!portaalUrl}
                  />
                </div>
                {!portaalUrl && (
                  <p className="text-xs text-muted-foreground">Geen portaal beschikbaar voor dit project</p>
                )}

                <div className="flex items-center justify-between">
                  <label className="text-sm">Offerte PDF als bijlage</label>
                  <Switch checked={bijlage} onCheckedChange={setBijlage} />
                </div>
              </div>

              {/* Bijlagen uploaden */}
              <div className="space-y-2 pt-1">
                <label className="text-sm font-medium">Bijlagen</label>
                <div
                  className="border-2 border-dashed rounded-xl px-4 py-3 text-center cursor-pointer hover:border-mod-email-border hover:bg-mod-email-light/10 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Klik om bestanden toe te voegen</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
                {bijlagen.length > 0 && (
                  <div className="space-y-1.5">
                    {bijlagen.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-1.5">
                        <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {file.size < 1024 * 1024
                            ? `${Math.round(file.size / 1024)} KB`
                            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                        <button
                          onClick={() => setBijlagen((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-0.5 rounded hover:bg-muted transition-colors shrink-0"
                        >
                          <X className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generate}
            disabled={isGenerating || isSending}
            className="gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
            Opnieuw genereren
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSending}
          >
            Annuleren
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={isGenerating || isSending || !to}
            className="gap-1.5 bg-mod-email-text hover:bg-mod-email-text/90 text-white"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Verstuur follow-up
          </Button>
        </div>
      </div>
    </>
  )
}
