import * as pdfjsLib from 'pdfjs-dist'

// Worker-setup volgt dezelfde aanpak als PdfPreviewDialog/react-pdf:
// unpkg-CDN met versie-pin via pdfjsLib.version. Hergebruik voorkomt
// dat we hier een lokale worker-import via Vite static-asset moeten regelen,
// wat een aparte bundling-config zou vereisen.
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

export interface PdfRenderOpties {
  schaal?: number
  maxBreedtePx?: number
}

export async function pdfEerstePaginaNaarImage(
  file: File,
  opties: PdfRenderOpties = {},
): Promise<Blob> {
  const { schaal = 2, maxBreedtePx = 1200 } = opties

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pagina = await pdf.getPage(1)

  const baseViewport = pagina.getViewport({ scale: 1 })
  const effectieveSchaal = Math.min(schaal, maxBreedtePx / baseViewport.width)
  const viewport = pagina.getViewport({ scale: effectieveSchaal })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D-context niet beschikbaar')

  await pagina.render({ canvasContext: ctx, viewport, canvas }).promise

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PDF-rendering naar PNG mislukt'))
    }, 'image/png')
  })
}
