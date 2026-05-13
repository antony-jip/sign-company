import { useState, useEffect } from 'react'
import { Send, FileText, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getPortaalByProject, getPortaalInstellingen, createPortaal } from '@/services/portaalService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Klant, Offerte, Document, ProjectFoto } from '@/types'

interface PortaalPreviewCardProps {
  projectId: string
  klant?: Klant | null
  offertes: Offerte[]
  bestanden: Document[]
  fotos: ProjectFoto[]
  onActivated?: () => void
}

type PreviewItem =
  | { kind: 'offerte'; id: string; titel: string; nummer: string; status: string }
  | { kind: 'bestand'; id: string; naam: string; grootte: number | null }

function pickPreviewItems(offertes: Offerte[], bestanden: Document[]): PreviewItem[] {
  const items: PreviewItem[] = []
  const laatsteOfferte = [...offertes].sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime(),
  )[0]
  if (laatsteOfferte) {
    items.push({
      kind: 'offerte',
      id: laatsteOfferte.id,
      titel: laatsteOfferte.titel || 'Offerte',
      nummer: laatsteOfferte.nummer,
      status: laatsteOfferte.status,
    })
  }
  const recenteBestanden = [...bestanden]
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 3 - items.length)
  for (const b of recenteBestanden) {
    items.push({ kind: 'bestand', id: b.id, naam: b.naam, grootte: (b as Document & { grootte?: number }).grootte ?? null })
  }
  return items
}

function getInitial(name?: string | null): string {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function PortaalPreviewCard({ projectId, klant, offertes, bestanden, fotos, onActivated }: PortaalPreviewCardProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [shouldShow, setShouldShow] = useState(false)
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!user?.id) return
      try {
        const instellingen = await getPortaalInstellingen(user.id)
        if (cancelled) return
        if (!instellingen.portaal_module_actief) {
          setShouldShow(false)
          return
        }
        const portaal = await getPortaalByProject(projectId)
        if (cancelled) return
        setShouldShow(!portaal)
      } catch (err) {
        logger.error('PortaalPreviewCard check:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [projectId, user?.id])

  const totaalItems = offertes.length + bestanden.length + fotos.length
  const previewItems = pickPreviewItems(offertes, bestanden)
  const heeftItems = previewItems.length > 0

  const handleActiveer = async () => {
    if (!user?.id || activating) return
    setActivating(true)
    try {
      await createPortaal(projectId, user.id)
      toast.success('Portaal geactiveerd')
      setShouldShow(false)
      onActivated?.()
    } catch (err) {
      logger.error('PortaalPreviewCard activeer:', err)
      toast.error('Kon portaal niet activeren')
    } finally {
      setActivating(false)
    }
  }

  if (loading || !shouldShow) return null

  const klantNaam = klant?.bedrijfsnaam || klant?.contactpersoon || 'Klant'

  return (
    <div className="rounded-xl bg-[#FFFFFF] shadow-[0_1px_3px_rgba(130,100,60,0.04)] overflow-hidden">
      {/* Head */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F0EFEC]">
        <div
          className="flex items-center justify-center h-[30px] w-[30px] rounded-lg flex-shrink-0"
          style={{ background: 'var(--lavender-bg)' }}
        >
          <Send className="h-3.5 w-3.5" style={{ color: 'var(--lavender-text)' }} />
        </div>
        <h3 className="flex-1 text-[11px] font-semibold text-[#6B6B66] uppercase tracking-[0.08em]">
          Klantportaal
        </h3>
        <span className="flex items-center gap-1.5 text-[11px] text-[#9B9B95]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C0BDB8]" />
          Niet actief
        </span>
      </div>

      {/* Body */}
      <div className="px-5 pt-[18px] pb-1">
        {/* Intro: klant-avatar + naam + count */}
        <div className="flex items-center gap-3 mb-3.5">
          <div
            className="flex items-center justify-center h-[34px] w-[34px] rounded-lg text-white text-[13px] font-bold flex-shrink-0"
            style={{ background: 'var(--m-klant)' }}
          >
            {getInitial(klantNaam)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold text-[#1A1A1A] truncate leading-tight">{klantNaam}</p>
            <p className="text-[12.5px] text-[#9B9B95] leading-tight mt-0.5">krijgt toegang tot het volgende</p>
          </div>
          {totaalItems > 0 && (
            <span
              className="font-mono text-[11px] font-medium rounded-full px-2 py-0.5 flex-shrink-0"
              style={{ background: 'var(--lavender-bg)', color: 'var(--lavender-text)' }}
            >
              {totaalItems} {totaalItems === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Preview-lijst */}
        {heeftItems ? (
          <div className="-mx-2">
            {previewItems.map((item, i) => {
              const isPrimary = i === 0 && item.kind === 'offerte'
              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#FAFAF8] transition-colors"
                >
                  <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0"
                    style={
                      isPrimary
                        ? { background: 'rgba(241, 80, 37, 0.08)', color: '#F15025' }
                        : { background: 'var(--cream-bg)', color: 'var(--cream-text)' }
                    }
                  >
                    {item.kind === 'offerte' ? (
                      <FileText className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.kind === 'offerte' ? (
                      <>
                        <p className={`text-[13px] truncate ${isPrimary ? 'font-semibold text-[#1A1A1A]' : 'text-[#1A1A1A]'}`}>
                          {/^offerte\b/i.test(item.titel) ? item.titel : `Offerte ${item.titel}`}
                        </p>
                        <p className="font-mono text-[11px] text-[#9B9B95] truncate">
                          {item.nummer} · {item.status}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] text-[#1A1A1A] truncate">{item.naam}</p>
                        {item.grootte && (
                          <p className="font-mono text-[11px] text-[#9B9B95]">
                            {(item.grootte / 1024 / 1024).toFixed(1)} MB
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <span
                    className="flex items-center gap-0.5 text-[11px] text-[#9B9B95] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0"
                  >
                    delen
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[12.5px] text-[#9B9B95] py-3 leading-relaxed">
            Voeg eerst een offerte of bestanden toe voordat je het portaal activeert.
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pt-3.5 pb-5">
        <button
          onClick={handleActiveer}
          disabled={!heeftItems || activating}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-[var(--lavender-text)] hover:brightness-110 transition-all hover:-translate-y-px disabled:bg-[#C0BDB8] disabled:cursor-not-allowed disabled:translate-y-0 disabled:hover:brightness-100"
        >
          <Send className="h-3.5 w-3.5" />
          {activating ? 'Activeren…' : 'Activeer portaal'}
        </button>
      </div>
    </div>
  )
}
