import React from 'react'

interface PortaalChatDaySeparatorProps {
  date: string
}

export function PortaalChatDaySeparator({ date }: PortaalChatDaySeparatorProps) {
  const label = React.useMemo(() => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()

    if (isSameDay(d, today)) return 'Vandaag'
    if (isSameDay(d, yesterday)) return 'Gisteren'

    return new Intl.DateTimeFormat('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  }, [date])

  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
