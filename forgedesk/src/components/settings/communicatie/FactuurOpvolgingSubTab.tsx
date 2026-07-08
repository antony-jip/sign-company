import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Mail, Loader2, Save, Send } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getProfile, getAppSettings, updateAppSettings } from '@/services/supabaseService'
import { sendEmail } from '@/services/gmailService'
import { factuurHerinneringTemplate } from '@/services/emailTemplateService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

export function FactuurOpvolgingSubTab() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null)

  const [herinnering1, setHerinnering1] = useState('')
  const [herinnering1Onderwerp, setHerinnering1Onderwerp] = useState('Herinnering: Factuur {factuur_nummer}')
  const [herinnering2, setHerinnering2] = useState('')
  const [herinnering2Onderwerp, setHerinnering2Onderwerp] = useState('2e herinnering: Factuur {factuur_nummer}')
  const [aanmaningTekst, setAanmaningTekst] = useState('')
  const [aanmaningOnderwerp, setAanmaningOnderwerp] = useState('Aanmaning: Factuur {factuur_nummer}')
  const [automatisch, setAutomatisch] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    getAppSettings(user.id).then((data) => {
      setHerinnering1(data.herinnering_1_tekst || '')
      setHerinnering1Onderwerp(data.herinnering_1_onderwerp || 'Herinnering: Factuur {factuur_nummer}')
      setHerinnering2(data.herinnering_2_tekst || '')
      setHerinnering2Onderwerp(data.herinnering_2_onderwerp || '2e herinnering: Factuur {factuur_nummer}')
      setAanmaningTekst(data.aanmaning_tekst || '')
      setAanmaningOnderwerp(data.aanmaning_onderwerp || 'Aanmaning: Factuur {factuur_nummer}')
      setAutomatisch(data.factuur_opvolging_automatisch === true)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      await updateAppSettings(user.id, {
        herinnering_1_tekst: herinnering1,
        herinnering_1_onderwerp: herinnering1Onderwerp,
        herinnering_2_tekst: herinnering2,
        herinnering_2_onderwerp: herinnering2Onderwerp,
        aanmaning_tekst: aanmaningTekst,
        aanmaning_onderwerp: aanmaningOnderwerp,
        factuur_opvolging_automatisch: automatisch,
      })
      toast.success('Instellingen opgeslagen.')
    } catch (err) {
      logger.error('Fout bij opslaan templates:', err)
      toast.error('Kon instellingen niet opslaan')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async (key: string, onderwerp: string, inhoud: string, placeholder: string) => {
    if (!user?.id || !user?.email) return
    setIsSendingTest(key)
    try {
      const p = await getProfile(user.id)
      const vars: Record<string, string> = {
        klant_naam: 'Jan de Vries',
        factuur_nummer: 'FAC-2026-0001',
        factuur_bedrag: '€ 1.250,00',
        vervaldatum: '15 maart 2026',
        dagen_verlopen: '7',
        bedrijfsnaam: p?.bedrijfsnaam || 'Uw Bedrijf',
        betaal_link: `${window.location.origin}/betalen/test-voorbeeld`,
      }
      const replaceVars = (s: string) => Object.entries(vars).reduce((r, [k, v]) => r.replace(new RegExp(`\\{${k}\\}`, 'g'), v), s)
      const sub = replaceVars(onderwerp)
      const body = replaceVars(inhoud || placeholder)
      const { html } = factuurHerinneringTemplate({
        klantNaam: vars.klant_naam,
        factuurNummer: vars.factuur_nummer,
        factuurTitel: 'Voorbeeld factuur',
        totaalBedrag: vars.factuur_bedrag,
        vervaldatum: vars.vervaldatum,
        dagenVervallen: 7,
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

  const templates = [
    { key: 'h1', label: 'Herinnering 1', onderwerp: herinnering1Onderwerp, setOnderwerp: setHerinnering1Onderwerp, inhoud: herinnering1, setInhoud: setHerinnering1, placeholder: 'Bijv. Misschien is het je ontgaan, maar we hebben nog geen betaling ontvangen voor factuur {factuur_nummer}.' },
    { key: 'h2', label: 'Herinnering 2', onderwerp: herinnering2Onderwerp, setOnderwerp: setHerinnering2Onderwerp, inhoud: herinnering2, setInhoud: setHerinnering2, placeholder: 'Bijv. Ondanks onze eerdere herinnering hebben we nog geen betaling ontvangen voor factuur {factuur_nummer}.' },
    { key: 'aanmaning', label: 'Aanmaning', onderwerp: aanmaningOnderwerp, setOnderwerp: setAanmaningOnderwerp, inhoud: aanmaningTekst, setInhoud: setAanmaningTekst, placeholder: 'Bijv. Als we binnen 7 dagen geen betaling ontvangen voor factuur {factuur_nummer}, zijn we genoodzaakt verdere stappen te ondernemen.' },
  ] as const

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Betalingsherinneringen
          </CardTitle>
          <CardDescription>
            Email-templates voor factuur-herinneringen en aanmaningen. Verstuurd via je eigen email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div className="space-y-1">
              <Label htmlFor="factuur-opvolging-automatisch" className="text-sm font-medium">
                Automatisch versturen
              </Label>
              <p className="text-xs text-muted-foreground">
                Verstuurt herinneringen dagelijks (09:30) vanzelf: herinnering 1 na 7 dagen,
                herinnering 2 na 14 dagen en de aanmaning na 30 dagen over de vervaldatum.
                Alleen voor facturen met status verzonden of vervallen; handmatig verstuurde
                herinneringen tellen mee, dus dubbel mailen kan niet. Deelbetalingen worden
                verrekend en facturen die al langer dan 180 dagen openstaan zonder eerdere
                herinnering worden overgeslagen.
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
          {templates.map((t) => (
            <div key={t.key} className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t.label}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={isSendingTest === t.key}
                  onClick={() => handleSendTest(t.key, t.onderwerp, t.inhoud, t.placeholder)}
                >
                  {isSendingTest === t.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Testmail
                </Button>
              </div>
              <Input value={t.onderwerp} onChange={(e) => t.setOnderwerp(e.target.value)} placeholder="Onderwerp" className="text-xs h-8" />
              <Textarea value={t.inhoud} onChange={(e) => t.setInhoud(e.target.value)} placeholder={t.placeholder} rows={2} className="text-xs" />
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
