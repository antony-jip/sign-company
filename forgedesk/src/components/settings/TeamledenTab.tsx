import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, UserPlus, MoreHorizontal, Shield, UserCheck, UserX, Mail, Loader2, RefreshCw, Camera } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { EmptyState } from '@/components/ui/empty-state'
import supabase, { isSupabaseConfigured } from '@/services/supabaseClient'
import { uploadAvatar } from '@/services/supabaseService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Profile, Uitnodiging, TeamRol } from '@/types'

type TeamTab = 'actief' | 'uitgenodigd' | 'gedeactiveerd'

const ROL_LABELS: Record<TeamRol, string> = {
  admin: 'Admin',
  medewerker: 'Medewerker',
  monteur: 'Monteur',
}

const ROL_COLORS: Record<TeamRol, string> = {
  admin: 'bg-[#1A535C]/10 text-[#1A535C] border-[#1A535C]/20 dark:bg-[#2A7A86]/20 dark:text-[#2A7A86] dark:border-[#2A7A86]/30',
  medewerker: 'bg-[#6A5A8A]/10 text-[#6A5A8A] border-[#6A5A8A]/20 dark:bg-[#6A5A8A]/20 dark:text-[#9A8AB8] dark:border-[#6A5A8A]/30',
  monteur: 'bg-[#9A5A48]/10 text-[#9A5A48] border-[#9A5A48]/20 dark:bg-[#9A5A48]/20 dark:text-[#C4886E] dark:border-[#9A5A48]/30',
}

function getInitials(profile: Profile): string {
  const v = profile.voornaam?.trim() || ''
  const a = profile.achternaam?.trim() || ''
  if (v && a) return `${v[0]}${a[0]}`.toUpperCase()
  if (v) return v.substring(0, 2).toUpperCase()
  if (profile.email) return profile.email.substring(0, 2).toUpperCase()
  return '??'
}

function getDisplayName(profile: Profile): string {
  const v = profile.voornaam?.trim() || ''
  const a = profile.achternaam?.trim() || ''
  if (v && a) return `${v} ${a}`
  if (v) return v
  return profile.email || 'Onbekend'
}

async function getAuthToken(): Promise<string> {
  if (!supabase) throw new Error('Supabase niet geconfigureerd')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Niet ingelogd')
  return session.access_token
}

function resizeImage(file: File, maxSize = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxSize) { h = Math.round((h * maxSize) / w); w = maxSize }
        } else {
          if (h > maxSize) { w = Math.round((w * maxSize) / h); h = maxSize }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas niet beschikbaar')); return }
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Kon afbeelding niet verwerken'))
        }, 'image/jpeg', 0.85)
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function TeamledenTab() {
  const { user, organisatieId } = useAuth()
  const [activeTab, setActiveTab] = useState<TeamTab>('actief')
  const [teamleden, setTeamleden] = useState<Profile[]>([])
  const [uitnodigingen, setUitnodigingen] = useState<Uitnodiging[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRol, setInviteRol] = useState<TeamRol>('medewerker')
  const [isInviting, setIsInviting] = useState(false)

  const loadData = useCallback(async () => {
    if (!organisatieId || !isSupabaseConfigured() || !supabase) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const [teamRes, uitnRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('organisatie_id', organisatieId)
          .order('created_at', { ascending: true }),
        supabase
          .from('uitnodigingen')
          .select('*')
          .eq('organisatie_id', organisatieId)
          .eq('status', 'verstuurd')
          .order('created_at', { ascending: false }),
      ])

      if (teamRes.data) setTeamleden(teamRes.data)
      if (uitnRes.data) setUitnodigingen(uitnRes.data)
    } catch (err) {
      console.error('Error loading team data:', err)
      toast.error('Teamgegevens konden niet geladen worden')
    } finally {
      setIsLoading(false)
    }
  }, [organisatieId])

  useEffect(() => { loadData() }, [loadData])

  const actieveleden = teamleden.filter(m => m.status !== 'gedeactiveerd')
  const gedeactiveerd = teamleden.filter(m => m.status === 'gedeactiveerd')

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !organisatieId || !user?.id) return
    setIsInviting(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/invite-team-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          rol: inviteRol,
          organisatie_id: organisatieId,
          uitgenodigd_door: user.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Kon uitnodiging niet versturen')
        return
      }

      toast.success(`Uitnodiging verstuurd naar ${inviteEmail}`)
      setInviteEmail('')
      setInviteRol('medewerker')
      setInviteOpen(false)
      await loadData()
    } catch {
      toast.error('Er ging iets mis bij het versturen')
    } finally {
      setIsInviting(false)
    }
  }

  const handleManage = async (profileId: string, action: 'update_rol' | 'deactiveer' | 'heractiveer', rol?: TeamRol) => {
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/manage-team-member', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ profile_id: profileId, action, ...(rol ? { rol } : {}) }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Actie mislukt')
        return
      }

      const actionLabels = { update_rol: 'Rol bijgewerkt', deactiveer: 'Teamlid gedeactiveerd', heractiveer: 'Teamlid geheractiveerd' }
      toast.success(actionLabels[action])
      await loadData()
    } catch {
      toast.error('Er ging iets mis')
    }
  }

  const handleCancelInvite = async (uitnodigingId: string) => {
    if (!isSupabaseConfigured() || !supabase) return
    try {
      await supabase.from('uitnodigingen').update({ status: 'ingetrokken' }).eq('id', uitnodigingId)
      toast.success('Uitnodiging ingetrokken')
      await loadData()
    } catch {
      toast.error('Kon uitnodiging niet intrekken')
    }
  }

  const tabs: { id: TeamTab; label: string; count: number }[] = [
    { id: 'actief', label: 'Actief', count: actieveleden.length },
    { id: 'uitgenodigd', label: 'Uitgenodigd', count: uitnodigingen.length },
    { id: 'gedeactiveerd', label: 'Gedeactiveerd', count: gedeactiveerd.length },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold tracking-[-0.03em] text-foreground font-display">Teamleden</h2>
          <p className="text-[13px] text-muted-foreground">Beheer wie toegang heeft tot Doen.</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-[#1A535C] hover:bg-[#1A535C]/90 text-white">
              <UserPlus className="w-4 h-4" />
              Teamlid uitnodigen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Teamlid uitnodigen</DialogTitle>
              <DialogDescription>
                Stuur een uitnodiging per e-mail om een nieuw teamlid toe te voegen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mailadres</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-rol">Rol</Label>
                <Select value={inviteRol} onValueChange={(v) => setInviteRol(v as TeamRol)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin — Volledige toegang</SelectItem>
                    <SelectItem value="medewerker">Medewerker — Standaard toegang</SelectItem>
                    <SelectItem value="monteur">Monteur — Alleen werkbonnen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuleren</Button>
              <Button onClick={handleInvite} disabled={isInviting || !inviteEmail.trim()}>
                {isInviting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Uitnodiging versturen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted dark:bg-muted rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-card text-foreground dark:text-white shadow-sm'
                : 'text-muted-foreground dark:text-muted-foreground/60 hover:text-foreground/70 dark:hover:text-muted-foreground/50'
            )}
          >
            {tab.label}
            <span className={cn(
              'text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
              activeTab === tab.id
                ? 'bg-primary/10 text-primary'
                : 'bg-muted-foreground/10 text-muted-foreground'
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {activeTab === 'actief' && (
                actieveleden.length === 0 ? (
                  <EmptyState
                    title="Nog alleen?"
                    description="Nodig iemand uit."
                    action={
                      <Button size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
                        <UserPlus className="w-4 h-4" />
                        Eerste teamlid uitnodigen
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {actieveleden.map((lid) => (
                      <TeamlidRow
                        key={lid.id}
                        profile={lid}
                        isCurrentUser={lid.id === user?.id}
                        onChangeRol={(rol) => handleManage(lid.id, 'update_rol', rol)}
                        onDeactiveer={() => handleManage(lid.id, 'deactiveer')}
                        onAvatarUpload={lid.id === user?.id ? async (file: File) => {
                          try {
                            const resized = await resizeImage(file, 200)
                            await uploadAvatar(lid.id, resized)
                            toast.success('Profielfoto bijgewerkt')
                            await loadData()
                          } catch {
                            toast.error('Kon profielfoto niet uploaden')
                          }
                        } : undefined}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'uitgenodigd' && (
                uitnodigingen.length === 0 ? (
                  <EmptyState
                    title="Geen openstaande uitnodigingen"
                    description="Alle uitnodigingen zijn geaccepteerd of ingetrokken."
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {uitnodigingen.map((uitn) => (
                      <UitnodigingRow
                        key={uitn.id}
                        uitnodiging={uitn}
                        onCancel={() => handleCancelInvite(uitn.id)}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === 'gedeactiveerd' && (
                gedeactiveerd.length === 0 ? (
                  <EmptyState
                    title="Geen gedeactiveerde leden"
                    description="Er zijn geen geblokkeerde teamleden."
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {gedeactiveerd.map((lid) => (
                      <TeamlidRow
                        key={lid.id}
                        profile={lid}
                        isCurrentUser={false}
                        isDeactivated
                        onHeractiveer={() => handleManage(lid.id, 'heractiveer')}
                      />
                    ))}
                  </div>
                )
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============ TEAMLID ROW ============

interface TeamlidRowProps {
  profile: Profile
  isCurrentUser: boolean
  isDeactivated?: boolean
  onChangeRol?: (rol: TeamRol) => void
  onDeactiveer?: () => void
  onHeractiveer?: () => void
  onAvatarUpload?: (file: File) => Promise<void>
}

function TeamlidRow({ profile, isCurrentUser, isDeactivated, onChangeRol, onDeactiveer, onHeractiveer, onAvatarUpload }: TeamlidRowProps) {
  const rol = profile.rol || 'medewerker'
  const initials = getInitials(profile)
  const name = getDisplayName(profile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAvatarUpload) {
      await onAvatarUpload(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="relative flex-shrink-0">
        <Avatar className="h-9 w-9">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
          <AvatarFallback className="bg-[#1A535C]/10 text-[#1A535C] dark:bg-[#2A7A86]/20 dark:text-[#2A7A86] text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {onAvatarUpload && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 hover:opacity-100 transition-opacity"
              title="Profielfoto wijzigen"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-2xs px-1.5 py-0">Jij</Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground truncate block">{profile.email}</span>
      </div>

      <Badge
        variant="outline"
        className={cn('text-xs font-bold uppercase tracking-wider flex-shrink-0', ROL_COLORS[rol as TeamRol] || '')}
      >
        {ROL_LABELS[rol as TeamRol] || rol}
      </Badge>

      {!isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isDeactivated && onChangeRol && (
              <>
                <DropdownMenuItem className="text-xs font-medium text-muted-foreground" disabled>
                  Rol wijzigen
                </DropdownMenuItem>
                {(['admin', 'medewerker', 'monteur'] as TeamRol[]).filter(r => r !== rol).map((r) => (
                  <DropdownMenuItem key={r} onClick={() => onChangeRol(r)}>
                    <Shield className="w-3.5 h-3.5 mr-2" />
                    {ROL_LABELS[r]}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            {isDeactivated && onHeractiveer ? (
              <DropdownMenuItem onClick={onHeractiveer}>
                <UserCheck className="w-3.5 h-3.5 mr-2" />
                Heractiveren
              </DropdownMenuItem>
            ) : onDeactiveer ? (
              <DropdownMenuItem onClick={onDeactiveer} className="text-[#F15025] focus:text-[#F15025] focus:bg-[#F15025]/5">
                <UserX className="w-3.5 h-3.5 mr-2" />
                Deactiveren
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// ============ UITNODIGING ROW ============

interface UitnodigingRowProps {
  uitnodiging: Uitnodiging
  onCancel: () => void
}

function UitnodigingRow({ uitnodiging, onCancel }: UitnodigingRowProps) {
  const rol = uitnodiging.rol || 'medewerker'
  const emailInitials = uitnodiging.email.substring(0, 2).toUpperCase()
  const expiresAt = uitnodiging.expires_at ? new Date(uitnodiging.expires_at) : null
  const isExpired = expiresAt ? expiresAt < new Date() : false

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className="bg-[#F4F2EE] text-[#A0A098] dark:bg-muted dark:text-muted-foreground text-sm font-bold">
          {emailInitials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{uitnodiging.email}</span>
          {isExpired && (
            <Badge variant="destructive" className="text-2xs px-1.5 py-0">Verlopen</Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground truncate block">
          <Mail className="w-3 h-3 inline mr-1 -mt-0.5" />
          Uitnodiging verstuurd {new Date(uitnodiging.created_at).toLocaleDateString('nl-NL')}
        </span>
      </div>

      <Badge
        variant="outline"
        className={cn('text-xs font-bold uppercase tracking-wider flex-shrink-0', ROL_COLORS[rol] || '')}
      >
        {ROL_LABELS[rol] || rol}
      </Badge>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onCancel} className="text-[#F15025] focus:text-[#F15025] focus:bg-[#F15025]/5">
            <UserX className="w-3.5 h-3.5 mr-2" />
            Uitnodiging intrekken
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
