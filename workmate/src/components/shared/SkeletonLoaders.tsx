import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton for a table with header and rows */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className="h-3 flex-1 max-w-[120px]" />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 px-4 py-3.5 border-b last:border-b-0">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={`h-3.5 ${c === 0 ? 'w-32' : 'flex-1 max-w-[100px]'}`}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Skeleton for a grid of cards (like projects, deals) */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Skeleton for a detail page with header and content blocks */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back button */}
      <Skeleton className="h-8 w-32" />
      {/* Hero header */}
      <div className="rounded-2xl bg-muted/50 p-6 space-y-3">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-3.5 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Skeleton for a list page with search/filter bar and items */
export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Search/filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      {/* Stats */}
      <div className="flex items-center gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
      {/* Table */}
      <TableSkeleton rows={rows} cols={5} />
    </div>
  )
}

/** Skeleton for dashboard widgets */
export function DashboardWidgetSkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
