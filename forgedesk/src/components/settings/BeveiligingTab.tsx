import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/services/supabaseClient'
import supabase from '@/services/supabaseClient'
import { toast } from 'sonner'
import { logger } from '../../utils/logger'
import { SubTabNav } from './SubTabNav'
import type { SubTab } from './settingsShared'
import { firstBlockingError } from '@/lib/passwordValidation'
import { usePasswordCheck } from '@/lib/usePasswordCheck'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'

// Tweefactor en Sessies zijn verwijderd: beide waren schijnschermen. De
// 2FA-schakelaar toonde alleen een toast en sloeg niets op, en de
// sessielijst was hardcoded HTML met een verzonnen apparaat. Een
// beveiligingsscherm dat bescherming suggereert die er niet is, is erger
// dan geen scherm.
const BEVEILIGING_TABS: SubTab[] = [
  { id: 'wachtwoord', label: 'Wachtwoord', icon: Lock },
]

export function BeveiligingTab() {
  const [subTab, setSubTab] = useState('wachtwoord')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const { user } = useAuth()

  const userInputs = useMemo(() => (user?.email ? [user.email] : []), [user?.email])
  const passwordCheck = usePasswordCheck(newPassword, userInputs)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Vul alle wachtwoordvelden in')
      return
    }
    const blocker = firstBlockingError(passwordCheck)
    if (blocker) {
      toast.error(blocker)
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Nieuwe wachtwoorden komen niet overeen')
      return
    }
    if (newPassword === currentPassword) {
      toast.error('Nieuw wachtwoord moet verschillen van het huidige wachtwoord')
      return
    }

    setIsChanging(true)
    try {
      if (isSupabaseConfigured() && supabase) {
        // First verify current password by re-signing in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: currentPassword,
        })
        if (signInError) {
          toast.error('Huidig wachtwoord is onjuist')
          return
        }
        // Now update the password
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        })
        if (updateError) {
          toast.error(`Kon wachtwoord niet wijzigen: ${updateError.message}`)
          return
        }
        toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
      } else {
        // Demo mode - update password in localStorage
        const storedUser = localStorage.getItem('doen_demo_user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          const storedPw = localStorage.getItem('doen_demo_password') || 'demo'
          if (currentPassword !== storedPw) {
            toast.error('Huidig wachtwoord is onjuist (standaard: "demo")')
            return
          }
          localStorage.setItem('doen_demo_password', newPassword)
          toast.success(<>Opgeslagen<span style={{ color: '#F15025' }}>.</span></>)
        }
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      logger.error('Error changing password:', err)
      toast.error('Er is een fout opgetreden bij het wijzigen van het wachtwoord')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <>
      <SubTabNav tabs={BEVEILIGING_TABS} active={subTab} onChange={setSubTab} variant="underline" />

      {subTab === 'wachtwoord' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Wachtwoord Wijzigen
          </CardTitle>
          <CardDescription>
            Kies een sterk wachtwoord van minimaal 10 tekens met hoofdletters, kleine letters en een cijfer of speciaal teken
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Huidig Wachtwoord</Label>
            <div className="relative max-w-md">
              <Input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nieuw Wachtwoord</Label>
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrengthMeter check={passwordCheck} hasInput={newPassword.length > 0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Bevestig Wachtwoord</Label>
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={isChanging}>
            {isChanging ? 'Wijzigen...' : 'Wachtwoord Wijzigen'}
          </Button>
        </CardContent>
      </Card>
      )}

    </>
  )
}
