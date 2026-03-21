import { Link2, MoreHorizontal, RefreshCw, Power, PowerOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PortaalChatProgressProps {
  items: { status: string }[]
  portaal: {
    actief: boolean
    verloopt_op: string
    token: string
  }
  onCopyLink: () => void
  onVerlengen: () => void
  onDeactiveer: () => void
  onActiveer: () => void
}

export function PortaalChatProgress({
  items,
  portaal,
  onCopyLink,
  onVerlengen,
  onDeactiveer,
  onActiveer,
}: PortaalChatProgressProps) {
  const approved = items.filter((i) => i.status === 'goedgekeurd').length
  const total = items.length
  const pct = total > 0 ? (approved / total) * 100 : 0

  const isActief = portaal.actief && new Date(portaal.verloopt_op) > new Date()
  const isVerlopen = portaal.actief && new Date(portaal.verloopt_op) <= new Date()

  const statusLabel = isActief ? 'Actief' : isVerlopen ? 'Verlopen' : 'Gedeactiveerd'
  const statusClass = isActief
    ? 'bg-[#E2F0F0] text-[#1A535C]'
    : isVerlopen
      ? 'bg-[#FDE8E2] text-[#C03A18]'
      : 'bg-[#EEEEED] text-[#5A5A55]'

  const formattedDate = new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(portaal.verloopt_op))

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-muted-foreground">
          Voortgang: {approved}/{total} goedgekeurd
        </span>
        <div className="h-2 w-24 overflow-hidden rounded-full bg-[#E6E4E0]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundImage: 'linear-gradient(90deg, #F15025 0%, #D4453A 18%, #9A4070 38%, #6A5A8A 50%, #3A6B8C 65%, #2D6B48 80%, #1A535C 100%)',
              backgroundSize: pct > 0 ? `${(100 / pct) * 100}% 100%` : '100% 100%',
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge className={statusClass}>{statusLabel}</Badge>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          Geldig tot {formattedDate}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onCopyLink}>
          <Link2 className="mr-1.5 h-4 w-4" />
          Link kopiëren
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isActief || isVerlopen ? (
              <>
                <DropdownMenuItem onClick={onVerlengen}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verlengen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeactiveer}>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Deactiveren
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={onActiveer}>
                <Power className="mr-2 h-4 w-4" />
                Heractiveren
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
