import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, FileText, CheckSquare, Users, Check, Loader2, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getKlanten } from '@/services/supabaseService'
import type { Klant } from '@/types'
import { ForgieActieKaart } from './ForgieActieKaart'
import type { ForgieActie } from '@/services/forgieChatService'

const STEP_CONFIG: Record<string, { label: string; icon: React.ElementType; order: number; route?: (id: string) => string }> = {
  klant: { label: 'Klant', icon: Users, order: 0 },
  project: { label: 'Project', icon: FolderOpen, order: 1, route: (id) => `/projecten/${id}` },
  offerte: { label: 'Offerte', icon: FileText, order: 2, route: (id) => `/offertes/${id}` },
  taak: { label: 'Taak', icon: CheckSquare, order: 3 },
}

const norm = (s: string) => s.trim().toLowerCase()

// Lichte Levenshtein-afstand (geen extra package) voor tikfout-tolerant zoeken.
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  let curr = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[n]
}

// "Lijkt erg op" — tolereert kleine typfouten (Floreks → Florex), schaalt met lengte.
function lijktOp(doel: string, kandidaat: string): boolean {
  const langer = Math.max(doel.length, kandidaat.length)
  if (Math.abs(doel.length - kandidaat.length) > 3) return false
  const drempel = langer <= 4 ? 1 : langer <= 8 ? 2 : 3
  const dist = levenshtein(doel, kandidaat)
  return dist > 0 && dist <= drempel
}

interface DaanActiePlanProps {
  acties: ForgieActie[]
}

export function DaanActiePlan({ acties }: DaanActiePlanProps) {
  const navigate = useNavigate()

  const baseOrdered = useMemo(
    () => [...acties].sort((a, b) => (STEP_CONFIG[a.type]?.order ?? 9) - (STEP_CONFIG[b.type]?.order ?? 9)),
    [acties],
  )

  // Project en offerte hebben een klant_id nodig; resolve de klantnaam vooraf.
  const needsKlant = baseOrdered.some((a) => a.type === 'project' || a.type === 'offerte')
  const klantNaam = useMemo(() => {
    const fromRef = baseOrdered.find((a) => a.type !== 'klant' && typeof a.data.klant_naam === 'string')?.data.klant_naam
    const fromKlant = baseOrdered.find((a) => a.type === 'klant')?.data.bedrijfsnaam
    return (fromRef ?? fromKlant) as string | undefined
  }, [baseOrdered])

  const [resolving, setResolving] = useState(needsKlant && !!klantNaam)
  const [resolvedKlant, setResolvedKlant] = useState<{ id: string; naam: string }>()
  const [klantMatches, setKlantMatches] = useState<Klant[] | null>(null)
  const [createNew, setCreateNew] = useState(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [createdIds, setCreatedIds] = useState<Record<string, string>>({})
  const [pendingKlantId, setPendingKlantId] = useState<string>()
  const [pendingProjectId, setPendingProjectId] = useState<string>()
  const [busyType, setBusyType] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)

  // Eenduidige match -> auto-koppelen; meerdere -> kiezen; geen -> aanmaken (geen gok).
  useEffect(() => {
    if (!needsKlant || !klantNaam) {
      setResolving(false)
      return
    }
    let abort = false
    getKlanten()
      .then((klanten) => {
        if (abort) return
        const doel = norm(klantNaam)
        const exact = klanten.filter((k) => norm(k.bedrijfsnaam) === doel)
        if (exact.length === 1) {
          setResolvedKlant({ id: exact[0].id, naam: exact[0].bedrijfsnaam })
        } else if (exact.length > 1) {
          setKlantMatches(exact)
        } else {
          // Geen exacte match: verzamel gelijkende kandidaten (substring of tikfout-nabij)
          // en laat kiezen — nooit automatisch koppelen, om duplicaten te voorkomen.
          const kandidaten = klanten.filter((k) => {
            const kn = norm(k.bedrijfsnaam)
            return kn.includes(doel) || doel.includes(kn) || lijktOp(doel, kn)
          })
          if (kandidaten.length >= 1) setKlantMatches(kandidaten)
          else setCreateNew(true)
        }
        setResolving(false)
      })
      .catch(() => {
        if (abort) return
        setCreateNew(true)
        setResolving(false)
      })
    return () => {
      abort = true
    }
  }, [needsKlant, klantNaam])

  // De daadwerkelijk uit te voeren keten: bestaande klant -> klant-stap weg (geen duplicaat);
  // niet gevonden zonder klant-actie van Daan -> synthetiseer een aanmaak-stap.
  const ordered = useMemo(() => {
    if (resolvedKlant) return baseOrdered.filter((a) => a.type !== 'klant')
    if (createNew && needsKlant && klantNaam && !baseOrdered.some((a) => a.type === 'klant')) {
      return [{ type: 'klant', data: { bedrijfsnaam: klantNaam } } as ForgieActie, ...baseOrdered]
    }
    return baseOrdered
  }, [baseOrdered, resolvedKlant, createNew, needsKlant, klantNaam])

  const effectiveKlantId = resolvedKlant?.id ?? pendingKlantId

  const handleCreated = useCallback((type: string, id: string) => {
    setCreatedIds((prev) => ({ ...prev, [type]: id }))
    if (type === 'klant') setPendingKlantId(id)
    if (type === 'project') setPendingProjectId(id)
    setBusyType(null)
    setCurrentIndex((i) => i + 1)
  }, [])

  const handleStatusChange = useCallback((status: string, type: string) => {
    setBusyType(status === 'creating' ? type : null)
  }, [])

  const handleCancel = useCallback(() => {
    setBusyType(null)
    setCancelled(true)
  }, [])

  const done = currentIndex >= ordered.length
  const activeActie = !done && !cancelled ? ordered[currentIndex] : undefined

  const title = cancelled ? 'Geannuleerd' : done ? 'Aangemaakt' : 'Daan wil dit voor je aanmaken'

  // Diepste aangemaakte record voor de samenvattingslink: offerte > project.
  const linkType = createdIds.offerte ? 'offerte' : createdIds.project ? 'project' : undefined
  const linkRoute = linkType && STEP_CONFIG[linkType].route?.(createdIds[linkType])

  const showChooser = !!klantMatches && !resolvedKlant && !createNew

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm p-3 mt-1 w-full">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">
        {title}
      </p>

      {resolving ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-petrol" />
          Klant opzoeken…
        </div>
      ) : showChooser ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground mb-1">
            Welke klant bedoel je met “{klantNaam}”?
          </p>
          {klantMatches!.map((k) => (
            <button
              key={k.id}
              onClick={() => setResolvedKlant({ id: k.id, naam: k.bedrijfsnaam })}
              className="w-full flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded-lg border border-border/60 hover:border-petrol hover:bg-petrol-light/40 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-petrol flex-shrink-0" />
              <span className="text-foreground">{k.bedrijfsnaam}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setKlantMatches(null)
              setCreateNew(true)
            }}
            className="text-xs text-muted-foreground hover:text-petrol underline-offset-2 hover:underline mt-0.5"
          >
            Geen van deze — nieuw aanmaken
          </button>
        </div>
      ) : (
        <>
          {resolvedKlant && (
            <p className="text-xs text-muted-foreground mb-2">
              Klant: <span className="text-foreground font-medium">{resolvedKlant.naam}</span>
            </p>
          )}

          <div className="space-y-1.5">
            {ordered.map((actie, i) => {
              const cfg = STEP_CONFIG[actie.type] || STEP_CONFIG.taak
              const Icon = cfg.icon
              const isDone = Boolean(createdIds[actie.type])
              const isBusy = busyType === actie.type && i === currentIndex
              const isActive = i === currentIndex && !cancelled && !isDone

              return (
                <div key={`${actie.type}-${i}`} className="flex items-center gap-2 text-xs">
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isDone ? (
                      <Check className="w-4 h-4" style={{ color: 'var(--status-green-text)' }} />
                    ) : isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-flame" />
                    ) : isActive ? (
                      <Icon className="w-3.5 h-3.5 text-petrol" />
                    ) : (
                      <Circle className="w-2 h-2 text-muted-foreground/50" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1',
                      isDone
                        ? 'text-foreground'
                        : isActive || isBusy
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground/60',
                    )}
                    style={isDone ? { color: 'var(--status-green-text)' } : undefined}
                  >
                    {cfg.label}
                    {isDone && cfg.route && (
                      <button
                        onClick={() => navigate(cfg.route!(createdIds[actie.type]))}
                        className="text-muted-foreground hover:text-petrol underline-offset-2 hover:underline"
                      >
                        bekijken
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          {activeActie && (
            <div className="mt-2.5">
              <ForgieActieKaart
                actie={activeActie}
                onCreated={handleCreated}
                onCancel={handleCancel}
                onStatusChange={(status) => handleStatusChange(status, activeActie.type)}
                pendingKlantId={effectiveKlantId}
                pendingProjectId={pendingProjectId}
              />
            </div>
          )}

          {done && linkRoute && (
            <button
              onClick={() => navigate(linkRoute)}
              className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-petrol hover:gap-2 transition-all"
            >
              Bekijk {linkType === 'offerte' ? 'de offerte' : 'het project'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  )
}
