import supabase, { isSupabaseConfigured } from './supabaseClient'

const BUCKET = 'documenten'

export async function uploadFile(file: File, path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    // Fallback: store as data URL in localStorage
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const stored = JSON.parse(localStorage.getItem('workmate_files') || '{}')
        stored[path] = { name: file.name, size: file.size, type: file.type, dataUrl: reader.result }
        localStorage.setItem('workmate_files', JSON.stringify(stored))
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
    const stored = JSON.parse(localStorage.getItem('workmate_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function getSignedUrl(path: string): Promise<string> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('workmate_files') || '{}')
    return stored[path]?.dataUrl || ''
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteFile(path: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('workmate_files') || '{}')
    delete stored[path]
    localStorage.setItem('workmate_files', JSON.stringify(stored))
    return
  }
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export async function listFiles(folder: string): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) {
    const stored = JSON.parse(localStorage.getItem('workmate_files') || '{}')
    return Object.entries(stored)
      .filter(([key]) => key.startsWith(folder))
      .map(([key, val]: [string, any]) => ({ name: val.name, id: key, metadata: { size: val.size, mimetype: val.type } }))
  }
  const { data, error } = await supabase.storage.from(BUCKET).list(folder)
  if (error) throw error
  return data || []
}
