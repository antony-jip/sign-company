import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigateWithTab } from '@/hooks/useNavigateWithTab'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  FolderKanban,
  Pin,
  MoreHorizontal,
  Eye,
  Pencil,
  FolderPlus,
  FileText,
  Receipt,
  Trash2,
} from 'lucide-react'
import { cn, getStatusColor } from '@/lib/utils'
import type { Klant } from '@/types'
import { klantStatusConfig } from '@/types'

interface ClientCardProps {
  key?: React.Key
  klant: Klant
  projectCount: number
  onEdit?: (klant: Klant) => void
  onDelete?: (id: string) => void
  selected?: boolean
  onToggleSelect?: () => void
}

export function ClientCard({ klant, projectCount, onEdit, onDelete, selected, onToggleSelect }: ClientCardProps) {
  const navigate = useNavigate()
  const { navigateWithTab } = useNavigateWithTab()

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 rounded-xl border-black/[0.06] hover:shadow-lg hover:border-[#8BAFD4]/40 dark:hover:border-[#8BAFD4]/30 group",
        selected && "ring-2 ring-primary border-primary/30"
      )}
      onClick={() => navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || klant.voornaam || 'Klant', id: `/klanten/${klant.id}` })}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {onToggleSelect ? (
              <div
                className="flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={onToggleSelect}
                  aria-label={`Selecteer ${klant.bedrijfsnaam}`}
                />
              </div>
            ) : null}
            <div className="w-10 h-10 rounded-lg bg-[#8BAFD4]/15 dark:bg-[#8BAFD4]/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-[#8BAFD4] dark:text-[#8BAFD4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-foreground dark:text-white truncate">
                  {klant.bedrijfsnaam}
                </h3>
                {klant.klant_status && klant.klant_status !== 'normaal' && (() => {
                  const cfg = klantStatusConfig[klant.klant_status]
                  if (!cfg) return null
                  return (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold whitespace-nowrap"
                      style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                    >
                      {(klant.klant_status === 'niet_helpen' || klant.klant_status === 'geblokkeerd') && '⚠ '}
                      {cfg.label}
                    </span>
                  )
                })()}
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground/60 truncate">
                {klant.contactpersoon}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Klant label dots */}
            {(klant.klant_labels || []).map((label) => {
              const dotColors: Record<string, string> = {
                vooruit_betalen: 'bg-orange-500',
                niet_helpen: 'bg-red-500',
                voorrang: 'bg-green-500',
                grote_klant: 'bg-blue-500',
                wanbetaler: 'bg-red-500',
              }
              const labelNames: Record<string, string> = {
                vooruit_betalen: 'Vooruit betalen',
                niet_helpen: 'Niet helpen',
                voorrang: 'Voorrang',
                grote_klant: 'Grote klant',
                wanbetaler: 'Wanbetaler',
              }
              return (
                <span
                  key={label}
                  className={`w-2.5 h-2.5 rounded-full ${dotColors[label] || 'bg-muted-foreground/40'}`}
                  title={labelNames[label] || label}
                />
              )
            })}
            {klant.gepinde_notitie && (
              <span title={klant.gepinde_notitie}><Pin className="w-3.5 h-3.5 text-amber-500" /></span>
            )}
            <Badge className={cn('capitalize', getStatusColor(klant.status))}>
              {klant.status}
            </Badge>

            {/* Action menu */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigateWithTab({ path: `/klanten/${klant.id}`, label: klant.bedrijfsnaam || klant.voornaam || 'Klant', id: `/klanten/${klant.id}` }) }}>
                  <Eye className="w-3.5 h-3.5 mr-2" />
                  Bekijken
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(klant) }}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Bewerken
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/projecten/nieuw?klant_id=${klant.id}`) }}>
                  <FolderPlus className="w-3.5 h-3.5 mr-2" />
                  Project aanmaken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/offertes/nieuw?klant_id=${klant.id}`) }}>
                  <FileText className="w-3.5 h-3.5 mr-2" />
                  Offerte maken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/facturen/nieuw?klant_id=${klant.id}`) }}>
                  <Receipt className="w-3.5 h-3.5 mr-2" />
                  Factuur aanmaken
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${klant.email}` }}>
                  <Mail className="w-3.5 h-3.5 mr-2" />
                  Klant mailen
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(klant.id) }}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Contact details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/60">
            <Mail className="w-4 h-4 flex-shrink-0 text-muted-foreground/60 dark:text-muted-foreground" />
            <span className="truncate">{klant.email}</span>
          </div>
          {klant.telefoon && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/60">
              <Phone className="w-4 h-4 flex-shrink-0 text-muted-foreground/60 dark:text-muted-foreground" />
              <span>{klant.telefoon}</span>
            </div>
          )}
          {klant.stad && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground/60">
              <MapPin className="w-4 h-4 flex-shrink-0 text-muted-foreground/60 dark:text-muted-foreground" />
              <span>{klant.stad}</span>
            </div>
          )}
        </div>

        {/* Tags, labels and project count */}
        <div className="flex items-center justify-between pt-2 border-t border-border dark:border-border">
          <div className="flex flex-wrap gap-1.5">
            {(klant.labels || []).slice(0, 2).map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="text-2xs px-1.5 py-0 font-normal text-muted-foreground"
              >
                {label}
              </Badge>
            ))}
            {klant.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-2 py-0.5 font-normal"
              >
                {tag}
              </Badge>
            ))}
            {klant.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                +{klant.tags.length - 3}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground dark:text-muted-foreground/60 flex-shrink-0 ml-2">
            <FolderKanban className="w-4 h-4" />
            <span className="font-medium font-mono">{projectCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
