import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Calendar, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleHeader } from '@/components/shared/ModuleHeader'
import { CalendarLayout } from '@/components/planning/CalendarLayout'
import { MontagePlanningLayout } from '@/components/planning/MontagePlanningLayout'

type PlanningModus = 'kalender' | 'montage'

export function PlanningLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modus: PlanningModus = searchParams.get('modus') === 'montage' ? 'montage' : 'kalender'

  const setModus = (m: PlanningModus) => {
    if (m === 'kalender') {
      setSearchParams({})
    } else {
      setSearchParams({ modus: m })
    }
  }

  return (
    <div className="h-full flex flex-col mod-strip mod-strip-planning">
      <ModuleHeader
        module="planning"
        icon={Calendar}
        title="Planning"
        subtitle="Kalender en montageplanning"
        actions={
          <div className="inline-flex rounded-xl border border-black/[0.06] bg-muted p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 rounded-lg px-3 h-8 text-xs font-medium transition-all',
                modus === 'kalender'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setModus('kalender')}
            >
              <Calendar className="w-3.5 h-3.5" />
              Kalender
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2 rounded-lg px-3 h-8 text-xs font-medium transition-all',
                modus === 'montage'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setModus('montage')}
            >
              <Wrench className="w-3.5 h-3.5" />
              Montage
            </Button>
          </div>
        }
      />

      {/* Content */}
      <div className="flex-1 min-h-0">
        {modus === 'kalender' ? <CalendarLayout /> : <MontagePlanningLayout />}
      </div>
    </div>
  )
}
