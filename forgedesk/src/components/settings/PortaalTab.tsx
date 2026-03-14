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
  Eye,
  CheckCircle2,
  Image,
  Phone,
  Globe,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { getPortaalInstellingen, updatePortaalInstellingen, getDefaultPortaalInstellingen } from '@/services/supabaseService'
import type { PortaalInstellingen } from '@/types'
import { toast } from 'sonner'

export function PortaalTab() {
  const { user } = useAuth()
  const { profile, primaireKleur } = useAppSettings()
  const [settings, setSettings] = useState<PortaalInstellingen>(getDefaultPortaalInstellingen())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    getPortaalInstellingen(user.id).then((s) => {
      setSettings(s)
      setLoading(false)
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Algemeen */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Algemeen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      <Separator />

      {/* Klant mogelijkheden */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Klant mogelijkheden
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

      <Separator />

      {/* Email notificaties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email notificaties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-[11px] text-muted-foreground mt-1">0 = geen herinnering</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Herinneringen ook voor facturen</Label>
              <p className="text-xs text-muted-foreground">Stuur ook herinneringen voor onbeantwoorde facturen</p>
            </div>
            <Switch
              checked={settings.herinnering_ook_voor_factuur}
              onCheckedChange={(v) => update('herinnering_ook_voor_factuur', v)}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Email teksten */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Email teksten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nieuw item email */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Nieuw item email</Label>
            <div>
              <Label className="text-sm font-medium">Onderwerp</Label>
              <Input
                value={settings.email_nieuw_item_onderwerp}
                onChange={(e) => update('email_nieuw_item_onderwerp', e.target.value)}
                placeholder="{bedrijfsnaam} — {itemtitel}"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Berichttekst</Label>
              <Textarea
                value={settings.email_nieuw_item_tekst}
                onChange={(e) => update('email_nieuw_item_tekst', e.target.value)}
                placeholder="Er is een nieuw item gedeeld voor project {projectnaam}."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Herinnering email */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Herinnering email</Label>
            <div>
              <Label className="text-sm font-medium">Onderwerp</Label>
              <Input
                value={settings.email_herinnering_onderwerp}
                onChange={(e) => update('email_herinnering_onderwerp', e.target.value)}
                placeholder="Herinnering: {itemtitel} wacht op uw reactie"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Berichttekst</Label>
              <Textarea
                value={settings.email_herinnering_tekst}
                onChange={(e) => update('email_herinnering_tekst', e.target.value)}
                placeholder="U heeft nog niet gereageerd op {itemtitel} voor project {projectnaam}."
                rows={2}
              />
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Variabelen: <code className="bg-muted px-1 rounded">{'{projectnaam}'}</code> <code className="bg-muted px-1 rounded">{'{itemtitel}'}</code> <code className="bg-muted px-1 rounded">{'{klantNaam}'}</code> <code className="bg-muted px-1 rounded">{'{bedrijfsnaam}'}</code> <code className="bg-muted px-1 rounded">{'{portaalUrl}'}</code>
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Bedrijfslogo tonen</Label>
              <p className="text-xs text-muted-foreground">Toon uw logo op het klantportaal en in emails</p>
            </div>
            <Switch
              checked={settings.bedrijfslogo_op_portaal}
              onCheckedChange={(v) => update('bedrijfslogo_op_portaal', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Bedrijfskleuren gebruiken</Label>
              <p className="text-xs text-muted-foreground">Gebruik uw primaire kleur op het portaal en in emails</p>
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

          {/* Live Preview */}
          <Separator />
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5 mb-3">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Portaal Preview */}
              <div className="rounded-xl border border-border overflow-hidden bg-[#FAFAF7]">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5 bg-muted/50 border-b">Klantportaal</p>
                {/* Mini header */}
                <div className="px-3 py-2 bg-white/90 border-b border-[#E8E8E3] flex items-center gap-2">
                  {settings.bedrijfslogo_op_portaal && profile?.logo_url ? (
                    <img src={profile.logo_url} alt="" className="h-5 w-auto max-w-[80px] object-contain" />
                  ) : (
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold"
                      style={{ backgroundColor: settings.bedrijfskleuren_gebruiken ? primaireKleur : '#1a1a1a' }}
                    >
                      {(profile?.bedrijfsnaam || 'B').charAt(0)}
                    </div>
                  )}
                  <span className="text-[10px] font-semibold text-[#1A1A1A] truncate">{profile?.bedrijfsnaam || 'Uw bedrijf'}</span>
                </div>
                {/* Mini item card */}
                <div className="p-3 space-y-2">
                  <div className="bg-white rounded-lg border border-[#E8E8E3] p-2.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{
                          backgroundColor: (settings.bedrijfskleuren_gebruiken ? primaireKleur : '#1a1a1a') + '12',
                          color: settings.bedrijfskleuren_gebruiken ? primaireKleur : '#1a1a1a',
                        }}
                      >
                        <Image className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-[10px] font-semibold text-[#1A1A1A]">Tekeningen v2</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#E4EBE6] text-[#5A8264] font-medium ml-auto">Goedgekeurd</span>
                    </div>
                    <div className="bg-[#F2F2ED] rounded h-12 mb-1.5" />
                    <button
                      className="w-full text-[9px] font-semibold text-white rounded py-1"
                      style={{ backgroundColor: settings.bedrijfskleuren_gebruiken ? primaireKleur : '#1a1a1a' }}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5" /> Goedkeuren
                    </button>
                  </div>
                  {settings.contactgegevens_tonen && (
                    <div className="bg-white rounded-lg border border-[#E8E8E3] p-2 flex gap-3">
                      <span className="text-[8px] text-[#8A8A85] flex items-center gap-0.5"><Phone className="w-2 h-2" /> 06-1234</span>
                      <span className="text-[8px] text-[#8A8A85] flex items-center gap-0.5"><Mail className="w-2 h-2" /> info@...</span>
                      <span className="text-[8px] text-[#8A8A85] flex items-center gap-0.5"><Globe className="w-2 h-2" /> website</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Preview */}
              <div className="rounded-xl border border-border overflow-hidden bg-[#F4F3F0]">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1.5 bg-muted/50 border-b">Uitgaande email</p>
                <div className="p-3 flex flex-col items-center">
                  {/* Logo in email */}
                  <div className="mb-2">
                    {settings.bedrijfslogo_op_portaal && profile?.logo_url ? (
                      <img src={profile.logo_url} alt="" className="h-6 w-auto max-w-[100px] object-contain" />
                    ) : (
                      <span className="text-[11px] text-[#1A1A1A]"><strong>FORGE</strong><span className="font-light">desk</span></span>
                    )}
                  </div>
                  {/* Email card */}
                  <div className="w-full bg-white rounded-lg shadow-sm p-3 space-y-2">
                    <p className="text-[10px] font-bold text-[#1A1A1A]">Er is een update voor uw project</p>
                    <div className="border border-[#E8E8E3] rounded p-2">
                      <p className="text-[9px] font-semibold text-[#1A1A1A]">Tekeningen v2</p>
                      <p className="text-[8px] text-[#5A5A55]">Bekijk de nieuwe tekeningen</p>
                    </div>
                    <div className="flex justify-center">
                      <span
                        className="text-[9px] font-semibold text-white rounded py-1 px-4 inline-block"
                        style={{ backgroundColor: settings.bedrijfskleuren_gebruiken ? primaireKleur : '#5A8264' }}
                      >
                        Bekijk in portaal &rarr;
                      </span>
                    </div>
                  </div>
                  <p className="text-[8px] text-[#8A8A85] mt-2">Verzonden via FORGEdesk{profile?.bedrijfsnaam ? ` namens ${profile.bedrijfsnaam}` : ''}</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Logo en kleur worden ingesteld bij <strong>Huisstijl</strong> en <strong>Profiel</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

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
