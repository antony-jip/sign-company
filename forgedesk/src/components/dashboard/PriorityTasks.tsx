import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListTodo, CheckCircle2, Loader2 } from 'lucide-react'
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils'
import { useDashboardData } from '@/contexts/DashboardDataContext'

const priorityOrder: Record<string, number> = {
  kritiek: 0,
  hoog: 1,
  medium: 2,
  laag: 3,
}

export function PriorityTasks() {
  const navigate = useNavigate()
  const { taken, projecten, klanten, isLoading: loading } = useDashboardData()

  const topTasks = useMemo(() => {
    const projectMap = new Map(
      projecten.map((p) => [p.id, p.naam])
    )
    const klantMap = new Map(
      klanten.map((k) => [k.id, k.bedrijfsnaam])
    )

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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl text-white" style={{ backgroundColor: '#1A535C' }}>
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[14px] font-bold leading-tight">Prioritaire Taken</span>
            {!loading && topTasks.length > 0 && (
              <p className="text-[11px] text-muted-foreground font-mono font-normal">{topTasks.length} openstaand</p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : topTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground/70">Nog geen openstaande taken</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Alle taken zijn afgerond.</p>
          </div>
        ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_140px_100px_90px] gap-3 px-3 py-2 text-xs font-bold text-text-tertiary uppercase tracking-label border-b border-border/50">
            <span>Prioriteit</span>
            <span>Taak</span>
            <span>Project</span>
            <span>Deadline</span>
            <span>Status</span>
          </div>

          {/* Task rows */}
          {topTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => navigate(task.project_id ? `/projecten/${task.project_id}` : '/taken')}
              className="grid grid-cols-[80px_1fr_140px_100px_90px] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-150 cursor-pointer group"
            >
              <div>
                <Badge
                  className={`${getPriorityColor(task.prioriteit)} text-xs capitalize`}
                >
                  {task.prioriteit}
                </Badge>
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {task.titel}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-sm text-muted-foreground truncate">
                  {task.projectNaam}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatDate(task.deadline ?? "")}
                </p>
              </div>

              <div>
                <Badge
                  className={`${getStatusColor(task.status)} text-xs capitalize`}
                >
                  {task.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
