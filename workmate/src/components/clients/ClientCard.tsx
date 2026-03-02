import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface ClientCardProps {
  key?: React.Key
  klant: Klant
  projectCount: number
  onEdit?: (klant: Klant) => void
  onDelete?: (id: string) => void
}

export function ClientCard({ klant, projectCount, onEdit, onDelete }: ClientCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 group"
      onClick={() => navigate(`/klanten/${klant.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                {klant.bedrijfsnaam}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
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
                  className={`w-2.5 h-2.5 rounded-full ${dotColors[label] || 'bg-gray-400'}`}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/klanten/${klant.id}`) }}>
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
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="truncate">{klant.email}</span>
          </div>
          {klant.telefoon && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Phone className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              <span>{klant.telefoon}</span>
            </div>
          )}
          {klant.stad && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
              <span>{klant.stad}</span>
            </div>
          )}
        </div>

        {/* Tags and project count */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap gap-1.5">
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
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
            <FolderKanban className="w-4 h-4" />
            <span className="font-medium">{projectCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
