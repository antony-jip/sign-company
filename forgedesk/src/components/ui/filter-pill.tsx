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
            ? "bg-[#F4F2EE] text-[#191919] font-semibold border border-[#D1CEC7]"
            : "text-[#5A5A55] border border-[#E6E4E0] hover:bg-[#F4F2EE] hover:text-[#191919]",
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
                ? "bg-[#191919]/10 text-[#191919]"
                : "bg-black/[0.06] text-[#5A5A55]"
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
