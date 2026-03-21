import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "text-primary-foreground hover:-translate-y-px [background:linear-gradient(135deg,#1A535C_0%,#15444B_100%)] [box-shadow:0_2px_8px_rgba(26,83,92,0.25)] hover:[box-shadow:0_4px_12px_rgba(26,83,92,0.35)]",
        destructive: "text-white hover:-translate-y-px [background:linear-gradient(135deg,#F15025_0%,#D4453A_100%)] [box-shadow:0_2px_8px_rgba(241,80,37,0.3)] hover:[background:linear-gradient(135deg,#D4453A_0%,#C03A18_100%)] hover:[box-shadow:0_4px_12px_rgba(241,80,37,0.4)]",
        outline: "border border-border-subtle bg-card text-foreground shadow-elevation-xs hover:bg-bg-hover hover:-translate-y-px hover:shadow-elevation-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-text-tertiary hover:bg-bg-hover hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
