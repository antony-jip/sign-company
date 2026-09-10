import { Building2, User, Hash, FileText, Receipt } from 'lucide-react'
import type { Project } from '@/types'
import { ProjectFaseBar } from '@/components/projects/cockpit/ProjectFaseBar'
import { MobielTop, MobielTabBalk } from '../kern/AppChrome'
import { Tik } from '../kern/TikRing'
import { project, klant, contact, offerte } from '../mockData'
import { veer, vlak } from '../tijd'

type Props = {
  t: number
  status: Project['status']
  // ms waarop de drie regels (klant, contact, project) landen; leeg = al zichtbaar.
  chipsOp?: number
  faseOp?: number
  actie?: 'offerte' | 'factuur' | 'geen'
  actieTikOp?: number
  offerteStatus?: 'concept' | 'verzonden' | 'goedgekeurd'
}

const Regel: React.FC<{ t: number; op: number; Icon: typeof Building2; label: string; waarde: string }> = ({ t, op, Icon, label, waarde }) => {
  const p = veer(t, op, { demping: 15, duurMs: 600 })
  const zicht = vlak(t, op, op + 150)
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ opacity: zicht, transform: `translateX(${(1 - p) * -24}px)` }}>
      <span className="w-8 h-8 rounded-[10px] bg-petrol/10 text-petrol flex items-center justify-center flex-shrink-0"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
        <p className="text-[15px] font-semibold text-foreground truncate">{waarde}</p>
      </div>
    </div>
  )
}

export const ProjectScherm: React.FC<Props> = ({ t, status, chipsOp = -1000, faseOp = -1000, actie = 'geen', actieTikOp = -1000, offerteStatus }) => {
  const faseP = veer(t, faseOp, { demping: 16, duurMs: 650 })
  const faseZicht = vlak(t, faseOp, faseOp + 150)
  return (
    <div className="absolute inset-0 bg-background flex flex-col">
      <MobielTop titel={project.project_nummer} terug />
      <div className="flex-1 px-4 pt-3 overflow-hidden">
        <h1 className="font-heading text-[22px] font-bold leading-tight tracking-[-0.015em] text-foreground">{project.naam}</h1>
        <div className="mt-1 divide-y divide-border">
          <Regel t={t} op={chipsOp} Icon={Building2} label="Klant" waarde={klant.bedrijfsnaam} />
          <Regel t={t} op={chipsOp + 260} Icon={User} label="Contact" waarde={`${contact.naam} · ${contact.telefoon}`} />
          <Regel t={t} op={chipsOp + 520} Icon={Hash} label="Project" waarde={`${project.project_nummer} · ${klant.stad}`} />
        </div>
        <div style={{ marginTop: 14, opacity: faseZicht, transform: `translateY(${(1 - faseP) * 24}px)` }}>
          <ProjectFaseBar status={status} onStatusChange={() => {}} totaalBedrag={offerte.subtotaal} deadline={project.eind_datum} />
        </div>
        {offerteStatus && (
          <div className="mt-4 rounded-xl doen-panel px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-4 w-4 text-flame flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground truncate">{offerte.nummer} · {offerte.titel}</p>
                <p className="text-[12px] text-muted-foreground font-mono">€ 4.250,00 ex btw</p>
              </div>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: offerteStatus === 'goedgekeurd' ? '#3A7D52' : offerteStatus === 'verzonden' ? '#3A5A9A' : '#5A5A55' }}>
              {offerteStatus === 'goedgekeurd' ? 'Akkoord' : offerteStatus === 'verzonden' ? 'Verstuurd' : 'Concept'}<span className="text-flame">.</span>
            </span>
          </div>
        )}
        {actie !== 'geen' && (
          <Tik t={t} op={actieTikOp} className="mt-5">
            <span className="btn-primary-flame inline-flex items-center gap-2 h-12 px-5 rounded-xl text-[15px] font-semibold text-white bg-flame w-full justify-center">
              {actie === 'offerte' ? <FileText className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
              {actie === 'offerte' ? 'Offerte maken' : 'Factuur maken'}
            </span>
          </Tik>
        )}
      </div>
      <MobielTabBalk actief="Projecten" />
    </div>
  )
}
