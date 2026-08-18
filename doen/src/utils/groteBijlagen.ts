import { uploadEmailBijlage, uploadGroteBijlage } from '@/services/storageService'

/** Totaal aan directe SMTP-bijlagen per mail (Outlook/Gmail-niveau). */
export const MAX_DIRECT_TOTAAL_BYTES = 25 * 1024 * 1024
/** Absolute bovengrens per bestand, ook via downloadlink. */
export const MAX_LINK_BIJLAGE_BYTES = 100 * 1024 * 1024
export const LINK_GELDIGHEID_DAGEN = 30

export interface BijlagenSplitsing {
  direct: File[]
  viaLink: File[]
}

export interface DirecteBijlage {
  filename: string
  storagePath: string
  size: number
}

export interface BijlagenPayload {
  attachments: DirecteBijlage[] | undefined
  /** HTML-blok met downloadlinks, '' wanneer alles direct meegaat. */
  linksHtml: string
  /** Plain-text equivalent voor de tekstversie van de mail. */
  linksText: string
}

/**
 * Verdeel bijlagen over direct (SMTP-attachment) en via-downloadlink.
 * De grootste bestanden verhuizen naar de link-route tot het directe
 * totaal binnen de 25MB past — zo gaan kleine bestanden altijd gewoon
 * als bijlage mee.
 */
export function splitsBijlagen(files: File[]): BijlagenSplitsing {
  const direct = [...files]
  const viaLink: File[] = []
  const totaal = () => direct.reduce((sum, f) => sum + f.size, 0)
  while (direct.length > 0 && totaal() > MAX_DIRECT_TOTAAL_BYTES) {
    let grootste = 0
    direct.forEach((f, i) => { if (f.size > direct[grootste].size) grootste = i })
    viaLink.push(direct.splice(grootste, 1)[0])
  }
  return { direct, viaLink }
}

/** Geeft een foutmelding terug als een bestand zelfs voor de link-route te groot is. */
export function valideerBijlagen(files: File[]): string | null {
  const teGroot = files.find(f => f.size > MAX_LINK_BIJLAGE_BYTES)
  if (teGroot) {
    return `"${teGroot.name}" is groter dan ${MAX_LINK_BIJLAGE_BYTES / 1024 / 1024}MB en kan niet worden verstuurd`
  }
  return null
}

function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1).replace('.', ',')} MB`
}

interface GroteBijlageLink {
  filename: string
  size: number
  url: string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function bouwLinksHtml(links: GroteBijlageLink[]): string {
  if (!links.length) return ''
  const rijen = links.map(l =>
    `<p style="margin:6px 0 0;font-size:14px;line-height:1.5;">` +
    `<a href="${l.url}" style="color:#1A535C;font-weight:600;text-decoration:underline;">${escapeHtml(l.filename)}</a>` +
    ` <span style="color:#9B9B95;">(${formatMB(l.size)})</span></p>`
  ).join('')
  return (
    `<div style="margin-top:20px;padding:14px 18px;border:1px solid #EBEBEB;border-radius:12px;background:#F8F7F5;">` +
    `<p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.04em;color:#9B9B95;">` +
    `Grote bijlagen &middot; downloadlink ${LINK_GELDIGHEID_DAGEN} dagen geldig</p>` +
    rijen +
    `</div>`
  )
}

function bouwLinksText(links: GroteBijlageLink[]): string {
  if (!links.length) return ''
  return (
    `\n\nGrote bijlagen (downloadlink ${LINK_GELDIGHEID_DAGEN} dagen geldig):\n` +
    links.map(l => `- ${l.filename} (${formatMB(l.size)}): ${l.url}`).join('\n')
  )
}

/**
 * Upload alle bijlagen: kleine bestanden naar het tijdelijke pad (gaan als
 * SMTP-attachment mee), grote naar de link-route. Gooit bij uploadfouten —
 * de aanroeper toont de toast.
 */
export async function uploadBijlagenMetLinkFallback(files: File[]): Promise<BijlagenPayload> {
  const { direct, viaLink } = splitsBijlagen(files)

  const [attachments, links] = await Promise.all([
    Promise.all(direct.map(file => uploadEmailBijlage(file))),
    Promise.all(viaLink.map(file => uploadGroteBijlage(file))),
  ])

  return {
    attachments: attachments.length > 0 ? attachments : undefined,
    linksHtml: bouwLinksHtml(links),
    linksText: bouwLinksText(links),
  }
}
