import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, Loader2 } from 'lucide-react'
import { firstBlockingError } from '@/lib/passwordValidation'
import { usePasswordCheck } from '@/lib/usePasswordCheck'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const passwordCheck = usePasswordCheck(password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const blocker = firstBlockingError(passwordCheck)
    if (blocker) { toast.error(blocker); return }
    if (password !== confirmPassword) { toast.error('Wachtwoorden komen niet overeen'); return }
    setIsLoading(true)
    try {
      await updatePassword(password)
      toast.success('Wachtwoord gewijzigd!')
      navigate('/login')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Wachtwoord wijzigen mislukt')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#FEFDFB' }}>
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-6 h-6 text-neutral-700" />
        </div>

        <h1 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: '"Bricolage Grotesque", sans-serif' }}>Nieuw wachtwoord</h1>
        <p className="text-[15px] text-neutral-600 mb-8">Kies een nieuw wachtwoord voor je account.</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-700">Nieuw wachtwoord</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 10 tekens, sterk"
              className="h-11 rounded-xl border-neutral-200 bg-white text-sm focus:border-black focus:ring-black"
              autoFocus
            />
            <PasswordStrengthMeter check={passwordCheck} hasInput={password.length > 0} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-neutral-700">Bevestig wachtwoord</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Herhaal je wachtwoord"
              className="h-11 rounded-xl border-neutral-200 bg-white text-sm focus:border-black focus:ring-black"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-white hover:opacity-90 rounded-xl font-semibold text-[14px]"
            style={{ backgroundColor: '#F15025' }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Wachtwoord wijzigen
          </Button>
        </form>
      </div>
    </div>
  )
}
