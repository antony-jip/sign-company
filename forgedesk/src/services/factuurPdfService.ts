import supabase from '@/services/supabaseClient'
import { generateFactuurPDF } from '@/services/pdfService'
import { logger } from '@/utils/logger'

type Args = {
  factuurId: string
  organisatieId: string
  factuurData: Parameters<typeof generateFactuurPDF>[0]
  items: Parameters<typeof generateFactuurPDF>[1]
  klant: Parameters<typeof generateFactuurPDF>[2]
  bedrijfsProfiel: Parameters<typeof generateFactuurPDF>[3]
  docStyle?: Parameters<typeof generateFactuurPDF>[4]
}

/**
 * Genereert factuur-PDF in de browser, uploadt naar storage.buckets.facturen
 * onder pad {organisatie_id}/{factuur_id}.pdf, en zet pdf_storage_path +
 * pdf_gegenereerd_op op de facturen-rij.
 *
 * Bij ELKE Storage-failure (network, RLS, bucket ontbreekt, etc.): return null.
 * Caller MOET fallback naar on-the-fly PDF hebben — Storage is een optimalisatie,
 * geen vereiste voor de verzendflow.
 */
export async function genereerEnUploadFactuurPdf(
  args: Args,
): Promise<{ path: string; blob: Blob } | null> {
  const { factuurId, organisatieId, factuurData, items, klant, bedrijfsProfiel, docStyle } = args

  if (!supabase) {
    logger.warn('PDF upload skipped — supabase client niet geconfigureerd')
    return null
  }

  let blob: Blob
  try {
    const doc = generateFactuurPDF(factuurData, items, klant, bedrijfsProfiel, docStyle ?? null)
    blob = doc.output('blob')
  } catch (renderErr) {
    logger.error('PDF rendering mislukt:', renderErr)
    return null
  }

  const path = `${organisatieId}/${factuurId}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('facturen')
    .upload(path, blob, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '3600',
    })

  if (uploadError) {
    logger.error('PDF upload naar storage.facturen mislukt:', uploadError)
    return null
  }

  // DB-tracking. Failure hier mag de return NIET ondermijnen — PDF staat al
  // in Storage; volgende send overschrijft (upsert: true) en probeert opnieuw.
  const { error: dbError } = await supabase
    .from('facturen')
    .update({
      pdf_storage_path: path,
      pdf_gegenereerd_op: new Date().toISOString(),
    })
    .eq('id', factuurId)

  if (dbError) {
    logger.error('facturen.pdf_storage_path update mislukt:', dbError)
  }

  return { path, blob }
}

/**
 * Download een eerder geüploade factuur-PDF uit storage.buckets.facturen.
 *
 * ALLEEN AANROEPEN VANUIT SUPABASE-AUTHENTICATED CONTEXT (ingelogde org-user).
 * De RLS-policy op de bucket vereist auth_organisatie_id() matching — calls
 * vanuit token-based portaal/betaalpagina worden geweigerd. Die paden gebruiken
 * generateFactuurPDF on-the-fly.
 *
 * Bij lege/ontbrekende path of elke Storage-failure: return null. Caller moet
 * fallback hebben naar on-the-fly generatie.
 */
export async function downloadFactuurPdfFromStorage(
  pdfStoragePath: string | null | undefined,
): Promise<Blob | null> {
  if (!pdfStoragePath) return null
  if (!supabase) {
    logger.warn('PDF download skipped — supabase client niet geconfigureerd')
    return null
  }

  const { data, error } = await supabase.storage
    .from('facturen')
    .download(pdfStoragePath)

  if (error || !data) {
    logger.warn('PDF download uit storage.facturen mislukt:', error)
    return null
  }

  return data
}

/**
 * Converteer een Blob naar een base64-string (zonder data-URL prefix).
 * Werkt veilig voor grote PDFs via FileReader (geen UTF-8 decode-risico).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}
