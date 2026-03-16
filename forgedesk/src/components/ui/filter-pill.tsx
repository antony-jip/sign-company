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
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-fast ease-out-expo whitespace-nowrap",
          active
            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
            : "bg-bg-subtle text-text-tertiary border border-transparent hover:bg-bg-hover hover:text-foreground",
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
              "ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] h-[18px] text-2xs font-bold",
              active
                ? "bg-primary/15 text-primary"
                : "bg-black/[0.06] text-text-tertiary"
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
