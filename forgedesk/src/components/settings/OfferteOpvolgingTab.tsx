import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Eye, ArrowLeft, Copy, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
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
  '{klant_naam}',
  '{contactpersoon}',
  '{offerte_nummer}',
  '{offerte_bedrag}',
  '{project_naam}',
  '{verstuurd_op}',
  '{dagen_open}',
  '{bedrijfsnaam}',
  '{afzender_naam}',
  '{offerte_link}',
  '{portaal_link}',
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
  '{offerte_link}': 'https://portal.example.com/offerte/042',
  '{portaal_link}': 'https://portal.example.com/klant/login',
}

const ACTIE_LABELS: Record<string, string> = {
  email_klant: 'Email naar klant',
  melding_intern: 'Interne melding',
  email_en_melding: 'Beide',
}

function replaceMergeFields(text: string): string {
  let result = text
  for (const [key, value] of Object.entries(DUMMY_DATA)) {
    result = result.replaceAll(key, value)
  }
  return result
}

export function OfferteOpvolgingTab() {
  const { organisatieId } = useAuth()
  const [schemas, setSchemas] = useState<OpvolgSchema[]>([])
  const [selectedSchema, setSelectedSchema] = useState<OpvolgSchema | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewStap, setPreviewStap] = useState<OpvolgStap | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const loadSchemas = useCallback(async () => {
    if (!organisatieId) return
    try {
      setLoading(true)
      await ensureDefaultOpvolgSchema(organisatieId)
      const data = await getOpvolgSchemas(organisatieId)
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
    toast.success(`${field} gekopieerd`)
    setTimeout(() => setCopiedField(null), 1500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Laden...
      </div>
    )
  }

  // ── Schema editor ──
  if (selectedSchema) {
    const stappen = (selectedSchema.stappen || []).sort((a, b) => a.stap_nummer - b.stap_nummer)

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedSchema(null); setPreviewStap(null) }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Terug
          </Button>
          <div className="flex-1">
            <Input
              defaultValue={selectedSchema.naam}
              onBlur={(e) => handleSchemaNameChange(selectedSchema, e.target.value)}
              className="text-sm font-semibold h-8 max-w-[240px] bg-[#FAFAF8] border-[#E6E4E0]"
            />
          </div>
          {selectedSchema.is_default && (
            <Badge variant="outline" className="text-[#1A5C5E] border-[#1A5C5E]/30 text-[11px]">Standaard</Badge>
          )}
        </div>

        {/* Stappen tabel */}
        <Card className="border-[#E6E4E0] bg-white">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold">Opvolgstappen</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E6E4E0] bg-[#FAFAF8]">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[60px]">Dag</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[150px]">Actie</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Onderwerp</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[240px]">Inhoud</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground w-[80px]">Niet bekeken</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground w-[80px]">Niet gereageerd</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground w-[50px]">Actief</th>
                    <th className="w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {stappen.map((stap) => (
                    <tr key={stap.id} className="border-b border-[#E6E4E0] last:border-b-0 hover:bg-[#FAFAF8]/50">
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          defaultValue={stap.dagen_na_versturen}
                          onBlur={(e) => handleStapChange(stap, { dagen_na_versturen: parseInt(e.target.value) || 0 })}
                          className="h-7 w-[52px] text-xs font-mono bg-[#FAFAF8] border-[#E6E4E0] text-center"
                          style={{ fontFamily: 'DM Mono, monospace' }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          defaultValue={stap.actie}
                          onValueChange={(v) => handleStapChange(stap, { actie: v as OpvolgStap['actie'] })}
                        >
                          <SelectTrigger className="h-7 text-xs bg-[#FAFAF8] border-[#E6E4E0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email_klant">Email naar klant</SelectItem>
                            <SelectItem value="melding_intern">Interne melding</SelectItem>
                            <SelectItem value="email_en_melding">Beide</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          defaultValue={stap.onderwerp}
                          onBlur={(e) => handleStapChange(stap, { onderwerp: e.target.value })}
                          className="h-7 text-xs bg-[#FAFAF8] border-[#E6E4E0]"
                          placeholder="Onderwerp..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Textarea
                          defaultValue={stap.inhoud}
                          onBlur={(e) => handleStapChange(stap, { inhoud: e.target.value })}
                          className="text-xs bg-[#FAFAF8] border-[#E6E4E0] min-h-[60px] resize-none"
                          rows={3}
                          placeholder="Inhoud..."
                        />
                      </td>
                      <td className="text-center px-2 py-2">
                        <Switch
                          checked={stap.alleen_als_niet_bekeken}
                          onCheckedChange={(v) => handleStapChange(stap, { alleen_als_niet_bekeken: v })}
                          className="scale-75"
                        />
                      </td>
                      <td className="text-center px-2 py-2">
                        <Switch
                          checked={stap.alleen_als_niet_gereageerd}
                          onCheckedChange={(v) => handleStapChange(stap, { alleen_als_niet_gereageerd: v })}
                          className="scale-75"
                        />
                      </td>
                      <td className="text-center px-2 py-2">
                        <Switch
                          checked={stap.actief}
                          onCheckedChange={(v) => handleStapChange(stap, { actief: v })}
                          className="scale-75"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-[#1A5C5E]"
                            onClick={() => setPreviewStap(previewStap?.id === stap.id ? null : stap)}
                            title="Toon voorbeeld"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDeleteStap(stap.id)}
                            title="Verwijder stap"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-[#E6E4E0]">
              <Button variant="outline" size="sm" onClick={handleAddStap} className="text-xs border-[#E6E4E0]">
                <Plus className="h-3.5 w-3.5 mr-1" /> Stap toevoegen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email preview */}
        {previewStap && (
          <Card className="border-[#1A5C5E]/20 bg-[#FAFAF8]">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-semibold text-[#1A5C5E]">
                Voorbeeld — Stap {previewStap.stap_nummer} (dag {previewStap.dagen_na_versturen})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Actie:</span> {ACTIE_LABELS[previewStap.actie]}
              </div>
              <div className="text-xs">
                <span className="font-medium text-muted-foreground">Onderwerp:</span>{' '}
                <span className="font-semibold">{replaceMergeFields(previewStap.onderwerp)}</span>
              </div>
              <div className="bg-white rounded border border-[#E6E4E0] p-3 text-xs whitespace-pre-wrap leading-relaxed">
                {replaceMergeFields(previewStap.inhoud)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Merge velden */}
        <Card className="border-[#E6E4E0] bg-white">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Beschikbare merge-velden</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {MERGE_VELDEN.map((field) => (
                <button
                  key={field}
                  onClick={() => handleCopy(field)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-[#F4F2EE] border border-[#E6E4E0] text-[#1A5C5E] hover:bg-[#1A5C5E]/10 transition-colors cursor-pointer"
                  style={{ fontFamily: 'DM Mono, monospace' }}
                  title="Klik om te kopiëren"
                >
                  {copiedField === field ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {field}
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Offerte opvolging</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatische herinneringen en meldingen na het versturen van offertes.
          </p>
        </div>
        <Button size="sm" onClick={handleCreateSchema} className="text-xs bg-[#1A5C5E] hover:bg-[#1A5C5E]/90">
          <Plus className="h-3.5 w-3.5 mr-1" /> Nieuw schema
        </Button>
      </div>

      {schemas.length === 0 ? (
        <Card className="border-[#E6E4E0]">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Geen opvolgschema's gevonden.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {schemas.map((schema) => (
            <Card
              key={schema.id}
              className="border-[#E6E4E0] bg-white hover:border-[#1A5C5E]/30 transition-colors cursor-pointer"
              onClick={() => setSelectedSchema(schema)}
            >
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{schema.naam}</span>
                      {schema.is_default && (
                        <Badge variant="outline" className="text-[#1A5C5E] border-[#1A5C5E]/30 text-[10px] px-1.5 py-0">
                          Standaard
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: 'DM Mono, monospace' }}>
                      {(schema.stappen || []).length} stappen
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={schema.actief}
                    onCheckedChange={() => handleToggleActief(schema)}
                    className="scale-90"
                  />
                  {!schema.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); handleDeleteSchema(schema.id) }}
                      title="Schema verwijderen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
