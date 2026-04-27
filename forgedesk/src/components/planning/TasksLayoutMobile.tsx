import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { getTaken, getMedewerkers, updateTaak } from '@/services/supabaseService'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import type { Taak, Medewerker } from '@/types'
import { TaakNieuwSheet } from './TaakNieuwSheet'
import { TasksDayTab } from './TasksDayTab'
import { TasksMonthTab } from './TasksMonthTab'

type ActiveTab = 'dag' | 'maand'

export function TasksLayoutMobile() {
  const { user } = useAuth()
  const [taken, setTaken] = useState<Taak[]>([])
  const [medewerkers, setMedewerkers] = useState<Medewerker[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [activeTab, setActiveTab] = useState<ActiveTab>('dag')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTaken(), getMedewerkers()])
      .then(([t, m]) => { setTaken(t); setMedewerkers(m) })
      .catch((err) => {
        logger.error('TasksLayoutMobile load failed', err)
        toast.error('Kon taken niet laden')
      })
      .finally(() => setLoading(false))
  }, [])

  const currentMedewerker = useMemo(() => {
    if (!user) return null
    return medewerkers.find((m) => m.user_id === user.id)
      || medewerkers.find((m) => m.email?.toLowerCase() === user.email?.toLowerCase())
      || null
  }, [medewerkers, user])

  const myName = currentMedewerker?.naam || ''

  async function toggleTask(t: Taak) {
    const newStatus: Taak['status'] = t.status === 'klaar' ? 'todo' : 'klaar'
    setTaken((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: newStatus } : x)))
    try {
      await updateTaak(t.id, { status: newStatus })
    } catch (err) {
      logger.error('updateTaak failed', err)
      toast.error('Kon status niet bijwerken')
      setTaken((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)))
    }
  }

  function handleCreated(created: Taak) {
    setTaken((prev) => [created, ...prev])
  }

  return (
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      <div className="px-5 pt-4 pb-3 bg-white">
        <div className="inline-flex h-9 p-0.5 rounded-full bg-[#F0EFEC]" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'dag'}
            onClick={() => setActiveTab('dag')}
            className={cn(
              'h-8 px-5 rounded-full text-[13px] font-medium transition-colors duration-150',
              activeTab === 'dag'
                ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#6B6B66]',
            )}
          >
            Dag
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'maand'}
            onClick={() => setActiveTab('maand')}
            className={cn(
              'h-8 px-5 rounded-full text-[13px] font-medium transition-colors duration-150',
              activeTab === 'maand'
                ? 'bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#6B6B66]',
            )}
          >
            Maand
          </button>
        </div>
      </div>

      {activeTab === 'dag' ? (
        <TasksDayTab
          taken={taken}
          myName={myName}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          toggleTask={toggleTask}
          loading={loading}
        />
      ) : (
        <TasksMonthTab
          taken={taken}
          myName={myName}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setActiveTab={setActiveTab}
        />
      )}

      {createPortal(
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-40 h-12 flex items-center justify-center gap-2 text-[14px] font-semibold text-white bg-[#F15025]/85 hover:bg-[#F15025] backdrop-blur-md shadow-[0_-2px_8px_rgba(0,0,0,0.08)] transition-colors duration-150"
        >
          <Plus className="h-4 w-4" />
          Nieuwe taak
        </button>,
        document.body,
      )}

      <TaakNieuwSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultDate={selectedDate}
        toegewezenAan={myName}
        onCreated={handleCreated}
      />
    </div>
  )
}
