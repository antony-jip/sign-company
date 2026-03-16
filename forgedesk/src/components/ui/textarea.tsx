import * as React from "react"
import { cn } from "@/lib/utils"
import { AITextToolbar } from "./AITextToolbar"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Set to false to disable the AI rewrite toolbar. Defaults to true. */
  enableAI?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, enableAI = true, onChange, value, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null)
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
      },
      [ref]
    )

    const handleReplace = React.useCallback(
      (newText: string, selStart: number, selEnd: number) => {
        const textarea = internalRef.current
        if (!textarea) return

        const currentValue = textarea.value
        const before = currentValue.substring(0, selStart)
        const after = currentValue.substring(selEnd)
        const updatedValue = before + newText + after

        // Update via native setter to trigger React's onChange
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )?.set
        nativeInputValueSetter?.call(textarea, updatedValue)
        textarea.dispatchEvent(new Event('input', { bubbles: true }))

        // Set cursor after inserted text
        const newCursorPos = selStart + newText.length
        requestAnimationFrame(() => {
          textarea.setSelectionRange(newCursorPos, newCursorPos)
          textarea.focus()
        })
      },
      []
    )

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-lg border border-border-subtle bg-card px-3.5 py-2.5 text-sm ring-offset-background transition-all duration-fast ease-out-expo placeholder:text-text-placeholder hover:border-text-tertiary/50 focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={combinedRef}
          onChange={onChange}
          value={value}
          {...props}
        />
        {enableAI && !props.disabled && (
          <AITextToolbar
            textareaRef={internalRef}
            onReplace={handleReplace}
          />
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
