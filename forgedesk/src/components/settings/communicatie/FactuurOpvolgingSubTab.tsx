import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Loader2, Save, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getProfile, getAppSettings, updateAppSettings } from '@/services/supabaseService'
import { getFactuurOpvolgStappen, upsertFactuurOpvolgStappen, type FactuurOpvolgStap } from '@/services/factuurService'
import { sendEmail } from '@/services/gmailService'
import { factuurHerinneringTemplate } from '@/services/emailTemplateService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

type StapType = FactuurOpvolgStap['stap_type']

interface StapState {
  stap_type: StapType
  label: string
  actief: boolean
  dagen: number
  kanaal: 'email' | 'intern'
  onderwerp: string
  inhoud: string
  placeholder: string
  standaardOnderwerp: string
}

const STANDAARD_STAPPEN: Omit<StapState, 'onderwerp' | 'inhoud'>[] = [
  { stap_type: 'herinnering_1', label: 'Herinnering 1', actief: true, dagen: 7, kanaal: 'email', placeholder: 'Bijv. Misschien is het je ontgaan, maar we hebben nog geen betaling ontvangen voor factuur {factuur_nummer}.', standaardOnderwerp: 'Herinnering: factuur {factuur_nummer}' },
  { stap_type: 'herinnering_2', label: 'Herinnering 2', actief: true, dagen: 14, kanaal: 'email', placeholder: 'Bijv. Ondanks onze eerdere herinnering hebben we nog geen betaling ontvangen voor factuur {factuur_nummer}.', standaardOnderwerp: 'Tweede herinnering: factuur {factuur_nummer}' },
  { stap_type: 'herinnering_3', label: 'Herinnering 3', actief: false, dagen: 21, kanaal: 'email', placeholder: 'Bijv. Factuur {factuur_nummer} staat nog altijd open; we verzoeken u per omgaande te betalen.', standaardOnderwerp: 'Derde herinnering: factuur {factuur_nummer}' },
  { stap_type: 'aanmaning', label: 'Aanmaning', actief: true, dagen: 30, kanaal: 'email', placeholder: 'Bijv. Als we binnen 7 dagen geen betaling ontvangen voor factuur {factuur_nummer}, zijn we genoodzaakt verdere stappen te ondernemen.', standaardOnderwerp: 'Aanmaning: factuur {factuur_nummer}' },
]

export function FactuurOpvolgingSubTab() {
  const { user, organisatieId } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null)
  const [automatisch, setAutomatisch] = useState(false)
  const [stappen, setStappen] = useState<StapState[]>([])

  useEffect(() => {
    if (!user?.id) return
    const laad = async () => {
      try {
        const data = await getAppSettings(user.id)
        setAutomatisch(data.factuur_opvolging_automatisch === true)
        const appTeksten: Partial<Record<StapType, { onderwerp?: string; inhoud?: string }>> = {
          herinnering_1: { onderwerp: data.herinnering_1_onderwerp, inhoud: data.herinnering_1_tekst },
          herinnering_2: { onderwerp: data.herinnering_2_onderwerp, inhoud: data.herinnering_2_tekst },
          aanmaning: { onderwerp: data.aanmaning_onderwerp, inhoud: data.aanmaning_tekst },
        }
        const eigenRijen = organisatieId ? await getFactuurOpvolgStappen(organisatieId).catch(() => []) : []
        const perType = new Map(eigenRijen.map((r) => [r.stap_type, r]))
        setStappen(STANDAARD_STAPPEN.map((std) => {
          const eigen = perType.get(std.stap_type)
          return {
            ...std,
            actief: eigen?.actief ?? std.actief,
            dagen: eigen?.dagen_na_vervaldatum ?? std.dagen,
            kanaal: eigen?.kanaal ?? std.kanaal,
            onderwerp: eigen?.onderwerp ?? appTeksten[std.stap_type]?.onderwerp ?? std.standaardOnderwerp,
            inhoud: eigen?.inhoud ?? appTeksten[std.stap_type]?.inhoud ?? '',
          }
        }))
      } catch (err) {
        logger.error('Fout bij laden opvolg-instellingen:', err)
      } finally {
        setIsLoading(false)
      }
    }
    laad()
  }, [user?.id, organisatieId])

  const wijzigStap = (stapType: StapType, wijziging: Partial<StapState>) => {
    setStappen((prev) => prev.map((s) => (s.stap_type === stapType ? { ...s, ...wijziging } : s)))
  }

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const perType = new Map(stappen.map((s) => [s.stap_type, s]))
      // De teksten ook in app_settings: de Trigger.dev-cron leest die zolang
      // hij nog niet opnieuw gedeployed is, en als fallback daarna.
      await updateAppSettings(user.id, {
        herinnering_1_tekst: perType.get('herinnering_1')?.inhoud ?? '',
        herinnering_1_onderwerp: perType.get('herinnering_1')?.onderwerp ?? '',
        herinnering_2_tekst: perType.get('herinnering_2')?.inhoud ?? '',
        herinnering_2_onderwerp: perType.get('herinnering_2')?.onderwerp ?? '',
        aanmaning_tekst: perType.get('aanmaning')?.inhoud ?? '',
        aanmaning_onderwerp: perType.get('aanmaning')?.onderwerp ?? '',
        factuur_opvolging_automatisch: automatisch,
      })
      let ladderOpgeslagen = false
      if (organisatieId) {
        ladderOpgeslagen = await upsertFactuurOpvolgStappen(
          organisatieId,
          stappen.map((s) => ({
            stap_type: s.stap_type,
            dagen_na_vervaldatum: Math.max(1, Math.round(s.dagen) || 1),
            kanaal: s.kanaal,
            onderwerp: s.onderwerp || null,
            inhoud: s.inhoud || null,
            actief: s.actief,
          }))
        )
      }
      if (ladderOpgeslagen) {
        toast.success('Instellingen opgeslagen.')
      } else {
        toast.info('Teksten opgeslagen. De ladder-instellingen (dagen, kanaal, aan/uit per stap) worden actief zodra migratie 212 gedraaid is.')
      }
    } catch (err) {
      logger.error('Fout bij opslaan templates:', err)
      toast.error('Kon instellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async (stap: StapState) => {
    if (!user?.id || !user?.email) return
    setIsSendingTest(stap.stap_type)
    try {
      const p = await getProfile(user.id)
      const vars: Record<string, string> = {
        klant_naam: 'Jan de Vries',
        factuur_nummer: 'FAC-2026-0001',
        factuur_bedrag: '€ 1.250,00',
        vervaldatum: '15 maart 2026',
        dagen_verlopen: String(stap.dagen),
        bedrijfsnaam: p?.bedrijfsnaam || 'Uw Bedrijf',
        betaal_link: `${window.location.origin}/betalen/test-voorbeeld`,
      }
      const replaceVars = (s: string) => Object.entries(vars).reduce((r, [k, v]) => r.replace(new RegExp(`\\{${k}\\}`, 'g'), v), s)
      const sub = replaceVars(stap.onderwerp || stap.standaardOnderwerp)
      const body = replaceVars(stap.inhoud || stap.placeholder)
      const { html } = factuurHerinneringTemplate({
        klantNaam: vars.klant_naam,
        factuurNummer: vars.factuur_nummer,
        factuurTitel: 'Voorbeeld factuur',
        totaalBedrag: vars.factuur_bedrag,
        vervaldatum: vars.vervaldatum,
        dagenVervallen: stap.dagen,
        bedrijfsnaam: vars.bedrijfsnaam,
        logoUrl: p?.logo_url || undefined,
        betaalUrl: vars.betaal_link,
      })
      await sendEmail(user.email, `[TEST] ${sub}`, body, { html })
      toast.success(`Testmail verstuurd naar ${user.email}`)
    } catch (err) {
      logger.error('Fout bij versturen testmail:', err)
      toast.error('Kon testmail niet versturen, controleer je email-instellingen')
    } finally {
      setIsSendingTest(null)
    }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Betalingsherinneringen
          </CardTitle>
          <CardDescription>
            Stel per stap in wanneer hij verstuurd wordt, via welk kanaal, en met welke tekst. Mails gaan via je eigen email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="space-y-1">
              <Label htmlFor="factuur-opvolging-automatisch" className="text-sm font-medium">
                Automatisch versturen
              </Label>
              <p className="text-xs text-muted-foreground">
                Verstuurt de onderstaande ladder dagelijks (09:30) vanzelf voor facturen met
                status verzonden of vervallen. Handmatig verstuurde herinneringen tellen mee,
                dus dubbel mailen kan niet. Deelbetalingen worden verrekend, facturen die al
                langer dan 180 dagen openstaan zonder eerdere herinnering worden overgeslagen,
                en met een actieve Exact-koppeling pauzeert de opvolging als de betaalstand
                verouderd is.
              </p>
            </div>
            <Switch
              id="factuur-opvolging-automatisch"
              checked={automatisch}
              onCheckedChange={setAutomatisch}
            />
          </div>
          <div className="rounded-md border bg-muted/50 px-3 py-2.5">
            <p className="text-xs font-medium text-muted-foreground mb-1">Beschikbare variabelen:</p>
            <div className="flex flex-wrap gap-1.5">
              {['{klant_naam}', '{factuur_nummer}', '{factuur_bedrag}', '{vervaldatum}', '{dagen_verlopen}', '{bedrijfsnaam}', '{betaal_link}'].map((v) => (
                <code key={v} className="rounded bg-background px-1.5 py-0.5 text-xs font-mono border">{v}</code>
              ))}
            </div>
          </div>
          {stappen.map((stap) => (
            <div key={stap.stap_type} className={`space-y-2 p-3 rounded-lg border border-border/50 ${stap.actief ? 'bg-muted/20' : 'bg-muted/40 opacity-70'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id={`stap-actief-${stap.stap_type}`}
                    checked={stap.actief}
                    onCheckedChange={(actief) => wijzigStap(stap.stap_type, { actief })}
                  />
                  <Label htmlFor={`stap-actief-${stap.stap_type}`} className="text-sm font-medium">{stap.label}</Label>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={isSendingTest === stap.stap_type}
                  onClick={() => handleSendTest(stap)}
                >
                  {isSendingTest === stap.stap_type ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Testmail
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    value={stap.dagen}
                    onChange={(e) => wijzigStap(stap.stap_type, { dagen: Number(e.target.value) })}
                    className="h-8 w-20 text-xs"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">dagen na vervaldatum</span>
                </div>
                <Select value={stap.kanaal} onValueChange={(kanaal) => wijzigStap(stap.stap_type, { kanaal: kanaal as 'email' | 'intern' })}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Mail naar klant</SelectItem>
                    <SelectItem value="intern">Alleen intern signaal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {stap.kanaal === 'email' ? (
                <>
                  <Input value={stap.onderwerp} onChange={(e) => wijzigStap(stap.stap_type, { onderwerp: e.target.value })} placeholder="Onderwerp" className="text-xs h-8" />
                  <Textarea value={stap.inhoud} onChange={(e) => wijzigStap(stap.stap_type, { inhoud: e.target.value })} placeholder={stap.placeholder} rows={3} className="text-xs" />
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Geen mail naar de klant; het team krijgt een notificatie om zelf contact op te nemen.
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        Offerte-opvolging templates staan onder het tabblad Offerte-opvolging in deze supertab. Portaal-mail templates onder Portaal e-mails.
      </p>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Opslaan...' : 'Opslaan'}
        </Button>
      </div>
    </div>
  )
}
