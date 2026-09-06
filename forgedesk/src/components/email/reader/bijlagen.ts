import type { EmailAttachment } from '@/types'
import type { EmailLijstItem } from '@/lib/mail/types'
import { downloadEmailAttachment, downloadAllEmailAttachments, type EmailAttachmentDownload } from '@/services/gmailService'
import { bijlageNaarProject } from '@/services/documentenService'
import { createProjectFoto, createInkoopOfferte } from '@/services/supabaseService'
import type { BijlageMetBestemming, BijlageProjectKeuze } from '@/components/email/BijlageProjectDialog'

// Bijlage-logica uit EmailReader als pure functies: grootte, type, welke
// thumbnail-bron, en het ophalen en wegzetten. Geen React, zodat het in node
// te testen is en de tegels alleen nog hoeven te tonen.

export function formatteerGrootte(bytes: number | null | undefined): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

const AFBEELDING_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'svg', 'bmp', 'tif', 'tiff', 'avif']

export function extensieVan(bestandsnaam: string): string {
  const stuk = (bestandsnaam || '').split('.').pop() || ''
  return stuk === bestandsnaam ? '' : stuk.toLowerCase()
}

export function isAfbeelding(bestandsnaam: string, contentType?: string | null): boolean {
  const ct = (contentType || '').toLowerCase()
  if (ct.startsWith('image/')) return true
  return AFBEELDING_EXT.includes(extensieVan(bestandsnaam))
}

export function isPdf(bestandsnaam: string, contentType?: string | null): boolean {
  return (contentType || '').toLowerCase().includes('pdf') || extensieVan(bestandsnaam) === 'pdf'
}

export type BijlageSoort = 'pdf' | 'afbeelding' | 'document' | 'sheet' | 'presentatie' | 'archief' | 'tekst' | 'vector' | 'overig'

export interface BijlageVisual {
  soort: BijlageSoort
  label: string
  /** Achtergrond van het type-blokje; gedempt, geen felle pills. */
  kleur: string
}

export function bijlageVisual(bestandsnaam: string, contentType?: string | null): BijlageVisual {
  const ext = extensieVan(bestandsnaam)
  const ct = (contentType || '').toLowerCase()
  if (isPdf(bestandsnaam, ct)) return { soort: 'pdf', label: 'PDF', kleur: '#C0451A' }
  if (isAfbeelding(bestandsnaam, ct)) return { soort: 'afbeelding', label: ext.toUpperCase() || 'IMG', kleur: '#6A5A8A' }
  if (['ai', 'eps', 'svg', 'cdr', 'dxf', 'dwg'].includes(ext)) return { soort: 'vector', label: ext.toUpperCase(), kleur: '#9A5A48' }
  if (ct.includes('word') || ['doc', 'docx', 'odt', 'rtf', 'pages'].includes(ext)) return { soort: 'document', label: 'DOC', kleur: '#3A5A9A' }
  if (ct.includes('sheet') || ct.includes('excel') || ['xls', 'xlsx', 'csv', 'numbers', 'ods'].includes(ext)) return { soort: 'sheet', label: 'XLS', kleur: '#2D6B48' }
  if (ct.includes('presentation') || ['ppt', 'pptx', 'key', 'odp'].includes(ext)) return { soort: 'presentatie', label: 'PPT', kleur: '#8A7A4A' }
  if (ct.includes('zip') || ct.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { soort: 'archief', label: 'ZIP', kleur: '#5A5A55' }
  if (ct.startsWith('text/') || ['txt', 'md', 'log'].includes(ext)) return { soort: 'tekst', label: 'TXT', kleur: '#5A5A55' }
  return { soort: 'overig', label: ext.toUpperCase().slice(0, 4) || 'FILE', kleur: '#5A5A55' }
}

/** Inline-cid beeld (logo's uit handtekeningen) hoort niet in de bijlagenrij. */
export function echteBijlagen(meta: EmailAttachment[] | null | undefined): EmailAttachment[] {
  return (meta || []).filter((a) => !a.isInlineCid)
}

export function totaleGrootte(bijlagen: EmailAttachment[]): number {
  return bijlagen.reduce((som, a) => som + (a.size || 0), 0)
}

export type ThumbnailBron =
  | { bron: 'geen' }
  | { bron: 'url'; url: string }
  | { bron: 'bytes'; base64: string; contentType: string }
  | { bron: 'ophalen' }

/**
 * Snelste pad eerst: een signed Storage-URL uit de cache, dan bytes die
 * read-email al inline meestuurde, en pas dan een eigen ronde naar de server.
 * Niet-beeld krijgt nooit een thumbnail.
 */
export function kiesThumbnailBron(
  bijlage: Pick<EmailAttachment, 'filename' | 'contentType'>,
  beschikbaar: { urls?: Record<string, string> | null; bytes?: Record<string, string> | null },
): ThumbnailBron {
  if (!isAfbeelding(bijlage.filename, bijlage.contentType)) return { bron: 'geen' }
  const url = beschikbaar.urls?.[bijlage.filename]
  if (url) return { bron: 'url', url }
  const base64 = beschikbaar.bytes?.[bijlage.filename]
  if (base64) return { bron: 'bytes', base64, contentType: bijlage.contentType || 'image/jpeg' }
  return { bron: 'ophalen' }
}

export function base64NaarBlob(base64: string, contentType: string): Blob {
  const binair = atob(base64)
  const bytes = new Uint8Array(binair.length)
  for (let i = 0; i < binair.length; i++) bytes[i] = binair.charCodeAt(i)
  return new Blob([bytes], { type: contentType || 'application/octet-stream' })
}

export function bijlageUid(item: Pick<EmailLijstItem, 'uid' | 'gmail_id' | 'id'>): number | null {
  const uid = Number(item.uid ?? item.gmail_id ?? item.id)
  return Number.isFinite(uid) && uid > 0 ? uid : null
}

const IMAP_MAP: Record<string, string> = {
  inbox: 'INBOX', verzonden: 'verzonden', concepten: 'concepten', prullenbak: 'prullenbak', gepland: 'gepland', archief: 'archief',
}

export function imapMapVoor(item: Pick<EmailLijstItem, 'imap_folder' | 'map'>): string {
  if (item.imap_folder) return item.imap_folder
  return IMAP_MAP[item.map] || 'INBOX'
}

/** Voor slepen naar de Finder: `type:naam:url`, het formaat dat Chrome leest. */
export function downloadUrlVoorSleep(bestandsnaam: string, contentType: string, url: string): string {
  const veiligeNaam = bestandsnaam.replace(/:/g, '-')
  return `${contentType || 'application/octet-stream'}:${veiligeNaam}:${url}`
}

export interface OpgehaaldeBijlage {
  filename: string
  contentType: string
  blob: Blob | null
  /** Signed URL (cache-hit) of een blob-URL; de aanroeper revoket blob-URLs. */
  url: string
}

function naarOpgehaald(result: EmailAttachmentDownload, terugvalNaam: string, terugvalType?: string): OpgehaaldeBijlage {
  const contentType = result.contentType || terugvalType || 'application/octet-stream'
  if (result.storage_url) return { filename: result.filename || terugvalNaam, contentType, blob: null, url: result.storage_url }
  if (result.content) {
    const blob = base64NaarBlob(result.content, contentType)
    return { filename: result.filename || terugvalNaam, contentType, blob, url: URL.createObjectURL(blob) }
  }
  throw new Error('Geen content of storage_url ontvangen')
}

export async function haalBijlage(uid: number, map: string, bestandsnaam: string, contentType?: string, accountId?: string): Promise<OpgehaaldeBijlage> {
  const result = await downloadEmailAttachment(uid, map, bestandsnaam, accountId)
  return naarOpgehaald(result, bestandsnaam, contentType)
}

/** Alle bijlagen in één serverronde; geeft alleen terug wat gevraagd is. */
export async function haalAlleBijlagen(uid: number, map: string, gevraagd: EmailAttachment[], accountId?: string): Promise<OpgehaaldeBijlage[]> {
  const namen = new Map(gevraagd.map((a) => [a.filename, a]))
  const results = await downloadAllEmailAttachments(uid, map, accountId)
  const uit: OpgehaaldeBijlage[] = []
  for (const r of results) {
    const meta = namen.get(r.filename)
    if (!meta) continue
    try { uit.push(naarOpgehaald(r, r.filename, meta.contentType)) } catch { /* overslaan */ }
  }
  return uit
}

export function bewaarViaBrowser(bestand: OpgehaaldeBijlage): void {
  const a = document.createElement('a')
  a.href = bestand.url
  a.download = bestand.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function alsBlob(bestand: OpgehaaldeBijlage): Promise<Blob> {
  if (bestand.blob) return bestand.blob
  const resp = await fetch(bestand.url)
  if (!resp.ok) throw new Error(`Bijlage ophalen mislukt (${resp.status})`)
  return resp.blob()
}

/**
 * Eén bijlage ophalen en onder het project zetten. Waar hij landt bepaalt de
 * gebruiker in de dialog: situatiefoto, projectbestand of inkoopofferte.
 */
export async function bewaarBijlageInProject(
  bijlage: BijlageMetBestemming,
  keuze: BijlageProjectKeuze,
  bron: { uid: number; map: string; userId: string; accountId?: string | null },
): Promise<'foto' | 'inkoop' | 'document'> {
  const opgehaald = await haalBijlage(bron.uid, bron.map, bijlage.filename, bijlage.contentType, bron.accountId || undefined)
  try {
    const blob = await alsBlob(opgehaald)
    const naam = opgehaald.filename || bijlage.filename
    const type = opgehaald.contentType || bijlage.contentType

    if (bijlage.bestemming === 'foto') {
      const file = new File([blob], naam, { type })
      await createProjectFoto({ user_id: bron.userId, project_id: keuze.project.id, omschrijving: naam, type: 'situatie' }, file)
      return 'foto'
    }

    if (bijlage.bestemming === 'inkoop') {
      // Het bestand gaat eerst naar de projectopslag; de inkoopofferte bewaart
      // dat pad, zodat het inkooppaneel de regels er later uit kan lezen.
      const bewaard = await bijlageNaarProject({
        projectId: keuze.project.id,
        klantId: keuze.project.klant_id,
        bestandsnaam: naam,
        contentType: type,
        map: 'Inkoop',
        data: blob,
      })
      await createInkoopOfferte({
        user_id: bron.userId,
        leverancier_naam: keuze.leverancier?.trim() || 'Onbekende leverancier',
        project_id: keuze.project.id,
        bestand_url: bewaard.storage_path,
        datum: new Date().toISOString().slice(0, 10),
        totaal: 0,
      })
      return 'inkoop'
    }

    await bijlageNaarProject({
      projectId: keuze.project.id,
      klantId: keuze.project.klant_id,
      bestandsnaam: naam,
      contentType: type,
      data: blob,
    })
    return 'document'
  } finally {
    if (opgehaald.url.startsWith('blob:')) URL.revokeObjectURL(opgehaald.url)
  }
}
