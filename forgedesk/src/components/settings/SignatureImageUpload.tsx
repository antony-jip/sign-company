import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Trash2, ImageIcon, Link2, X, Minus, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { uploadPubliekeMailAfbeelding, getPubliekeMailUrl } from '@/services/storageService'
import { sanitizeStorageFilename } from '@/utils/storageHelpers'
import { handtekeningBreedte, HANDTEKENING_BREEDTE_MIN, HANDTEKENING_BREEDTE_MAX } from '@/utils/handtekening'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'

/**
 * Uploaden en instellen van de afbeelding onder een handtekening. Stond in
 * EmailTab; staat hier omdat het handtekeningenbeheer hem ook gebruikt.
 */
export function SignatureImageUpload({
  imageUrl,
  imageLink,
  onImageLinkChange,
  onImageChange,
  imageSize,
  onImageSizeChange,
  label = 'Afbeelding in handtekening',
}: {
  imageUrl: string
  onImageChange: (url: string) => void
  imageLink?: string
  onImageLinkChange?: (link: string) => void
  imageSize?: number
  onImageSizeChange?: (size: number) => void
  label?: string
}) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const currentSize = handtekeningBreedte(imageSize)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecteer een afbeelding (PNG, JPG, SVG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Afbeelding mag maximaal 2MB zijn')
      return
    }
    try {
      setIsUploading(true)
      // Upload path must start with user_id for Supabase RLS policies
      const userId = user?.id || 'local'
      const path = `${userId}/handtekeningen/${Date.now()}_${sanitizeStorageFilename(file.name)}`
      // Naar de PUBLIEKE bucket, niet de private: zie de opmerking hieronder.
      await uploadPubliekeMailAfbeelding(file, path)
      // Bewust een blijvende publieke URL: deze afbeelding komt in de
      // e-mailhandtekening en moet laden bij de ontvanger, ook maanden later.
      const url = await getPubliekeMailUrl(path)
      onImageChange(url)
      toast.success('Afbeelding geüpload')
    } catch (err) {
      logger.error('Fout bij uploaden afbeelding:', err)
      toast.error('Kon afbeelding niet uploaden. Controleer of Supabase Storage is geconfigureerd.')
    } finally {
      setIsUploading(false)
      // Reset file input so the same file can be uploaded again
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
        Voeg een bedrijfslogo of profielfoto toe aan de handtekening (max 2MB)
      </p>
      {imageUrl ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="relative border border-border rounded-lg p-2 bg-card">
              <img
                src={imageUrl}
                alt="Handtekening afbeelding"
                style={{ maxWidth: `${currentSize}px`, maxHeight: `${currentSize}px` }}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {isUploading ? 'Uploaden...' : 'Vervangen'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onImageChange('')} className="text-destructive hover:text-destructive">
                <X className="w-3.5 h-3.5 mr-1.5" />
                Verwijderen
              </Button>
            </div>
          </div>
          {onImageLinkChange && (
            <div className="space-y-1.5">
              <Label htmlFor="handtekening-link" className="text-xs">Link achter de afbeelding</Label>
              <Input
                id="handtekening-link"
                type="url"
                inputMode="url"
                value={imageLink ?? ''}
                onChange={(e) => onImageLinkChange(e.target.value)}
                placeholder="https://jouwsite.nl/onze-merken"
              />
              <p className="text-xs text-muted-foreground dark:text-muted-foreground/60">
                Ontvangers komen hier terecht als ze op de afbeelding klikken. Leeg laten = niet klikbaar.
              </p>
            </div>
          )}
          {onImageSizeChange && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Breedte in de mail</Label>
                <span className="text-xs text-muted-foreground">{currentSize}px breed</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="range"
                  min={HANDTEKENING_BREEDTE_MIN}
                  max={HANDTEKENING_BREEDTE_MAX}
                  step={10}
                  value={currentSize}
                  onChange={(e) => onImageSizeChange(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-3 w-full p-4 border-2 border-dashed rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          <div className="p-2 bg-muted rounded-lg">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium">{isUploading ? 'Uploaden...' : 'Afbeelding toevoegen'}</p>
            <p className="text-xs text-muted-foreground">PNG, JPG of SVG · bijv. bedrijfslogo of foto</p>
          </div>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  )
}

