import { Button } from '@/components/ui/button'

export function ErrorButton() {
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        throw new Error('Sentry test error — opzettelijk getriggerd vanuit ErrorButton')
      }}
    >
      Trigger Sentry test error
    </Button>
  )
}
