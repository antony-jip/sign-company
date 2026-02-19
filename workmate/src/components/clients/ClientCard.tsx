import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, MapPin, Building2, FolderKanban } from 'lucide-react'
import { cn, getStatusColor } from '@/lib/utils'
import type { Klant } from '@/types'

interface ClientCardProps {
  key?: React.Key
  klant: Klant
  projectCount: number
}

export function ClientCard({ klant, projectCount }: ClientCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800"
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
          <Badge className={cn('flex-shrink-0 capitalize', getStatusColor(klant.status))}>
            {klant.status}
          </Badge>
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
