import { useState, useRef } from 'react'
import {
  CheckCircle2,
  RotateCcw,
  Loader2,
  Paperclip,
  X,
  FileText,
  Send,
} from 'lucide-react'

interface PortaalReactieFormProps {
  token: string
  itemId: string
  itemType: string // 'offerte' | 'tekening' | 'bericht'
  itemStatus: string
  primaire_kleur: string
  onReactie: () => void // callback to refresh data
}

const NAAM_KEY = 'forgedesk_portaal_klant_naam'
const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:... prefix to get pure base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PortaalReactieForm({ token, itemId, itemType, itemStatus, primaire_kleur, onReactie }: PortaalReactieFormProps) {
  const [naam, setNaam] = useState(() => {
    try { return localStorage.getItem(NAAM_KEY) || '' } catch { return '' }
  })
  const [bericht, setBericht] = useState('')
  const [modus, setModus] = useState<'idle' | 'revisie'>('idle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])

  // Niet tonen als al gereageerd (behalve bericht — chat blijft altijd open)
  if (itemType !== 'bericht' && ['goedgekeurd', 'revisie', 'betaald'].includes(itemStatus)) {
    return null
  }

  function saveNaam(value: string) {
    setNaam(value)
    try { localStorage.setItem(NAAM_KEY, value) } catch { /* ignore */ }
  }

  function addFiles(newFiles: FileList | File[]) {
    const fileArray = Array.from(newFiles)
    const valid = fileArray.filter(f => {
      if (!ALLOWED_TYPES.includes(f.type)) return false
      if (f.size > MAX_FILE_SIZE) return false
      return true
    })
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES))
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function uploadFiles(): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const base64 = await fileToBase64(file)
      const response = await fetch('/api/portaal-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: itemId,
          bestandsnaam: file.name,
          mime_type: file.type,
          data: base64,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || `Upload mislukt: ${file.name}`)
      }
      const result = await response.json()
      urls.push(result.url)
    }
    return urls
  }

  async function handleSubmit(type: 'goedkeuring' | 'revisie' | 'bericht') {
    if (type === 'revisie' && !bericht.trim()) {
      setError('Geef aan wat er anders moet')
      return
    }
    if (type === 'bericht' && !bericht.trim()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      // Upload bestanden eerst (als er bestanden zijn)
      let bestandUrls = uploadedUrls
      if (files.length > 0) {
        bestandUrls = await uploadFiles()
        setUploadedUrls(bestandUrls)
      }

      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: itemId,
          type,
          bericht: bericht.trim() || undefined,
          klant_naam: naam.trim() || undefined,
          bestanden: bestandUrls.length > 0 ? bestandUrls : undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Kon reactie niet versturen')
      }

      // Succes — reset velden
      setBericht('')
      setFiles([])
      setUploadedUrls([])
      setModus('idle')
      onReactie()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Bericht chat modus — altijd een chatachtige input tonen
  if (itemType === 'bericht') {
    return (
      <div className="border-t border-gray-100 px-5 py-3">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={bericht}
              onChange={(e) => {
                setBericht(e.target.value)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (bericht.trim()) handleSubmit('bericht')
                }
              }}
              placeholder="Typ een reactie..."
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style={{ '--tw-ring-color': primaire_kleur, minHeight: '38px' } as React.CSSProperties}
            />
          </div>
          <button
            onClick={() => { if (bericht.trim()) handleSubmit('bericht') }}
            disabled={loading || !bericht.trim()}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: primaire_kleur }}
            title="Versturen"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {/* Naam opslaan (verborgen tot eerste keer) */}
        {!naam && (
          <div className="mt-2">
            <input
              type="text"
              value={naam}
              onChange={(e) => saveNaam(e.target.value)}
              placeholder="Uw naam (optioneel)"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:border-transparent"
              style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
            />
          </div>
        )}
      </div>
    )
  }

  // Revisie modus
  if (modus === 'revisie') {
    return (
      <div className="border-t border-gray-100 px-5 py-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Uw naam (optioneel)</label>
          <input
            type="text"
            value={naam}
            onChange={(e) => saveNaam(e.target.value)}
            placeholder="Jan de Groot"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wat moet er anders? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={bericht}
            onChange={(e) => setBericht(e.target.value)}
            placeholder="Beschrijf wat u graag anders ziet..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
            required
          />
        </div>

        {/* Bestanden toevoegen */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Paperclip className="w-4 h-4" />
            Bestand toevoegen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <p className="text-xs text-gray-400 mt-0.5">Max {MAX_FILES} bestanden, 10MB per stuk (JPG, PNG, PDF)</p>
        </div>

        {/* Geselecteerde bestanden */}
        {files.length > 0 && (
          <div className="space-y-1">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate flex-1">{file.name}</span>
                <span className="text-2xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drag & drop zone */}
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-gray-400') }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('border-gray-400') }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('border-gray-400')
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
        >
          <p className="text-xs text-gray-400">Sleep bestanden hierheen</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit('revisie')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#f59e0b' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Revisie versturen
          </button>
          <button
            onClick={() => { setModus('idle'); setError('') }}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    )
  }

  // Idle modus — toon goedkeuren / revisie knoppen
  return (
    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Uw naam (optioneel)</label>
        <input
          type="text"
          value={naam}
          onChange={(e) => saveNaam(e.target.value)}
          placeholder="Jan de Groot"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
        />
      </div>

      {itemType === 'offerte' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bericht (optioneel)</label>
          <textarea
            value={bericht}
            onChange={(e) => setBericht(e.target.value)}
            placeholder="Optioneel bericht..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent resize-none"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleSubmit('goedkeuring')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: primaire_kleur }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {itemType === 'offerte' ? 'Offerte goedkeuren' : 'Goedkeuren'}
        </button>
        {itemType === 'tekening' && (
          <button
            onClick={() => setModus('revisie')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Revisie vragen
          </button>
        )}
      </div>
    </div>
  )
}
