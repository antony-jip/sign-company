import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAppSettings } from '@/contexts/AppSettingsContext'

/**
 * Hook that checks for portaal items waiting without reaction
 * and sends branded reminder emails. Runs once per session (on mount).
 * Delay, types, and email text are driven by portaal instellingen.
 */
export function usePortaalHerinnering() {
  const { user } = useAuth()
  const { profile, primaireKleur } = useAppSettings()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current || !user?.id) return
    hasRun.current = true

    checkEnStuurHerinneringen(
      user.id,
      profile?.bedrijfsnaam || '',
      profile?.logo_url || undefined,
      primaireKleur || undefined,
    ).catch(err =>
      console.warn('Herinnering check mislukt:', err)
    )
  }, [user?.id, profile?.bedrijfsnaam, profile?.logo_url, primaireKleur])
}

async function checkEnStuurHerinneringen(
  userId: string,
  bedrijfsnaam: string,
  logoUrl?: string,
  primaireKleur?: string,
) {
  const { createClient } = await import('@supabase/supabase-js')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Haal portaal instellingen op
  const { getPortaalInstellingen } = await import('@/services/supabaseService')
  const settings = await getPortaalInstellingen(userId)

  // Als herinnering_na_dagen 0 is, geen herinneringen sturen
  if (settings.herinnering_na_dagen === 0) return

  const delayMs = settings.herinnering_na_dagen * 86_400_000
  const cutoff = new Date(Date.now() - delayMs).toISOString()

  // Bepaal welke item types herinneringen krijgen
  const types: string[] = ['offerte', 'tekening']
  if (settings.herinnering_ook_voor_factuur) {
    types.push('factuur')
  }

  const { data: items } = await supabase
    .from('portaal_items')
    .select('id, titel, type, portaal_id, project_id, created_at')
    .eq('user_id', userId)
    .eq('status', 'verstuurd')
    .eq('zichtbaar_voor_klant', true)
    .in('type', types)
    .lt('created_at', cutoff)

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

  const portaalMap = new Map<string, { id: string; token: string; project_id: string }>(portalen.map((p: { id: string; token: string; project_id: string }) => [p.id, p]))

  // Get project info for klant emails
  const projectIds = [...new Set(portalen.map((p: { project_id: string }) => p.project_id))]
  const { data: projecten } = await supabase
    .from('projecten')
    .select('id, naam, klant_id')
    .in('id', projectIds)

  const projectMap = new Map<string, { id: string; naam: string; klant_id: string }>((projecten || []).map((p: { id: string; naam: string; klant_id: string }) => [p.id, p]))

  // Get klant emails
  const klantIds = [...new Set((projecten || []).map((p: { klant_id: string }) => p.klant_id).filter(Boolean))]
  const { data: klanten } = await supabase
    .from('klanten')
    .select('id, email, contactpersoon')
    .in('id', klantIds)

  const klantMap = new Map<string, { id: string; email: string; contactpersoon: string }>((klanten || []).map((k: { id: string; email: string; contactpersoon: string }) => [k.id, k]))

  // Email helpers
  const { sendEmail } = await import('@/services/gmailService')
  const { buildPortalEmailHtml, replaceEmailVariables } = await import('@/utils/emailTemplate')

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

      const vars: Record<string, string> = {
        projectnaam: projectNaam,
        itemtitel: item.titel,
        klantNaam,
        bedrijfsnaam: bedrijfsnaam || 'Het team',
        portaalUrl,
      }

      const onderwerp = replaceEmailVariables(settings.email_herinnering_onderwerp, vars)
      const berichtTekst = replaceEmailVariables(settings.email_herinnering_tekst, vars)

      const plainBody = [
        `Beste ${klantNaam},`,
        '',
        berichtTekst,
        '',
        `Bekijk het hier: ${portaalUrl}`,
        '',
        `Met vriendelijke groet,`,
        bedrijfsnaam || 'Het team',
      ].join('\n')

      const htmlBody = buildPortalEmailHtml({
        heading: berichtTekst,
        itemTitel: item.titel,
        beschrijving: `Project: ${projectNaam}`,
        ctaLabel: 'Bekijk in portaal \u2192',
        ctaUrl: portaalUrl,
        bedrijfsnaam: bedrijfsnaam || undefined,
        logoUrl,
        primaireKleur,
      })

      try {
        await sendEmail(
          klantEmail,
          onderwerp,
          plainBody,
          { html: htmlBody }
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
