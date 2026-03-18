import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { getPortaalByProject, getPortaalItems } from '@/services/supabaseService'
import type { ProjectPortaal, PortaalItem } from '@/types'

interface PortaalSidebarCardProps {
  projectId: string
}

export function PortaalSidebarCard({ projectId }: PortaalSidebarCardProps) {
  const navigate = useNavigate()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [laatsteBericht, setLaatsteBericht] = useState<PortaalItem | null>(null)
  const [voortgang, setVoortgang] = useState({ goedgekeurd: 0, totaal: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      try {
        const p = await getPortaalByProject(projectId)
        if (cancelled || !p) { setLoading(false); return }
        setPortaal(p)

        const items = await getPortaalItems(p.id)
        if (cancelled) return

        // Find last visible message/item
        const zichtbaar = items.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
        if (zichtbaar.length > 0) {
          const sorted = [...zichtbaar].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setLaatsteBericht(sorted[0])
        }

        // Count progress: goedgekeurde items / totaal goedkeurbare items
        const goedkeurbaar = zichtbaar.filter(
          (i: PortaalItem) => i.type === 'offerte' || i.type === 'tekening'
        )
        const goedgekeurd = goedkeurbaar.filter(
          (i: PortaalItem) => i.status === 'goedgekeurd'
        )
        setVoortgang({ goedgekeurd: goedgekeurd.length, totaal: goedkeurbaar.length })
      } catch {
        // No portaal or fetch error — card stays hidden
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [projectId])

  if (loading || !portaal) return null

  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen

  const berichtTekst = laatsteBericht
    ? (laatsteBericht.bericht_tekst || laatsteBericht.titel || laatsteBericht.omschrijving || '')
    : ''
  const isVanBedrijf = laatsteBericht?.afzender === 'bedrijf'
  const afzenderLabel = isVanBedrijf ? 'Jij' : 'Klant'
  const berichtTijd = laatsteBericht
    ? new Date(laatsteBericht.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
    : ''

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isActief ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          <span className="text-[13px] font-medium text-foreground">Portaal</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            isActief
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {isActief ? 'Actief' : 'Verlopen'}
          </span>
        </div>
        {voortgang.totaal > 0 && (
          <span className="text-xs text-muted-foreground font-mono">
            {voortgang.goedgekeurd}/{voortgang.totaal}
          </span>
        )}
      </div>

      {/* Laatste bericht preview */}
      <div className="mb-3">
        {berichtTekst ? (
          <>
            <div className={`flex ${isVanBedrijf ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[180px] rounded-xl p-2 text-[11px] leading-snug ${
                isVanBedrijf
                  ? 'bg-green-50 rounded-br-sm text-foreground'
                  : 'bg-muted rounded-bl-sm text-foreground'
              }`}>
                {berichtTekst.length > 80 ? `${berichtTekst.slice(0, 80)}…` : berichtTekst}
              </div>
            </div>
            <p className={`text-[10px] text-muted-foreground mt-1 ${isVanBedrijf ? 'text-right' : 'text-left'}`}>
              {afzenderLabel} · {berichtTijd}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Nog geen berichten</p>
        )}
      </div>

      {/* Portaal openen knop */}
      <button
        onClick={() => navigate('/portalen')}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] border border-border rounded-lg py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        Portaal openen
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  )
}
