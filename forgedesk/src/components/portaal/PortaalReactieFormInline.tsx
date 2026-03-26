import { useState, useRef } from 'react'
import { Loader2, Camera, X } from 'lucide-react'

interface PortaalReactieFormInlineProps {
  token: string
  itemId: string
  itemTitel: string
  klantNaam: string
  onClose: () => void
  onReactie: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PortaalReactieFormInline({
  token,
  itemId,
  itemTitel,
  klantNaam,
  onClose,
  onReactie,
}: PortaalReactieFormInlineProps) {
  const [bericht, setBericht] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleFotoSelect(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setError('Bestand te groot (max 10MB)')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Alleen afbeeldingen toegestaan')
      return
    }
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
    setError('')
  }

  function removeFoto() {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFoto(null)
    setFotoPreview(null)
  }

  async function handleSubmit() {
    if (!bericht.trim() && !foto) return
    setLoading(true)
    setError('')

    try {
      let fotoUrl: string | undefined

      // Upload foto first if present
      if (foto) {
        const base64 = await fileToBase64(foto)
        const uploadResp = await fetch('/api/portaal-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            portaal_item_id: itemId,
            bestandsnaam: foto.name,
            mime_type: foto.type,
            data: base64,
          }),
        })
        if (!uploadResp.ok) {
          const err = await uploadResp.json()
          throw new Error(err.error || 'Foto upload mislukt')
        }
        const uploadResult = await uploadResp.json()
        fotoUrl = uploadResult.url
      }

      // Submit reaction
      const response = await fetch('/api/portaal-reactie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          portaal_item_id: itemId,
          type: 'bericht',
          bericht: bericht.trim() || undefined,
          klant_naam: klantNaam || undefined,
          foto_url: fotoUrl,
          bestanden: fotoUrl ? [fotoUrl] : undefined,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Reactie versturen mislukt')
      }

      onReactie()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="ml-6 rounded-lg p-4 space-y-3"
      style={{ backgroundColor: '#FAF9F7', border: '0.5px solid #E8E6E1' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium" style={{ color: '#5A5A55' }}>
          Uw reactie op: {itemTitel}
        </p>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200/50 transition-colors"
          aria-label="Sluiten"
        >
          <X className="w-3.5 h-3.5" style={{ color: '#A0A098' }} />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={bericht}
        onChange={(e) => {
          setBericht(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && bericht.trim()) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Typ uw reactie..."
        rows={2}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A535C]/30 focus:border-[#1A535C] resize-none"
        style={{ borderColor: '#E8E6E1', minHeight: 60 }}
        autoFocus
      />

      {/* Foto preview */}
      {fotoPreview && (
        <div className="relative inline-block">
          <img
            src={fotoPreview}
            alt="Preview"
            className="w-20 h-20 object-cover rounded-lg border"
            style={{ borderColor: '#E8E6E1' }}
          />
          <button
            onClick={removeFoto}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-100"
          style={{ color: '#5A5A55' }}
        >
          <Camera className="w-4 h-4" />
          Foto toevoegen
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFotoSelect(file)
            e.target.value = ''
          }}
        />
        <div className="flex-1" />
        <button
          onClick={handleSubmit}
          disabled={loading || (!bericht.trim() && !foto)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90"
          style={{ backgroundColor: '#1A535C' }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Verstuur
        </button>
      </div>
    </div>
  )
}
