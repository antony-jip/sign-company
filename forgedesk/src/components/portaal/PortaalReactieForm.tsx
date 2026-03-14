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
        let errorMessage = `Upload mislukt: ${file.name}`
        try {
          const text = await response.text()
          const parsed = JSON.parse(text)
          errorMessage = parsed.error || errorMessage
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage)
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
        let errorMessage = 'Kon reactie niet versturen'
        try {
          const text = await response.text()
          const parsed = JSON.parse(text)
          errorMessage = parsed.error || errorMessage
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage)
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
      <div className="border-t border-[#E8E8E3] px-6 py-4">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={bericht}
              onChange={(e) => {
                setBericht(e.target.value)
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
              className="w-full px-4 py-2.5 border border-[#E8E8E3] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-2 focus:border-transparent resize-none bg-[#FAFAF7]"
              style={{ '--tw-ring-color': primaire_kleur, minHeight: '40px' } as React.CSSProperties}
            />
          </div>
          <button
            onClick={() => { if (bericht.trim()) handleSubmit('bericht') }}
            disabled={loading || !bericht.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 shadow-sm hover:shadow-md"
            style={{ backgroundColor: primaire_kleur }}
            title="Versturen"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {!naam && (
          <div className="mt-2">
            <input
              type="text"
              value={naam}
              onChange={(e) => saveNaam(e.target.value)}
              placeholder="Uw naam (optioneel)"
              className="w-full px-4 py-2 border border-[#E8E8E3] rounded-xl text-xs text-[#5A5A55] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-1 focus:border-transparent bg-[#FAFAF7]"
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
      <div className="border-t border-[#E8E8E3] px-6 py-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#5A5A55] uppercase tracking-wide mb-1.5">Uw naam (optioneel)</label>
          <input
            type="text"
            value={naam}
            onChange={(e) => saveNaam(e.target.value)}
            placeholder="Jan de Groot"
            className="w-full px-4 py-2.5 border border-[#E8E8E3] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-2 focus:border-transparent bg-[#FAFAF7]"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5A5A55] uppercase tracking-wide mb-1.5">
            Wat moet er anders? <span className="text-[#D4856B]">*</span>
          </label>
          <textarea
            value={bericht}
            onChange={(e) => setBericht(e.target.value)}
            placeholder="Beschrijf wat u graag anders ziet..."
            rows={3}
            className="w-full px-4 py-2.5 border border-[#E8E8E3] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-2 focus:border-transparent resize-none bg-[#FAFAF7]"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
            required
          />
        </div>

        {/* Bestanden toevoegen */}
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm text-[#5A5A55] hover:text-[#1A1A1A] transition-colors"
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
          <p className="text-[11px] text-[#C0C0BA] mt-0.5">Max {MAX_FILES} bestanden, 10MB per stuk (JPG, PNG, PDF)</p>
        </div>

        {/* Geselecteerde bestanden */}
        {files.length > 0 && (
          <div className="space-y-1.5">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#FAFAF7] rounded-xl px-4 py-2 border border-[#E8E8E3]">
                <FileText className="w-3.5 h-3.5 text-[#8A8A85] flex-shrink-0" />
                <span className="text-xs text-[#333330] truncate flex-1">{file.name}</span>
                <span className="text-[10px] text-[#C0C0BA]">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={() => removeFile(i)} className="text-[#C0C0BA] hover:text-[#D4856B] transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drag & drop zone */}
        <div
          className="border-2 border-dashed border-[#E8E8E3] rounded-xl p-4 text-center transition-colors"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#C0C0BA]', 'bg-[#FAFAF7]') }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('border-[#C0C0BA]', 'bg-[#FAFAF7]') }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('border-[#C0C0BA]', 'bg-[#FAFAF7]')
            if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
          }}
        >
          <p className="text-xs text-[#C0C0BA]">Sleep bestanden hierheen</p>
        </div>

        {error && <p className="text-sm text-[#D4856B]">{error}</p>}

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit('revisie')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm hover:shadow-md bg-[#D4856B] hover:bg-[#C47860]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Revisie versturen
          </button>
          <button
            onClick={() => { setModus('idle'); setError('') }}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm text-[#5A5A55] hover:bg-[#F2F2ED] transition-colors"
          >
            Annuleren
          </button>
        </div>
      </div>
    )
  }

  // Idle modus — toon goedkeuren / revisie knoppen
  return (
    <div className="border-t border-[#E8E8E3] px-6 py-5 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#5A5A55] uppercase tracking-wide mb-1.5">Uw naam (optioneel)</label>
        <input
          type="text"
          value={naam}
          onChange={(e) => saveNaam(e.target.value)}
          placeholder="Jan de Groot"
          className="w-full px-4 py-2.5 border border-[#E8E8E3] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-2 focus:border-transparent bg-[#FAFAF7]"
          style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
        />
      </div>

      {itemType === 'offerte' && (
        <div>
          <label className="block text-xs font-semibold text-[#5A5A55] uppercase tracking-wide mb-1.5">Bericht (optioneel)</label>
          <textarea
            value={bericht}
            onChange={(e) => setBericht(e.target.value)}
            placeholder="Optioneel bericht..."
            rows={2}
            className="w-full px-4 py-2.5 border border-[#E8E8E3] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#C0C0BA] focus:outline-none focus:ring-2 focus:border-transparent resize-none bg-[#FAFAF7]"
            style={{ '--tw-ring-color': primaire_kleur } as React.CSSProperties}
          />
        </div>
      )}

      {error && <p className="text-sm text-[#D4856B]">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleSubmit('goedkeuring')}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
          style={{ backgroundColor: primaire_kleur }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {itemType === 'offerte' ? 'Offerte goedkeuren' : 'Goedkeuren'}
        </button>
        {itemType === 'tekening' && (
          <button
            onClick={() => setModus('revisie')}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#D4856B] bg-[#FAE8E0] hover:bg-[#F5D5C8] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Revisie vragen
          </button>
        )}
      </div>
    </div>
  )
}
