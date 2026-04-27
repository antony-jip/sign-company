import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createTaak } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Taak } from '@/types'

interface TaakNieuwSheetProps {
  open: boolean
  onClose: () => void
  defaultDate: Date
  toegewezenAan: string
  onCreated: (taak: Taak) => void
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function TaakNieuwSheet({ open, onClose, defaultDate, toegewezenAan, onCreated }: TaakNieuwSheetProps) {
  const [titel, setTitel] = useState('')
  const [datum, setDatum] = useState(() => toDateInputValue(defaultDate))
  const [tijd, setTijd] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitel('')
      setDatum(toDateInputValue(defaultDate))
      setTijd('')
    }
  }, [open, defaultDate])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = titel.trim()
    if (!trimmed || saving) return
    setSaving(true)
    const deadline = tijd ? `${datum}T${tijd}:00` : datum
    try {
      const created = await createTaak({
        titel: trimmed,
        beschrijving: '',
        status: 'todo',
        prioriteit: 'medium',
        toegewezen_aan: toegewezenAan,
        deadline,
        geschatte_tijd: 0,
        bestede_tijd: 0,
      })
      toast.success('Taak toegevoegd')
      onCreated(created)
      onClose()
    } catch (err) {
      logger.error('createTaak failed', err)
      toast.error('Kon taak niet aanmaken')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <>
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] transform transition-transform duration-300 ease-out shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-[#D4D2CE] mb-5" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-bold text-[#1A1A1A]">
            Nieuwe taak<span className="text-[#F15025]">.</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 -mr-2 flex items-center justify-center rounded-full text-[#6B6B66] hover:text-[#1A1A1A] hover:bg-[#F0EFEC] active:bg-[#E6E5E1] transition-colors"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Wat moet er gebeuren?"
            className="w-full h-11 px-3 rounded-lg bg-[#F8F7F5] border border-[#EBEBEB] focus:border-[#1A535C] focus:bg-white focus:ring-2 focus:ring-[#1A535C]/10 outline-none text-[15px] text-[#1A1A1A] placeholder:text-[#9B9B95] transition-all"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              required
              className="flex-1 h-11 px-3 rounded-lg bg-[#F8F7F5] border border-[#EBEBEB] focus:border-[#1A535C] focus:bg-white focus:ring-2 focus:ring-[#1A535C]/10 outline-none text-[14px] text-[#1A1A1A] transition-all"
            />
            <input
              type="time"
              value={tijd}
              onChange={(e) => setTijd(e.target.value)}
              className="w-32 h-11 px-3 rounded-lg bg-[#F8F7F5] border border-[#EBEBEB] focus:border-[#1A535C] focus:bg-white focus:ring-2 focus:ring-[#1A535C]/10 outline-none text-[14px] text-[#1A1A1A] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!titel.trim() || saving}
            className="w-full h-12 mt-2 rounded-xl bg-[#F15025] text-white text-[15px] font-semibold hover:bg-[#D9431E] active:bg-[#C83A18] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Toevoegen…' : 'Toevoegen'}
          </button>
        </form>
      </div>
    </>,
    document.body,
  )
}
