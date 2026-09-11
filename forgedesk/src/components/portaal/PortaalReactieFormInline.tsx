import { useState, useRef } from 'react'
import { Loader2, Camera, X } from 'lucide-react'
import { invoerVeld, knopPetrol, tekstLink } from '@/components/klantpagina/Klantstijl'

interface PortaalReactieFormInlineProps {
  token: string
  itemId: string
  itemTitel: string
  klantNaam: string
  kanFotoToevoegen?: boolean
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
  kanFotoToevoegen = true,
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
    <div className="ml-4 space-y-3 rounded-xl bg-[#FFFFFF] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] md:ml-6">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-medium text-[#6B6B66]">Uw reactie op {itemTitel}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#9B9B95] transition-colors hover:bg-[#F8F7F5]"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" />
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
        placeholder="Typ uw reactie"
        aria-label={`Uw reactie op ${itemTitel}`}
        rows={2}
        className={`${invoerVeld} resize-none`}
        style={{ minHeight: 72 }}
        autoFocus
      />

      {fotoPreview && (
        <div className="relative inline-block">
          <img
            src={fotoPreview}
            alt="Voorbeeld van de foto"
            className="h-20 w-20 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={removeFoto}
            aria-label="Foto verwijderen"
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A1A1A] text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-[#C0451A]">{error}</p>}

      <div className="flex items-center gap-3">
        {kanFotoToevoegen && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={tekstLink}
            >
              <Camera className="h-4 w-4" />
              Foto toevoegen
            </button>
            {/* Geen capture-attribuut: dat forceert op veel telefoons de camera
                en blokkeert kiezen uit de galerij */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFotoSelect(file)
                e.target.value = ''
              }}
            />
          </>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || (!bericht.trim() && !foto)}
          className={knopPetrol}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Versturen
        </button>
      </div>
    </div>
  )
}
