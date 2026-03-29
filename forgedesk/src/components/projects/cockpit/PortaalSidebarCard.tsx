import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPortaalByProject, getPortaalItems, createPortaal } from '@/services/supabaseService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { logger } from '../../../utils/logger'
import { Send } from 'lucide-react'
import type { ProjectPortaal, PortaalItem } from '@/types'
import { formatTime } from './portaal/PortaalTimelineItems'
import { PortaalSidebarHeader } from './portaal/PortaalSidebarHeader'
import { PortaalSidebarTimeline } from './portaal/PortaalSidebarTimeline'
import { PortaalSidebarActions } from './portaal/PortaalSidebarActions'
import { PortaalActiviteitenLog } from './portaal/PortaalActiviteitenLog'

interface PortaalCompactCardProps {
  projectId: string
}

export function PortaalCompactCard({ projectId }: PortaalCompactCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [portaal, setPortaal] = useState<ProjectPortaal | null>(null)
  const [items, setItems] = useState<PortaalItem[]>([])
  const [voortgang, setVoortgang] = useState({ goedgekeurd: 0, totaal: 0 })
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const timelineEndRef = useRef<HTMLDivElement>(null)

  // Count unread klant messages (messages from klant that are newer than the last bedrijf message)
  const hasKlantReactie = (() => {
    if (items.length === 0) return false
    const lastBedrijfIdx = [...items].reverse().findIndex(i => i.afzender === 'bedrijf')
    if (lastBedrijfIdx === -1) return items.some(i => i.afzender === 'klant')
    const lastBedrijfItem = items[items.length - 1 - lastBedrijfIdx]
    return items.some(i =>
      i.afzender === 'klant' &&
      new Date(i.created_at).getTime() > new Date(lastBedrijfItem.created_at).getTime()
    )
  })()

  // Scroll to bottom of timeline when items change or expanded
  useEffect(() => {
    if (expanded && timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [expanded, items.length])

  async function fetchItems() {
    if (!portaal) return
    try {
      const raw = await getPortaalItems(portaal.id)
      const zichtbaar = raw.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
      // Sort chronological (oldest first, like a chat)
      const sorted = [...zichtbaar].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setItems(sorted)
      const goedkeurbaar = zichtbaar.filter((i: PortaalItem) => i.type === 'offerte' || i.type === 'tekening')
      const goedgekeurd = goedkeurbaar.filter((i: PortaalItem) => i.status === 'goedgekeurd')
      setVoortgang({ goedgekeurd: goedgekeurd.length, totaal: goedkeurbaar.length })
    } catch (err) { logger.error('Refresh portaal items failed:', err) }
  }

  useEffect(() => {
    let cancelled = false
    async function fetch() {
      try {
        const p = await getPortaalByProject(projectId)
        if (cancelled || !p) { setLoading(false); return }
        setPortaal(p)

        const raw = await getPortaalItems(p.id)
        if (cancelled) return

        const zichtbaar = raw.filter((i: PortaalItem) => i.zichtbaar_voor_klant)
        const sorted = [...zichtbaar].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setItems(sorted)

        const goedkeurbaar = zichtbaar.filter((i: PortaalItem) => i.type === 'offerte' || i.type === 'tekening')
        const goedgekeurd = goedkeurbaar.filter((i: PortaalItem) => i.status === 'goedgekeurd')
        setVoortgang({ goedgekeurd: goedgekeurd.length, totaal: goedkeurbaar.length })
      } catch (err) {
        logger.error('Fetch portaal failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [projectId])

  const handleActiveerPortaal = async () => {
    if (!user?.id) return
    try {
      const nieuwPortaal = await createPortaal(projectId, user.id)
      setPortaal(nieuwPortaal)
      setExpanded(true)
      toast.success('Portaal geactiveerd')
    } catch (err) {
      logger.error('Activate portaal failed:', err)
      toast.error('Kon portaal niet activeren')
    }
  }

  if (loading) return null

  if (!portaal) {
    return (
      <div className="border border-[#E6E4E0] bg-[#FAFAF8] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#E6E4E0]">
            <Send className="h-4 w-4 text-[#9B9B95]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground">Portaal</span>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Deel offertes, tekeningen en updates met je klant</p>
          </div>
          <button
            onClick={handleActiveerPortaal}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ backgroundColor: '#1A535C', color: '#FFFFFF' }}
          >
            Activeer
          </button>
        </div>
      </div>
    )
  }

  const isVerlopen = new Date(portaal.verloopt_op) < new Date()
  const isActief = portaal.actief && !isVerlopen

  // Last message for collapsed preview
  const laatsteItem = items.length > 0 ? items[items.length - 1] : null
  const previewText = laatsteItem
    ? (laatsteItem.bericht_tekst || laatsteItem.titel || laatsteItem.omschrijving || '')
    : ''
  const previewAfzender = laatsteItem?.afzender === 'bedrijf' ? 'Jij' : 'Klant'
  const previewTijd = laatsteItem ? formatTime(laatsteItem.created_at) : ''

  return (
    <div className="border border-[#E6E4E0] bg-[#FAFAF8] shadow-[0_1px_3px_rgba(130,100,60,0.04)] rounded-[10px] overflow-hidden">
      <PortaalSidebarHeader
        expanded={expanded}
        setExpanded={setExpanded}
        isActief={isActief}
        hasKlantReactie={hasKlantReactie}
        itemCount={items.length}
        previewText={previewText}
        previewAfzender={previewAfzender}
        previewTijd={previewTijd}
        voortgang={voortgang}
        onNavigate={() => navigate('/portalen')}
      />

      {expanded && (
        <div className="border-t border-[#E6E4E0]">
          <PortaalSidebarTimeline
            items={items}
            voortgang={voortgang}
            timelineEndRef={timelineEndRef}
          />

          <PortaalActiviteitenLog portaalId={portaal.id} />

          {portaal && user?.id && (
            <PortaalSidebarActions
              portaal={portaal}
              projectId={projectId}
              isActief={isActief}
              isSending={isSending}
              setIsSending={setIsSending}
              fetchItems={fetchItems}
              userId={user.id}
            />
          )}
        </div>
      )}
    </div>
  )
}
