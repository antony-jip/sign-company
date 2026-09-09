import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Star, Mail } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAppSettings } from '@/contexts/AppSettingsContext'
import { HandtekeningEditor } from './HandtekeningEditor'
import { SignatureImageUpload } from './SignatureImageUpload'
import {
  getHandtekeningen, bewaarHandtekening, verwijderHandtekening, zetStandaard,
  type Handtekening,
} from '@/services/handtekeningService'
import { getPostvakken } from '@/services/postvakService'
import { bouwHandtekeningHtml } from '@/utils/handtekening'
import type { Postvak } from '@/lib/mail/types'

/**
 * Meerdere handtekeningen beheren (migratie 248).
 *
 * Verschijnt alleen als die migratie gedraaid is; anders blijft de oude kaart
 * met die ene handtekening staan en verandert er niets. Zodra je er meer hebt,
 * kiest de composer automatisch de juiste: die van het postvak waaruit je
 * mailt, anders de standaard.
 */
export function HandtekeningenBeheer({ onGeladen }: { onGeladen?: (aantal: number) => void }) {
  // De standaardhandtekening wordt naar het profiel gespiegeld, want de
  // offerte-, factuur- en projectmail lezen daaruit. Zonder deze verversing
  // klopt de database wel maar de draaiende sessie niet, en verstuur je tot de
  // volgende herlading nog de oude.
  const { refreshProfile } = useAppSettings()
  const [lijst, setLijst] = useState<Handtekening[]>([])
  const [postvakken, setPostvakken] = useState<Postvak[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  const laad = useCallback(async () => {
    const [h, p] = await Promise.all([
      getHandtekeningen().catch(() => [] as Handtekening[]),
      getPostvakken().catch(() => [] as Postvak[]),
    ])
    setLijst(h)
    setPostvakken(p)
    onGeladen?.(h.length)
  }, [onGeladen])

  useEffect(() => { void laad() }, [laad])

  const bewaar = async (h: Handtekening) => {
    setBezig(true)
    try {
      await bewaarHandtekening(h)
      await Promise.all([laad(), refreshProfile()])
      toast.success(<>Handtekening opgeslagen<span style={{ color: '#D24620' }}>.</span></>)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Opslaan mislukt')
    } finally {
      setBezig(false)
    }
  }

  const nieuw = async () => {
    setBezig(true)
    try {
      const gemaakt = await bewaarHandtekening({
        naam: lijst.length === 0 ? 'Standaard' : `Handtekening ${lijst.length + 1}`,
        inhoud: '',
        // Nooit meteen standaard als er al een is: dat zou de handtekening die
        // je vandaag gebruikt stilletjes vervangen door een lege. Is het je
        // eerste, dan moet hij het juist wél worden, anders zien je offertes en
        // facturen hem nooit.
        isStandaard: lijst.length === 0,
        volgorde: lijst.length,
      })
      await laad()
      if (gemaakt) setOpen(gemaakt.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Toevoegen mislukt')
    } finally {
      setBezig(false)
    }
  }

  const weg = async (h: Handtekening) => {
    if (h.isStandaard) {
      toast.error('Maak eerst een andere handtekening de standaard.')
      return
    }
    setBezig(true)
    try {
      await verwijderHandtekening(h.id)
      await Promise.all([laad(), refreshProfile()])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verwijderen mislukt')
    } finally {
      setBezig(false)
    }
  }

  const standaard = async (h: Handtekening) => {
    setBezig(true)
    try {
      await zetStandaard(h.id)
      await Promise.all([laad(), refreshProfile()])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Standaard zetten mislukt')
    } finally {
      setBezig(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Handtekeningen
        </CardTitle>
        <CardDescription>
          {postvakken.length > 1
            ? 'Koppel een handtekening aan een postvak, dan ondertekent elk adres op zijn eigen manier.'
            : 'Meerdere handtekeningen: kies bij het schrijven welke eronder komt.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {lijst.map((h) => (
          <Rij
            key={h.id}
            handtekening={h}
            postvakken={postvakken}
            open={open === h.id}
            bezig={bezig}
            onOpen={() => setOpen(open === h.id ? null : h.id)}
            onBewaar={bewaar}
            onWeg={() => weg(h)}
            onStandaard={() => standaard(h)}
          />
        ))}

        <Button variant="outline" size="sm" onClick={nieuw} disabled={bezig} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Handtekening toevoegen
        </Button>
      </CardContent>
    </Card>
  )
}

function Rij({
  handtekening, postvakken, open, bezig, onOpen, onBewaar, onWeg, onStandaard,
}: {
  handtekening: Handtekening
  postvakken: Postvak[]
  open: boolean
  bezig: boolean
  onOpen: () => void
  onBewaar: (h: Handtekening) => void
  onWeg: () => void
  onStandaard: () => void
}) {
  const [concept, setConcept] = useState(handtekening)
  useEffect(() => { setConcept(handtekening) }, [handtekening])

  const voorbeeld = bouwHandtekeningHtml({
    tekst: concept.inhoud,
    afbeeldingUrl: concept.afbeeldingUrl,
    afbeeldingLink: concept.afbeeldingLink,
    afbeeldingBreedte: concept.afbeeldingBreedte,
  })
  const gekoppeldAan = postvakken.find((p) => p.id === concept.accountId)

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-sm font-medium">{handtekening.naam}</span>
          {handtekening.isStandaard && (
            <span className="flex-shrink-0 rounded bg-petrol/10 px-1.5 py-0.5 text-[11px] font-medium text-petrol">Standaard</span>
          )}
          {gekoppeldAan && (
            <span className="min-w-0 truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {gekoppeldAan.adres || gekoppeldAan.naam}
            </span>
          )}
        </button>
        {!handtekening.isStandaard && (
          <Button variant="ghost" size="sm" onClick={onStandaard} disabled={bezig} title="Maak dit de standaard">
            <Star className="h-4 w-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onWeg} disabled={bezig} title="Verwijderen">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-border p-3">
          <div className="space-y-2">
            <Label>Naam</Label>
            <Input
              value={concept.naam}
              onChange={(e) => setConcept({ ...concept, naam: e.target.value })}
              placeholder="Bijv. Zakelijk, Kort, Namens het team"
            />
            <p className="text-xs text-muted-foreground">Alleen voor jezelf, om hem terug te vinden bij het schrijven.</p>
          </div>

          {postvakken.length > 1 && (
            <div className="space-y-2">
              <Label>Hoort bij postvak</Label>
              <select
                value={concept.accountId ?? ''}
                onChange={(e) => setConcept({ ...concept, accountId: e.target.value || null })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Geen · voor elk postvak</option>
                {postvakken.map((p) => (
                  <option key={p.id} value={p.id}>{p.adres || p.naam}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Mail je vanuit dit postvak, dan staat deze handtekening er meteen onder.
              </p>
            </div>
          )}

          <SignatureImageUpload
            imageUrl={concept.afbeeldingUrl || ''}
            onImageChange={(url) => setConcept({ ...concept, afbeeldingUrl: url || null })}
            imageSize={concept.afbeeldingBreedte ?? undefined}
            onImageSizeChange={(g) => setConcept({ ...concept, afbeeldingBreedte: g })}
            imageLink={concept.afbeeldingLink || ''}
            onImageLinkChange={(l) => setConcept({ ...concept, afbeeldingLink: l || null })}
          />

          <div className="space-y-2">
            <Label>Handtekening</Label>
            <HandtekeningEditor
              waarde={concept.inhoud}
              onChange={(v) => setConcept({ ...concept, inhoud: v })}
            />
          </div>

          {voorbeeld && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-label text-muted-foreground">Voorbeeld</Label>
              <div
                className="rounded-lg border border-border bg-background p-4 text-sm text-foreground/80 [&_a]:text-petrol [&_a]:underline [&_img]:max-w-full"
                dangerouslySetInnerHTML={{ __html: voorbeeld }}
              />
            </div>
          )}

          <Button size="sm" onClick={() => onBewaar(concept)} disabled={bezig}>Opslaan</Button>
        </div>
      )}
    </div>
  )
}
