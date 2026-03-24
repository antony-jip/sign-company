import DeviceFrame from './DeviceFrame'

export default function WerkbonMockup({ className = '' }: { className?: string }) {
  return (
    <DeviceFrame type="phone" className={className}>
      <div className="bg-white" style={{ minHeight: '420px' }}>
        {/* App header */}
        <div className="bg-petrol px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 4L6 8l4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-white text-sm font-semibold">Mijn Werkbon</span>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-lg font-extrabold text-ink tracking-tight font-heading mb-1">
            Mijn Werkbon<span className="text-flame">.</span>
          </h3>

          {/* Project list */}
          <div className="space-y-2 mb-5">
            {[
              { name: 'Project 1', hasArrow: true },
              { name: 'Project 1', hasArrow: true },
              { name: 'Project 2', hasArrow: true },
              { name: 'Mijn Werkbon', hasArrow: true },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-petrol/[0.04] rounded-xl px-4 py-3 border border-petrol/10"
              >
                <span className="text-sm font-medium text-ink">{item.name}</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 3l4 4-4 4" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ))}
          </div>

          {/* Photo upload */}
          <p className="text-xs font-semibold text-ink/60 mb-2">Foto&apos;s uploaden</p>
          <div className="flex gap-3 mb-5">
            <div className="w-16 h-16 rounded-xl bg-petrol/5 border-2 border-dashed border-petrol/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="#1A535C" strokeWidth="1.5" fill="none" />
                <circle cx="8.5" cy="10.5" r="1.5" stroke="#1A535C" strokeWidth="1.5" fill="none" />
                <path d="M21 17l-5-5-3 3-2-2-5 5" stroke="#1A535C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="w-16 h-16 rounded-xl bg-petrol/5 border-2 border-dashed border-petrol/20 flex items-center justify-center">
              <span className="text-[10px] text-muted/30">No uploads</span>
            </div>
          </div>

          {/* Status */}
          <p className="text-xs font-semibold text-ink/60 mb-2">Status</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#FAE5E0] text-[#943520]">
              In uitvoering<span className="text-flame">.</span>
            </span>
            <div className="w-3 h-3 rounded-full bg-flame" />
          </div>
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around py-2 bg-white border-t border-[#E6E4E0]">
          {['home', 'grid', 'calendar', 'mail', 'settings'].map((icon, i) => (
            <div key={i} className={`w-6 h-6 rounded-md ${i === 0 ? 'bg-petrol/10' : 'bg-transparent'} flex items-center justify-center`}>
              <div className={`w-3.5 h-3.5 rounded-sm ${i === 0 ? 'bg-petrol/40' : 'bg-muted/20'}`} />
            </div>
          ))}
        </div>
      </div>
    </DeviceFrame>
  )
}
