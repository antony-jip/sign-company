import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resendConfirmation } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'

export function CheckInboxPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (!email || cooldown > 0) return
    setIsResending(true)
    try {
      await resendConfirmation(email)
      toast.success('Mail opnieuw verstuurd!')
      setCooldown(60)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Versturen mislukt. Probeer opnieuw.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#FEFDFB' }}>
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-7 h-7 text-neutral-700" />
        </div>

        <h1 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>
          Check je inbox!
        </h1>

        <p className="text-[15px] text-neutral-600 mb-8 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
          We hebben een bevestigingsmail gestuurd naar{' '}
          {email && <span className="font-semibold text-black">{email}</span>}
          {!email && 'je emailadres'}. Klik op de link in de mail om je account te activeren.
        </p>

        <Button
          onClick={handleResend}
          variant="outline"
          className="h-11 rounded-xl border-neutral-300 hover:bg-white text-[14px] font-medium px-6"
          disabled={isResending || cooldown > 0}
        >
          {isResending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Versturen...
            </>
          ) : cooldown > 0 ? (
            `Opnieuw versturen (${cooldown}s)`
          ) : (
            'Opnieuw versturen'
          )}
        </Button>

        <p className="text-sm text-neutral-500 mt-6 mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
          Tip: Check ook je spam folder.
        </p>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black font-medium transition-colors"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar inloggen
        </Link>
      </div>
    </div>
  )
}
