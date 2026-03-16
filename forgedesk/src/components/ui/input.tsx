import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border-subtle bg-card px-3.5 py-2.5 text-sm ring-offset-background transition-all duration-fast ease-out-expo file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-placeholder hover:border-text-tertiary/50 focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
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
