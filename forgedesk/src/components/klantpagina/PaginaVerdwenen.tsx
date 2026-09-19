import React from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Vangnet voor oude publieke links (booking, lead-formulieren) waarvan de
 * module is verdwenen. Zelfde opmaak als de not-found-kaart van de
 * offertepagina: vaste kleuren, geen app-thema.
 */
export function PaginaVerdwenen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F7F5] p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-[#FFFFFF] p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F8F7F5]">
          <AlertTriangle className="h-8 w-8 text-[#9B9B95]" />
        </div>
        <h2 className="text-xl font-bold tracking-[-0.3px] text-[#1A1A1A]">Deze pagina bestaat niet meer</h2>
        <p className="text-sm text-[#6B6B66]">Neem contact op met het bedrijf dat je deze link stuurde.</p>
      </div>
    </div>
  )
}

export default PaginaVerdwenen
