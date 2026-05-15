import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardData } from '@/contexts/DashboardDataContext'
import { getAvatarStyle } from '@/utils/medewerkerAvatar'
import { isAdminUser } from '@/utils/authHelpers'
import { formatCurrency, cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { ActiviteitLog } from './ActiviteitLog'
import { MedewerkerFilterCombobox } from '@/components/shared/MedewerkerFilterCombobox'
import type { Medewerker, Klant } from '@/types'

const DAG_HEADERS = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

function startOfWeek(d: Date): Date {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  dt.setHours(0, 0, 0, 0)
  return dt
}

function initialen(naam: string): string {
  return naam.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0] ?? '').join('').toUpperCase()
}

function findMedewerker(idOrName: string | undefined | null, medewerkers: Medewerker[]): Medewerker | null {
  if (!idOrName) return null
  return medewerkers.find(m => m.id === idOrName || m.naam === idOrName) ?? null
}

function Avatar({ medewerker, medewerkers, size = 24 }: { medewerker: Medewerker; medewerkers: Medewerker[]; size?: number }) {
  const idx = medewerkers.findIndex(m => m.id === medewerker.id)
  const style = getAvatarStyle(idx >= 0 ? idx : 0)
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontSize: Math.round(size * 0.42),
      }}
      title={medewerker.naam}
    >
      {initialen(medewerker.naam)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// Deze week — date strip + events

interface WeekEvent {
  id: string
  tijd: string | null
  titel: string
  sub: string
  dotColor: string
  href: string
  date: Date
}

function DezeWeekCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { montages, events, klanten, medewerkers } = useDashboardData()

  const currentMedewerker = useMemo(
    () => medewerkers.find(m => m.user_id === user?.id) ?? null,
    [medewerkers, user?.id],
  )

  const [filterNaam, setFilterNaam] = useState<string>('')

  // Default to the current user's medewerker zodra die bekend is
  useEffect(() => {
    if (currentMedewerker && !filterNaam) setFilterNaam(currentMedewerker.naam)
  }, [currentMedewerker, filterNaam])

  const today = new Date()
  const weekStart = startOfWeek(today)
  const todayIdx = (today.getDay() + 6) % 7

  const monthLabel = today.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }).toLowerCase()

  const items = useMemo<WeekEvent[]>(() => {
    const klantById = new Map<string, Klant>(klanten.map(k => [k.id, k]))
    const target = filterNaam ? medewerkers.find(m => m.naam === filterNaam) : null
    const matchesFilter = (people: string[] | undefined): boolean => {
      if (!filterNaam) return true
      if (!target) return false
      if (!people || people.length === 0) return false
      return people.some(p => p === target.id || p === target.naam)
    }

    const list: WeekEvent[] = []
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    montages.forEach(m => {
      const d = new Date(m.datum)
      if (d < weekStart || d >= weekEnd) return
      if (!matchesFilter(m.monteurs)) return
      const tijd = m.start_tijd ? m.start_tijd.slice(0, 5) : null
      const monteur = findMedewerker(m.monteurs?.[0], medewerkers)
      const klant = klantById.get(m.klant_id)
      const sub = [monteur?.naam.split(' ')[0], klant?.stad].filter(Boolean).join(' · ')
      list.push({
        id: `m-${m.id}`,
        tijd,
        titel: m.titel || klant?.bedrijfsnaam || 'Montage',
        sub: sub || m.locatie || '',
        dotColor: '#F15025',
        href: '/planning',
        date: d,
      })
    })

    events.forEach(e => {
      const d = new Date(e.start_datum)
      if (d < weekStart || d >= weekEnd) return
      if (!matchesFilter(e.deelnemers)) return
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      const tijd = hours === '00' && mins === '00' ? null : `${hours}:${mins}`
      const dot = e.type === 'deadline' ? '#F15025' : e.type === 'meeting' ? '#1A535C' : '#C4A463'
      list.push({
        id: `e-${e.id}`,
        tijd,
        titel: e.titel,
        sub: e.locatie || '',
        dotColor: dot,
        href: '/planning',
        date: d,
      })
    })

    return list
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8)
  }, [montages, events, klanten, medewerkers, weekStart, filterNaam])

  return (
    <section
      className="rounded-xl bg-white p-6"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between mb-3">
        <h2 className="text-[14px] font-bold text-[#1A1A1A]">Deze week</h2>
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#9B9B95]">
          {monthLabel}
        </span>
      </header>

      <div className="mb-4">
        <MedewerkerFilterCombobox
          medewerkers={medewerkers}
          value={filterNaam}
          onChange={setFilterNaam}
          allLabel="Iedereen"
          placeholder="Zoek medewerker…"
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {DAG_HEADERS.map((d, i) => {
          const date = new Date(weekStart)
          date.setDate(weekStart.getDate() + i)
          const isToday = i === todayIdx
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase text-[#9B9B95]">{d}</span>
              <span
                className={cn(
                  'text-[13px] font-mono rounded-md w-7 h-7 flex items-center justify-center',
                  isToday ? 'bg-[#1A535C] text-white font-semibold' : 'text-[#1A1A1A]',
                )}
              >
                {date.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Geen afspraken deze week.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.href)}
                className="w-full flex items-start gap-3 text-left hover:bg-[#F8F7F5] rounded-md -mx-2 px-2 py-1 transition-colors"
              >
                <span className="font-mono text-[11px] text-[#6B6B66] w-10 pt-0.5 flex-shrink-0">
                  {item.tijd ?? '—'}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] text-[#1A1A1A] truncate">{item.titel}</span>
                  {item.sub && (
                    <span className="block text-[11px] text-[#9B9B95] truncate">{item.sub}</span>
                  )}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                  style={{ backgroundColor: item.dotColor }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Team — deze week (stats + recente activiteit)

interface ActivityItem {
  id: string
  medewerker: Medewerker | null
  fallbackInitials: string
  fallbackBg: string
  fallbackColor: string
  tekst: string
  tijd: string
  sortDate: Date
  href: string
}

function TeamCard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { montages, offertes, facturen, medewerkers } = useDashboardData()

  const currentMedewerker = useMemo(
    () => medewerkers.find(m => m.user_id === user?.id) ?? null,
    [medewerkers, user?.id],
  )
  const admin = isAdminUser(currentMedewerker, user)

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const actief = new Set<string>()
    montages.forEach(m => {
      const d = new Date(m.datum)
      if (d >= weekStart && d < weekEnd) m.monteurs?.forEach(id => actief.add(id))
    })
    return { actief: actief.size }
  }, [montages])

  const activiteit = useMemo<ActivityItem[]>(() => {
    const out: ActivityItem[] = []

    offertes
      .filter(o => o.status === 'verzonden' && o.verstuurd_op)
      .forEach(o => {
        out.push({
          id: `off-vz-${o.id}`,
          medewerker: null,
          fallbackInitials: (o.klant_naam || '?').slice(0, 2).toUpperCase(),
          fallbackBg: 'rgba(26,83,92,0.08)',
          fallbackColor: '#1A535C',
          tekst: `Offerte verstuurd — ${o.klant_naam || 'Onbekend'}`,
          tijd: formatDistanceToNow(new Date(o.verstuurd_op!), { addSuffix: false, locale: nl }),
          sortDate: new Date(o.verstuurd_op!),
          href: `/offertes/${o.id}`,
        })
      })

    offertes
      .filter(o => o.status === 'goedgekeurd' && o.akkoord_op)
      .forEach(o => {
        out.push({
          id: `off-gk-${o.id}`,
          medewerker: null,
          fallbackInitials: (o.klant_naam || '?').slice(0, 2).toUpperCase(),
          fallbackBg: '#E8F2EC',
          fallbackColor: '#3A7D52',
          tekst: `Offerte goedgekeurd — ${o.klant_naam || 'Onbekend'}`,
          tijd: formatDistanceToNow(new Date(o.akkoord_op!), { addSuffix: false, locale: nl }),
          sortDate: new Date(o.akkoord_op!),
          href: `/offertes/${o.id}`,
        })
      })

    montages
      .filter(m => m.status === 'afgerond')
      .forEach(m => {
        const monteur = findMedewerker(m.monteurs?.[0], medewerkers)
        out.push({
          id: `m-af-${m.id}`,
          medewerker: monteur,
          fallbackInitials: 'MO',
          fallbackBg: '#FDE8E4',
          fallbackColor: '#F15025',
          tekst: `Montage afgerond — ${m.klant_naam || m.titel}`,
          tijd: formatDistanceToNow(new Date(m.updated_at), { addSuffix: false, locale: nl }),
          sortDate: new Date(m.updated_at),
          href: '/planning',
        })
      })

    facturen
      .filter(f => f.status === 'betaald' && f.betaaldatum)
      .forEach(f => {
        out.push({
          id: `f-bt-${f.id}`,
          medewerker: null,
          fallbackInitials: '€',
          fallbackBg: '#E8F2EC',
          fallbackColor: '#3A7D52',
          tekst: `Factuur betaald — ${formatCurrency(f.totaal || 0)}`,
          tijd: formatDistanceToNow(new Date(f.betaaldatum!), { addSuffix: false, locale: nl }),
          sortDate: new Date(f.betaaldatum!),
          href: `/facturen/${f.id}`,
        })
      })

    return out.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime()).slice(0, 30)
  }, [offertes, montages, facturen, medewerkers])

  if (!admin) return null

  return (
    <section
      className="rounded-xl bg-white p-6"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
    >
      <header className="flex items-baseline justify-between mb-4">
        <h2 className="text-[14px] font-bold text-[#1A1A1A]">
          Gedaan<span className="text-[#F15025]">.</span>
          <span
            className="text-[#9B9B95] ml-2 font-normal"
            style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic' }}
          >
            — team-log
          </span>
        </h2>
        <span className="text-[11px] font-mono text-[#9B9B95]">
          {stats.actief} actief
        </span>
      </header>

      {activiteit.length === 0 ? (
        <p className="text-sm text-[#9B9B95] py-2">Nog geen activiteit deze week.</p>
      ) : (
        <ul className="space-y-3 max-h-[200px] overflow-y-auto pr-1 -mr-2">
          {activiteit.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.href)}
                className="w-full flex items-center gap-3 text-left hover:bg-[#F8F7F5] rounded-md -mx-2 px-2 py-1 transition-colors"
              >
                {item.medewerker ? (
                  <Avatar medewerker={item.medewerker} medewerkers={medewerkers} size={26} />
                ) : (
                  <span
                    className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={{ backgroundColor: item.fallbackBg, color: item.fallbackColor }}
                  >
                    {item.fallbackInitials}
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] text-[#1A1A1A] truncate">
                    <span className="font-medium">{item.medewerker?.naam.split(' ')[0] || '—'}</span>
                  </span>
                  <span className="block text-[11px] text-[#9B9B95] truncate">{item.tekst}</span>
                </span>
                <span className="text-[10px] font-mono text-[#9B9B95] flex-shrink-0">
                  {item.tijd}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// Public export

export function RightRail() {
  return (
    <aside className="space-y-4 w-full xl:w-[320px] xl:flex-shrink-0">
      <DezeWeekCard />
      <ActiviteitLog />
      <TeamCard />
    </aside>
  )
}
