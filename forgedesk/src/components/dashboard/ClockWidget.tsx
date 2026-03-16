import { useState, useEffect } from 'react'

export function ClockWidget() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')

  const dateStr = now.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="flex items-baseline gap-0.5 tabular-nums">
        <span className="text-4xl font-bold tracking-tight text-foreground font-mono">{hours}</span>
        <span className="text-4xl font-bold tracking-tight text-primary/60 font-mono animate-pulse">:</span>
        <span className="text-4xl font-bold tracking-tight text-foreground font-mono">{minutes}</span>
        <span className="text-lg font-medium text-muted-foreground/50 font-mono ml-1">{seconds}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 capitalize">{dateStr}</p>
    </div>
  )
}
