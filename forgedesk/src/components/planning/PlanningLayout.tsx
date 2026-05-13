import { MontagePlanningLayout } from '@/components/planning/MontagePlanningLayout'

export function PlanningLayout() {
  return (
    <div className="h-full flex flex-col bg-[#F8F7F5] -m-3 sm:-m-4 md:-m-6">
      <MontagePlanningLayout />
    </div>
  )
}
