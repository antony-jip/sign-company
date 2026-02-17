import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListTodo, CheckCircle2, Loader2 } from 'lucide-react'
import { getTaken, getProjecten } from '@/services/supabaseService'
import type { Taak, Project } from '@/types'
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils'

const priorityOrder: Record<string, number> = {
  kritiek: 0,
  hoog: 1,
  medium: 2,
  laag: 3,
}

export function PriorityTasks() {
  const navigate = useNavigate()
  const [taken, setTaken] = useState<Taak[]>([])
  const [projecten, setProjecten] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTaken(), getProjecten()])
      .then(([t, p]) => {
        setTaken(t)
        setProjecten(p)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const topTasks = useMemo(() => {
    const projectMap = new Map(
      projecten.map((p) => [p.id, p.naam])
    )

    return [...taken]
      .filter((t) => t.status !== 'klaar')
      .sort(
        (a, b) =>
          (priorityOrder[a.prioriteit] ?? 99) -
          (priorityOrder[b.prioriteit] ?? 99)
      )
      .slice(0, 5)
      .map((task) => ({
        ...task,
        projectNaam: projectMap.get(task.project_id) ?? 'Onbekend project',
      }))
  }, [taken, projecten])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-md">
            <ListTodo className="h-4 w-4 text-white" />
          </div>
          <span>Prioritaire Taken</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : topTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Geen openstaande taken</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Alle taken zijn afgerond.</p>
          </div>
        ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_140px_100px_90px] gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
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
              onClick={() => navigate(`/projecten/${task.project_id}`)}
              className="grid grid-cols-[80px_1fr_140px_100px_90px] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-all duration-150 cursor-pointer group"
            >
              <div>
                <Badge
                  className={`${getPriorityColor(task.prioriteit)} text-[11px] capitalize`}
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
                <p className="text-sm text-muted-foreground">
                  {formatDate(task.deadline)}
                </p>
              </div>

              <div>
                <Badge
                  className={`${getStatusColor(task.status)} text-[11px] capitalize`}
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
