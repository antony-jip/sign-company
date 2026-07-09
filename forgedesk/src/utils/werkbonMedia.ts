import { getSignedUrl } from '@/services/storageService'
import { logger } from './logger'

// Langere TTL dan de standaard 1 uur: een monteur houdt de werkbon vaak een
// hele dag op locatie open; anders verlopen de foto-URL's tussentijds.
export const WERKBON_URL_TTL = 60 * 60 * 12

/**
 * Zet een opgeslagen storage-pad om naar een signed URL. Data/http/blob-urls
 * worden ongewijzigd teruggegeven. Bij falen '' zodat de render-laag een
 * placeholder kan tonen i.p.v. een broken image.
 */
export async function resolveWerkbonUrl(url: string): Promise<string> {
  if (!url || url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:')) return url
  try {
    return await getSignedUrl(url, WERKBON_URL_TTL)
  } catch (err) {
    logger.warn('Kon storage URL niet resolven:', url, err)
    return ''
  }
}

/** Schaalt een afbeelding terug tot maxWidth en levert een JPEG-blob (kwaliteit 0.8). */
export function resizeWerkbonImage(file: File, maxWidth: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas context failed')); return }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Blob creation failed')) },
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image loading failed')) }
    img.src = url
  })
}

/**
 * Voegt "Afgerond door: <naam>" toe aan de monteur-opmerkingen, maar strip eerst
 * een eventuele eerdere toevoeging zodat opnieuw afronden niet stapelt.
 */
export function opmerkingenMetAfronder(opmerkingen: string | undefined, medewerkerNaam: string): string {
  const base = (opmerkingen || '').replace(/\n\nAfgerond door: [\s\S]*$/, '').trimEnd()
  return base ? `${base}\n\nAfgerond door: ${medewerkerNaam}` : `Afgerond door: ${medewerkerNaam}`
}
