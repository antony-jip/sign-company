import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Knoppen onderaan. Op desktop een DialogFooter, op mobiel een vaste balk onder de scrollende inhoud. */
  footer?: React.ReactNode
  children?: React.ReactNode
  /** Extra klassen voor de desktop-DialogContent (bijv. `sm:max-w-md`). */
  className?: string
  titleClassName?: string
  descriptionClassName?: string
}

/**
 * Dialog vanaf md, bottom sheet daaronder. Zelfde inhoud, zelfde handlers;
 * alleen de verpakking verschilt. Onder md scrolt de inhoud binnen de sheet
 * en blijft de footer met de primaire actie in beeld boven de safe-area.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
  titleClassName,
  descriptionClassName,
}: ResponsiveDialogProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className} {...(!description && { 'aria-describedby': undefined })}>
          <DialogHeader>
            <DialogTitle className={titleClassName}>{title}</DialogTitle>
            {description && <DialogDescription className={descriptionClassName}>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          {...(!description && { 'aria-describedby': undefined })}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[90vh] rounded-t-2xl border-t border-border bg-card text-card-foreground shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
            'duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            !footer && 'pb-[calc(env(safe-area-inset-bottom)+1rem)]',
          )}
        >
          <div className="shrink-0 px-5 pt-2">
            <div className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3 pt-4 pb-3">
              <div className="min-w-0 flex-1 space-y-1">
                <DialogPrimitive.Title className={cn('text-[18px] font-bold leading-tight tracking-tight text-foreground', titleClassName)}>
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', descriptionClassName)}>
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close
                className="-mr-2 -mt-1 h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-muted active:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Sluiten"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
            {children}
          </div>

          {footer && (
            <div className="shrink-0 flex flex-col-reverse gap-2.5 border-t border-border bg-card px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] [&>button]:min-h-[44px] [&>button]:w-full">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}
