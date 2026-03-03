import supabase, { isSupabaseConfigured } from './supabaseClient'
import { safeSetItem } from '@/utils/localStorageUtils'

const BUCKET = 'documenten'

/** Max file size (in bytes) that will be stored in localStorage fallback (500KB). */
const MAX_LOCAL_FILE_SIZE = 500 * 1024

export async function uploadFile(file: File, path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    if (file.size > MAX_LOCAL_FILE_SIZE) {
      throw new Error(
        `Bestand te groot voor lokale opslag (max ${Math.round(MAX_LOCAL_FILE_SIZE / 1024)}KB). Configureer Supabase voor grotere bestanden.`
      )
    }
    // Fallback: store as data URL in localStorage
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const stored = JSON.parse(localStorage.getItem('forgedesk_files') || '{}')
        stored[path] = { name: file.name, size: file.size, type: file.type, dataUrl: reader.result }
        if (!safeSetItem('forgedesk_files', JSON.stringify(stored))) {
          reject(new Error('Onvoldoende opslagruimte. Verwijder oude bestanden of configureer Supabase.'))
          return
        }
        resolve(path)
      }
      reader.readAsDataURL(file)
    })
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
