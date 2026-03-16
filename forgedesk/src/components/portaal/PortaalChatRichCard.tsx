import {
  FileText,
  Image,
  Receipt,
  MessageSquare,
  CheckCircle2,
  Eye,
  Clock,
  RotateCcw,
  CreditCard,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PortaalItem, PortaalReactie } from '@/types'

interface PortaalChatRichCardProps {
  item: PortaalItem
  isPublic: boolean
  onApprove?: (itemId: string) => void
  onRevisie?: (itemId: string) => void
  onImageClick?: (url: string) => void
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Eye }> = {
  verstuurd: { label: 'Verstuurd', color: 'bg-blue-50 text-blue-700', icon: Clock },
  bekeken: { label: 'Bekeken', color: 'bg-gray-100 text-gray-700', icon: Eye },
  goedgekeurd: { label: 'Goedgekeurd', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  revisie: { label: 'Revisie gevraagd', color: 'bg-amber-50 text-amber-700', icon: RotateCcw },
  betaald: { label: 'Betaald', color: 'bg-green-50 text-green-700', icon: CreditCard },
  vervangen: { label: 'Vervangen', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  offerte: FileText,
  tekening: Image,
  factuur: Receipt,
  bericht: MessageSquare,
}

const REACTION_COLORS: Record<string, string> = {
  goedkeuring: 'bg-green-50 text-green-700 border-green-200',
  revisie: 'bg-amber-50 text-amber-700 border-amber-200',
  bericht: 'bg-gray-50 text-gray-700 border-gray-200',
}

const REACTION_ICONS: Record<string, typeof CheckCircle2> = {
  goedkeuring: CheckCircle2,
  revisie: RotateCcw,
  bericht: MessageSquare,
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function isImageFile(mimeType?: string, filename?: string): boolean {
  if (mimeType?.startsWith('image/')) return true
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')
  }
  return false
}

function ReactionBubble({ reactie }: { reactie: PortaalReactie }) {
  const Icon = REACTION_ICONS[reactie.type] || MessageSquare
  const colorClass = REACTION_COLORS[reactie.type] || REACTION_COLORS.bericht

  return (
    <div className={`inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${colorClass}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>
        {reactie.bericht && <p className="whitespace-pre-wrap">{reactie.bericht}</p>}
        <div className="mt-1 flex items-center gap-1 opacity-70">
          {reactie.klant_naam && <span>{reactie.klant_naam}</span>}
          <span>&middot;</span>
          <span>{formatTime(reactie.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

export function PortaalChatRichCard({
  item,
  isPublic,
  onApprove,
  onRevisie,
  onImageClick,
}: PortaalChatRichCardProps) {
  const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.verstuurd
  const StatusIcon = statusConfig.icon
  const TypeIcon = TYPE_ICONS[item.type] || FileText

  const images = item.bestanden.filter((b) => isImageFile(b.mime_type, b.bestandsnaam))
  const files = item.bestanden.filter((b) => !isImageFile(b.mime_type, b.bestandsnaam))

  // Foto bericht type
  if (item.bericht_type === 'foto') {
    return (
      <div className="mx-auto max-w-md">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {item.foto_url && (
            <img
              src={item.foto_url}
              alt={item.titel}
              className="max-w-[300px] cursor-pointer rounded"
              onClick={() => onImageClick?.(item.foto_url!)}
            />
          )}
          {item.bericht_tekst && (
            <div className="px-3 py-2">
              <p className="text-sm">{item.bericht_tekst}</p>
            </div>
          )}
          <div className="px-3 pb-2 text-right">
            <span className="text-xs text-muted-foreground">{formatTime(item.created_at)}</span>
          </div>
        </div>

        {item.reacties && item.reacties.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {item.reacties.map((r) => (
              <ReactionBubble key={r.id} reactie={r} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <TypeIcon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">{item.titel}</span>
          <Badge className={statusConfig.color}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Content area */}
        <div className="px-4 py-3">
          {/* Offerte */}
          {item.type === 'offerte' && (
            <div className="space-y-2">
              {item.bedrag != null && (
                <p className="font-mono text-lg font-semibold">{formatCurrency(item.bedrag)}</p>
              )}
              {item.omschrijving && (
                <p className="text-sm text-muted-foreground">{item.omschrijving}</p>
              )}
              {isPublic && item.status !== 'goedgekeurd' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onApprove?.(item.id)}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Goedkeuren
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-1.5 h-4 w-4" />
                    Bekijk
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tekening */}
          {item.type === 'tekening' && (
            <div className="space-y-2">
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.slice(0, 1).map((img) => (
                    <img
                      key={img.id}
                      src={img.thumbnail_url || img.url}
                      alt={img.bestandsnaam}
                      className="max-h-48 w-full cursor-pointer rounded object-cover"
                      onClick={() => onImageClick?.(img.url)}
                    />
                  ))}
                </div>
              )}
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded bg-muted px-2 py-1.5 text-xs hover:bg-muted/80"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="truncate">{f.bestandsnaam}</span>
                      <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
              {isPublic && item.status !== 'goedgekeurd' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onApprove?.(item.id)}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Goedkeuren
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onRevisie?.(item.id)}>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Revisie vragen
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Factuur */}
          {item.type === 'factuur' && (
            <div className="space-y-2">
              {item.bedrag != null && (
                <p className="font-mono text-lg font-semibold">{formatCurrency(item.bedrag)}</p>
              )}
              {item.mollie_payment_url && isPublic && item.status !== 'betaald' && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    asChild
                  >
                    <a href={item.mollie_payment_url} target="_blank" rel="noopener noreferrer">
                      <CreditCard className="mr-1.5 h-4 w-4" />
                      Betalen
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Bericht (non-foto, already handled by early return) */}
          {item.type === 'bericht' && (
            <div>
              {item.bericht_tekst && (
                <p className="text-sm whitespace-pre-wrap">{item.bericht_tekst}</p>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="px-4 pb-2 text-right">
          <span className="text-xs text-muted-foreground">{formatTime(item.created_at)}</span>
        </div>
      </div>

      {/* Reactions */}
      {item.reacties && item.reacties.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {item.reacties.map((r) => (
            <ReactionBubble key={r.id} reactie={r} />
          ))}
        </div>
      )}
    </div>
  )
}
