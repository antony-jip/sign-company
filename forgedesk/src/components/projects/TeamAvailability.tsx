import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { User, Mail } from 'lucide-react'

interface TeamAvailabilityProps {
  teamLeden: string[]
}

// Simulated role assignments for display purposes
const rolToewijzingen: Record<string, string> = {
  Jan: 'Projectleider',
  Sophie: 'Designer',
  Marco: 'Technisch tekenaar',
  'Jan de Vries': 'Klant',
  'Lisa Bakker': 'Klant',
  'Peter van Dijk': 'Klant',
  'Maria Jansen': 'Klant',
  'Thomas Smit': 'Klant',
  'Anna de Groot': 'Klant',
}

const avatarKleuren = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  'bg-wm-pale/30 text-accent dark:bg-accent/30/50 dark:text-wm-pale',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  'bg-wm-pale/30 text-accent dark:bg-accent/30 dark:text-primary',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
]

export function TeamAvailability({ teamLeden }: TeamAvailabilityProps) {
  if (teamLeden.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-base font-medium">Nog geen teamleden</p>
        <p className="text-sm mt-1">Er zijn nog geen teamleden toegewezen aan dit project.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {teamLeden.map((lid, index) => {
        const kleur = avatarKleuren[index % avatarKleuren.length]
        const rol = rolToewijzingen[lid] || 'Teamlid'
        const initials = getInitials(lid)

        return (
          <Card
            key={lid}
            className="hover:shadow-md transition-shadow duration-200 border-black/[0.06] rounded-xl"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className={`${kleur} text-sm font-semibold`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm text-foreground truncate">{lid}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{rol}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {lid.toLowerCase().replace(/\s+/g, '.')}@signcompany.nl
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
