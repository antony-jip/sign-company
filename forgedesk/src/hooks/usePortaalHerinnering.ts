import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Hook that checks for portaal items waiting > N days without reaction
 * and sends reminder emails. Runs once per session (on mount).
 * N = herinnering_na_dagen from portaal_instellingen (default 3, 0 = disabled)
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
    checkEnStuurHerinneringen(user.id, profile?.bedrijfsnaam || '', profile?.logo_url || '').catch(err =>
      console.warn('Herinnering check mislukt:', err)
    )
  }, [user?.id, profile?.bedrijfsnaam, profile?.logo_url])
}

async function checkEnStuurHerinneringen(userId: string, bedrijfsnaam: string, logoUrl: string) {
  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Haal portaal instellingen op
  const { data: appSettings } = await supabase
    .from('app_settings')
    .select('portaal_instellingen')
    .eq('user_id', userId)
    .maybeSingle()

  const instellingen = (appSettings?.portaal_instellingen || {}) as {
    herinnering_na_dagen?: number
    bedrijfslogo_op_portaal?: boolean
  }

  const herinneringDagen = instellingen.herinnering_na_dagen ?? 3
  if (herinneringDagen === 0) return // Herinneringen uitgeschakeld

  // Zoek items die > N dagen oud zijn, status 'verstuurd', type offerte/tekening
  const drempelDatum = new Date(Date.now() - herinneringDagen * 86400000).toISOString()

  const { data: items } = await supabase
    .from('portaal_items')
    .select('id, titel, type, portaal_id, project_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'verstuurd')
    .eq('zichtbaar_voor_klant', true)
    .in('type', ['offerte', 'tekening'])
    .lt('created_at', drempelDatum)

  if (!items || items.length === 0) return

  // Check welke items al een herinnering hebben (max 1 per item OOIT)
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

  // Group by portaal to get tokens
  const portaalIds = [...new Set(teVersturen.map(i => i.portaal_id))]
  const { data: portalen } = await supabase
    .from('project_portalen')
    .select('id, token, project_id')
    .in('id', portaalIds)
    .eq('actief', true)

  if (!portalen || portalen.length === 0) return

  // Check verlopen portalen uitfilteren
  const portaalMap = new Map<string, { id: string; token: string; project_id: string }>(
    portalen
      .map((p: { id: string; token: string; project_id: string }) => [p.id, p] as const)
  )

  // Get project info for klant emails
  const projectIds = [...new Set(portalen.map((p: { project_id: string }) => p.project_id))]
  const { data: projecten } = await supabase
    .from('projecten')
    .select('id, naam, klant_id')
    .in('id', projectIds)

  const projectMap = new Map<string, { id: string; naam: string; klant_id: string }>(
    (projecten || []).map((p: { id: string; naam: string; klant_id: string }) => [p.id, p])
  )

  // Get klant emails
  const klantIds = [...new Set((projecten || []).map((p: { klant_id: string }) => p.klant_id).filter(Boolean))]
  const { data: klanten } = await supabase
    .from('klanten')
    .select('id, email, contactpersoon')
    .in('id', klantIds)

  const klantMap = new Map<string, { id: string; email: string; contactpersoon: string }>(
    (klanten || []).map((k: { id: string; email: string; contactpersoon: string }) => [k.id, k])
  )

  // Get email service
  const { sendEmail } = await import('@/services/gmailService')

  // Build logo HTML for email
  const logoHtml = (instellingen.bedrijfslogo_op_portaal !== false && logoUrl)
    ? `<img src="${logoUrl}" alt="${bedrijfsnaam}" style="max-height:40px;margin-bottom:16px;" /><br/>`
    : ''

  for (const item of teVersturen) {
    const portaal = portaalMap.get(item.portaal_id)
    if (!portaal) continue

    const project = projectMap.get(item.project_id)
    const klant = project ? klantMap.get(project.klant_id) : undefined
    const klantEmail = klant?.email

    if (klantEmail) {
      const portaalUrl = `${window.location.origin}/portaal/${portaal.token}`
      const klantNaam = klant?.contactpersoon || 'klant'
      const projectNaam = project?.naam || 'project'

      try {
        const plainBody = [
          `Beste ${klantNaam},`,
          '',
          `U heeft nog niet gereageerd op ${item.titel} voor project ${projectNaam}.`,
          '',
          `Bekijk het hier: ${portaalUrl}`,
          '',
          `Met vriendelijke groet,`,
          bedrijfsnaam || 'Het team',
        ].join('\n')

        const htmlBody = `${logoHtml}
          <p>Beste ${klantNaam},</p>
          <p>U heeft nog niet gereageerd op <strong>${item.titel}</strong> voor project <strong>${projectNaam}</strong>.</p>
          <p><a href="${portaalUrl}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;color:#fff;border-radius:6px;text-decoration:none;">Bekijk in portaal</a></p>
          <p>Met vriendelijke groet,<br/>${bedrijfsnaam || 'Het team'}</p>`

        await sendEmail(
          klantEmail,
          `Herinnering: ${item.titel} wacht op uw reactie`,
          plainBody,
          { html: htmlBody }
        )
      } catch {
        // Email mislukt, maar log wel de herinnering
      }
    }

    // Log herinnering als notificatie (intern, voor medewerker)
    await supabase.from('notificaties').insert({
      user_id: userId,
      type: 'portaal_herinnering',
      titel: `Herinnering verstuurd: ${item.titel}`,
      bericht: `herinnering:${item.id}`,
      link: `/projecten/${item.project_id}?tab=portaal`,
      project_id: item.project_id,
      gelezen: false,
      actie_genomen: false,
    })
  }
}
