import { useState, useEffect, useRef, useCallback } from 'react'
import { logger } from '../../utils/logger'
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
  Monitor,
  Smartphone,
  PartyPopper,
  ExternalLink as OpenExtern,
} from 'lucide-react'
import { STANDAARD_KLANTPAGINA_TEKSTEN } from '@/lib/klantpaginaTeksten'
import { VOORBEELD_TOKEN, type VoorbeeldBericht } from '@/lib/offerteVoorbeeld'
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
  const [bedrijf, setBedrijf] = useState<VoorbeeldBericht['bedrijf']>({})
  const [contactpersoon, setContactpersoon] = useState<VoorbeeldBericht['contactpersoon']>(null)
  const [previewModus, setPreviewModus] = useState<'desktop' | 'mobiel'>('desktop')
  const [previewKlaar, setPreviewKlaar] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  // De preview draait de echte offertepagina in een iframe en krijgt de
  // instellingen via postMessage, zodat elke toetsaanslag meteen zichtbaar is.
  const stuurNaarPreview = useCallback((extra?: Partial<VoorbeeldBericht>) => {
    const venster = previewRef.current?.contentWindow
    if (!venster) return
    const bericht: VoorbeeldBericht = {
      type: 'doen-offerte-voorbeeld',
      huisstijl: {
        kop_kleur: settings.portaal_header_kleur,
        logo_tonen: settings.bedrijfslogo_op_portaal,
        akkoord_toegestaan: settings.klant_kan_offerte_goedkeuren,
        teksten: {
          akkoord_intro: settings.offerte_akkoord_intro || '',
          bedankt_kop: settings.offerte_bedankt_kop || '',
          bedankt_tekst: settings.offerte_bedankt_tekst || '',
        },
      },
      bedrijf: { ...bedrijf, logo_url: logoUrl },
      contactpersoon,
      ...extra,
    }
    venster.postMessage(bericht, window.location.origin)
  }, [settings, bedrijf, logoUrl, contactpersoon])

  useEffect(() => {
    const opBericht = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'doen-offerte-voorbeeld-klaar') return
      setPreviewKlaar(true)
    }
    window.addEventListener('message', opBericht)
    return () => window.removeEventListener('message', opBericht)
  }, [])

  useEffect(() => {
    if (previewKlaar) stuurNaarPreview()
  }, [previewKlaar, stuurNaarPreview])

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
      } catch (err) {
        setEmailGekoppeld(false)
      }
    } else {
      setEmailGekoppeld(false)
    }

    // Haal logo op uit profiel
    getProfile(user.id).then((profile) => {
      if (profile?.logo_url) setLogoUrl(profile.logo_url)
      setBedrijf({
        bedrijfsnaam: profile?.bedrijfsnaam,
        bedrijfs_telefoon: profile?.bedrijfs_telefoon,
        bedrijfs_email: profile?.bedrijfs_email,
      })
      const naam = [profile?.voornaam, profile?.achternaam].filter(Boolean).join(' ')
      setContactpersoon(naam ? { naam, functie: profile?.functie || null, foto_url: profile?.avatar_url || null } : null)
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

  function updateTemplate(templateKey: 'template_nieuw_item' | 'template_herinnering', field: keyof PortaalEmailTemplate, value: string) {
    setSettings(prev => ({
      ...prev,
      [templateKey]: { ...prev[templateKey], [field]: value },
    }))
  }

  async function sendTestEmail(templateKey: 'template_nieuw_item' | 'template_herinnering') {
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
      const onderwerp = Object.entries(demoVars).reduce((s, [k, v]) => s.split(k).join(v), template.onderwerp)
      const inhoud = Object.entries(demoVars).reduce((s, [k, v]) => s.split(k).join(v), template.inhoud)
      await sendEmail(user.email, `[TEST] ${onderwerp}`, inhoud, {})
      toast.success(`Testmail verstuurd naar ${user.email}`)
    } catch (err) {
      logger.error('Kon testmail niet versturen:', err)
      toast.error('Kon testmail niet versturen. Controleer je e-mailinstellingen.')
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
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-3 text-sm text-foreground dark:border-border dark:bg-muted dark:text-muted-foreground">
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
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2.5 text-sm text-foreground dark:border-border dark:bg-muted dark:text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 text-flame" />
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
              De branding komt uit je bedrijfsprofiel (Instellingen &gt; Bedrijf). Hier bepaal je wat de klant ervan ziet.
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
                <p className="text-xs text-muted-foreground">Toon je logo op het klantportaal en de offertepagina</p>
              </div>
              <Switch
                checked={settings.bedrijfslogo_op_portaal}
                onCheckedChange={(v) => update('bedrijfslogo_op_portaal', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Header achtergrond</Label>
                <p className="text-xs text-muted-foreground">Kleur van de bovenbalk op het portaal en de offertepagina</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.portaal_header_kleur || '#1A535C'}
                  onChange={(e) => update('portaal_header_kleur', e.target.value)}
                  className="w-8 h-8 rounded-md border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                />
                <Input
                  value={settings.portaal_header_kleur || ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update('portaal_header_kleur', v)
                  }}
                  className="w-24 h-8 text-xs font-mono"
                  placeholder="#1A535C"
                />
              </div>
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

        <Separator className="my-6" />

        {/* Offertepagina: teksten + live preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Offertepagina
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Dit ziet je klant als hij de offerte opent. Pas de teksten aan; de preview verandert mee. Leeg laten geeft de standaardtekst.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Tekst bij "Akkoord geven"</Label>
                <Input
                  value={settings.offerte_akkoord_intro || ''}
                  onChange={(e) => update('offerte_akkoord_intro', e.target.value)}
                  placeholder={STANDAARD_KLANTPAGINA_TEKSTEN.akkoord_intro}
                  maxLength={140}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Kop van het bedankscherm</Label>
                <Input
                  value={settings.offerte_bedankt_kop || ''}
                  onChange={(e) => update('offerte_bedankt_kop', e.target.value)}
                  placeholder={STANDAARD_KLANTPAGINA_TEKSTEN.bedankt_kop}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm font-medium">Tekst op het bedankscherm</Label>
                <Textarea
                  value={settings.offerte_bedankt_tekst || ''}
                  onChange={(e) => update('offerte_bedankt_tekst', e.target.value)}
                  placeholder={STANDAARD_KLANTPAGINA_TEKSTEN.bedankt_tekst}
                  rows={2}
                  maxLength={300}
                />
                <p className="text-xs text-muted-foreground">Verschijnt met confetti zodra de klant heeft getekend, en daarna in het overzicht van de vervolgstappen.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewModus('desktop')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${previewModus === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModus('mobiel')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${previewModus === 'mobiel' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Telefoon
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => stuurNaarPreview({ toonBedankt: true })} disabled={!previewKlaar}>
                  <PartyPopper className="h-3.5 w-3.5 mr-1.5" />
                  Bekijk het bedankscherm
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => window.open(`/offerte-bekijken/${VOORBEELD_TOKEN}`, '_blank')}>
                  <OpenExtern className="h-3.5 w-3.5 mr-1.5" />
                  Open groot
                </Button>
              </div>
            </div>

            <div className={`mx-auto overflow-hidden rounded-xl border border-border bg-[#F8F7F5] transition-all ${previewModus === 'mobiel' ? 'w-[390px] max-w-full' : 'w-full'}`}>
              <iframe
                ref={previewRef}
                title="Preview van de offertepagina"
                src={`/offerte-bekijken/${VOORBEELD_TOKEN}`}
                className="block w-full"
                style={{ height: previewModus === 'mobiel' ? 760 : 820, border: 0 }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              De preview is een voorbeeldofferte met een verzonnen klant. Je eigen logo, kopkleur en teksten zijn wel echt. Wat je hier ziet gaat pas live na Opslaan.
            </p>
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
