import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[#E6E4E0] bg-[#FAFAF8] px-3.5 py-2.5 text-[13px] ring-offset-background transition-all duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-placeholder hover:border-text-tertiary/50 focus-visible:outline-none focus-visible:border-[#1A535C] focus-visible:ring-2 focus-visible:ring-[rgba(26,83,92,0.12)] focus-visible:shadow-[0_0_0_2px_rgba(26,83,92,0.12)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
