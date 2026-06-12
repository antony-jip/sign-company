import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = process.env.SUPABASE_UPLOAD_BUCKET ?? 'uploads'
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff']

/**
 * Klant uploadt een eigen foto ("eigen kunstdoek"). Slaat het bestand op in
 * Supabase Storage en registreert het in custom_uploads. Geeft het upload-id
 * terug; dat verwijst de cart-regel naar de juiste afbeelding.
 *
 * Vereist een storage-bucket (default 'uploads'). Aanmaken:
 *   Supabase Dashboard -> Storage -> New bucket -> "uploads" (public).
 */
export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Verwacht multipart/form-data' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Geen bestand ontvangen' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Bestand te groot (max 25 MB)' }, { status: 413 })
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Alleen JPG, PNG, WEBP of TIFF' }, { status: 415 })
  }

  const admin = supabaseAdmin()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `eigen-foto/${crypto.randomUUID()}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (upErr) {
    return NextResponse.json({ error: `Upload mislukt: ${upErr.message}` }, { status: 500 })
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)

  const { data: row, error: rowErr } = await admin
    .from('custom_uploads')
    .insert({
      storage_path: path,
      public_url: pub.publicUrl,
      bestandsnaam: file.name,
    })
    .select('id, public_url')
    .single()

  if (rowErr || !row) {
    return NextResponse.json({ error: 'Registratie upload mislukt' }, { status: 500 })
  }

  return NextResponse.json({ uploadId: row.id, url: row.public_url })
}
