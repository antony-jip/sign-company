import { Check, X } from 'lucide-react'
import type { PasswordCheck } from '@/lib/passwordValidation'
import { PASSWORD_MIN_ZXCVBN_SCORE } from '@/lib/passwordValidation'

interface Props {
  check: PasswordCheck
  hasInput: boolean
}

export function PasswordStrengthMeter({ check, hasInput }: Props) {
  if (!hasInput) return null

  const filledBars = Math.max(1, check.strength.score)

  return (
    <div className="space-y-2 pt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-all ${
              level <= filledBars ? check.strength.barColor : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-medium ${check.strength.color}`}>
          {check.strength.loading ? 'Beoordelen…' : check.strength.label}
        </p>
        {!check.strength.loading && check.strength.score < PASSWORD_MIN_ZXCVBN_SCORE && (
          <p className="text-[11px] text-muted-foreground">Minimaal "Sterk" vereist</p>
        )}
      </div>

      <ul className="space-y-1 pt-1">
        {check.requirements.map((req) => (
          <li key={req.key} className="flex items-center gap-1.5 text-[11px]">
            {req.satisfied ? (
              <Check className="h-3 w-3 text-[#2D6B48] flex-shrink-0" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/80 flex-shrink-0" />
            )}
            <span className={req.satisfied ? 'text-foreground/70' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>

      {check.strength.warning && check.strength.score < PASSWORD_MIN_ZXCVBN_SCORE && (
        <p className="text-[11px] text-[#C03A18] pt-1">{check.strength.warning}</p>
      )}
      {check.strength.suggestions.length > 0 && check.strength.score < PASSWORD_MIN_ZXCVBN_SCORE && (
        <p className="text-[11px] text-muted-foreground">
          Tip: {check.strength.suggestions[0]}
        </p>
      )}
    </div>
  )
}
