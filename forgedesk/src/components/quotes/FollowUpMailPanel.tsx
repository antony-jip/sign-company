import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { X, RefreshCw, Send, Loader2 } from 'lucide-react'
import { generateFollowUpEmail, sendFollowUpEmail } from '@/services/followUpService'
import type { FollowUpContext } from '@/services/followUpService'
import { updateOfferte, getPortaalByProject } from '@/services/supabaseService'
import { logWijziging } from '@/utils/auditLogger'
import { cn } from '@/lib/utils'
import type { Offerte, Klant, Project } from '@/types'

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
      toast.error(err instanceof Error ? err.message : 'AI email generatie mislukt')
    } finally {
      setIsGenerating(false)
    }
  }, [offerte, klant, project, profile, dagenOpen, dagenTotVerlopen])

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

      // Send email
      await sendFollowUpEmail({
        to,
        subject: onderwerp,
        body: finalBody,
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
      } catch {
        // Non-critical
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
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-lavender-text)]" />
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
            className="gap-1.5 bg-[var(--color-lavender-text)] hover:bg-[var(--color-lavender-text)]/90 text-white"
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
