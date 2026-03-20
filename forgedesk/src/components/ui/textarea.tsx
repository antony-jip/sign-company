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
            "flex min-h-[80px] w-full rounded-md border border-[#E6E4E0] bg-[#FAFAF8] px-3.5 py-2.5 text-[13px] ring-offset-background transition-all duration-150 placeholder:text-text-placeholder hover:border-text-tertiary/50 focus-visible:outline-none focus-visible:border-[#1A535C] focus-visible:ring-2 focus-visible:ring-[rgba(26,83,92,0.12)] focus-visible:shadow-[0_0_0_2px_rgba(26,83,92,0.12)] disabled:cursor-not-allowed disabled:opacity-50",
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
