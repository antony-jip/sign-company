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
  Rocket,
  type LucideIcon,
} from 'lucide-react'
import { useAanDeSlagStatus, type StapId } from '@/hooks/useAanDeSlagStatus'
import { ConfettiBurst } from '@/components/shared/ConfettiBurst'

interface TegelDef {
  id: StapId
  titel: string
  uitleg: string
  route: string
  Icon: LucideIcon
}

const TEGELS: TegelDef[] = [
  { id: 'account', titel: 'Account ingericht',  uitleg: 'Bedrijfsgegevens staan klaar.', route: '/instellingen?tab=bedrijf', Icon: Rocket },
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

  if (status.alleVerplichtKlaar) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-card shadow-[var(--shadow-sm)] px-7 py-8 sm:px-9 text-center">
        <ConfettiBurst />
        <div className="relative">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[hsl(var(--status-green-bg))] mb-4">
            <Check className="h-5 w-5 text-[#3A7D52]" strokeWidth={2.5} />
          </span>
          <h2
            className="font-heading text-foreground"
            style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}
          >
            Je bent ingericht<span className="text-flame">.</span>
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-[440px] mx-auto leading-[1.6]">
            Alles staat klaar: klanten, briefpapier, bedrijfsgegevens, e-mail en je eerste project.
            Vanaf hier werk je gewoon vanuit je projecten.
          </p>
          <button
            type="button"
            onClick={() => { void status.dismiss() }}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-flame text-white text-sm font-semibold hover:bg-[#E04520] transition-colors"
          >
            Aan het werk
          </button>
        </div>
      </div>
    )
  }

  // 'account' staat altijd af gevinkt, dus de drempel schuift met de tegel mee.
  const moetCollapsen = status.klaarCount >= 5 && !status.alleVerplichtKlaar
  const ingeklapt = moetCollapsen && !forceUitgevouwen

  if (ingeklapt) {
    return (
      <button
        type="button"
        onClick={() => setForceUitgevouwen(true)}
        className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-card shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow text-left"
      >
        <span className="text-[14px] text-foreground">
          Aan de slag<span className="text-flame">.</span>{' '}
          <span className="text-foreground/70">{status.klaarCount} van {status.totaal} klaar.</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-petrol">
          Uitvouwen
          <ChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-card shadow-[var(--shadow-sm)] overflow-hidden">
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
          Werk vanuit projecten<span className="text-flame">.</span>
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
                    : 'bg-card border-border hover:border-petrol/40 hover:shadow-[var(--shadow-sm)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  {klaar ? (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[hsl(var(--status-green-bg))]">
                      <Check className="h-3.5 w-3.5 text-[#3A7D52]" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-flame/10">
                      <Icon className="h-3.5 w-3.5 text-flame" strokeWidth={2} />
                    </span>
                  )}
                  {klaar && (
                    <span className="text-[10px] uppercase tracking-wider text-[#3A7D52] font-semibold">
                      Klaar<span className="text-flame">.</span>
                    </span>
                  )}
                </div>
                <p
                  className={`text-[13px] font-semibold leading-snug ${
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
              className="h-full bg-flame transition-all duration-500 ease-out"
              style={{ width: `${(status.klaarCount / status.totaal) * 100}%` }}
            />
          </div>
          <span className="text-[12px] font-mono text-foreground/70 tabular-nums">
            {status.klaarCount} / {status.totaal}
          </span>
        </div>
      </div>
    </div>
  )
}
