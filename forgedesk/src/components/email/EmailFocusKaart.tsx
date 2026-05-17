import { Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailFocusKaartProps {
  onUitzetten: () => void
}

export function EmailFocusKaart({ onUitzetten }: EmailFocusKaartProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#F8F7F5] p-6">
      <div className="max-w-md w-full bg-white border border-[#EBEBEB] rounded-2xl p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1A535C]/10 mb-4">
          <Moon className="h-5 w-5 text-[#1A535C]" />
        </div>
        <h2 className="text-[18px] font-semibold text-[#1A1A1A] mb-2">
          Focus modus aan
        </h2>
        <p className="text-[14px] text-[#5F5E5A] mb-6 leading-relaxed">
          Je inbox is verborgen. Geen ongelezen-tellers, geen nieuwe mails in zicht.
          Zet weer aan wanneer je klaar bent met je werk.
        </p>
        <Button
          onClick={onUitzetten}
          className="bg-[#1A535C] hover:bg-[#1A535C]/90 text-white"
        >
          Inbox weer aanzetten
        </Button>
      </div>
    </div>
  )
}
