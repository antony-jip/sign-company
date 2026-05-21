import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, Flag, User2, Loader2, Paperclip, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Medewerker, Project, TaakPrioriteit } from '@/types'

export interface EmailTaakFormData {
  titel: string
  beschrijving: string
  deadline: string
  toegewezen_aan: string
  project_id: string
  prioriteit: TaakPrioriteit
}

interface EmailTaakDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: EmailTaakFormData
  onChange: (formData: EmailTaakFormData) => void
  onSave: () => Promise<void> | void
  saving: boolean
  medewerkers: Medewerker[]
  projecten: Project[]
}

const PRIORITEIT_FLAG_COLORS: Record<TaakPrioriteit, string> = {
  kritiek: 'text-[#C0451A]',
  hoog: 'text-[#F15025]',
  medium: 'text-[#3A5A9A]',
  laag: 'text-[#9B9B95]',
}

const PRIORITEIT_LABELS: Record<TaakPrioriteit, string> = {
  kritiek: 'Kritiek',
  hoog: 'Hoog',
  medium: 'Medium',
  laag: 'Laag',
}

const pillBase =
  'h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#E0DED8] bg-white text-[12px] font-medium text-[#1A1A1A] hover:border-[#B0ADA8] hover:bg-[#F8F7F5] transition-colors cursor-pointer'

export function EmailTaakDialog({
  open,
  onOpenChange,
  formData,
  onChange,
  onSave,
  saving,
  medewerkers,
  projecten,
}: EmailTaakDialogProps) {
  const update = <K extends keyof EmailTaakFormData>(field: K, value: EmailTaakFormData[K]) => {
    onChange({ ...formData, [field]: value })
  }

  const displayDeadline = formData.deadline
    ? new Date(formData.deadline).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
    : 'Geen deadline'

  const [datePickerOpen, setDatePickerOpen] = useState(false)
  useEffect(() => { if (!open) setDatePickerOpen(false) }, [open])

  const actieveMedewerkers = medewerkers.filter((m) => m.status === 'actief')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="sr-only"><DialogTitle>Taak aanmaken</DialogTitle></DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Titel */}
          <div className="px-7 pt-7 pb-2">
            <input
              type="text"
              value={formData.titel}
              onChange={(e) => update('titel', e.target.value)}
              placeholder="Titel van de taak"
              autoFocus
              className="w-full border-0 shadow-none px-0 h-auto py-0 bg-transparent text-[20px] font-bold text-[#1A1A1A] placeholder:text-[#9B9B95] placeholder:font-medium focus:outline-none tracking-[-0.3px]"
            />
          </div>

          {/* Meta pills: prioriteit · deadline · toegewezen */}
          <div className="px-7 pb-4 flex items-center gap-1.5 flex-wrap">
            <div className="relative">
              <select
                value={formData.prioriteit}
                onChange={(e) => update('prioriteit', e.target.value as TaakPrioriteit)}
                className={cn(pillBase, 'appearance-none pl-7 pr-3 cursor-pointer')}
              >
                {(['kritiek', 'hoog', 'medium', 'laag'] as TaakPrioriteit[]).map((p) => (
                  <option key={p} value={p}>{PRIORITEIT_LABELS[p]}</option>
                ))}
              </select>
              <Flag className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none', PRIORITEIT_FLAG_COLORS[formData.prioriteit])} />
            </div>

            <button
              type="button"
              onClick={() => setDatePickerOpen((v) => !v)}
              className={pillBase}
            >
              <CalendarIcon className="w-3 h-3 text-[#6B6B66]" />
              <span className={cn(!formData.deadline && 'text-[#9B9B95]')}>{displayDeadline}</span>
            </button>
            {datePickerOpen && (
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => { update('deadline', e.target.value); setDatePickerOpen(false) }}
                className="h-7 px-2 rounded-full border border-[#E0DED8] bg-white text-[12px] text-[#1A1A1A] font-mono focus:outline-none focus:border-[#1A535C]"
              />
            )}

            {actieveMedewerkers.length > 0 ? (
              <div className="relative">
                <select
                  value={formData.toegewezen_aan || ''}
                  onChange={(e) => update('toegewezen_aan', e.target.value)}
                  className={cn(pillBase, 'appearance-none pl-7 pr-3 cursor-pointer max-w-[180px]')}
                >
                  <option value="">Niet toegewezen</option>
                  {actieveMedewerkers.map((m) => (
                    <option key={m.id} value={m.naam}>{m.naam}</option>
                  ))}
                </select>
                <User2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B6B66] pointer-events-none" />
              </div>
            ) : (
              <div className={cn(pillBase, 'cursor-text')}>
                <User2 className="w-3 h-3 text-[#6B6B66]" />
                <input
                  value={formData.toegewezen_aan}
                  onChange={(e) => update('toegewezen_aan', e.target.value)}
                  placeholder="Niet toegewezen"
                  className="bg-transparent border-0 outline-none text-[12px] font-medium text-[#1A1A1A] placeholder:text-[#9B9B95] w-28"
                />
              </div>
            )}
          </div>

          {/* Project */}
          <div className="px-7 pb-4 space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B9B95] block">Project</label>
            <select
              value={formData.project_id || ''}
              onChange={(e) => update('project_id', e.target.value)}
              className="w-full h-9 px-3 text-[13px] border border-[#E0DED8] bg-[#F8F7F5] rounded-lg outline-none focus:border-[#1A535C] focus:ring-1 focus:ring-[#1A535C]/20 transition-colors"
            >
              <option value="">Geen project</option>
              {projecten.map((p) => (
                <option key={p.id} value={p.id}>{p.naam}</option>
              ))}
            </select>
          </div>

          {/* Briefing */}
          <div className="px-7 pb-5 space-y-2">
            <label className="text-[11px] uppercase tracking-[0.05em] text-[#9B9B95] font-semibold block">Briefing</label>
            <textarea
              value={formData.beschrijving}
              onChange={(e) => update('beschrijving', e.target.value)}
              placeholder="Briefing toevoegen…"
              data-gramm="false"
              className="w-full border-0 shadow-none px-3 py-2.5 min-h-[140px] max-h-[300px] resize-none overflow-y-auto bg-[#F8F7F5] hover:bg-[#F0EFEC] focus:bg-white rounded-lg text-[13px] leading-relaxed text-[#1A1A1A] placeholder:text-[#6B6B66] outline-none focus:ring-1 focus:ring-[#1A535C]/20 transition-colors"
            />
          </div>

          {/* Bijlagen — placeholder voor latere upload-flow */}
          <div className="px-7 pb-5">
            <div className="flex items-center gap-3">
              <label className="text-[11px] uppercase tracking-[0.05em] text-[#9B9B95] font-semibold m-0">Bijlagen</label>
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-dashed border-[#C4C2BD] bg-transparent text-[11px] font-medium text-[#9B9B95]">
                <Plus className="h-3 w-3" />
                Toevoegen
              </span>
              <span className="text-[11px] italic text-[#9B9B95]">via taak-detail</span>
            </div>
          </div>
        </div>

        <DialogFooter className="px-7 py-4 border-t border-[#EBEBEB] bg-[#F8F7F5]/60 flex items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-md text-[13px] font-medium text-[#6B6B66] hover:text-[#1A1A1A] transition-colors"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !formData.titel.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-md text-[13px] font-semibold text-white bg-[#1A535C] hover:bg-[#0F3A40] shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Opslaan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
