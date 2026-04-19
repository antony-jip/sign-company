import { useEffect, useState } from 'react'
import { buildPasswordCheck, type PasswordCheck } from './passwordValidation'

type ZxcvbnFn = (password: string, userInputs?: string[]) => {
  score: 0 | 1 | 2 | 3 | 4
  feedback: { warning: string; suggestions: string[] }
}

let zxcvbnPromise: Promise<ZxcvbnFn> | null = null
function loadZxcvbn(): Promise<ZxcvbnFn> {
  if (!zxcvbnPromise) {
    zxcvbnPromise = import('zxcvbn').then((m) => m.default as unknown as ZxcvbnFn)
  }
  return zxcvbnPromise
}

export function usePasswordCheck(password: string, userInputs: string[] = []): PasswordCheck {
  const [score, setScore] = useState<0 | 1 | 2 | 3 | 4 | null>(null)
  const [warning, setWarning] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!password) {
      setScore(null)
      setWarning('')
      setSuggestions([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    loadZxcvbn().then((zxcvbn) => {
      if (cancelled) return
      const result = zxcvbn(password, userInputs)
      setScore(result.score)
      setWarning(result.feedback.warning || '')
      setSuggestions(result.feedback.suggestions || [])
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, userInputs.join('|')])

  return buildPasswordCheck(password, score, warning, suggestions, loading)
}
