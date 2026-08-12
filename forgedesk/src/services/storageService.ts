import supabase, { isSupabaseConfigured } from './supabaseClient'
import * as Sentry from '@sentry/react'
import { getOrgId } from './supabaseHelpers'
import { safeSetItem } from '@/utils/localStorageUtils'

// De private bucket. Alles wat gevoelig is staat hier; lezen loopt via
// api/bestand, dat de organisatie controleert (migraties 182-185).
const BUCKET = 'documenten-prive'

// De oude, publieke bucket. Nog precies één ding hoort hier: beeld dat in
// uitgaande mail komt en dus permanent bereikbaar moet blijven. Zie
// getPubliekeMailUrl.
const PUBLIEKE_MAIL_BUCKET = 'documenten'

/** Allowed MIME types for file uploads */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'text/csv',
])

/** Max file size: 25MB */
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024

function validateFile(file: File): void {
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`Bestand te groot (max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB)`)
  }
  if (ALLOWED_MIME_TYPES.size > 0 && !ALLOWED_MIME_TYPES.has(file.type) && file.type !== '') {
    throw new Error(`Bestandstype "${file.type}" niet toegestaan`)
  }
}

/** Max file size (in bytes) that will be stored in localStorage fallback (5MB). */
const MAX_LOCAL_FILE_SIZE = 5 * 1024 * 1024

/** Compress an image file to a data URL with reduced size. */
function compressImageForStorage(file: File, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    // Non-image files: read as-is
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w)
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas not supported')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadFile(file: File, path: string): Promise<string> {
  validateFile(file)
  if (!isSupabaseConfigured() || !supabase) {
    return uploadFileToLocalStorage(file, path)
  }
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw error
  return data.path
}

/** Max grootte voor een losse mailbijlage (20MB). */
const MAX_EMAIL_ATTACHMENT_SIZE = 20 * 1024 * 1024

/**
 * Upload een mailbijlage naar een tijdelijk pad in de documenten-bucket en geef
 * het storage-pad terug. Bewust GEEN MIME-allowlist (mailbijlagen mogen elk type
 * zijn, bv. .ai/.eps/.zip), wel een eigen 20MB-limiet. api/send-email downloadt
 * het bestand server-side en verwijdert het na verzending (cleanupAfter), zodat
 * de request-body klein blijft (Vercel ~4.5MB body-limiet).
 */
export async function uploadEmailAttachment(data: Blob, filename: string, userId: string): Promise<string> {
  if (data.size > MAX_EMAIL_ATTACHMENT_SIZE) {
    throw new Error(`Bijlage "${filename}" is groter dan ${MAX_EMAIL_ATTACHMENT_SIZE / 1024 / 1024}MB`)
  }
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase Storage niet geconfigureerd — kan bijlage niet versturen')
  }
  const safeName = filename.replace(/[^\w.\-]+/g, '_')
  const path = `email-bijlagen/${userId}/${crypto.randomUUID()}-${safeName}`
  const { data: res, error } = await supabase.storage.from(BUCKET).upload(path, data, {
    cacheControl: '3600',
    upsert: false,
    contentType: data.type || 'application/octet-stream',
  })
  if (error) throw error
  return res.path
}

async function uploadFileToLocalStorage(file: File, path: string): Promise<string> {
  if (file.size > MAX_LOCAL_FILE_SIZE) {
    throw new Error(
      `Bestand te groot voor lokale opslag (max ${Math.round(MAX_LOCAL_FILE_SIZE / (1024 * 1024))}MB). Configureer Supabase Storage.`
    )
  }
  const dataUrl = await compressImageForStorage(file)
  const stored = JSON.parse(localStorage.getItem('doen_files') || '{}')
  stored[path] = { name: file.name, size: file.size, type: file.type, dataUrl }
  if (!safeSetItem('doen_files', JSON.stringify(stored))) {
    throw new Error('Onvoldoende opslagruimte. Verwijder oude bestanden of configureer Supabase.')
  }
  return path
}

/**
 * Levert een bruikbare URL om een bestand te TONEN of op te halen. De link is
 * ondertekend en vervalt na een dag: lang genoeg voor een sessie of een PDF,
 * kort genoeg dat een doorgestuurde link geen blijvende sleutel is.
 *
 * Bewaar het resultaat NIET in de database. Wie een pad wil opslaan, slaat het
 * pad op; de leeskant lost het hier weer op. Zie getPubliekeMailUrl voor het
 * ene geval waarin dat niet kan.
 */
export async function downloadFile(path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('doen_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  return vraagOndertekendeUrl(path)
}

// Eenmaal opgehaalde links hergebruiken binnen hun geldigheid. Zonder dit doet
// een lijst met twintig bijlagen twintig serverrondjes bij elke render.
const urlCache = new Map<string, { url: string; geldigTot: number }>()

/** Legen bij uitloggen of een orgwissel: anders blijven links van de vorige
 *  sessie in hetzelfde tabblad bruikbaar tot ze vervallen. */
export function wisBestandsCache(): void {
  urlCache.clear()
}

// Werpt NOOIT. Een bestand dat niet opgehaald kan worden hoort een lege plek
// te geven, geen kapotte pagina. Deze functie zit in Promise.all-lijsten
// (portaalitems, visualisaties), en daar zou een enkele afwijzing de hele lijst
// meeslepen. `fetch` gooit bij elk netwerkprobleem: offline, afgebroken request,
// wegnavigeren tijdens het laden. In Safari heet dat "Load failed".
async function vraagOndertekendeUrl(path: string): Promise<string> {
  const uitCache = urlCache.get(path)
  if (uitCache && uitCache.geldigTot > Date.now() + 60_000) return uitCache.url

  try {
    const { data: { session } } = await supabase!.auth.getSession()
    if (!session) return ''

    const res = await fetch('/api/bestand', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pad: path }),
    })
    if (!res.ok) {
      // 404 is een normale uitkomst: het bestand hoort niet bij jouw
      // organisatie of bestaat niet meer. Alles daarboven is een storing en
      // hoort zichtbaar te zijn, ook al ziet de gebruiker alleen een lege plek.
      if (res.status !== 404) {
        Sentry.captureMessage('Bestand ophalen mislukt', {
          level: 'warning',
          tags: { bron: 'api/bestand', status: String(res.status) },
        })
      }
      return ''
    }
    const { url, geldigTot } = await res.json()
    if (url) urlCache.set(path, { url, geldigTot: geldigTot ?? Date.now() + 3600_000 })
    return url || ''
  } catch (err) {
    // Stil voor de gebruiker, zichtbaar voor ons. Zonder deze melding is een
    // kapot bestand onzichtbaar: de lege plek valt niemand op tot een klant
    // erover belt.
    Sentry.captureException(err, { tags: { bron: 'api/bestand' } })
    return ''
  }
}

/**
 * Blijvende publieke URL, alleen voor beeld dat in UITGAANDE MAIL komt.
 *
 * Een mailclient kan geen vervallende link openen, en een verstuurde mail is
 * niet meer te wijzigen: de URL die erin staat moet blijven werken zolang de
 * ontvanger hem kan terugzoeken. Dat is de reden dat deze functie bestaat en
 * de reden dat de documenten-bucket publiek is.
 *
 * Gebruik dit nergens anders voor. Alles wat alleen in de app getoond wordt,
 * hoort via downloadFile te gaan.
 */
export async function getPubliekeMailUrl(path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('doen_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  const { data } = supabase.storage.from(PUBLIEKE_MAIL_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Uploadt naar de publieke bucket. Alleen voor beeld dat in mail terechtkomt. */
export async function uploadPubliekeMailAfbeelding(file: File, path: string): Promise<string> {
  validateFile(file)
  if (!isSupabaseConfigured() || !supabase) return uploadFileToLocalStorage(file, path)
  const { data, error } = await supabase.storage.from(PUBLIEKE_MAIL_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
  return data.path
}

/**
 * Resolve een opgeslagen portaal-bestand-waarde naar een publiek bruikbare URL.
 *
 * Spiegel van resolveStorageUrl in api/portaal-get.ts:303-312 — gebruikt aan de
 * client-kant zodat interne users (in de cockpit) dezelfde URL krijgen die de
 * publieke route al opbouwt voor klanten. Storage paths leveren we niet in de
 * DB resolved op (zie REVIEW_NOTES); deze helper vangt dat read-side af.
 */
export async function resolvePortaalBestandUrl(
  pathOrUrl: string | null | undefined,
): Promise<string | null> {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://') || pathOrUrl.startsWith('data:')) {
    return pathOrUrl
  }
  if (!isSupabaseConfigured() || !supabase) return pathOrUrl
  // Ondertekend in plaats van publiek: dit zijn klantdocumenten en
  // projectfoto's. Een dag is ruim voor een sessie en kort genoeg dat een
  // doorgestuurde link niet eeuwig meegaat. Werkt ook zolang de bucket nog
  // publiek is, dus dit kan vooruit op het splitsen van de bucket.
  return (await vraagOndertekendeUrl(pathOrUrl)) || null
}

export async function getSignedUrl(path: string, ttlSeconden: number = 3600): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('doen_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  // ttlSeconden wordt door de server bepaald (24 uur); de parameter blijft
  // staan zodat aanroepers niet hoeven te wijzigen.
  void ttlSeconden
  return vraagOndertekendeUrl(path)
}

/**
 * Upload een montage bijlage naar storage en geef een MontageBijlage object terug met een persistente URL.
 */
export async function uploadMontageBijlage(file: File): Promise<{
  id: string
  naam: string
  type: 'pdf' | 'tekening' | 'foto' | 'overig'
  url: string
  grootte: number
  uploaded_at: string
}> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  let type: 'pdf' | 'tekening' | 'foto' | 'overig' = 'overig'
  if (ext === 'pdf') type = 'pdf'
  else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = 'foto'

  const orgId = await getOrgId()
  if (!orgId) throw new Error('Organisatie niet gevonden')
  const fileId = crypto.randomUUID()
  const storagePath = `montage-bijlagen/${orgId}/${fileId}.${ext || 'bin'}`
  const url = await uploadFile(file, storagePath)

  // Bewust het PAD, niet een opgeloste link. Dit object wordt opgeslagen in
  // montage_afspraken.bijlagen, en een ondertekende URL zou daar na een dag
  // dood in staan zonder dat het pad nog te achterhalen was.
  return {
    id: fileId,
    naam: file.name,
    type,
    url,
    grootte: file.size,
    uploaded_at: new Date().toISOString(),
  }
}

export async function uploadEmailBijlage(file: File): Promise<{ filename: string; storagePath: string; size: number }> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase Storage is niet geconfigureerd')
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error(`Bestand te groot (max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB)`)
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) throw new Error('Niet ingelogd')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storagePath = `email-bijlagen/${session.user.id}/${id}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    cacheControl: '300',
    upsert: false,
  })
  if (error) throw new Error(`Upload mislukt: ${error.message}`)
  return { filename: file.name, storagePath, size: file.size }
}

/** Max grootte voor een grote bijlage die via downloadlink meegaat (100MB).
    Let op: de Supabase "global file size limit" moet dit ook toestaan. */
const MAX_GROTE_BIJLAGE_SIZE = 100 * 1024 * 1024
/** Downloadlinks voor grote bijlagen blijven 30 dagen geldig. */
export const GROTE_BIJLAGE_TTL_SECONDEN = 30 * 24 * 60 * 60

/**
 * Upload een grote mailbijlage naar een NIET-tijdelijk pad en geef een
 * signed download-URL (30 dagen geldig) terug. Het bestand gaat niet als
 * SMTP-attachment mee maar als link in de mailbody — zoals Outlook grote
 * bestanden via OneDrive deelt. Opruimen gebeurt door de dagelijkse
 * attachment-cleanup-cron (>35 dagen oud).
 */
export async function uploadGroteBijlage(file: File): Promise<{ filename: string; size: number; url: string }> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase Storage is niet geconfigureerd')
  }
  if (file.size > MAX_GROTE_BIJLAGE_SIZE) {
    throw new Error(`"${file.name}" is groter dan ${MAX_GROTE_BIJLAGE_SIZE / 1024 / 1024}MB — te groot, ook voor een downloadlink`)
  }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) throw new Error('Niet ingelogd')
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const storagePath = `email-bijlagen-groot/${session.user.id}/${crypto.randomUUID()}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) throw new Error(`Upload mislukt: ${error.message}`)
  // Ondertekenen kan niet meer vanaf de client: de private bucket geeft
  // authenticated geen leesrecht. De server doet het, met een ruimere
  // geldigheid omdat de ontvanger de link pas dagen later kan openen.
  const url = await vraagOndertekendeUrl(storagePath)
  if (!url) throw new Error('Downloadlink aanmaken mislukt')
  return { filename: file.name, size: file.size, url }
}

export async function deleteFile(path: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('doen_files') || '{}')
    delete stored[path]
    safeSetItem('doen_files', JSON.stringify(stored))
    return
  }
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

interface StorageFile {
  name: string
  id: string
  metadata?: { size?: number; mimetype?: string }
}
