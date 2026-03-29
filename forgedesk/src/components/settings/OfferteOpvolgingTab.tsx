import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Eye, EyeOff, ArrowLeft, Copy, Check, Send, Loader2, Mail, Bell, Clock, Info } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { sendEmail } from '@/services/gmailService'
import {
  getOpvolgSchemas,
  createOpvolgSchema,
  updateOpvolgSchema,
  deleteOpvolgSchema,
  upsertOpvolgStap,
  deleteOpvolgStap,
  ensureDefaultOpvolgSchema,
} from '@/services/supabaseService'
import type { OpvolgSchema, OpvolgStap } from '@/types'
import { toast } from 'sonner'

const MERGE_VELDEN = [
  { key: '{klant_naam}', label: 'Bedrijfsnaam klant' },
  { key: '{contactpersoon}', label: 'Contactpersoon' },
  { key: '{offerte_nummer}', label: 'Offertenummer' },
  { key: '{offerte_bedrag}', label: 'Totaalbedrag' },
  { key: '{project_naam}', label: 'Projectnaam' },
  { key: '{verstuurd_op}', label: 'Verzenddatum' },
  { key: '{dagen_open}', label: 'Dagen sinds versturen' },
  { key: '{bedrijfsnaam}', label: 'Uw bedrijfsnaam' },
  { key: '{offerte_link}', label: 'Link naar offerte (portaal of publiek)' },
]

const DUMMY_DATA: Record<string, string> = {
  '{klant_naam}': 'Bakkerij De Gouden Korst',
  '{contactpersoon}': 'Jan de Vries',
  '{offerte_nummer}': 'OFF-2026-042',
  '{offerte_bedrag}': '€ 4.850,00',
  '{project_naam}': 'Gevelreclame & signing',
  '{verstuurd_op}': '15 maart 2026',
  '{dagen_open}': '7',
  '{bedrijfsnaam}': 'Sign Company BV',
  '{afzender_naam}': 'Pieter Jansen',
  '{offerte_link}': 'https://app.doen.team/offerte-bekijken/abc123',
  '{portaal_link}': 'https://app.doen.team/portaal/abc123',
}

const ACTIE_CONFIG: Record<string, { label: string; description: string; icon: typeof Mail }> = {
  email_klant: { label: 'Email naar klant', description: 'Stuurt een email naar de klant', icon: Mail },
  melding_intern: { label: 'Interne melding', description: 'Toont een melding in uw dashboard', icon: Bell },
  email_en_melding: { label: 'Email + melding', description: 'Stuurt een email én toont een melding', icon: Mail },
}

function replaceMergeFields(text: string): string {
  let result = text
  for (const [key, value] of Object.entries(DUMMY_DATA)) {
    result = result.split(key).join(value)
  }
  return result
}

export function OfferteOpvolgingTab() {
  const { organisatieId, user } = useAuth()
  const [schemas, setSchemas] = useState<OpvolgSchema[]>([])
  const [selectedSchema, setSelectedSchema] = useState<OpvolgSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewStapId, setPreviewStapId] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [sendingTestId, setSendingTestId] = useState<string | null>(null)

  const handleSendTest = async (stap: OpvolgStap) => {
    if (!user?.email) return
    setSendingTestId(stap.id)
    try {
      const onderwerp = replaceMergeFields(stap.onderwerp)
      const inhoud = replaceMergeFields(stap.inhoud)
      await sendEmail(user.email, `[TEST] ${onderwerp}`, inhoud, {})
      toast.success(`Testmail verstuurd naar ${user.email}`)
    } catch {
      toast.error('Kon testmail niet versturen — controleer je email instellingen')
    } finally {
      setSendingTestId(null)
    }
  }

  const loadSchemas = useCallback(async () => {
    if (!organisatieId) return
    try {
      setLoading(true)
      let data = await getOpvolgSchemas(organisatieId)

      if (data.length === 0) {
        await ensureDefaultOpvolgSchema(organisatieId)
        data = await getOpvolgSchemas(organisatieId)
      }

      // Deduplicate by name
      const seen = new Set<string>()
      data = data.filter(s => {
        if (seen.has(s.naam)) return false
        seen.add(s.naam)
        return true
      })

      setSchemas(data)
      if (selectedSchema) {
        const updated = data.find(s => s.id === selectedSchema.id)
        if (updated) setSelectedSchema(updated)
      }
    } catch (e) {
      console.error(e)
      toast.error('Kon opvolgschema\'s niet laden')
    } finally {
      setLoading(false)
    }
  }, [organisatieId, selectedSchema?.id])

  useEffect(() => {
    loadSchemas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisatieId])

  const handleCreateSchema = async () => {
    if (!organisatieId) return
    try {
      const schema = await createOpvolgSchema(organisatieId, 'Nieuw schema')
      await loadSchemas()
      const updated = await getOpvolgSchemas(organisatieId)
      const created = updated.find(s => s.id === schema.id)
      setSelectedSchema(created || schema)
      toast.success('Schema aangemaakt')
    } catch {
      toast.error('Kon schema niet aanmaken')
    }
  }

  const handleDeleteSchema = async (id: string) => {
    try {
      await deleteOpvolgSchema(id)
      if (selectedSchema?.id === id) setSelectedSchema(null)
      await loadSchemas()
      toast.success('Schema verwijderd')
    } catch {
      toast.error('Kon schema niet verwijderen')
    }
  }

  const handleToggleActief = async (schema: OpvolgSchema) => {
    try {
      await updateOpvolgSchema(schema.id, { actief: !schema.actief })
      await loadSchemas()
    } catch {
      toast.error('Kon status niet wijzigen')
    }
  }

  const handleSchemaNameChange = async (schema: OpvolgSchema, naam: string) => {
    try {
      await updateOpvolgSchema(schema.id, { naam })
      await loadSchemas()
    } catch {
      toast.error('Kon naam niet opslaan')
    }
  }

  const handleStapChange = async (stap: OpvolgStap, updates: Partial<OpvolgStap>) => {
    try {
      await upsertOpvolgStap({ ...stap, ...updates, schema_id: stap.schema_id })
      await loadSchemas()
    } catch {
      toast.error('Kon stap niet opslaan')
    }
  }

  const handleAddStap = async () => {
    if (!selectedSchema) return
    const stappen = selectedSchema.stappen || []
    const maxNr = stappen.reduce((m, s) => Math.max(m, s.stap_nummer), 0)
    const maxDag = stappen.reduce((m, s) => Math.max(m, s.dagen_na_versturen), 0)
    try {
      await upsertOpvolgStap({
        schema_id: selectedSchema.id,
        stap_nummer: maxNr + 1,
        dagen_na_versturen: maxDag + 7,
        actie: 'email_klant',
        onderwerp: '',
        inhoud: '',
        alleen_als_niet_bekeken: false,
        alleen_als_niet_gereageerd: false,
        actief: true,
      })
      await loadSchemas()
      toast.success('Stap toegevoegd')
    } catch {
      toast.error('Kon stap niet toevoegen')
    }
  }

  const handleDeleteStap = async (id: string) => {
    try {
      await deleteOpvolgStap(id)
      await loadSchemas()
      toast.success('Stap verwijderd')
    } catch {
      toast.error('Kon stap niet verwijderen')
    }
  }

  const handleCopy = (field: string) => {
    navigator.clipboard.writeText(field)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 1500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Laden...
      </div>
    )
  }

  // ── Schema editor ──
  if (selectedSchema) {
    const stappen = (selectedSchema.stappen || []).sort((a, b) => a.stap_nummer - b.stap_nummer)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedSchema(null); setPreviewStapId(null) }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Terug
          </Button>
          <div className="flex-1">
            <Input
              defaultValue={selectedSchema.naam}
              onBlur={(e) => handleSchemaNameChange(selectedSchema, e.target.value)}
              className="text-sm font-semibold h-8 max-w-[240px]"
            />
          </div>
          {selectedSchema.is_default && (
            <Badge variant="outline" className="text-[10px]">Standaard</Badge>
          )}
        </div>

        {/* Stappen als kaarten */}
        <div className="space-y-3">
          {stappen.map((stap, index) => {
            const actieConfig = ACTIE_CONFIG[stap.actie] || ACTIE_CONFIG.email_klant
            const isExpanded = previewStapId === stap.id

            return (
              <Card key={stap.id} className={`transition-all ${!stap.actief ? 'opacity-50' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Stap header */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-semibold text-muted-foreground shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Na</span>
                      </div>
                      <Input
                        type="number"
                        defaultValue={stap.dagen_na_versturen}
                        onBlur={(e) => handleStapChange(stap, { dagen_na_versturen: parseInt(e.target.value) || 0 })}
                        className="h-7 w-16 text-xs text-center"
                        min={1}
                      />
                      <span className="text-xs text-muted-foreground">dagen</span>
                      <span className="text-muted-foreground/30 mx-1">·</span>
                      <Select
                        defaultValue={stap.actie}
                        onValueChange={(v) => handleStapChange(stap, { actie: v as OpvolgStap['actie'] })}
                      >
                        <SelectTrigger className="h-7 text-xs w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ACTIE_CONFIG).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={stap.actief}
                        onCheckedChange={(v) => handleStapChange(stap, { actief: v })}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => setPreviewStapId(isExpanded ? null : stap.id)}
                        title={isExpanded ? 'Verberg voorbeeld' : 'Toon voorbeeld'}
                      >
                        {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        disabled={sendingTestId === stap.id}
                        onClick={() => handleSendTest(stap)}
                        title="Verstuur testmail naar jezelf"
                      >
                        {sendingTestId === stap.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteStap(stap.id)}
                        title="Verwijder stap"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Onderwerp + inhoud */}
                  <div className="pl-10 space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Onderwerp</Label>
                      <Input
                        defaultValue={stap.onderwerp}
                        onBlur={(e) => handleStapChange(stap, { onderwerp: e.target.value })}
                        className="mt-1 text-xs h-8"
                        placeholder="Bijv. Offerte {offerte_nummer} — heeft u nog vragen?"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Inhoud</Label>
                      <Textarea
                        defaultValue={stap.inhoud}
                        onBlur={(e) => handleStapChange(stap, { inhoud: e.target.value })}
                        className="mt-1 text-xs min-h-[80px]"
                        rows={4}
                        placeholder="Beste {contactpersoon},&#10;&#10;..."
                      />
                    </div>

                    {/* Condities */}
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          checked={stap.alleen_als_niet_bekeken}
                          onCheckedChange={(v) => handleStapChange(stap, { alleen_als_niet_bekeken: v })}
                          className="scale-[0.65]"
                        />
                        Alleen als offerte niet bekeken is
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <Switch
                          checked={stap.alleen_als_niet_gereageerd}
                          onCheckedChange={(v) => handleStapChange(stap, { alleen_als_niet_gereageerd: v })}
                          className="scale-[0.65]"
                        />
                        Alleen als klant niet gereageerd heeft
                      </label>
                    </div>
                  </div>

                  {/* Preview */}
                  {isExpanded && (
                    <div className="pl-10 pt-2">
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Voorbeeld met dummy data:</p>
                        <p className="text-xs font-semibold">{replaceMergeFields(stap.onderwerp) || '(geen onderwerp)'}</p>
                        <Separator />
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">
                          {replaceMergeFields(stap.inhoud) || '(geen inhoud)'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <Button variant="outline" size="sm" onClick={handleAddStap} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Stap toevoegen
          </Button>
        </div>

        {/* Merge velden */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Beschikbare variabelen</CardTitle>
            <CardDescription className="text-xs">Klik om te kopiëren, plak in onderwerp of inhoud.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {MERGE_VELDEN.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleCopy(key)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] bg-muted/50 border border-border/50 hover:bg-muted transition-colors cursor-pointer group"
                >
                  <code className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground shrink-0">
                    {copiedField === key ? <Check className="h-3 w-3 text-green-600" /> : key}
                  </code>
                  <span className="text-muted-foreground truncate">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Schema overzicht ──
  return (
    <div className="space-y-6">
      {/* Uitleg bovenaan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Offerte opvolging
          </CardTitle>
          <CardDescription>
            Automatische herinneringen wanneer een klant niet reageert op een verstuurde offerte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Hoe werkt het?
            </p>
            <div className="space-y-2 text-xs leading-relaxed">
              <p>
                Wanneer je een offerte verstuurt (via portaal of als PDF), start de opvolging automatisch.
                Het systeem checkt elke ochtend om 08:00 of er stappen uitgevoerd moeten worden.
              </p>
              <p>
                Per stap bepaal je <strong>na hoeveel dagen</strong> de actie plaatsvindt, <strong>wat er gebeurt</strong> (email naar klant,
                interne melding, of beide), en onder welke <strong>voorwaarden</strong> (bijv. alleen als de klant de offerte nog niet bekeken heeft).
              </p>
              <p>
                De link in de email past zich automatisch aan: bij een portaal-offerte linkt het naar het portaal,
                bij een PDF-offerte naar de publieke offertepagina.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {schemas.length === 0 ? 'Nog geen schema — maak er één aan.' : `${schemas.length} ${schemas.length === 1 ? 'schema' : 'schema\'s'}`}
            </span>
            <Button size="sm" onClick={handleCreateSchema} className="text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Nieuw schema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schema lijst */}
      {schemas.map((schema) => (
        <Card
          key={schema.id}
          className="hover:border-foreground/20 transition-colors cursor-pointer"
          onClick={() => setSelectedSchema(schema)}
        >
          <CardContent className="flex items-center justify-between py-4 px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{schema.naam}</span>
                {schema.is_default && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Standaard</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {(schema.stappen || []).length} stappen · {schema.actief ? 'Actief' : 'Uitgeschakeld'}
              </span>
            </div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={schema.actief}
                onCheckedChange={() => handleToggleActief(schema)}
                className="scale-90"
              />
              {!schema.is_default && (
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                  onClick={(e) => { e.stopPropagation(); handleDeleteSchema(schema.id) }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
