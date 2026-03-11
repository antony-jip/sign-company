import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Hook that checks for portaal items waiting > 3 days without reaction
 * and sends reminder emails. Runs once per session (on mount).
 * Max 1 reminder per item. Only for offerte/tekening types.
 */
export function usePortaalHerinnering() {
  const { user } = useAuth()
  const { profile } = useAppSettings()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current || !user?.id) return
    hasRun.current = true

    // Async, niet-blokkerend
    checkEnStuurHerinneringen(user.id, profile?.bedrijfsnaam || '').catch(err =>
      console.warn('Herinnering check mislukt:', err)
    )
  }, [user?.id, profile?.bedrijfsnaam])
}

async function checkEnStuurHerinneringen(userId: string, bedrijfsnaam: string) {
  const { createClient } = await import('@supabase/supabase-js')

  // Use the env vars that are available client-side
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Zoek items die > 3 dagen oud zijn, status 'verstuurd', type offerte/tekening
  const dreiDagenGeleden = new Date(Date.now() - 3 * 86400000).toISOString()

  const { data: items } = await supabase
    .from('portaal_items')
    .select('id, titel, type, portaal_id, project_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'verstuurd')
    .eq('zichtbaar_voor_klant', true)
    .in('type', ['offerte', 'tekening'])
    .lt('created_at', dreiDagenGeleden)

  if (!items || items.length === 0) return

  // Check welke items al een herinnering hebben
  const itemIds = items.map(i => i.id)
  const { data: bestaandeHerinneringen } = await supabase
    .from('notificaties')
    .select('bericht')
    .eq('user_id', userId)
    .eq('type', 'portaal_herinnering')
    .in('bericht', itemIds.map(id => `herinnering:${id}`))

  const alVerstuurd = new Set(
    (bestaandeHerinneringen || []).map((n: { bericht: string }) => n.bericht.replace('herinnering:', ''))
  )

  const teVersturen = items.filter(i => !alVerstuurd.has(i.id))
  if (teVersturen.length === 0) return

  // Group by portaal to get tokens and klant emails
  const portaalIds = [...new Set(teVersturen.map(i => i.portaal_id))]
  const { data: portalen } = await supabase
    .from('project_portalen')
    .select('id, token, project_id')
    .in('id', portaalIds)
    .eq('actief', true)

  if (!portalen || portalen.length === 0) return

  const portaalMap = new Map(portalen.map((p: { id: string; token: string; project_id: string }) => [p.id, p]))

  // Get project info for klant emails
  const projectIds = [...new Set(portalen.map((p: { project_id: string }) => p.project_id))]
  const { data: projecten } = await supabase
    .from('projecten')
    .select('id, naam, klant_id')
    .in('id', projectIds)

  const projectMap = new Map((projecten || []).map((p: { id: string; naam: string; klant_id: string }) => [p.id, p]))

  // Get klant emails
  const klantIds = [...new Set((projecten || []).map((p: { klant_id: string }) => p.klant_id).filter(Boolean))]
  const { data: klanten } = await supabase
    .from('klanten')
    .select('id, email, contactpersoon')
    .in('id', klantIds)

  const klantMap = new Map((klanten || []).map((k: { id: string; email: string; contactpersoon: string }) => [k.id, k]))

  // Get email credentials
  const { sendEmail } = await import('@/services/gmailService')

  for (const item of teVersturen) {
    const portaal = portaalMap.get(item.portaal_id)
    if (!portaal) continue

    const project = projectMap.get(item.project_id)
    const klant = project ? klantMap.get(project.klant_id) : null
    const klantEmail = (klant as { email?: string } | null)?.email

    if (klantEmail) {
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const klantNaam = (klant as { contactpersoon?: string } | null)?.contactpersoon || 'klant'
      const projectNaam = (project as { naam?: string } | null)?.naam || 'project'

      try {
        await sendEmail(
          klantEmail,
          `Herinnering: ${item.titel} wacht op uw reactie`,
          [
            `Beste ${klantNaam},`,
            '',
            `U heeft nog niet gereageerd op ${item.titel} voor project ${projectNaam}.`,
            '',
            `Bekijk het hier: ${portaalUrl}`,
            '',
            `Met vriendelijke groet,`,
            bedrijfsnaam || 'Het team',
          ].join('\n')
        )
      } catch {
        // Email mislukt, maar log wel de herinnering
      }
    }

    // Log herinnering als notificatie (intern, niet voor klant)
    await supabase.from('notificaties').insert({
      user_id: userId,
      type: 'portaal_herinnering',
      titel: `Herinnering verstuurd: ${item.titel}`,
      bericht: `herinnering:${item.id}`,
      link: `/projecten/${item.project_id}`,
      project_id: item.project_id,
      gelezen: false,
      actie_genomen: false,
    })
  }
}
