import supabase, { isSupabaseConfigured } from './supabaseClient'
import { safeSetItem } from '@/utils/localStorageUtils'

const BUCKET = 'documenten'

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
  if (!isSupabaseConfigured() || !supabase) {
    if (file.size > MAX_LOCAL_FILE_SIZE) {
      throw new Error(
        `Bestand te groot voor lokale opslag (max ${Math.round(MAX_LOCAL_FILE_SIZE / (1024 * 1024))}MB). Configureer Supabase voor grotere bestanden.`
      )
    }
    // Fallback: compress images and store in localStorage
    try {
      const dataUrl = await compressImageForStorage(file)
      const stored = JSON.parse(localStorage.getItem('forgedesk_files') || '{}')
      stored[path] = { name: file.name, size: file.size, type: file.type, dataUrl }
      if (!safeSetItem('forgedesk_files', JSON.stringify(stored))) {
        throw new Error('Onvoldoende opslagruimte. Verwijder oude bestanden of configureer Supabase.')
      }
      return path
    } catch (err) {
      throw err instanceof Error ? err : new Error('Kon bestand niet opslaan')
    }
  }
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw error
  return data.path
}

export async function downloadFile(path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('forgedesk_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function getSignedUrl(path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('forgedesk_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
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

  const id = `bijlage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const storagePath = `montage-bijlagen/${id}.${ext}`
  const url = await uploadFile(file, storagePath)

  // Get a public/downloadable URL
  let displayUrl = url
  try {
    displayUrl = await downloadFile(url)
  } catch {
    // fallback to path
  }

  return {
    id,
    naam: file.name,
    type,
    url: displayUrl,
    grootte: file.size,
    uploaded_at: new Date().toISOString(),
  }
}

export async function deleteFile(path: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('forgedesk_files') || '{}')
    delete stored[path]
    safeSetItem('forgedesk_files', JSON.stringify(stored))
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

export async function listFiles(folder: string): Promise<StorageFile[]> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('forgedesk_files') || '{}') as Record<string, { name: string; size: number; type: string }>
    return Object.entries(stored)
      .filter(([key]) => key.startsWith(folder))
      .map(([key, val]) => ({ name: val.name, id: key, metadata: { size: val.size, mimetype: val.type } }))
  }
  const { data, error } = await supabase.storage.from(BUCKET).list(folder)
  if (error) throw error
  return data || []
}
