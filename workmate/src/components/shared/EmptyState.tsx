import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction, compact }: EmptyStateProps) {
  const navigate = useNavigate()

  function handleAction(a: { onClick?: () => void; href?: string }) {
    if (a.onClick) a.onClick()
    else if (a.href) navigate(a.href)
  }

  return (
    <Card className="border-dashed">
      <CardContent className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
        <div className={`rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 ${compact ? 'h-12 w-12' : 'h-16 w-16'}`}>
          <Icon className={`text-primary/40 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`} />
        </div>
        <p className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base'}`}>
          {title}
        </p>
        <p className={`text-muted-foreground mt-1 max-w-sm ${compact ? 'text-xs' : 'text-sm'}`}>
          {description}
        </p>
        {(action || secondaryAction) && (
          <div className="flex items-center gap-2 mt-4">
            {action && (
              <Button
                size={compact ? 'sm' : 'default'}
                className="bg-gradient-to-r from-accent to-primary hover:from-accent hover:to-wm-hover shadow-lg shadow-primary/25 border-0"
                onClick={() => handleAction(action)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                size={compact ? 'sm' : 'default'}
                variant="outline"
                onClick={() => handleAction(secondaryAction)}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
