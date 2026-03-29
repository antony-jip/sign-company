import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Save,
  Loader2,
  Link2,
  MessageSquare,
  Mail,
  Palette,
  Power,
  FileText,
  AlertTriangle,
  ExternalLink,
  Image,
  Send,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getPortaalInstellingen, updatePortaalInstellingen, getDefaultPortaalInstellingen, getProfile } from '@/services/supabaseService'
import type { PortaalInstellingen, PortaalEmailTemplate } from '@/types'
import { toast } from 'sonner'
import { sendEmail } from '@/services/gmailService'

const PLACEHOLDERS = ['{{klant_naam}}', '{{project_naam}}', '{{portaal_link}}', '{{bedrijfsnaam}}', '{{item_type}}']

export function PortaalTab() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PortaalInstellingen>(getDefaultPortaalInstellingen())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailGekoppeld, setEmailGekoppeld] = useState<boolean | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    getPortaalInstellingen(user.id).then((s) => {
      setSettings(s)
      setLoading(false)
    })

    // Check of email gekoppeld is
    const cached = sessionStorage.getItem('doen_email_settings')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setEmailGekoppeld(!!parsed?.gmail_address)
      } catch {
        setEmailGekoppeld(false)
      }
    } else {
      setEmailGekoppeld(false)
    }

    // Haal logo op uit profiel
    getProfile(user.id).then((profile) => {
      if (profile?.logo_url) setLogoUrl(profile.logo_url)
    })
  }, [user?.id])

  async function handleSave() {
    if (!user?.id) return
    setSaving(true)
    try {
      await updatePortaalInstellingen(user.id, settings)
      toast.success('Portaal instellingen opgeslagen')
    } catch (err) {
      toast.error((err as Error).message || 'Kon niet opslaan')
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof PortaalInstellingen>(key: K, value: PortaalInstellingen[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function updateTemplate(templateKey: 'template_portaallink' | 'template_nieuw_item' | 'template_herinnering', field: keyof PortaalEmailTemplate, value: string) {
    setSettings(prev => ({
      ...prev,
      [templateKey]: { ...prev[templateKey], [field]: value },
    }))
  }

  async function sendTestEmail(templateKey: 'template_portaallink' | 'template_nieuw_item' | 'template_herinnering') {
    if (!user?.email) return
    setIsSendingTest(templateKey)
    try {
      const template = settings[templateKey]
      const demoVars: Record<string, string> = {
        '{{klant_naam}}': 'Jan de Vries',
        '{{project_naam}}': 'Gevelreclame Hoofdkantoor',
        '{{portaal_link}}': `${window.location.origin}/portaal/test-voorbeeld`,
        '{{bedrijfsnaam}}': logoUrl ? '' : 'Uw Bedrijf',
        '{{item_type}}': 'offerte',
      }
      const onderwerp = Object.entries(demoVars).reduce((s, [k, v]) => s.replaceAll(k, v), template.onderwerp)
      const inhoud = Object.entries(demoVars).reduce((s, [k, v]) => s.replaceAll(k, v), template.inhoud)
      await sendEmail(user.email, `[TEST] ${onderwerp}`, inhoud, {})
      toast.success(`Testmail verstuurd naar ${user.email}`)
    } catch {
      toast.error('Kon testmail niet versturen — controleer je email instellingen')
    } finally {
      setIsSendingTest(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Master toggle */}
      <Card className={!settings.portaal_module_actief ? 'border-muted bg-muted/30' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Power className="h-4 w-4" />
            Klantportaal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Het klantportaal geeft uw klanten een eigen online omgeving waar ze offertes kunnen bekijken, tekeningen goedkeuren en berichten sturen.
          </p>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Klantportaal inschakelen</Label>
              <p className="text-xs text-muted-foreground">Schakel de volledige portaal module in of uit voor uw bedrijf</p>
            </div>
            <Switch
              checked={settings.portaal_module_actief}
              onCheckedChange={(v) => update('portaal_module_actief', v)}
            />
          </div>
        </CardContent>
      </Card>

      {!settings.portaal_module_actief && (
        <div className="flex items-center gap-2 rounded-md border border-[#E6E4E0] bg-[#F4F2EE] px-4 py-3 text-sm text-foreground dark:border-border dark:bg-muted dark:text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Het klantportaal is uitgeschakeld. Schakel het in om de onderstaande instellingen te gebruiken.
        </div>
      )}

      <div className={!settings.portaal_module_actief ? 'opacity-50 pointer-events-none' : ''}>
        {/* Algemeen */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Algemeen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bepaal de standaardinstellingen voor nieuwe portalen.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Portaal standaard actief</Label>
                <p className="text-xs text-muted-foreground">Nieuwe portalen zijn direct actief bij aanmaken</p>
              </div>
              <Switch
                checked={settings.portaal_standaard_actief}
                onCheckedChange={(v) => update('portaal_standaard_actief', v)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Link geldigheid (dagen)</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Hoe lang een portaallink geldig is</p>
              <Input
                type="number"
                min={1}
                max={365}
                value={settings.link_geldigheid_dagen}
                onChange={(e) => update('link_geldigheid_dagen', parseInt(e.target.value) || 30)}
                className="w-32"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Standaard instructietekst</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Wordt automatisch ingevuld bij nieuwe portalen</p>
              <Textarea
                value={settings.instructie_tekst}
                onChange={(e) => update('instructie_tekst', e.target.value)}
                placeholder="Welkom bij uw projectportaal. Hier vindt u alle documenten en kunt u feedback geven."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Klant mogelijkheden */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Klant mogelijkheden
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bepaal wat klanten kunnen doen in hun portaal.
            </p>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Offerte goedkeuren</Label>
                <p className="text-xs text-muted-foreground">Klant kan offertes goedkeuren of revisie aanvragen</p>
              </div>
              <Switch
                checked={settings.klant_kan_offerte_goedkeuren}
                onCheckedChange={(v) => update('klant_kan_offerte_goedkeuren', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Tekening goedkeuren</Label>
                <p className="text-xs text-muted-foreground">Klant kan tekeningen goedkeuren of revisie aanvragen</p>
              </div>
              <Switch
                checked={settings.klant_kan_tekening_goedkeuren}
                onCheckedChange={(v) => update('klant_kan_tekening_goedkeuren', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Bestanden uploaden</Label>
                <p className="text-xs text-muted-foreground">Klant kan bestanden uploaden bij een reactie</p>
              </div>
              <Switch
                checked={settings.klant_kan_bestanden_uploaden}
                onCheckedChange={(v) => update('klant_kan_bestanden_uploaden', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Berichten sturen</Label>
                <p className="text-xs text-muted-foreground">Klant kan berichten sturen via het portaal</p>
              </div>
              <Switch
                checked={settings.klant_kan_berichten_sturen}
                onCheckedChange={(v) => update('klant_kan_berichten_sturen', v)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Max bestandsgrootte (MB)</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Maximum grootte per bestand bij uploads</p>
              <Input
                type="number"
                min={1}
                max={50}
                value={settings.max_bestandsgrootte_mb}
                onChange={(e) => update('max_bestandsgrootte_mb', parseInt(e.target.value) || 10)}
                className="w-32"
              />
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Email notificaties */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email notificaties
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Notificaties worden verstuurd via uw gekoppelde email account. Koppel eerst uw Gmail in Instellingen &gt; Email als u dit nog niet heeft gedaan.
            </p>

            {emailGekoppeld === false && (
              <div className="flex items-center gap-2 rounded-md border border-[#E6E4E0] bg-[#F4F2EE] px-3 py-2.5 text-sm text-foreground dark:border-border dark:bg-muted dark:text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#F15025]" />
                <span>
                  Geen email account gekoppeld.{' '}
                  <button
                    type="button"
                    className="underline font-medium inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white"
                    onClick={() => {
                      // Navigate to email tab
                      const emailTab = document.querySelector('[data-tab="email"]') as HTMLElement | null
                      emailTab?.click()
                    }}
                  >
                    Koppel uw Gmail
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email bij nieuw item</Label>
                <p className="text-xs text-muted-foreground">Stuur klant een email als er een nieuw item wordt gedeeld</p>
              </div>
              <Switch
                checked={settings.email_naar_klant_bij_nieuw_item}
                onCheckedChange={(v) => update('email_naar_klant_bij_nieuw_item', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Email bij reactie</Label>
                <p className="text-xs text-muted-foreground">Ontvang een email wanneer de klant reageert</p>
              </div>
              <Switch
                checked={settings.email_naar_mij_bij_reactie}
                onCheckedChange={(v) => update('email_naar_mij_bij_reactie', v)}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Herinnering na (dagen)</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Stuur automatisch een herinnering als klant niet reageert</p>
              <Input
                type="number"
                min={0}
                max={30}
                value={settings.herinnering_na_dagen}
                onChange={(e) => update('herinnering_na_dagen', parseInt(e.target.value) || 0)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = geen herinnering</p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Email templates */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Email templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Pas de emails aan die naar klanten worden verstuurd vanuit het portaal.
            </p>

            <div className="rounded-md border bg-muted/50 px-3 py-2.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">Beschikbare placeholders:</p>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <code key={p} className="rounded bg-background px-1.5 py-0.5 text-xs font-mono border">{p}</code>
                ))}
              </div>
            </div>

            {/* Portaallink template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Portaallink email</Label>
                  <p className="text-xs text-muted-foreground">Verstuurd wanneer u een portaallink deelt met een klant.</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" disabled={isSendingTest === 'template_portaallink'} onClick={() => sendTestEmail('template_portaallink')}>
                  {isSendingTest === 'template_portaallink' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Testmail
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Onderwerp</Label>
                <Input
                  value={settings.template_portaallink.onderwerp}
                  onChange={(e) => updateTemplate('template_portaallink', 'onderwerp', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Inhoud</Label>
                <Textarea
                  value={settings.template_portaallink.inhoud}
                  onChange={(e) => updateTemplate('template_portaallink', 'inhoud', e.target.value)}
                  rows={5}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Nieuw item template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Nieuw item email</Label>
                  <p className="text-xs text-muted-foreground">Verstuurd wanneer u een nieuw item (offerte, tekening, bericht) deelt.</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" disabled={isSendingTest === 'template_nieuw_item'} onClick={() => sendTestEmail('template_nieuw_item')}>
                  {isSendingTest === 'template_nieuw_item' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Testmail
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Onderwerp</Label>
                <Input
                  value={settings.template_nieuw_item.onderwerp}
                  onChange={(e) => updateTemplate('template_nieuw_item', 'onderwerp', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Inhoud</Label>
                <Textarea
                  value={settings.template_nieuw_item.inhoud}
                  onChange={(e) => updateTemplate('template_nieuw_item', 'inhoud', e.target.value)}
                  rows={5}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>

            <Separator />

            {/* Herinnering template */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Herinnering email</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground" disabled={isSendingTest === 'template_herinnering'} onClick={() => sendTestEmail('template_herinnering')}>
                  {isSendingTest === 'template_herinnering' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Testmail
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Verstuurd als de klant niet reageert binnen het ingestelde aantal dagen.</p>
              <div>
                <Label className="text-xs text-muted-foreground">Onderwerp</Label>
                <Input
                  value={settings.template_herinnering.onderwerp}
                  onChange={(e) => updateTemplate('template_herinnering', 'onderwerp', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Inhoud</Label>
                <Textarea
                  value={settings.template_herinnering.inhoud}
                  onChange={(e) => updateTemplate('template_herinnering', 'inhoud', e.target.value)}
                  rows={5}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Branding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              De branding wordt overgenomen uit uw bedrijfsprofiel (Instellingen &gt; Bedrijf). Hier bepaalt u welke elementen zichtbaar zijn op het portaal.
            </p>

            {/* Logo preview */}
            {logoUrl ? (
              <div className="flex items-center gap-4 rounded-md border bg-muted/30 p-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-card">
                  <img src={logoUrl} alt="Bedrijfslogo" className="h-full w-full object-contain" />
                </div>
                <div className="text-sm">
                  <p className="font-medium">Huidig logo</p>
                  <button
                    type="button"
                    className="text-xs text-primary underline inline-flex items-center gap-1 hover:text-primary/80"
                    onClick={() => {
                      const bedrijfTab = document.querySelector('[data-tab="bedrijf"]') as HTMLElement | null
                      bedrijfTab?.click()
                    }}
                  >
                    Logo wijzigen in Bedrijfsprofiel
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-dashed bg-muted/20 p-3">
                <Image className="h-8 w-8 text-muted-foreground/50" />
                <div className="text-sm">
                  <p className="text-muted-foreground">Geen logo ingesteld.</p>
                  <button
                    type="button"
                    className="text-xs text-primary underline inline-flex items-center gap-1 hover:text-primary/80"
                    onClick={() => {
                      const bedrijfTab = document.querySelector('[data-tab="bedrijf"]') as HTMLElement | null
                      bedrijfTab?.click()
                    }}
                  >
                    Logo uploaden in Bedrijfsprofiel
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Bedrijfslogo tonen</Label>
                <p className="text-xs text-muted-foreground">Toon uw logo op het klantportaal</p>
              </div>
              <Switch
                checked={settings.bedrijfslogo_op_portaal}
                onCheckedChange={(v) => update('bedrijfslogo_op_portaal', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Bedrijfskleuren gebruiken</Label>
                <p className="text-xs text-muted-foreground">Gebruik uw primaire kleur op het portaal</p>
              </div>
              <Switch
                checked={settings.bedrijfskleuren_gebruiken}
                onCheckedChange={(v) => update('bedrijfskleuren_gebruiken', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Contactgegevens tonen</Label>
                <p className="text-xs text-muted-foreground">Toon telefoon, email en website op het portaal</p>
              </div>
              <Switch
                checked={settings.contactgegevens_tonen}
                onCheckedChange={(v) => update('contactgegevens_tonen', v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opslaan */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          Opslaan
        </Button>
      </div>
    </div>
  )
}
