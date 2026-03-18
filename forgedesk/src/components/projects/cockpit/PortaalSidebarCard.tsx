import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Send } from 'lucide-react'
import { getPortaalByProject, getPortaalItems } from '@/services/supabaseService'
import type { ProjectPortaal, PortaalItem } from '@/types'

interface PortaalCompactCardProps {
  projectId: string
}

export function PortaalCompactCard({ projectId }: PortaalCompactCardProps) {
  const navigate = useNavigate()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [laatsteBericht, setLaatsteBericht] = useState<PortaalItem | null>(null)
  const [voortgang, setVoortgang] = useState({ goedgekeurd: 0, totaal: 0 })
  const [itemCount, setItemCount] = useState(0)
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

        const zichtbaar = items.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
        setItemCount(zichtbaar.length)

        if (zichtbaar.length > 0) {
          const sorted = [...zichtbaar].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          setLaatsteBericht(sorted[0])
        }

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
    <div className="border border-[hsl(35,15%,87%)] bg-[#FFFFFE] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] overflow-hidden">
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={`w-1 flex-shrink-0 ${isActief ? 'bg-emerald-500' : 'bg-gray-300'}`} />

        {/* Content */}
        <div className="flex-1 flex items-center gap-4 px-4 py-3 min-w-0">
          {/* Icon */}
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isActief
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm'
              : 'bg-gray-200'
          }`}>
            <Send className={`h-4 w-4 ${isActief ? 'text-white' : 'text-gray-500'}`} />
          </div>

          {/* Title + status */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Portaal</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isActief
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {isActief ? 'Actief' : 'Verlopen'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {voortgang.totaal > 0 && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {voortgang.goedgekeurd}/{voortgang.totaal} goedgekeurd
                </span>
              )}
              {voortgang.totaal === 0 && itemCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </span>
              )}
              {voortgang.totaal === 0 && itemCount === 0 && (
                <span className="text-[11px] text-muted-foreground">Geen items</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[hsl(35,15%,90%)] flex-shrink-0 hidden sm:block" />

          {/* Last message preview */}
          <div className="flex-1 min-w-0 hidden sm:block">
            {berichtTekst ? (
              <div className="flex items-start gap-2">
                <div className={`flex-1 min-w-0 rounded-lg px-3 py-1.5 text-[11px] leading-snug ${
                  isVanBedrijf
                    ? 'bg-emerald-50/80 rounded-br-sm'
                    : 'bg-[hsl(35,15%,96%)] rounded-bl-sm'
                }`}>
                  <p className="text-foreground/80 truncate">
                    {berichtTekst.length > 100 ? `${berichtTekst.slice(0, 100)}…` : berichtTekst}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {afzenderLabel} · {berichtTijd}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/60 italic">Nog geen berichten</p>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={() => navigate('/portalen')}
            className="flex items-center gap-1.5 text-[11px] font-medium border border-[hsl(35,15%,85%)] rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-[hsl(35,15%,75%)] hover:bg-[hsl(35,15%,97%)] transition-all flex-shrink-0"
          >
            Openen
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
