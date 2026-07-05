import * as React from "react"
import { cn } from "@/lib/utils"

export interface FilterPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  count?: number
  /** Small colored dot indicator (pass a hex color or CSS color) */
  dot?: string
}

const FilterPill = React.forwardRef<HTMLButtonElement, FilterPillProps>(
  ({ className, active, count, dot, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 whitespace-nowrap",
          active
            ? "bg-muted text-foreground font-semibold border border-[#D1CEC7] pill-pop-active"
            : "text-foreground/70 border border-border hover:bg-muted hover:text-foreground",
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: dot }}
          />
        )}
        {children}
        {count !== undefined && (
          <span
            className={cn(
              "ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] h-[18px] text-[10px] font-mono font-semibold",
              active
                ? "bg-[#191919]/10 text-foreground"
                : "bg-black/[0.06] text-foreground/70"
            )}
          >
            {count}
          </span>
        )}
      </button>
    )
  }
)
FilterPill.displayName = "FilterPill"

export { FilterPill }
