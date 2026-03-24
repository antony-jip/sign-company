import DeviceFrame from './DeviceFrame'

export default function KlantportaalMockup({ className = '' }: { className?: string }) {
  return (
    <DeviceFrame type="tablet" className={className}>
      <div className="bg-[#FAFAF8]" style={{ minHeight: '300px' }}>
        {/* Header */}
        <div className="bg-petrol px-6 py-4">
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-white text-lg font-extrabold tracking-tight font-heading">Klantportaal</span>
            <span className="text-flame text-lg font-extrabold">.</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="text-base font-extrabold text-ink tracking-tight font-heading mb-0.5">
            Welkom bij uw project overzicht<span className="text-flame">.</span>
          </h2>
          <p className="text-xs text-muted mb-4">Welkom bij uw project overzicht ov project.</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Left: Overview stats */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-ink">Overview</span>
                <span className="text-[10px] text-petrol font-medium">Project portal &rarr;</span>
              </div>

              {/* Mini milestone chart */}
              <div className="bg-white rounded-xl p-3 border border-black/[0.05] mb-3" style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}>
                <div className="flex items-end gap-1 h-12">
                  {[20, 35, 45, 30, 55, 40, 60, 50, 70, 65, 75, 70, 80].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        backgroundColor: i < 5 ? '#E2F0F0' : i < 9 ? '#1A535C' : '#F15025',
                        opacity: i < 5 ? 0.6 : 1,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {['0', '3', '6', '9', '12', '15'].map((n, i) => (
                    <span key={i} className="text-[7px] text-muted/30">{n}</span>
                  ))}
                </div>
                {/* Milestone labels */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {[
                    { label: 'Project milestones', color: '#E2F0F0' },
                    { label: 'Project milestone', color: '#1A535C' },
                    { label: 'Project milestone', color: '#F15025' },
                  ].map((m, i) => (
                    <span
                      key={i}
                      className="text-[6px] px-1.5 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: m.color === '#E2F0F0' ? '#1A535C80' : m.color }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Facturen */}
            <div>
              <span className="text-xs font-semibold text-ink block mb-3">Mijn Facturen</span>
              <div className="space-y-2">
                {[
                  { label: 'Facturen', status: 'Betaald', statusBg: '#E2F0F0', statusColor: '#1A535C' },
                  { label: 'Facturen', status: 'Betaald', statusBg: '#E2F0F0', statusColor: '#1A535C' },
                ].map((f, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl p-3 border border-black/[0.05]"
                    style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-ink/60">{f.label}</p>
                      </div>
                      <span
                        className="text-[8px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: f.statusBg, color: f.statusColor }}
                      >
                        {f.status}<span className="text-flame">.</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-flame" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DeviceFrame>
  )
}
