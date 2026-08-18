import { Sun, Moon } from 'lucide-react'
import { usePalette } from '@/contexts/PaletteContext'
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'icon' | 'pill'
  className?: string
}

export function DarkModeToggle({ variant = 'icon', className }: Props) {
  const { appThemeId, setAppThemeId } = usePalette()
  const isDark = appThemeId === 'dark'

  const toggle = () => setAppThemeId(isDark ? 'normaal' : 'dark')

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'tap-press inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] text-[12px] font-medium transition-colors duration-150',
          isDark
            ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/80'
            : 'bg-black/[0.04] text-foreground/70 hover:bg-black/[0.06]',
          className,
        )}
        title={isDark ? 'Naar licht' : 'Naar donker'}
        aria-label={isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {isDark ? 'Licht' : 'Donker'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'tap-press inline-flex items-center justify-center w-8 h-8 rounded-[10px] transition-colors duration-150 active:scale-[0.94]',
        isDark
          ? 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]'
          : 'text-foreground/70 hover:text-foreground hover:bg-black/[0.04]',
        className,
      )}
      title={isDark ? 'Naar licht' : 'Naar donker'}
      aria-label={isDark ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
