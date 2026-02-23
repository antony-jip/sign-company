import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface ShortcutDef {
  keys: string[]
  label: string
  path: string
  display: string
}

export const GLOBAL_SHORTCUTS: ShortcutDef[] = [
  { keys: ['n', 'o'], label: 'Nieuwe Offerte', path: '/offertes/nieuw', display: 'N dan O' },
  { keys: ['n', 'k'], label: 'Nieuwe Klant', path: '/klanten?nieuw=true', display: 'N dan K' },
  { keys: ['n', 'p'], label: 'Nieuw Project', path: '/projecten/nieuw', display: 'N dan P' },
  { keys: ['n', 'f'], label: 'Nieuwe Factuur', path: '/facturen?nieuw=true', display: 'N dan F' },
  { keys: ['n', 't'], label: 'Nieuwe Taak', path: '/taken?nieuw=true', display: 'N dan T' },
  { keys: ['n', 'd'], label: 'Nieuwe Deal', path: '/deals?nieuw=true', display: 'N dan D' },
  { keys: ['n', 'w'], label: 'Nieuwe Werkbon', path: '/werkbonnen/nieuw', display: 'N dan W' },
  { keys: ['g', 'h'], label: 'Ga naar Dashboard', path: '/', display: 'G dan H' },
  { keys: ['g', 'o'], label: 'Ga naar Offertes', path: '/offertes', display: 'G dan O' },
  { keys: ['g', 'k'], label: 'Ga naar Klanten', path: '/klanten', display: 'G dan K' },
  { keys: ['g', 'p'], label: 'Ga naar Projecten', path: '/projecten', display: 'G dan P' },
  { keys: ['g', 'i'], label: 'Ga naar Instellingen', path: '/instellingen', display: 'G dan I' },
]

const CHORD_TIMEOUT_MS = 800

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if ((el as HTMLElement).isContentEditable) return true
  return false
}

export function useGlobalShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    let firstKey: string | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    function reset() {
      firstKey = null
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs or when modifiers are held
      if (isInputFocused()) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const key = e.key.toLowerCase()

      if (firstKey === null) {
        // Check if this key could be the start of a chord
        const possibleChord = GLOBAL_SHORTCUTS.some((s) => s.keys[0] === key)
        if (possibleChord) {
          firstKey = key
          timer = setTimeout(reset, CHORD_TIMEOUT_MS)
        }
        return
      }

      // We have a first key — check for a matching chord
      const match = GLOBAL_SHORTCUTS.find(
        (s) => s.keys[0] === firstKey && s.keys[1] === key
      )

      if (match) {
        e.preventDefault()
        navigate(match.path)
      }

      reset()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      reset()
    }
  }, [navigate])
}
