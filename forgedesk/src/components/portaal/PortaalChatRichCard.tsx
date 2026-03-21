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
import { getStatusBadgeClass } from '@/utils/statusColors'
import type { PortaalItem, PortaalReactie } from '@/types'

interface PortaalChatRichCardProps {
  item: PortaalItem
  isPublic: boolean
  onApprove?: (itemId: string) => void
  onRevisie?: (itemId: string) => void
  onImageClick?: (url: string) => void
  instellingen?: Record<string, unknown>
}

const STATUS_LABELS: Record<string, string> = {
  verstuurd: 'Verstuurd',
  bekeken: 'Bekeken',
  goedgekeurd: 'Goedgekeurd',
  revisie: 'Revisie gevraagd',
  betaald: 'Betaald',
  vervangen: 'Vervangen',
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  offerte: FileText,
  tekening: Image,
  factuur: Receipt,
  bericht: MessageSquare,
}

const REACTION_COLORS: Record<string, string> = {
  goedkeuring: 'bg-[#E4F0EA] text-[#2D6B48] border-[#C0DBCC]',
  revisie: 'bg-[#FDE8E2] text-[#C03A18] border-[#F5C4B4]',
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

// Check if item has been approved or revisied
function getApprovalIndicator(item: PortaalItem): { type: 'goedgekeurd' | 'revisie'; naam: string } | null {
  if (item.status === 'goedgekeurd') {
    const r = item.reacties?.find(r => r.type === 'goedkeuring')
    return { type: 'goedgekeurd', naam: r?.klant_naam || 'Klant' }
  }
  if (item.status === 'revisie') {
    const r = item.reacties?.find(r => r.type === 'revisie')
    return { type: 'revisie', naam: r?.klant_naam || 'Klant' }
  }
  return null
}

export function PortaalChatRichCard({
  item,
  isPublic,
  onApprove,
  onRevisie,
  onImageClick,
  instellingen,
}: PortaalChatRichCardProps) {
  const TypeIcon = TYPE_ICONS[item.type] || FileText
  const statusLabel = STATUS_LABELS[item.status] || item.status
  const badgeClass = getStatusBadgeClass(item.status)
  const approval = getApprovalIndicator(item)

  const images = item.bestanden.filter((b) => isImageFile(b.mime_type, b.bestandsnaam))
  const files = item.bestanden.filter((b) => !isImageFile(b.mime_type, b.bestandsnaam))

  // Determine if approve/revise buttons should show
  const canApproveOfferte = isPublic && item.type === 'offerte' && item.status !== 'goedgekeurd' && item.status !== 'revisie' && instellingen?.klant_kan_offerte_goedkeuren !== false
  const canApproveTekening = isPublic && item.type === 'tekening' && item.status !== 'goedgekeurd' && item.status !== 'revisie' && instellingen?.klant_kan_tekening_goedkeuren !== false

  // Foto bericht type — inline image
  if (item.bericht_type === 'foto') {
    const afzender = item.afzender || 'bedrijf'
    const isOwn = isPublic ? afzender === 'klant' : afzender === 'bedrijf'
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[300px] md:max-w-[300px] max-[768px]:max-w-full">
          {item.foto_url && (
            <img
              src={item.foto_url}
              alt={item.titel}
              className="cursor-pointer rounded-lg"
              onClick={() => onImageClick?.(item.foto_url!)}
            />
          )}
          {item.bericht_tekst && (
            <p className="mt-1 text-sm whitespace-pre-wrap">{item.bericht_tekst}</p>
          )}
          <div className="mt-1 text-right">
            <span className="text-xs text-muted-foreground">{formatTime(item.created_at)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border bg-white p-4">
        {/* Header row: icon + title + status badge */}
        <div className="flex items-start gap-3">
          {/* Icon in sage circle */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F2EC]">
            <TypeIcon className="h-5 w-5 text-[#4a7c5f]" />
          </div>

          {/* Title + number + amount */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-medium">{item.titel}</h4>
              {item.label && (
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.label}</span>
              )}
            </div>
            {item.bedrag != null && (
              <p className="font-mono text-base font-semibold">{formatCurrency(item.bedrag)}</p>
            )}
            {item.omschrijving && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.omschrijving}</p>
            )}
          </div>

          {/* Status badge */}
          <span className={`badge shrink-0 ${badgeClass}`}>{statusLabel}</span>
        </div>

        {/* Images (tekening) */}
        {images.length > 0 && (
          <div className="mt-3">
            {images.slice(0, 1).map((img) => (
              <img
                key={img.id}
                src={img.thumbnail_url || img.url}
                alt={img.bestandsnaam}
                className="max-h-[200px] cursor-pointer rounded-lg object-cover"
                onClick={() => onImageClick?.(img.url)}
              />
            ))}
          </div>
        )}

        {/* Files (PDF/documents) */}
        {files.length > 0 && (
          <div className="mt-3 space-y-1">
            {files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs hover:bg-gray-100"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{f.bestandsnaam}</span>
                {f.grootte && (
                  <span className="shrink-0 text-muted-foreground">
                    {(f.grootte / 1024).toFixed(0)} KB
                  </span>
                )}
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        )}

        {/* Approval indicator */}
        {approval && (
          <div className={`mt-3 flex items-center gap-1.5 text-xs ${approval.type === 'goedgekeurd' ? 'text-[#2D6B48]' : 'text-[#C03A18]'}`}>
            {approval.type === 'goedgekeurd' ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Goedgekeurd door {approval.naam}</>
            ) : (
              <><RotateCcw className="h-3.5 w-3.5" /> Revisie gevraagd door {approval.naam}</>
            )}
          </div>
        )}

        {/* Action buttons — compact text links */}
        <div className="mt-3 flex items-center gap-4">
          {/* Public: Approve/Revise for offerte */}
          {canApproveOfferte && (
            <>
              <button
                type="button"
                onClick={() => onApprove?.(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-[#2D6B48] hover:text-[#2D6B48]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Goedkeuren
              </button>
              <button
                type="button"
                onClick={() => onRevisie?.(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-[#C03A18] hover:text-[#C03A18]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revisie vragen
              </button>
            </>
          )}

          {/* Public: Approve/Revise for tekening */}
          {canApproveTekening && (
            <>
              <button
                type="button"
                onClick={() => onApprove?.(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-[#2D6B48] hover:text-[#2D6B48]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Goedkeuren
              </button>
              <button
                type="button"
                onClick={() => onRevisie?.(item.id)}
                className="flex items-center gap-1 text-xs font-medium text-[#C03A18] hover:text-[#C03A18]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Revisie vragen
              </button>
            </>
          )}

          {/* Public: Pay for factuur */}
          {isPublic && item.type === 'factuur' && item.mollie_payment_url && item.status !== 'betaald' && (
            <a
              href={item.mollie_payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-medium text-[#2D6B48] hover:text-[#2D6B48]"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Betalen
            </a>
          )}

          {/* Internal: View/Edit */}
          {!isPublic && (
            <>
              <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Eye className="h-3.5 w-3.5" />
                Bekijk
              </button>
            </>
          )}

          {/* Timestamp right-aligned */}
          <span className="ml-auto text-xs text-muted-foreground">{formatTime(item.created_at)}</span>
        </div>
      </div>

      {/* Reactions below the card */}
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
