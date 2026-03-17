import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  UserPlus, ArrowLeft, Save, Plus, Trash2, Loader2,
  GripVertical, Copy, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { LeadFormulier, LeadFormulierVeld } from '@/types'
import {
  getLeadFormulier, createLeadFormulier, updateLeadFormulier,
} from '@/services/supabaseService'

function generateVeldId(): string {
  return `veld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

const DEFAULT_VELDEN: LeadFormulierVeld[] = [
  { id: generateVeldId(), label: 'Naam', type: 'tekst', verplicht: true, placeholder: 'Uw naam', volgorde: 1 },
  { id: generateVeldId(), label: 'Email', type: 'email', verplicht: true, placeholder: 'uw@email.nl', volgorde: 2 },
  { id: generateVeldId(), label: 'Telefoon', type: 'telefoon', verplicht: false, placeholder: '06-12345678', volgorde: 3 },
  { id: generateVeldId(), label: 'Bericht', type: 'textarea', verplicht: false, placeholder: 'Uw vraag of bericht...', volgorde: 4 },
]

export function LeadFormulierEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'nieuw'

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [formulierId, setFormulierId] = useState<string | null>(null)
  const [publiekToken, setPubliekToken] = useState('')

  // Form state
  const [naam, setNaam] = useState('')
  const [beschrijving, setBeschrijving] = useState('')
  const [velden, setVelden] = useState<LeadFormulierVeld[]>(DEFAULT_VELDEN)
  const [bedankTekst, setBedankTekst] = useState('Bedankt voor uw bericht! We nemen zo snel mogelijk contact met u op.')
  const [emailNotificatie, setEmailNotificatie] = useState(true)
  const [autoDealAanmaken, setAutoDealAanmaken] = useState(true)
  const [knopTekst, setKnopTekst] = useState('Versturen')

  useEffect(() => {
    let cancelled = false
    async function loadData() {
      if (isNew || !id) { setIsLoading(false); return }
      try {
        const form = await getLeadFormulier(id)
        if (!form) { toast.error('Formulier niet gevonden'); navigate('/leads'); return }
        if (cancelled) return
        setFormulierId(form.id)
        setPubliekToken(form.publiek_token)
        setNaam(form.naam)
        setBeschrijving(form.beschrijving || '')
        setVelden(form.velden)
        setBedankTekst(form.bedank_tekst)
        setEmailNotificatie(form.email_notificatie)
        setAutoDealAanmaken(form.auto_deal_aanmaken)
        setKnopTekst(form.knop_tekst)
      } catch {
        toast.error('Fout bij laden')
        navigate('/leads')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [id, isNew, navigate])

  // ============ VELDEN ============

  const handleAddVeld = useCallback(() => {
    setVelden((prev) => [...prev, {
      id: generateVeldId(),
      label: '',
      type: 'tekst',
      verplicht: false,
      placeholder: '',
      volgorde: prev.length + 1,
    }])
  }, [])

  const handleUpdateVeld = useCallback((veldId: string, updates: Partial<LeadFormulierVeld>) => {
    setVelden((prev) => prev.map((v) => v.id === veldId ? { ...v, ...updates } : v))
  }, [])

  const handleRemoveVeld = useCallback((veldId: string) => {
    setVelden((prev) => prev.filter((v) => v.id !== veldId))
  }, [])

  // ============ SAVE ============

  const handleSave = useCallback(async () => {
    if (!naam.trim()) { toast.error('Vul een formuliernaam in'); return }
    if (velden.length === 0) { toast.error('Voeg minimaal 1 veld toe'); return }

    setIsSaving(true)
    try {
      const orderedVelden = velden.map((v, i) => ({ ...v, volgorde: i + 1 }))

      if (isNew) {
        const created = await createLeadFormulier({
          user_id: '',
          naam: naam.trim(),
          beschrijving: beschrijving || undefined,
          velden: orderedVelden,
          bedank_tekst: bedankTekst,
          email_notificatie: emailNotificatie,
          auto_deal_aanmaken: autoDealAanmaken,
          standaard_bron: 'website',
          knop_tekst: knopTekst,
          actief: true,
        })
        setFormulierId(created.id)
        setPubliekToken(created.publiek_token)
        toast.success('Formulier aangemaakt')
        navigate(`/leads/formulieren/${created.id}`, { replace: true })
      } else if (formulierId) {
        await updateLeadFormulier(formulierId, {
          naam: naam.trim(),
          beschrijving: beschrijving || undefined,
          velden: orderedVelden,
          bedank_tekst: bedankTekst,
          email_notificatie: emailNotificatie,
          auto_deal_aanmaken: autoDealAanmaken,
          knop_tekst: knopTekst,
        })
        toast.success('Formulier opgeslagen')
      }
    } catch {
      toast.error('Fout bij opslaan')
    } finally {
      setIsSaving(false)
    }
  }, [isNew, naam, beschrijving, velden, bedankTekst, emailNotificatie, autoDealAanmaken, knopTekst, formulierId, navigate])

  const handleCopyLink = useCallback(() => {
    if (!publiekToken) return
    navigator.clipboard.writeText(`${window.location.origin}/formulier/${publiekToken}`)
    toast.success('Link gekopieerd')
  }, [publiekToken])

  const handleCopyEmbed = useCallback(() => {
    if (!publiekToken) return
    const code = `<iframe src="${window.location.origin}/formulier/${publiekToken}" width="100%" height="500" frameborder="0"></iframe>`
    navigator.clipboard.writeText(code)
    toast.success('Embed code gekopieerd')
  }, [publiekToken])

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{isNew ? 'Nieuw formulier' : naam}</h1>
            <p className="text-sm text-muted-foreground">{isNew ? 'Configureer je lead capture formulier' : 'Formulier bewerken'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {publiekToken && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-1"><Copy className="h-3.5 w-3.5" /> Link</Button>
              <Button variant="outline" size="sm" onClick={handleCopyEmbed} className="gap-1"><ExternalLink className="h-3.5 w-3.5" /> Embed</Button>
            </>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="gap-1 bg-gradient-to-r from-violet-500 to-fuchsia-600" size="sm">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Opslaan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form config */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Algemeen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Formuliernaam *</Label>
                <Input value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Bijv. Offerte aanvraag" />
              </div>
              <div>
                <Label>Beschrijving</Label>
                <Input value={beschrijving} onChange={(e) => setBeschrijving(e.target.value)} placeholder="Korte uitleg" />
              </div>
            </CardContent>
          </Card>

          {/* Velden */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Velden</CardTitle>
                <Button variant="outline" size="sm" onClick={handleAddVeld} className="gap-1"><Plus className="h-3.5 w-3.5" /> Veld</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {velden.map((veld, index) => (
                <div key={veld.id} className="flex items-start gap-2 p-3 bg-background dark:bg-muted/50 rounded-lg">
                  <GripVertical className="h-4 w-4 text-muted-foreground/60 mt-2 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={veld.label} onChange={(e) => handleUpdateVeld(veld.id, { label: e.target.value })} placeholder="Label" className="text-sm" />
                      <Select value={veld.type} onValueChange={(v) => handleUpdateVeld(veld.id, { type: v as LeadFormulierVeld['type'] })}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tekst">Tekst</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="telefoon">Telefoon</SelectItem>
                          <SelectItem value="textarea">Tekstvlak</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input value={veld.placeholder || ''} onChange={(e) => handleUpdateVeld(veld.id, { placeholder: e.target.value })} placeholder="Placeholder" className="text-xs flex-1" />
                      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                        <input type="checkbox" checked={veld.verplicht} onChange={(e) => handleUpdateVeld(veld.id, { verplicht: e.target.checked })} className="rounded" />
                        Verplicht
                      </label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 flex-shrink-0" onClick={() => handleRemoveVeld(veld.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Instellingen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bedanktekst</Label>
                <textarea value={bedankTekst} onChange={(e) => setBedankTekst(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" />
              </div>
              <div>
                <Label>Knop tekst</Label>
                <Input value={knopTekst} onChange={(e) => setKnopTekst(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={emailNotificatie} onChange={(e) => setEmailNotificatie(e.target.checked)} className="rounded" />
                  Email notificatie bij inzending
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={autoDealAanmaken} onChange={(e) => setAutoDealAanmaken(e.target.checked)} className="rounded" />
                  Automatisch deal aanmaken
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl p-6 bg-card space-y-4">
                <h3 className="text-lg font-bold text-foreground dark:text-white">{naam || 'Formulier titel'}</h3>
                {beschrijving && <p className="text-sm text-muted-foreground">{beschrijving}</p>}
                <Separator />
                {velden.map((veld) => (
                  <div key={veld.id}>
                    <Label className="text-sm">{veld.label || 'Veld'} {veld.verplicht && <span className="text-red-500">*</span>}</Label>
                    {veld.type === 'textarea' ? (
                      <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" placeholder={veld.placeholder} disabled />
                    ) : veld.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled className="rounded" /> {veld.placeholder || veld.label}</label>
                    ) : (
                      <Input placeholder={veld.placeholder} disabled className="text-sm" />
                    )}
                  </div>
                ))}
                <Button className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600" disabled>{knopTekst}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
