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
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getPortaalInstellingen, updatePortaalInstellingen, getDefaultPortaalInstellingen } from '@/services/supabaseService'
import type { PortaalInstellingen } from '@/types'
import { toast } from 'sonner'

export function PortaalTab() {
  const { user } = useAuth()
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
            <p className="text-xs text-muted-foreground mt-1">0 = geen herinnering</p>
          </div>
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
