import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  getBedrijfsprofielen,
  createBedrijfsprofiel,
  updateBedrijfsprofiel,
  deleteBedrijfsprofiel,
} from '@/services/bedrijfsprofielService'
import { uploadBriefpapier, uploadVervolgpapier } from '@/services/supabaseService'
import type { Bedrijfsprofiel, BriefpapierModus } from '@/types'
import { Section, SliderWithInput } from './HuisstijlTab'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

// Een tweede bedrijf om offertes onder uit te geven (migratie 189). Alleen de
// bedrijfsgegevens en het papier staan hier: lettertypen, kleuren, marges en
// tabelstijl blijven die van Huisstijl, want die worden gedeeld.

type Concept = Partial<Bedrijfsprofiel> & { label: string }

const LEEG: Concept = {
  label: '',
  bedrijfsnaam: '',
  bedrijfs_adres: '',
  bedrijfs_telefoon: '',
  bedrijfs_email: '',
  bedrijfs_website: '',
  kvk_nummer: '',
  btw_nummer: '',
  iban: '',
  logo_url: '',
  briefpapier_url: '',
  vervolgpapier_url: '',
  briefpapier_modus: 'geen',
  briefpapier_toon_branding: false,
  actief: true,
}

function VeldRij({ label, waarde, onChange, placeholder }: {
  label: string
  waarde: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground dark:text-muted-foreground/60">{label}</Label>
      <Input value={waarde} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9" />
    </div>
  )
}

function PapierVak({ titel, url, bezig, onKies, onWis, hint }: {
  titel: string
  url: string
  bezig: boolean
  onKies: () => void
  onWis: () => void
  hint: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{titel}</label>
      {url ? (
        <div className="relative group rounded-lg overflow-hidden border border-border bg-background">
          <img src={url} alt={titel} className="w-full aspect-[210/297] object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button onClick={onKies} disabled={bezig} className="px-3 py-1.5 text-xs font-medium bg-card rounded-md shadow-sm hover:bg-background transition-colors">
              {bezig ? 'Uploaden...' : 'Wijzigen'}
            </button>
            <button onClick={onWis} className="px-3 py-1.5 text-xs font-medium bg-card text-[#C0451A] rounded-md shadow-sm hover:bg-[hsl(var(--status-flame-bg))] transition-colors">
              Verwijder
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onKies}
          disabled={bezig}
          className="w-full aspect-[210/297] rounded-lg border-2 border-dashed border-border hover:border-petrol/30 hover:bg-petrol/[0.02] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{bezig ? 'Uploaden...' : 'Uploaden'}</span>
          <span className="text-[10px] text-muted-foreground/60">{hint}</span>
        </button>
      )}
    </div>
  )
}

function ProfielFormulier({ waarde, onChange }: {
  waarde: Concept
  onChange: (updates: Partial<Bedrijfsprofiel>) => void
}) {
  const { user } = useAuth()
  const briefpapierRef = useRef<HTMLInputElement>(null)
  const vervolgpapierRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const [bezigBrief, setBezigBrief] = useState(false)
  const [bezigVervolg, setBezigVervolg] = useState(false)
  const [bezigLogo, setBezigLogo] = useState(false)

  const upload = useCallback(async (
    bestand: File | undefined,
    uploader: (userId: string, file: File) => Promise<string>,
    zetBezig: (v: boolean) => void,
    klaar: (url: string) => void,
  ) => {
    if (!bestand || !user?.id) return
    if (bestand.size > 10 * 1024 * 1024) {
      toast.error('Bestand is groter dan 10 MB')
      return
    }
    zetBezig(true)
    try {
      klaar(await uploader(user.id, bestand))
    } catch (err) {
      logger.error('Upload voor bedrijfsprofiel mislukt:', err)
      toast.error('Uploaden is niet gelukt')
    } finally {
      zetBezig(false)
    }
  }, [user?.id])

  const heeftPapier = !!waarde.briefpapier_url && waarde.briefpapier_modus !== 'geen'

  return (
    <div className="space-y-4">
      <Section title="Bedrijfsgegevens" icon={Building2}>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Deze gegevens komen op de offerte te staan in plaats van je eigen bedrijfsgegevens.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VeldRij label="Naam in de keuzelijst" waarde={waarde.label || ''} onChange={(v) => onChange({ label: v })} placeholder="Duurzame Vlaggen" />
          <VeldRij label="Bedrijfsnaam op het document" waarde={waarde.bedrijfsnaam || ''} onChange={(v) => onChange({ bedrijfsnaam: v })} placeholder="Duurzame Vlaggen" />
          <VeldRij label="Adres" waarde={waarde.bedrijfs_adres || ''} onChange={(v) => onChange({ bedrijfs_adres: v })} placeholder="De Drie Kronen 115, 1601 MT Enkhuizen" />
          <VeldRij label="Telefoon" waarde={waarde.bedrijfs_telefoon || ''} onChange={(v) => onChange({ bedrijfs_telefoon: v })} placeholder="0228 35 19 60" />
          <VeldRij label="E-mail" waarde={waarde.bedrijfs_email || ''} onChange={(v) => onChange({ bedrijfs_email: v })} placeholder="info@duurzamevlaggen.nl" />
          <VeldRij label="Website" waarde={waarde.bedrijfs_website || ''} onChange={(v) => onChange({ bedrijfs_website: v })} placeholder="duurzamevlaggen.nl" />
          <VeldRij label="KvK-nummer" waarde={waarde.kvk_nummer || ''} onChange={(v) => onChange({ kvk_nummer: v })} />
          <VeldRij label="Btw-nummer" waarde={waarde.btw_nummer || ''} onChange={(v) => onChange({ btw_nummer: v })} />
          <VeldRij label="IBAN" waarde={waarde.iban || ''} onChange={(v) => onChange({ iban: v })} />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <div className="h-14 w-14 rounded-lg border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
            {waarde.logo_url
              ? <img src={waarde.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
              : <ImageIcon className="h-5 w-5 text-muted-foreground/50" />}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Logo. Wordt alleen getekend als dit bedrijf geen briefpapier gebruikt.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} disabled={bezigLogo}>
                {bezigLogo ? 'Uploaden...' : 'Logo kiezen'}
              </Button>
              {waarde.logo_url && (
                <Button variant="ghost" size="sm" onClick={() => onChange({ logo_url: '' })}>Verwijder</Button>
              )}
            </div>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const bestand = e.target.files?.[0]
              upload(bestand, uploadBriefpapier, setBezigLogo, (url) => onChange({ logo_url: url }))
              if (logoRef.current) logoRef.current.value = ''
            }}
          />
        </div>
      </Section>

      <Section title="Briefpapier" icon={ImageIcon}>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Upload het briefpapier van dit bedrijf. Net als bij je eigen briefpapier: JPG op ongeveer 2480 × 3508 px blijft scherp bij printen.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PapierVak
            titel="Pagina 1"
            url={waarde.briefpapier_url || ''}
            bezig={bezigBrief}
            hint="JPG aanbevolen · max 10MB"
            onKies={() => briefpapierRef.current?.click()}
            onWis={() => onChange({ briefpapier_url: '', briefpapier_modus: 'geen' })}
          />
          <PapierVak
            titel="Pagina 2+"
            url={waarde.vervolgpapier_url || ''}
            bezig={bezigVervolg}
            hint="Compactere versie"
            onKies={() => vervolgpapierRef.current?.click()}
            onWis={() => onChange({ vervolgpapier_url: '' })}
          />
        </div>
        <input
          ref={briefpapierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const bestand = e.target.files?.[0]
            upload(bestand, uploadBriefpapier, setBezigBrief, (url) => onChange({
              briefpapier_url: url,
              briefpapier_modus: waarde.briefpapier_modus === 'geen' ? 'achtergrond' : waarde.briefpapier_modus,
            }))
            if (briefpapierRef.current) briefpapierRef.current.value = ''
          }}
        />
        <input
          ref={vervolgpapierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const bestand = e.target.files?.[0]
            upload(bestand, uploadVervolgpapier, setBezigVervolg, (url) => onChange({
              vervolgpapier_url: url,
              briefpapier_modus: waarde.briefpapier_url ? 'eerste_en_vervolg' : waarde.briefpapier_modus,
            }))
            if (vervolgpapierRef.current) vervolgpapierRef.current.value = ''
          }}
        />

        {waarde.briefpapier_url && (
          <div className="space-y-1.5 pt-2">
            <label className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">Toepassing</label>
            <Select
              value={waarde.briefpapier_modus || 'geen'}
              onValueChange={(v) => onChange({ briefpapier_modus: v as BriefpapierModus })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="achtergrond">Alle pagina&apos;s</SelectItem>
                <SelectItem value="alleen_eerste_pagina">Alleen eerste pagina</SelectItem>
                {waarde.vervolgpapier_url && <SelectItem value="eerste_en_vervolg">Pagina 1 + vervolgpapier</SelectItem>}
                <SelectItem value="geen">Uitgeschakeld</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {heeftPapier && (
          <div className="space-y-4 pt-5 mt-2 border-t border-border">
            <div>
              <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-1">Veilige zone</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Ander papier betekent bijna altijd een andere vrije zone. Deze waarden gelden alleen voor dit bedrijf.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <SliderWithInput label="Boven" unit="mm" min={0} max={80} value={waarde.briefpapier_safe_zone_boven ?? 0} onChange={(v) => onChange({ briefpapier_safe_zone_boven: v })} />
                <SliderWithInput label="Onder" unit="mm" min={0} max={80} value={waarde.briefpapier_safe_zone_onder ?? 0} onChange={(v) => onChange({ briefpapier_safe_zone_onder: v })} />
                <SliderWithInput label="Links" unit="mm" min={-30} max={80} value={waarde.briefpapier_safe_zone_links ?? 0} onChange={(v) => onChange({ briefpapier_safe_zone_links: v })} />
                <SliderWithInput label="Rechts" unit="mm" min={-30} max={80} value={waarde.briefpapier_safe_zone_rechts ?? 0} onChange={(v) => onChange({ briefpapier_safe_zone_rechts: v })} />
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label className="text-[12px] font-medium text-foreground">Eigen branding tonen</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Standaard blijven logo, naam en footer weg zolang er briefpapier ligt. Zet aan om ze er toch overheen te tekenen.
                </p>
              </div>
              <Switch
                checked={!!waarde.briefpapier_toon_branding}
                onCheckedChange={(checked) => onChange({ briefpapier_toon_branding: checked })}
              />
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

export function BedrijfsprofielenTab() {
  const [profielen, setProfielen] = useState<Bedrijfsprofiel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [bewerktId, setBewerktId] = useState<string | null>(null)
  const [concept, setConcept] = useState<Concept | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const laden = useCallback(async () => {
    setIsLoading(true)
    setProfielen(await getBedrijfsprofielen())
    setIsLoading(false)
  }, [])

  useEffect(() => { laden() }, [laden])

  const startNieuw = () => {
    setBewerktId('nieuw')
    setConcept({ ...LEEG })
  }

  const startBewerken = (profiel: Bedrijfsprofiel) => {
    setBewerktId(profiel.id)
    setConcept({ ...profiel })
  }

  const annuleer = () => {
    setBewerktId(null)
    setConcept(null)
  }

  const opslaan = async () => {
    if (!concept) return
    const label = (concept.label || '').trim()
    if (!label) {
      toast.error('Geef het bedrijf een naam voor in de keuzelijst')
      return
    }
    setIsSaving(true)
    try {
      if (bewerktId && bewerktId !== 'nieuw') {
        await updateBedrijfsprofiel(bewerktId, { ...concept, label })
      } else {
        await createBedrijfsprofiel({ ...concept, label })
      }
      toast.success('Bedrijf opgeslagen')
      annuleer()
      await laden()
    } catch (err) {
      logger.error('Bedrijfsprofiel opslaan mislukt:', err)
      const melding = err instanceof Error ? err.message : 'Opslaan is niet gelukt'
      toast.error(melding.includes('bedrijfsprofielen')
        ? 'Opslaan is niet gelukt. Draait migratie 189 al in Supabase?'
        : melding)
    } finally {
      setIsSaving(false)
    }
  }

  const verwijder = async (profiel: Bedrijfsprofiel) => {
    if (!window.confirm(`"${profiel.label}" verwijderen? Offertes die hieronder zijn uitgegeven vallen daarna terug op je eigen bedrijf.`)) return
    try {
      await deleteBedrijfsprofiel(profiel.id)
      toast.success('Bedrijf verwijderd')
      if (bewerktId === profiel.id) annuleer()
      await laden()
    } catch (err) {
      logger.error('Bedrijfsprofiel verwijderen mislukt:', err)
      toast.error('Verwijderen is niet gelukt')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground dark:text-white">Tweede bedrijf</h2>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground/60">
            Geef een offerte uit onder een ander bedrijf, met eigen gegevens en eigen briefpapier. Lettertypen, kleuren en marges blijven gedeeld met je huisstijl.
          </p>
        </div>
        {!concept && (
          <Button size="sm" onClick={startNieuw}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Bedrijf toevoegen
          </Button>
        )}
      </div>

      {profielen.length === 0 && !concept && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Building2 className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            Nog geen tweede bedrijf. Zodra je er een toevoegt, verschijnt bij elke offerte de keuze onder welk bedrijf hij uitgaat.
          </p>
        </div>
      )}

      {profielen.length > 0 && (
        <div className="space-y-2">
          {profielen.map((profiel) => (
            <div
              key={profiel.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profiel.label}
                  {!profiel.actief && <span className="ml-2 text-[11px] text-muted-foreground">(uit)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {profiel.bedrijfsnaam || 'Geen bedrijfsnaam'}
                  {profiel.briefpapier_url && profiel.briefpapier_modus !== 'geen' ? ' · eigen briefpapier' : ' · geen briefpapier'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => startBewerken(profiel)}>Bewerken</Button>
                <Button variant="ghost" size="sm" onClick={() => verwijder(profiel)}>
                  <Trash2 className="w-3.5 h-3.5 text-[#C0451A]" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {concept && (
        <div className="space-y-4">
          <ProfielFormulier
            waarde={concept}
            onChange={(updates) => setConcept((huidig) => (huidig ? { ...huidig, ...updates } : huidig))}
          />
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={concept.actief !== false}
                onCheckedChange={(checked) => setConcept((huidig) => (huidig ? { ...huidig, actief: checked } : huidig))}
              />
              <Label className="text-[12px] text-muted-foreground">Zichtbaar in de keuzelijst bij offertes</Label>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={annuleer}>Annuleren</Button>
              <Button size="sm" onClick={opslaan} disabled={isSaving}>
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
