import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Image,
  Building2,
  Mail,
  FolderPlus,
  UserPlus,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from 'lucide-react'
import { useAanDeSlagStatus, type StapId } from '@/hooks/useAanDeSlagStatus'

interface TegelDef {
  id: StapId
  titel: string
  uitleg: string
  route: string
  Icon: LucideIcon
}

const TEGELS: TegelDef[] = [
  { id: 'klanten', titel: 'Klanten importeren', uitleg: 'Begin met je bestaande klanten.', route: '/importeren', Icon: Users },
  { id: 'logo',    titel: 'Logo & briefpapier', uitleg: 'Voor mooie offertes en facturen.', route: '/instellingen?tab=briefpapier', Icon: Image },
  { id: 'bedrijf', titel: 'Bedrijfsgegevens',   uitleg: 'KVK, BTW en IBAN invullen.',       route: '/instellingen?tab=bedrijf',     Icon: Building2 },
  { id: 'email',   titel: 'E-mail koppelen',    uitleg: 'Stuur en ontvang in doen.',         route: '/instellingen?tab=email',       Icon: Mail },
  { id: 'project', titel: 'Eerste project',     uitleg: 'De kern van doen.',                 route: '/projecten/nieuw',              Icon: FolderPlus },
  { id: 'team',    titel: 'Team uitnodigen',    uitleg: 'Optioneel, voor collega’s.',   route: '/team',                         Icon: UserPlus },
]

export function AanDeSlagSectie() {
  const navigate = useNavigate()
  const status = useAanDeSlagStatus()
  const [forceUitgevouwen, setForceUitgevouwen] = useState(false)

  if (status.isLoading) return null
  if (status.verborgen) return null

  const moetCollapsen = status.klaarCount >= 4 && !status.alleVerplichtKlaar
  const ingeklapt = moetCollapsen && !forceUitgevouwen

  if (ingeklapt) {
    return (
      <button
        type="button"
        onClick={() => setForceUitgevouwen(true)}
        className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.05)] transition-shadow text-left"
      >
        <span className="text-[14px] text-foreground">
          Aan de slag<span className="text-[#F15025]">.</span>{' '}
          <span className="text-foreground/70">{status.klaarCount} van 6 klaar.</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1A535C]">
          Uitvouwen
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.03)] overflow-hidden">
      <div
        className="relative px-7 py-7 sm:px-9 sm:py-8"
        style={{ background: 'linear-gradient(135deg, #143E47 0%, #1A535C 55%, #2A6E78 100%)' }}
      >
        <button
          type="button"
          onClick={() => { void status.dismiss() }}
          aria-label="Sluiten"
          className="absolute top-4 right-4 p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <h2
          className="font-heading text-white"
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.15 }}
        >
          Werk vanuit projecten<span className="text-[#F15025]">.</span>
        </h2>
        <p className="mt-3 text-[14px] text-white/60 leading-[1.6] max-w-[640px]">
          In doen. hangt alles aan een project · offertes, taken, planning, facturen, werkbonnen.
          Maak een project aan voor elke opdracht en regel daar alles vanuit.
          Geen losse modules om te onthouden, gewoon &eacute;&eacute;n plek per klus.
        </p>
        {moetCollapsen && (
          <button
            type="button"
            onClick={() => setForceUitgevouwen(false)}
            className="absolute bottom-3 right-4 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/50 hover:text-white/80 transition-colors"
          >
            Inklappen
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="px-7 py-7 sm:px-9 sm:py-8">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-5">
          Stel je account in
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TEGELS.map(tegel => {
            const klaar = status.stappen[tegel.id]
            const Icon = tegel.Icon
            return (
              <button
                key={tegel.id}
                type="button"
                onClick={() => navigate(tegel.route)}
                className={`group text-left rounded-lg px-4 py-4 transition-all border ${
                  klaar
                    ? 'bg-background border-transparent'
                    : 'bg-white border-border hover:border-[#1A535C]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  {klaar ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#E8F2EC]">
                      <Check className="h-3.5 w-3.5 text-[#3A7D52]" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#F15025]/10">
                      <Icon className="h-3.5 w-3.5 text-[#F15025]" strokeWidth={2} />
                    </span>
                  )}
                  {klaar && (
                    <span className="text-[10px] uppercase tracking-wider text-[#3A7D52] font-semibold">
                      Klaar<span className="text-[#F15025]">.</span>
                    </span>
                  )}
                </div>
                <p
                  className={`text-[13.5px] font-semibold leading-snug ${
                    klaar ? 'text-muted-foreground line-through decoration-[#9B9B95]/40' : 'text-foreground'
                  }`}
                >
                  {tegel.titel}
                </p>
                <p className={`text-[12px] mt-1 leading-snug ${klaar ? 'text-muted-foreground' : 'text-foreground/70'}`}>
                  {tegel.uitleg}
                </p>
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Voortgang
          </span>
          <div className="flex-1 h-[3px] bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F15025] transition-all duration-500 ease-out"
              style={{ width: `${(status.klaarCount / 6) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-mono text-foreground/70 tabular-nums">
            {status.klaarCount} / 6
          </span>
        </div>
      </div>
    </div>
  )
}
