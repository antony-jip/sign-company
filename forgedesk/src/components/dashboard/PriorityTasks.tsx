import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ListTodo, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useDashboardData } from '@/contexts/DashboardDataContext'

const priorityOrder: Record<string, number> = {
  kritiek: 0,
  hoog: 1,
  medium: 2,
  laag: 3,
}

const PRIORITY_BAR: Record<string, string> = {
  kritiek: 'bg-[#F15025]',
  hoog: 'bg-[#C44830]',
  medium: 'bg-[#1A535C]/50',
  laag: 'bg-[#888780]',
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Open',
  bezig: 'Bezig',
  review: 'Review',
}

export function PriorityTasks() {
  const navigate = useNavigate()
  const { taken, projecten, klanten, isLoading: loading } = useDashboardData()

  const topTasks = useMemo(() => {
    const projectMap = new Map(projecten.map((p) => [p.id, p.naam]))
    const klantMap = new Map(klanten.map((k) => [k.id, k.bedrijfsnaam]))

    return [...taken]
      .filter((t) => t.status !== 'klaar')
      .sort(
        (a, b) =>
          (priorityOrder[a.prioriteit] ?? 99) -
          (priorityOrder[b.prioriteit] ?? 99)
      )
      .slice(0, 5)
      .map((task) => {
        let contextLabel: string
        if (task.project_id) {
          contextLabel = projectMap.get(task.project_id) ?? 'Onbekend project'
        } else if (task.klant_id) {
          contextLabel = klantMap.get(task.klant_id) ?? 'Losse taak'
        } else {
          contextLabel = 'Intern'
        }
        return { ...task, projectNaam: contextLabel }
      })
  }, [taken, projecten, klanten])

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl text-white" style={{ backgroundColor: '#5A5A55' }}>
              <ListTodo className="h-4 w-4" />
            </div>
            <h3 className="text-[14px] font-bold text-foreground">Prioritaire taken</h3>
          </div>
          <span
            onClick={() => navigate('/taken')}
            className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground cursor-pointer hover:text-[#1A535C] transition-colors"
          >
            Alles →
          </span>
        </div>
        {loading ? (
          <div className="rounded-xl bg-[#5A5A55]/[0.04] p-2 space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-3 px-2 ${i > 0 ? 'border-t border-border/40' : ''}`}
              >
                <Skeleton className="w-1 h-9 rounded-sm flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-12 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : topTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground/70">
              Geen prioritaire taken vandaag<span className="text-[#F15025]">.</span>
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {topTasks.map((task, idx) => {
              const statusLabel = STATUS_LABELS[task.status] ?? task.status
              const deadline = task.deadline ? formatDate(task.deadline) : null
              return (
                <div
                  key={task.id}
                  onClick={() => navigate(task.project_id ? `/projecten/${task.project_id}` : '/taken')}
                  className={`flex items-center gap-3 py-3 cursor-pointer hover:bg-bg-hover -mx-2 px-2 rounded-lg transition-all duration-150 ${
                    idx > 0 ? 'border-t border-border/50' : ''
                  }`}
                >
                  <div className={`w-1 h-9 rounded-sm flex-shrink-0 ${PRIORITY_BAR[task.prioriteit] ?? 'bg-border'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{task.titel}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
                      {task.projectNaam}
                      {deadline && (
                        <>
                          {' · '}
                          <span className="font-mono">{deadline}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    {statusLabel}<span style={{ color: '#F15025' }}>.</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
