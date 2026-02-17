import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ListTodo } from 'lucide-react'
import { mockTaken, mockProjecten } from '@/data/mockData'
import { formatDate, getPriorityColor, getStatusColor } from '@/lib/utils'

const priorityOrder: Record<string, number> = {
  kritiek: 0,
  hoog: 1,
  medium: 2,
  laag: 3,
}

export function PriorityTasks() {
  const topTasks = useMemo(() => {
    const projectMap = new Map(
      mockProjecten.map((p) => [p.id, p.naam])
    )

    return [...mockTaken]
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
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <span>Prioritaire Taken</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
