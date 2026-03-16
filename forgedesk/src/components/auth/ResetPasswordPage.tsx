import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Lock, Loader2 } from 'lucide-react'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Wachtwoord moet minimaal 8 tekens zijn'); return }
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
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F4F3F0' }}>
      <div className="w-full max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-6 h-6 text-neutral-700" />
        </div>

        <h1 className="text-2xl font-bold text-black mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>Nieuw wachtwoord</h1>
        <p className="text-[15px] text-neutral-600 mb-8">Kies een nieuw wachtwoord voor je account.</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">Nieuw wachtwoord</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 8 tekens"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12.5px] font-medium text-neutral-700">Bevestig wachtwoord</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Herhaal je wachtwoord"
              className="h-11 rounded-xl border-neutral-200 bg-white text-[13.5px] focus:border-black focus:ring-black"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-black text-white hover:bg-neutral-800 rounded-xl font-semibold text-[14px]"
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
