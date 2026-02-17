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
          <ListTodo className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span>Prioritaire Taken</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : topTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Geen openstaande taken</p>
            <p className="text-xs mt-1">Alle taken zijn afgerond.</p>
          </div>
        ) : (
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_140px_100px_90px] gap-3 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
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
              className="grid grid-cols-[80px_1fr_140px_100px_90px] gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 cursor-pointer"
            >
              {/* Priority badge */}
              <div>
                <Badge
                  className={`${getPriorityColor(task.prioriteit)} text-[11px] capitalize`}
                >
                  {task.prioriteit}
                </Badge>
              </div>

              {/* Task title */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {task.titel}
                </p>
              </div>

              {/* Project name */}
              <div className="min-w-0">
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {task.projectNaam}
                </p>
              </div>

              {/* Deadline */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(task.deadline)}
                </p>
              </div>

              {/* Status badge */}
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
