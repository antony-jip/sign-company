import { useState, useEffect, useCallback } from 'react'

export function NotitieWidget() {
  const [text, setText] = useState(() => {
    return localStorage.getItem('forgedesk-dashboard-notes') || ''
  })

  const saveToStorage = useCallback((value: string) => {
    localStorage.setItem('forgedesk-dashboard-notes', value)
  }, [])

  // Auto-save with debounce
  useEffect(() => {
    const timeout = setTimeout(() => saveToStorage(text), 500)
    return () => clearTimeout(timeout)
  }, [text, saveToStorage])

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Notities, ideeën, to-do's..."
        className="w-full h-[180px] resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none leading-relaxed"
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/40">
        <span>{text.length > 0 ? 'Auto-opgeslagen' : ''}</span>
        <span>{text.length} tekens</span>
      </div>
    </div>
  )
}
