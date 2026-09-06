import { useCallback, useEffect, useState } from 'react'
import { Download, FolderPlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { EmailAttachment } from '@/types'
import type { EmailLijstItem } from '@/lib/mail/types'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/utils/logger'
import { BijlageProjectDialog, type BijlageKandidaat, type BijlageProjectKeuze } from '@/components/email/BijlageProjectDialog'
import { extractSenderEmail, extractSenderName } from '@/components/email/emailHelpers'
import {
  bewaarBijlageInProject, bewaarViaBrowser, bijlageUid, bijlageVisual, downloadUrlVoorSleep, echteBijlagen,
  formatteerGrootte, haalAlleBijlagen, haalBijlage, imapMapVoor, isAfbeelding, isPdf, totaleGrootte, type OpgehaaldeBijlage,
} from './bijlagen'

// Opgehaalde bestanden per mail, zodat thumbnails, preview, slepen en
// downloaden dezelfde bytes delen en een tweede open geen IMAP-ronde kost.
const MAX_MAILS_IN_CACHE = 24
const cache = new Map<string, Map<string, OpgehaaldeBijlage>>()
const lopend = new Map<string, Promise<OpgehaaldeBijlage>>()

function cacheVoor(emailId: string): Map<string, OpgehaaldeBijlage> {
  let m = cache.get(emailId)
  if (!m) {
    m = new Map()
    cache.set(emailId, m)
    if (cache.size > MAX_MAILS_IN_CACHE) {
      const oudste = cache.keys().next().value
      if (oudste !== undefined) {
        for (const b of cache.get(oudste)?.values() || []) if (b.url.startsWith('blob:')) URL.revokeObjectURL(b.url)
        cache.delete(oudste)
      }
    }
  }
  return m
}

function haalGecached(bericht: EmailLijstItem, att: EmailAttachment): Promise<OpgehaaldeBijlage> {
  const bekend = cacheVoor(bericht.id).get(att.filename)
  if (bekend) return Promise.resolve(bekend)
  const sleutel = `${bericht.id}:${att.filename}`
  const bezig = lopend.get(sleutel)
  if (bezig) return bezig
  const uid = bijlageUid(bericht)
  if (!uid) return Promise.reject(new Error('Kan deze bijlage niet ophalen · geen geldig email-id'))
  const belofte = haalBijlage(uid, imapMapVoor(bericht), att.filename, att.contentType, bericht.account_id || undefined)
    .then((b) => { cacheVoor(bericht.id).set(att.filename, b); return b })
    .finally(() => lopend.delete(sleutel))
  lopend.set(sleutel, belofte)
  return belofte
}

interface BijlagenProps {
  bericht: EmailLijstItem
  compact?: boolean
}

export function Bijlagen({ bericht, compact }: BijlagenProps) {
  const { user } = useAuth()
  const lijst = echteBijlagen(bericht.attachment_meta)
  const [versie, zetVersie] = useState(0)
  const [bezig, zetBezig] = useState<string | null>(null)
  const [allesBezig, zetAllesBezig] = useState(false)
  const [preview, zetPreview] = useState<OpgehaaldeBijlage | null>(null)
  const [dialogBijlagen, zetDialogBijlagen] = useState<BijlageKandidaat[]>([])
  const [koppelBezig, zetKoppelBezig] = useState(false)
  const [koppelVoortgang, zetKoppelVoortgang] = useState<string | null>(null)

  const afbeeldingen = lijst.filter((a) => isAfbeelding(a.filename, a.contentType))
  const gecached = cacheVoor(bericht.id)

  // Thumbnails: alle beeldbijlagen in één serverronde, één keer per mail.
  useEffect(() => {
    if (afbeeldingen.length === 0) return
    const ontbrekend = afbeeldingen.filter((a) => !gecached.has(a.filename))
    if (ontbrekend.length === 0) return
    const uid = bijlageUid(bericht)
    if (!uid) return
    let actueel = true
    haalAlleBijlagen(uid, imapMapVoor(bericht), ontbrekend, bericht.account_id || undefined)
      .then((bestanden) => {
        const m = cacheVoor(bericht.id)
        for (const b of bestanden) if (!m.has(b.filename)) m.set(b.filename, b)
        if (actueel) zetVersie((n) => n + 1)
      })
      .catch((e) => logger.warn('Thumbnails ophalen mislukt:', e))
    return () => { actueel = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bericht.id, afbeeldingen.length])

  const openPreview = useCallback(async (att: EmailAttachment) => {
    zetBezig(att.filename)
    try {
      zetPreview(await haalGecached(bericht, att))
    } catch (e) {
      logger.error('Preview ophalen mislukt:', e)
      toast.error(e instanceof Error ? e.message : 'Preview ophalen mislukt')
    } finally {
      zetBezig(null)
    }
  }, [bericht])

  const download = useCallback(async (att: EmailAttachment) => {
    zetBezig(att.filename)
    try {
      bewaarViaBrowser(await haalGecached(bericht, att))
    } catch (e) {
      logger.error('Bijlage downloaden mislukt:', e)
      toast.error(e instanceof Error ? e.message : 'Bijlage downloaden mislukt')
    } finally {
      zetBezig(null)
    }
  }, [bericht])

  const downloadAlles = useCallback(async () => {
    const uid = bijlageUid(bericht)
    if (!uid || lijst.length === 0) return
    zetAllesBezig(true)
    let gelukt = 0
    try {
      const bestanden = await haalAlleBijlagen(uid, imapMapVoor(bericht), lijst, bericht.account_id || undefined)
      const m = cacheVoor(bericht.id)
      for (const b of bestanden) {
        if (!m.has(b.filename)) m.set(b.filename, b)
        bewaarViaBrowser(b)
        gelukt += 1
        // Korte pauze zodat de browser elke download apart verwerkt.
        await new Promise((r) => setTimeout(r, 200))
      }
      if (gelukt === lijst.length) toast.success(`${gelukt} bijlage${gelukt > 1 ? 'n' : ''} gedownload`)
      else toast.warning(`${gelukt}/${lijst.length} bijlagen gedownload`)
    } catch (e) {
      logger.error('Bulk-download mislukt:', e)
      toast.error(e instanceof Error ? e.message : 'Bijlagen downloaden mislukt')
    } finally {
      zetAllesBezig(false)
    }
  }, [bericht, lijst])

  const naarProject = useCallback((selectie: EmailAttachment[]) => {
    if (!bijlageUid(bericht)) { toast.error('Kan deze bijlagen niet ophalen · geen geldig email-id'); return }
    zetDialogBijlagen(selectie.map((a) => ({ filename: a.filename, contentType: a.contentType, previewUrl: gecached.get(a.filename)?.url })))
  }, [bericht, gecached])

  const bevestigProject = useCallback(async (keuze: BijlageProjectKeuze) => {
    const uid = bijlageUid(bericht)
    if (!uid || !user?.id || keuze.bestanden.length === 0) return
    const totaal = keuze.bestanden.length
    const gelukt: string[] = []
    const mislukt: string[] = []
    zetKoppelBezig(true)
    // Eén voor één: parallel ophalen van een IMAP-server geeft eerder een time-out dan tijdwinst.
    for (const [index, bijlage] of keuze.bestanden.entries()) {
      zetKoppelVoortgang(totaal > 1 ? `${index + 1} van ${totaal}` : null)
      try {
        await bewaarBijlageInProject(bijlage, keuze, { uid, map: imapMapVoor(bericht), userId: user.id, accountId: bericht.account_id })
        gelukt.push(bijlage.filename)
      } catch (e) {
        logger.error('Bijlage aan project koppelen mislukt:', e)
        mislukt.push(bijlage.filename)
      }
    }
    zetKoppelBezig(false)
    zetKoppelVoortgang(null)
    if (mislukt.length === 0) {
      zetDialogBijlagen([])
      toast.success('Toegevoegd aan project', {
        description: totaal === 1 ? `${gelukt[0]} staat nu bij ${keuze.project.naam}.` : `${totaal} bijlagen staan nu bij ${keuze.project.naam}.`,
      })
    } else if (gelukt.length === 0) {
      toast.error(totaal === 1 ? 'Toevoegen aan project mislukt' : 'Geen van de bijlagen kon worden toegevoegd')
    } else {
      toast.warning(`${gelukt.length} van ${totaal} toegevoegd`, { description: `Niet gelukt: ${mislukt.join(', ')}` })
    }
  }, [bericht, user?.id])

  // Slepen naar de Finder werkt alleen met een URL die er al is; bij hover
  // halen we het bestand vast op zodat de sleep die kans krijgt.
  const warmOp = useCallback((att: EmailAttachment) => {
    if (gecached.has(att.filename)) return
    void haalGecached(bericht, att).then(() => zetVersie((n) => n + 1)).catch(() => {})
  }, [bericht, gecached])

  const sluitPreview = useCallback(() => zetPreview(null), [])
  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') sluitPreview() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, sluitPreview])

  if (lijst.length === 0) return null
  void versie

  return (
    <div className={cn('border-t border-border', compact ? 'px-3 py-2.5' : 'px-5 py-3')}>
      <div className="mb-2 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>{lijst.length} bijlage{lijst.length > 1 ? 'n' : ''} · {formatteerGrootte(totaleGrootte(lijst))}</span>
        <span className="flex-1" />
        {lijst.length > 1 && (
          <button type="button" onClick={downloadAlles} disabled={allesBezig} className="inline-flex items-center gap-1 normal-case tracking-normal text-petrol hover:underline disabled:opacity-50">
            {allesBezig ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Alles downloaden
          </button>
        )}
        <button type="button" onClick={() => naarProject(lijst)} className="inline-flex items-center gap-1 normal-case tracking-normal text-petrol hover:underline">
          <FolderPlus className="h-3 w-3" />
          Opslaan in project
        </button>
      </div>

      <div className={cn('flex gap-2', compact ? 'overflow-x-auto pb-1' : 'flex-wrap')}>
        {lijst.map((att) => {
          const visual = bijlageVisual(att.filename, att.contentType)
          const bestand = gecached.get(att.filename)
          const thumb = visual.soort === 'afbeelding' && bestand ? bestand.url : null
          const isBezig = bezig === att.filename
          return (
            <div
              key={att.filename}
              draggable={!!bestand}
              onMouseEnter={() => warmOp(att)}
              onDragStart={(e) => {
                if (!bestand) return
                e.dataTransfer.effectAllowed = 'copy'
                e.dataTransfer.setData('DownloadURL', downloadUrlVoorSleep(bestand.filename, bestand.contentType, bestand.url))
                e.dataTransfer.setData('text/uri-list', bestand.url)
              }}
              className={cn(
                'group/att relative flex flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-petrol/40',
                thumb ? 'h-[104px] w-[140px]' : 'h-[52px] w-[200px] items-center gap-2.5 pl-2.5 pr-8',
                compact && !thumb && 'w-[180px]',
              )}
              onClick={() => openPreview(att)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') openPreview(att) }}
              title={`${att.filename} · ${formatteerGrootte(att.size)}`}
            >
              {thumb ? (
                <>
                  <img src={thumb} alt={att.filename} className="h-full w-full object-cover" draggable={false} />
                  <div className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-2 py-1 text-[11px] text-white">
                    {att.filename}
                  </div>
                </>
              ) : (
                <>
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-semibold text-white"
                    style={{ background: visual.kleur }}
                    aria-hidden
                  >
                    {visual.soort === 'afbeelding' && bestand === undefined ? <Loader2 className="h-3 w-3 animate-spin" /> : visual.label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-foreground">{att.filename}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">{formatteerGrootte(att.size)}</span>
                  </span>
                </>
              )}
              {isBezig ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-4 w-4 animate-spin text-petrol" />
                </span>
              ) : (
                <div className={cn('absolute top-1 right-1 flex gap-0.5 opacity-0 transition-opacity group-hover/att:opacity-100 focus-within:opacity-100', thumb && 'top-1.5 right-1.5')}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); naarProject([att]) }}
                    className="rounded-md bg-background/90 p-1 text-foreground/70 hover:text-petrol"
                    title="Opslaan in project"
                    aria-label={`${att.filename} opslaan in project`}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); download(att) }}
                    className="rounded-md bg-background/90 p-1 text-foreground/70 hover:text-petrol"
                    title="Downloaden"
                    aria-label={`${att.filename} downloaden`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 p-6" onClick={sluitPreview}>
          <div className="relative flex max-h-[92vh] max-w-[92vw] flex-col overflow-hidden rounded-2xl bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
              <p className="min-w-0 truncate text-[14px] font-medium text-foreground/80">{preview.filename}</p>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button type="button" onClick={() => bewaarViaBrowser(preview)} className="rounded-lg p-2 transition-colors hover:bg-petrol/[0.06]" title="Downloaden" aria-label="Downloaden">
                  <Download className="h-4 w-4 text-foreground/70" />
                </button>
                <button type="button" onClick={sluitPreview} className="rounded-lg p-2 transition-colors hover:bg-petrol/[0.06]" title="Sluiten" aria-label="Sluiten">
                  <X className="h-4 w-4 text-foreground/70" />
                </button>
              </div>
            </div>
            <div className="flex min-h-[320px] min-w-[320px] flex-1 items-center justify-center overflow-auto bg-background">
              {preview.contentType.startsWith('image/') ? (
                <img src={preview.url} alt={preview.filename} className="max-h-[82vh] max-w-full object-contain" />
              ) : isPdf(preview.filename, preview.contentType) ? (
                <iframe src={preview.url} title={preview.filename} className="h-[82vh] w-[82vw] border-0 bg-white" />
              ) : (
                <div className="p-10 text-center">
                  <p className="mb-4 text-[14px] text-foreground/70">Geen preview beschikbaar voor dit bestandstype.</p>
                  <button type="button" onClick={() => bewaarViaBrowser(preview)} className="inline-flex items-center gap-2 rounded-lg bg-petrol px-4 py-2 text-[13px] text-white transition-colors hover:bg-[#16454D]">
                    <Download className="h-4 w-4" />
                    Download bestand
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BijlageProjectDialog
        open={dialogBijlagen.length > 0}
        onOpenChange={(v) => { if (!v) zetDialogBijlagen([]) }}
        bijlagen={dialogBijlagen}
        threadId={bericht.thread_id}
        senderEmail={extractSenderEmail(bericht.van)}
        senderNaam={extractSenderName(bericht.van)}
        bezig={koppelBezig}
        voortgang={koppelVoortgang}
        onBevestig={bevestigProject}
      />
    </div>
  )
}
