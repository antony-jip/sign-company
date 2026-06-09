import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { resetPassword } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Vul je emailadres in'); return }
    setIsLoading(true)
    try {
      await resetPassword(email)
      setIsSent(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Versturen mislukt')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-[#FEFDFB] dark:bg-background">
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-card border border-neutral-200 dark:border-white/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-6 h-6 text-neutral-700 dark:text-muted-foreground" />
        </div>

        {isSent ? (
          <>
            <h1 className="text-2xl font-bold text-black dark:text-foreground mb-2" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Check je inbox</h1>
            <p className="text-[15px] text-neutral-600 dark:text-muted-foreground mb-8">
              We hebben een link gestuurd naar <span className="font-semibold text-black dark:text-foreground">{email}</span> om je wachtwoord te resetten.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-black dark:text-foreground mb-2" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Wachtwoord vergeten?</h1>
            <p className="text-[15px] text-neutral-600 dark:text-muted-foreground mb-8">
              Vul je emailadres in en we sturen je een link om je wachtwoord te resetten.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-neutral-700 dark:text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="naam@bedrijf.nl"
                  className="h-11 rounded-xl border-neutral-200 bg-white dark:border-white/10 dark:bg-white/[0.06] text-sm focus:border-black focus:ring-black dark:focus:border-white/40 dark:focus:ring-white/20"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-white hover:opacity-90 rounded-xl font-semibold text-[14px]"
                style={{ backgroundColor: '#F15025' }}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Reset link versturen
              </Button>
            </form>
          </>
        )}

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-black dark:text-muted-foreground dark:hover:text-foreground font-medium transition-colors mt-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar inloggen
        </Link>
      </div>
    </div>
  )
}
