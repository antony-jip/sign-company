import { ReactNode } from 'react'

interface DeviceFrameProps {
  type: 'laptop' | 'phone' | 'tablet'
  children: ReactNode
  className?: string
}

export default function DeviceFrame({ type, children, className = '' }: DeviceFrameProps) {
  if (type === 'phone') {
    return (
      <div className={`relative ${className}`}>
        {/* iPhone frame */}
        <div className="relative bg-[#1a1a1a] rounded-[2.5rem] p-[3px] shadow-xl shadow-black/20">
          <div className="bg-[#1a1a1a] rounded-[2.4rem] p-1">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] h-[22px] bg-[#1a1a1a] rounded-b-2xl z-10" />
            {/* Screen */}
            <div className="relative bg-white rounded-[2rem] overflow-hidden">
              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1 bg-petrol text-white">
                <span className="font-mono text-[10px]">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-2 border border-white/60 rounded-[2px]">
                    <div className="w-2 h-1 bg-white/60 rounded-[1px] m-[1px]" />
                  </div>
                </div>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'tablet') {
    return (
      <div className={`relative ${className}`}>
        <div className="relative bg-[#e5e5e5] rounded-[1.2rem] p-[5px] shadow-xl shadow-black/15">
          <div className="bg-white rounded-[0.9rem] overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Laptop
  return (
    <div className={`relative ${className}`}>
      {/* Screen */}
      <div className="relative bg-[#2a2a2a] rounded-t-xl p-[6px]">
        {/* Camera dot */}
        <div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#3a3a3a]" />
        <div className="bg-white rounded-lg overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f6f6f6] border-b border-black/5">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28ca41]" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-white rounded-md px-3 py-1 text-[9px] text-muted/40 font-mono border border-black/5">
                app.doen.team
              </div>
            </div>
          </div>
          {children}
        </div>
      </div>
      {/* Laptop base */}
      <div className="relative mx-auto w-[110%] -ml-[5%]">
        <div className="h-3 bg-gradient-to-b from-[#c0c0c0] to-[#a8a8a8] rounded-b-xl" />
        <div className="h-1 bg-[#888] rounded-b-lg mx-[10%]" />
      </div>
    </div>
  )
}
