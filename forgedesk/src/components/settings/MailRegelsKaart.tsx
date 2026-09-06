import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GripVertical, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { logger } from '@/utils/logger'
import { mailStore } from '@/lib/mail/mailStore'
import { useToewijzing } from '@/components/email/shell/toewijzing'
import { zoekProjecten } from '@/services/projectService'
import {
  getRegels, maakRegel, wijzigRegel, verwijderRegel, herordenRegels,
  regelsBeschikbaar, heeftVoorwaarde, VOORWAARDE_LABELS,
  type MailRegel, type RegelActies, type RegelVoorwaarden,
} from '@/services/mailRegelService'
import {
  getLabels, maakLabel, wijzigLabel, verwijderLabel, labelsBeschikbaar,
  LABEL_KLEUREN, type MailLabel,
} from '@/services/mailLabelService'
import { VASTE_LABELS } from '@/components/email/shell/LabelMenu'
import type { Project } from '@/types'

function samenvatting(regel: MailRegel): string {
  const v = regel.voorwaarden
  const alsDelen: string[] = []
  if (v.afzenderBevat) alsDelen.push(`afzender bevat "${v.afzenderBevat}"`)
  if (v.onderwerpBevat) alsDelen.push(`onderwerp bevat "${v.onderwerpBevat}"`)
  if (v.domeinIs) alsDelen.push(`domein is ${v.domeinIs}`)
  if (v.aanBevat) alsDelen.push(`aan-adres bevat "${v.aanBevat}"`)
  if (v.heeftBijlage) alsDelen.push('er een bijlage bij zit')

  const a = regel.acties
  const danDelen: string[] = []
  if (a.markeerGelezen) danDelen.push('markeer als gelezen')
  if (a.label) danDelen.push(`label ${a.label}`)
  if (a.toewijzenAan) danDelen.push('wijs toe')
  if (a.projectId) danDelen.push('koppel aan project')
  if (a.archiveren) danDelen.push('archiveer')

  if (alsDelen.length === 0) return 'Nog geen voorwaarde ingevuld'
  return `Als ${alsDelen.join(' en ')}, dan ${danDelen.length ? danDelen.join(' en ') : 'niets'}`
}

function legeRegel(volgorde: number): Omit<MailRegel, 'id'> {
  return { naam: 'Nieuwe regel', volgorde, actief: true, accountId: null, voorwaarden: {}, acties: {} }
}

/**
 * Regels op binnenkomende mail. Toepassen gebeurt in de browser (zie
 * LOGBOEK.md): met een gedeeld postvak of meerdere apparaten hoort dit op de
 * server thuis, en dat staat op de lijst.
 */
export function MailRegelsKaart() {
  const [labels, zetLabels] = useState<MailLabel[]>([])
  const [regels, zetRegels] = useState<MailRegel[]>([])
  const [laden, zetLaden] = useState(true)
  const [open, zetOpen] = useState<string | null>(null)
  const [bezig, zetBezig] = useState(false)
  const sleepId = useRef<string | null>(null)

  const beschikbaar = regelsBeschikbaar()

  useEffect(() => {
    getRegels()
      .then(zetRegels)
      .catch((e) => logger.warn('Regels laden mislukt:', e))
      .finally(() => zetLaden(false))
    getLabels().then(zetLabels).catch((e) => logger.warn('Labels laden mislukt:', e))
  }, [])

  const bewaar = useCallback(async (id: string, deel: Partial<Omit<MailRegel, 'id'>>) => {
    zetRegels((oud) => oud.map((r) => (r.id === id ? { ...r, ...deel } : r)))
    try {
      await wijzigRegel(id, deel)
      void mailStore.laadRegels(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regel opslaan mislukt')
    }
  }, [])

  const nieuw = useCallback(async () => {
    try {
      const gemaakt = await maakRegel(legeRegel(regels.length))
      zetRegels((oud) => [...oud, gemaakt])
      zetOpen(gemaakt.id)
      void mailStore.laadRegels(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regel aanmaken mislukt')
    }
  }, [regels.length])

  const wis = useCallback(async (id: string) => {
    const vorige = regels
    zetRegels((oud) => oud.filter((r) => r.id !== id))
    try {
      await verwijderRegel(id)
      void mailStore.laadRegels(true)
    } catch {
      zetRegels(vorige)
      toast.error('Regel verwijderen mislukt')
    }
  }, [regels])

  const verplaats = useCallback((vanId: string, naarId: string) => {
    zetRegels((oud) => {
      const van = oud.findIndex((r) => r.id === vanId)
      const naar = oud.findIndex((r) => r.id === naarId)
      if (van < 0 || naar < 0 || van === naar) return oud
      const nieuweLijst = [...oud]
      const [verplaatst] = nieuweLijst.splice(van, 1)
      nieuweLijst.splice(naar, 0, verplaatst)
      void herordenRegels(nieuweLijst.map((r) => r.id)).then(() => mailStore.laadRegels(true)).catch(() => toast.error('Volgorde opslaan mislukt'))
      return nieuweLijst.map((r, i) => ({ ...r, volgorde: i }))
    })
  }, [])

  const nuToepassen = useCallback(async () => {
    zetBezig(true)
    try {
      const aantal = await mailStore.pasRegelsToeOpBestaande(200)
      toast.success(aantal === 0 ? 'Geen mail voldeed aan een regel' : `${aantal} ${aantal === 1 ? 'mail' : 'mails'} verwerkt`)
    } catch (e) {
      logger.error('Regels toepassen mislukt:', e)
      toast.error('Regels toepassen mislukt')
    } finally {
      zetBezig(false)
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regels en labels</CardTitle>
        <CardDescription>
          Wat er automatisch met binnenkomende mail gebeurt, en welke labels je kunt geven. De bovenste regel die past, wint.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!beschikbaar && (
          <p className="rounded-lg bg-[#F5F2E8] px-3 py-2 text-[12px] text-[#8A7A4A] dark:bg-[#8A7A4A]/10">
            Regels staan nog niet aan in de database. Zodra dat gebeurd is verschijnen ze hier.
          </p>
        )}

        {laden ? (
          <p className="text-[13px] text-muted-foreground">Regels laden...</p>
        ) : regels.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Nog geen regels. Een regel kan mail van een leverancier meteen archiveren, of alles van één domein aan een collega geven.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {regels.map((regel) => (
              <li
                key={regel.id}
                draggable
                onDragStart={() => { sleepId.current = regel.id }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (sleepId.current && sleepId.current !== regel.id) verplaats(sleepId.current, regel.id); sleepId.current = null }}
                className="py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground/50" aria-hidden />
                  <button
                    type="button"
                    onClick={() => zetOpen((o) => (o === regel.id ? null : regel.id))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className={cn('block truncate text-[13.5px] font-medium', regel.actief ? 'text-foreground' : 'text-muted-foreground')}>
                      {regel.naam || 'Naamloze regel'}
                      {!heeftVoorwaarde(regel) && <span className="ml-2 text-[11px] font-normal text-[#8A7A4A]">onvolledig</span>}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">{samenvatting(regel)}</span>
                  </button>
                  <Switch
                    checked={regel.actief}
                    onCheckedChange={(v) => void bewaar(regel.id, { actief: v })}
                    aria-label={`Regel ${regel.naam} aan of uit`}
                  />
                  <button
                    type="button"
                    onClick={() => void wis(regel.id)}
                    title="Regel verwijderen"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-[#C0451A]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {open === regel.id && (
                  <RegelEditor
                    regel={regel}
                    labels={[...VASTE_LABELS, ...labels.map((l) => l.naam)]}
                    onWijzig={(deel) => void bewaar(regel.id, deel)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void nieuw()}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-flame transition-opacity hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            Regel toevoegen
          </button>
          <Button variant="outline" size="sm" onClick={() => void nuToepassen()} disabled={bezig || regels.length === 0} className="gap-2">
            {bezig && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Nu toepassen op de laatste 200 mails
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Regels draaien terwijl doen. openstaat. Mail die binnenkomt als je niets openhebt wordt verwerkt zodra je de inbox weer opent.
        </p>

        <Separator />

        <LabelBeheer labels={labels} onWijzig={zetLabels} />
      </CardContent>
    </Card>
  )
}

function RegelEditor({ regel, labels, onWijzig }: {
  regel: MailRegel
  labels: string[]
  onWijzig: (deel: Partial<Omit<MailRegel, 'id'>>) => void
}) {
  const { doelen } = useToewijzing()
  const [projectZoek, zetProjectZoek] = useState('')
  const [projecten, zetProjecten] = useState<Project[]>([])

  useEffect(() => {
    if (!projectZoek.trim()) { zetProjecten([]); return }
    let actueel = true
    const t = setTimeout(() => {
      zoekProjecten(projectZoek, 8)
        .then((lijst) => { if (actueel) zetProjecten(lijst) })
        .catch(() => { if (actueel) zetProjecten([]) })
    }, 250)
    return () => { actueel = false; clearTimeout(t) }
  }, [projectZoek])

  const zetVoorwaarde = (deel: Partial<RegelVoorwaarden>) => onWijzig({ voorwaarden: { ...regel.voorwaarden, ...deel } })
  const zetActie = (deel: Partial<RegelActies>) => onWijzig({ acties: { ...regel.acties, ...deel } })

  const gekozenProject = useMemo(() => projecten.find((p) => p.id === regel.acties.projectId), [projecten, regel.acties.projectId])

  return (
    <div className="mt-3 space-y-4 rounded-xl bg-background p-4">
      <div className="space-y-1.5">
        <Label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Naam</Label>
        <Input value={regel.naam} onChange={(e) => onWijzig({ naam: e.target.value })} placeholder="Bijv. Leveranciersmail archiveren" />
      </div>

      <div className="space-y-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Als</p>
        {VOORWAARDE_LABELS.map((v) => (
          <div key={v.sleutel} className="flex items-center gap-3">
            <span className="w-[130px] flex-shrink-0 text-[12.5px] text-foreground/75">{v.label}</span>
            {v.soort === 'schakelaar' ? (
              <Switch
                checked={!!regel.voorwaarden.heeftBijlage}
                onCheckedChange={(aan) => zetVoorwaarde({ heeftBijlage: aan || undefined })}
                aria-label={v.label}
              />
            ) : (
              <Input
                value={(regel.voorwaarden[v.sleutel] as string) || ''}
                onChange={(e) => zetVoorwaarde({ [v.sleutel]: e.target.value || undefined } as Partial<RegelVoorwaarden>)}
                placeholder={v.sleutel === 'domeinIs' ? 'bijv. probo.nl' : 'laat leeg om over te slaan'}
                className="h-9"
              />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Dan</p>

        <div className="flex items-center gap-3">
          <span className="w-[130px] flex-shrink-0 text-[12.5px] text-foreground/75">Markeer als gelezen</span>
          <Switch checked={!!regel.acties.markeerGelezen} onCheckedChange={(aan) => zetActie({ markeerGelezen: aan || undefined })} aria-label="Markeer als gelezen" />
        </div>

        <div className="flex items-center gap-3">
          <span className="w-[130px] flex-shrink-0 text-[12.5px] text-foreground/75">Archiveer</span>
          <Switch checked={!!regel.acties.archiveren} onCheckedChange={(aan) => zetActie({ archiveren: aan || undefined })} aria-label="Archiveer" />
        </div>

        <div className="flex items-center gap-3">
          <span className="w-[130px] flex-shrink-0 text-[12.5px] text-foreground/75">Label</span>
          <select
            value={regel.acties.label || ''}
            onChange={(e) => zetActie({ label: e.target.value || undefined })}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-[13px] text-foreground outline-none focus:border-petrol"
          >
            <option value="">Geen</option>
            {labels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="w-[130px] flex-shrink-0 text-[12.5px] text-foreground/75">Wijs toe aan</span>
          <select
            value={regel.acties.toewijzenAan || ''}
            onChange={(e) => zetActie({ toewijzenAan: e.target.value || undefined })}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-[13px] text-foreground outline-none focus:border-petrol"
          >
            <option value="">Niemand</option>
            {doelen.map((d) => <option key={d.sleutel} value={d.sleutel}>{d.naam}</option>)}
          </select>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-[130px] flex-shrink-0 pt-2 text-[12.5px] text-foreground/75">Koppel aan project</span>
          <div className="min-w-0 flex-1">
            {regel.acties.projectId ? (
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] text-foreground">{gekozenProject?.naam || 'Gekoppeld project'}</span>
                <button type="button" onClick={() => zetActie({ projectId: undefined })} className="text-[12px] text-muted-foreground hover:text-[#C0451A]">
                  Loskoppelen
                </button>
              </div>
            ) : (
              <>
                <Input value={projectZoek} onChange={(e) => zetProjectZoek(e.target.value)} placeholder="Zoek een project" className="h-9" />
                {projecten.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {projecten.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { zetActie({ projectId: p.id }); zetProjectZoek('') }}
                        className="block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] text-foreground/80 transition-colors hover:bg-card"
                      >
                        {p.naam}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LabelBeheer({ labels, onWijzig }: { labels: MailLabel[]; onWijzig: (labels: MailLabel[]) => void }) {
  const [naam, zetNaam] = useState('')
  const [kleur, zetKleur] = useState<string>(LABEL_KLEUREN[0])
  const beschikbaar = labelsBeschikbaar()

  const voegToe = async () => {
    try {
      const nieuw = await maakLabel(naam, kleur, labels.length)
      onWijzig([...labels, nieuw])
      zetNaam('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Label aanmaken mislukt')
    }
  }

  const kleurWissel = async (id: string, nieuweKleur: string) => {
    onWijzig(labels.map((l) => (l.id === id ? { ...l, kleur: nieuweKleur } : l)))
    try { await wijzigLabel(id, { kleur: nieuweKleur }) } catch { toast.error('Kleur opslaan mislukt') }
  }

  const wis = async (id: string) => {
    const vorige = labels
    onWijzig(labels.filter((l) => l.id !== id))
    try { await verwijderLabel(id) } catch { onWijzig(vorige); toast.error('Label verwijderen mislukt') }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13.5px] font-semibold text-foreground">Eigen labels</p>
        <p className="text-[12px] text-muted-foreground">
          Naast de vaste labels {VASTE_LABELS.join(', ')}. Ze staan in het labelmenu en als filter onder de mappen.
        </p>
      </div>

      {!beschikbaar ? (
        <p className="rounded-lg bg-[#F5F2E8] px-3 py-2 text-[12px] text-[#8A7A4A] dark:bg-[#8A7A4A]/10">
          Eigen labels staan nog niet aan in de database. De vier vaste labels werken gewoon.
        </p>
      ) : (
        <>
          {labels.length > 0 && (
            <ul className="space-y-1.5">
              {labels.map((l) => (
                <li key={l.id} className="flex items-center gap-2.5">
                  <span className="inline-block h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: l.kleur }} aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/85">{l.naam}</span>
                  <div className="flex items-center gap-1">
                    {LABEL_KLEUREN.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => void kleurWissel(l.id, k)}
                        aria-label={`Kleur ${k}`}
                        className={cn('h-4 w-4 rounded-full transition-transform hover:scale-110', l.kleur === k && 'ring-2 ring-offset-1 ring-petrol')}
                        style={{ backgroundColor: k }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void wis(l.id)}
                    title="Label verwijderen"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-[#C0451A]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={naam}
              onChange={(e) => zetNaam(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void voegToe() } }}
              placeholder="Naam van het label"
              className="h-9 w-[200px]"
            />
            <div className="flex items-center gap-1">
              {LABEL_KLEUREN.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => zetKleur(k)}
                  aria-label={`Kleur ${k}`}
                  className={cn('h-5 w-5 rounded-full transition-transform hover:scale-110', kleur === k && 'ring-2 ring-offset-1 ring-petrol')}
                  style={{ backgroundColor: k }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => void voegToe()}
              disabled={!naam.trim()}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-flame transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              Label toevoegen
            </button>
          </div>
        </>
      )}
    </div>
  )
}
