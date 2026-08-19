/**
 * Afbeeldingen in een mailbody moeten de ontvanger ook echt bereiken.
 *
 * Zet je een foto in een contenteditable, dan maakt de browser er een
 * blob:-verwijzing van (Safari soms webkit-fake-url:). Die leeft alleen in jouw
 * tabblad: jij ziet de foto staan, de ontvanger krijgt een leeg vakje. Alleen
 * een data:-URI overleeft de reis — api/send-email zet die server-side om naar
 * een CID-inline-bijlage.
 *
 * Onderweg gaat de foto door de compressie: een telefoonfoto van 4 MB wordt als
 * base64 ruim 5 MB en loopt tegen de 4,5 MB-limiet van de verzendroute aan.
 */
import { comprimeerFoto } from './beeldCompressie'
import { logger } from './logger'

/** Ruim onder de payload-limiet, groot genoeg om op een scherm scherp te zijn. */
const MAIL_MAX_ZIJDE = 1600
const MAIL_KWALITEIT = 0.82

/** Verwijzingen die alleen in het tabblad van de afzender bestaan. */
const LOKALE_BRON = /^(blob:|webkit-fake-url:|file:)/i

function alsDataUrl(bron: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Kon de afbeelding niet lezen'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Kon de afbeelding niet lezen'))
    reader.readAsDataURL(bron)
  })
}

/** Onder deze grens is verkleinen niet nodig en dus alleen maar schadelijk. */
const KLEIN_GENOEG = 700 * 1024

/**
 * Comprimeren gaat via canvas naar JPEG, en dat kost doorzichtigheid en
 * animatie. Een logo met transparante achtergrond zou zwart worden, dus die
 * formaten blijven zoals ze zijn zolang ze klein genoeg zijn.
 */
function magGecomprimeerd(bron: File | Blob): boolean {
  const type = (bron.type || '').toLowerCase()
  if (type === 'image/svg+xml') return false
  if ((type === 'image/png' || type === 'image/gif') && bron.size <= KLEIN_GENOEG) return false
  return bron.size > KLEIN_GENOEG || type === 'image/heic' || type === 'image/heif'
}

/**
 * Een afbeelding als data:-URI, verkleind waar dat kan. Lukt decoderen niet
 * (HEIC zonder browser-support bijvoorbeeld), dan gaat het origineel mee: liever
 * een grote bijlage dan een foto die de ontvanger mist.
 */
export async function afbeeldingAlsDataUrl(bron: File | Blob): Promise<string> {
  if (!magGecomprimeerd(bron)) return alsDataUrl(bron)
  try {
    return await alsDataUrl(await comprimeerFoto(bron, MAIL_MAX_ZIJDE, MAIL_KWALITEIT))
  } catch {
    return alsDataUrl(bron)
  }
}

/** De beeldbestanden uit een plak- of sleepactie. */
export function afbeeldingenUitLijst(lijst: DataTransferItemList | FileList | null | undefined): File[] {
  const files: File[] = []
  if (!lijst) return files
  for (const entry of Array.from(lijst as ArrayLike<DataTransferItem | File>)) {
    if (entry instanceof File) {
      if (entry.type.startsWith('image/')) files.push(entry)
    } else if (entry.kind === 'file' && entry.type.startsWith('image/')) {
      const f = entry.getAsFile()
      if (f) files.push(f)
    }
  }
  return files
}

/** Zet de gekozen beelden op de cursorpositie in de editor. */
export async function voegAfbeeldingenIn(editor: HTMLElement | null, files: File[]): Promise<void> {
  for (const file of files) {
    try {
      const dataUrl = await afbeeldingAlsDataUrl(file)
      editor?.focus()
      document.execCommand('insertHTML', false, `<img src="${dataUrl}" alt="" style="max-width:100%;height:auto;" />`)
    } catch (err) {
      logger.warn('Afbeelding invoegen mislukt:', err)
    }
  }
}

/**
 * Vangnet vlak voor verzenden: elke afbeelding die nog naar een lokale bron
 * wijst wordt alsnog ingesloten. Lukt dat niet, dan gaat de verwijzing eruit —
 * een kapot vakje in de mail van de klant is slechter dan geen beeld.
 */
export async function inlineLokaleAfbeeldingen(html: string): Promise<string> {
  if (!html || !/<img/i.test(html)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const lokaal = Array.from(doc.querySelectorAll('img')).filter((img) =>
    LOKALE_BRON.test(img.getAttribute('src') || ''),
  )
  if (lokaal.length === 0) return html

  for (const img of lokaal) {
    const src = img.getAttribute('src') || ''
    try {
      const blob = await fetch(src).then((r) => r.blob())
      img.setAttribute('src', await afbeeldingAlsDataUrl(blob))
    } catch (err) {
      logger.warn('Lokale afbeelding kon niet worden ingesloten:', err)
      img.remove()
    }
  }
  return doc.body.innerHTML
}
