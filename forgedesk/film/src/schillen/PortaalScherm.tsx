import { Img } from 'remotion'
import { PortaalHeader } from '@/components/portaal/PortaalHeader'
import { PortaalSidebar } from '@/components/portaal/PortaalSidebar'
import { PortaalFeedItemOfferte } from '@/components/portaal/PortaalFeedItemOfferte'
import { PortaalFeedItemAfbeelding } from '@/components/portaal/PortaalFeedItemAfbeelding'
import { PortaalFeedItemFactuur } from '@/components/portaal/PortaalFeedItemFactuur'
import { StatusBalk } from '../kern/TelefoonFrame'
import { TikRing } from '../kern/TikRing'
import { project, portaalBedrijf, portaalItemOfferte, portaalItemFactuur, portaalItemFoto, montage, klant } from '../mockData'
import { veer, vlak } from '../tijd'

// Het echte klantportaal: header, projectbalk, mobiele zijbalk en feedkaarten
// zijn de componenten uit src/components/portaal, met mockdata.
type Kaart = { soort: 'offerte' | 'foto' | 'factuur'; op?: number; status?: string; tikOp?: number }

type Props = {
  t: number
  projectStatus: string
  kaarten: Kaart[]
  zijbalkOpen?: boolean
  scroll?: number
}

export const PortaalScherm: React.FC<Props> = ({ t, projectStatus, kaarten, zijbalkOpen = false, scroll = 0 }) => (
  <div className="absolute inset-0 bg-background flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
    <div style={{ backgroundColor: '#1A535C' }}><StatusBalk donker /></div>
    <div style={{ transform: `translateY(${-scroll}px)` }}>
      <PortaalHeader bedrijfNaam={portaalBedrijf.naam} verlooptOp="2026-10-14" projectNaam={project.naam} headerKleur="#1A535C" />
      <div className="flex-shrink-0 border-b" style={{ borderColor: '#E8E6E1', backgroundColor: 'hsl(var(--card))' }}>
        <div className="px-4 py-3">
          <h1 className="text-base font-bold" style={{ color: 'hsl(var(--foreground))', fontFamily: '"Instrument Sans", sans-serif' }}>{project.naam}</h1>
        </div>
      </div>
      <div className="w-full px-4 pt-4">
        <PortaalSidebar
          project={{ naam: project.naam, status: projectStatus, start_datum: project.start_datum, deadline: project.eind_datum }}
          bedrijf={portaalBedrijf}
          montage={{ datum: montage.datum, start_tijd: montage.start_tijd }}
          documenten={[]}
          toonContact
          isMobiel
        />
      </div>
      <main className="w-full px-4 py-4">
        <div className="space-y-4">
          {kaarten.map((k, i) => {
            const op = k.op ?? -1000
            const p = veer(t, op, { demping: 16, duurMs: 650 })
            const zicht = vlak(t, op, op + 150)
            const stijl = { opacity: zicht, transform: `translateY(${(1 - p) * 28}px)` }
            if (k.soort === 'offerte') return (
              <div key={i} style={{ ...stijl, position: 'relative' }}>
                {k.tikOp !== undefined && <TikRing t={t} op={k.tikOp} x={68} y={120} schaal={1 / 2.3} />}
                <PortaalFeedItemOfferte item={{ ...portaalItemOfferte, status: k.status ?? 'verstuurd' }} token="tok" klantNaam={klant.contactpersoon} kanGoedkeuren onReactie={() => {}} />
              </div>
            )
            if (k.soort === 'factuur') return (
              <div key={i} style={stijl}>
                <PortaalFeedItemFactuur item={{ ...portaalItemFactuur, status: k.status ?? 'verstuurd' }} token="tok" />
              </div>
            )
            return (
              <div key={i} style={stijl}>
                <PortaalFeedItemAfbeelding item={portaalItemFoto} />
              </div>
            )
          })}
        </div>
      </main>
    </div>
    {/* Voorladen, zodat de <img> in de fotokaart al in de cache zit. */}
    <Img src={portaalItemFoto.foto_url!} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
    {zijbalkOpen && null}
  </div>
)
