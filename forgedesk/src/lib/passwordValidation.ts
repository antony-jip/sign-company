export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MIN_ZXCVBN_SCORE = 3

export interface PasswordRequirement {
  key: 'length' | 'uppercase' | 'lowercase' | 'digitOrSymbol'
  label: string
  satisfied: boolean
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
  barColor: string
  warning: string
  suggestions: string[]
  loading: boolean
}

export interface PasswordCheck {
  requirements: PasswordRequirement[]
  allRequirementsMet: boolean
  strength: PasswordStrength
  isAcceptable: boolean
}

const STRENGTH_META: Record<0 | 1 | 2 | 3 | 4, { label: string; color: string; barColor: string }> = {
  0: { label: 'Heel zwak', color: 'text-[#C03A18]', barColor: 'bg-[#C03A18]' },
  1: { label: 'Zwak', color: 'text-[#C03A18]', barColor: 'bg-[#C03A18]' },
  2: { label: 'Redelijk', color: 'text-[#E8B931]', barColor: 'bg-[#E8B931]' },
  3: { label: 'Sterk', color: 'text-[#2D6B48]', barColor: 'bg-[#2D6B48]' },
  4: { label: 'Heel sterk', color: 'text-[#2D6B48]', barColor: 'bg-[#2D6B48]' },
}

export function getRequirements(password: string): PasswordRequirement[] {
  return [
    { key: 'length', label: `Minimaal ${PASSWORD_MIN_LENGTH} tekens`, satisfied: password.length >= PASSWORD_MIN_LENGTH },
    { key: 'uppercase', label: 'Een hoofdletter', satisfied: /[A-Z]/.test(password) },
    { key: 'lowercase', label: 'Een kleine letter', satisfied: /[a-z]/.test(password) },
    { key: 'digitOrSymbol', label: 'Een cijfer of speciaal teken', satisfied: /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password) },
  ]
}

export function buildPasswordCheck(
  password: string,
  zxcvbnScore: 0 | 1 | 2 | 3 | 4 | null,
  zxcvbnWarning: string,
  zxcvbnSuggestions: string[],
  loading: boolean,
): PasswordCheck {
  const requirements = getRequirements(password)
  const allRequirementsMet = requirements.every((r) => r.satisfied)

  const effectiveScore = zxcvbnScore ?? 0
  const meta = STRENGTH_META[effectiveScore]

  const strength: PasswordStrength = {
    score: effectiveScore,
    label: meta.label,
    color: meta.color,
    barColor: meta.barColor,
    warning: zxcvbnWarning,
    suggestions: zxcvbnSuggestions,
    loading,
  }

  const isAcceptable = allRequirementsMet && !loading && effectiveScore >= PASSWORD_MIN_ZXCVBN_SCORE

  return { requirements, allRequirementsMet, strength, isAcceptable }
}

export function firstBlockingError(check: PasswordCheck): string | null {
  const missing = check.requirements.find((r) => !r.satisfied)
  if (missing) return `Wachtwoord vereist: ${missing.label.toLowerCase()}`
  if (check.strength.loading) return 'Wachtwoord wordt beoordeeld, probeer opnieuw'
  if (check.strength.score < PASSWORD_MIN_ZXCVBN_SCORE) {
    return check.strength.warning
      ? `Wachtwoord te zwak: ${check.strength.warning.toLowerCase()}`
      : 'Wachtwoord te zwak — kies een minder voorspelbare combinatie'
  }
  return null
}
