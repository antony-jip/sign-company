/**
 * Client-side foto-compressie voor maatjes. Comprimeren gebeurt op de telefoon
 * vooraf, zodat zwak signaal op de bouwplaats geen probleem is en de storage
 * klein blijft (~300-600 KB i.p.v. meerdere MB iPhone-HEIC).
 *
 * EXIF-oriëntatie wordt eruit gebakken via createImageBitmap met
 * imageOrientation 'from-image', zodat de foto niet gedraaid in de editor
 * verschijnt. Output is JPEG (klein voor foto's, geen PNG).
 */

export const MAATJE_MAX_ZIJDE = 2048
export const MAATJE_FOTO_KWALITEIT = 0.8

/** Foto kon niet client-side gedecodeerd worden (bv. HEIC zonder support). */
export class FotoVerwerkingsFout extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FotoVerwerkingsFout'
  }
}

export async function comprimeerFoto(
  bron: File | Blob,
  maxZijde = MAATJE_MAX_ZIJDE,
  kwaliteit = MAATJE_FOTO_KWALITEIT,
): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(bron, { imageOrientation: 'from-image' })
  } catch {
    throw new FotoVerwerkingsFout('Kon de foto niet verwerken op dit toestel')
  }

  let breedte = bitmap.width
  let hoogte = bitmap.height
  const langste = Math.max(breedte, hoogte)
  if (langste > maxZijde) {
    const factor = maxZijde / langste
    breedte = Math.round(breedte * factor)
    hoogte = Math.round(hoogte * factor)
  }

  const canvas = document.createElement('canvas')
  canvas.width = breedte
  canvas.height = hoogte
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new FotoVerwerkingsFout('Canvas niet ondersteund')
  }
  ctx.drawImage(bitmap, 0, 0, breedte, hoogte)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new FotoVerwerkingsFout('Compressie mislukt'))),
      'image/jpeg',
      kwaliteit,
    )
  })
}
