import DeviceFrame from './DeviceFrame'

// Module colors from the actual app
const moduleColors = {
  projecten: { bg: '#E2F0F0', color: '#1A535C' },
  offertes: { bg: '#FDE8E2', color: '#F15025' },
  facturen: { bg: '#E4F0EA', color: '#2D6B48' },
  klanten: { bg: '#E5ECF6', color: '#3A6B8C' },
  werkbonnen: { bg: '#FAE5E0', color: '#C44830' },
  planning: { bg: '#F2E8E5', color: '#9A5A48' },
}

export default function DashboardMockup({ className = '' }: { className?: string }) {
  return (
    <DeviceFrame type="laptop" className={className}>
      <div className="flex h-[320px] md:h-[380px]">
        {/* Sidebar */}
        <div className="w-[52px] bg-[#FAFAF8] border-r border-[#E6E4E0] shrink-0 flex flex-col items-center py-3 gap-1">
          {/* Logo */}
          <div className="mb-3 flex items-baseline">
            <span className="text-[9px] font-extrabold text-petrol tracking-tight">d</span>
            <span className="text-[9px] text-flame font-extrabold">.</span>
          </div>

          {/* Nav items */}
          {[
            { label: 'Da', color: moduleColors.projecten.color, active: true },
            { label: 'Pr', color: moduleColors.projecten.color },
            { label: 'Of', color: moduleColors.offertes.color },
            { label: 'Fa', color: moduleColors.facturen.color },
            { label: 'Kl', color: moduleColors.klanten.color },
            { label: 'Wb', color: moduleColors.werkbonnen.color },
            { label: 'Pl', color: moduleColors.planning.color },
          ].map((item, i) => (
            <div
              key={i}
              className={`relative w-9 h-9 rounded-lg flex flex-col items-center justify-center cursor-default ${
                item.active ? 'bg-petrol/[0.08]' : ''
              }`}
            >
              {item.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-petrol" />
              )}
              <div
                className="w-4 h-4 rounded-md"
                style={{ backgroundColor: item.color + '20' }}
              >
                <div
                  className="w-full h-full rounded-md flex items-center justify-center text-[6px] font-bold"
                  style={{ color: item.color }}
                >
                  {item.label}
                </div>
              </div>
              <span className="text-[6px] text-muted/50 mt-[1px]">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 bg-[#FAFAF8] p-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-ink tracking-tight font-heading">Dashboard</h2>
            <div className="flex items-center gap-2">
              <div className="w-24 h-6 bg-white rounded-md border border-[#E6E4E0] flex items-center px-2">
                <span className="text-[8px] text-muted/30">Zoeken...</span>
              </div>
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Projecten', value: '12', gradient: 'linear-gradient(160deg, #E2F0F0 0%, #C8E0E2 100%)', color: '#1A535C' },
              { label: 'Offertes', value: '8', gradient: 'linear-gradient(160deg, #FDE8E2 0%, #F8D4C8 100%)', color: '#F15025' },
              { label: 'Facturen', value: '€14.200', gradient: 'linear-gradient(160deg, #E4F0EA 0%, #C8DED0 100%)', color: '#2D6B48' },
              { label: 'Openstaand', value: '€3.800', gradient: 'linear-gradient(160deg, #F2E8E5 0%, #E5D8D2 100%)', color: '#9A5A48' },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-[10px] p-2.5"
                style={{ background: stat.gradient }}
              >
                <p className="text-[7px] font-bold uppercase tracking-[0.08em]" style={{ color: stat.color + '90' }}>
                  {stat.label}
                </p>
                <p className="text-sm font-bold font-mono mt-1" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Project cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Gevelreclame De Vries', status: 'verstuurd', statusBg: '#FDE8E2', statusColor: '#C03A18', code: '#F15025' },
              { name: 'Wrapping Bakker BV', status: 'betaald', statusBg: '#E2F0F0', statusColor: '#1A535C', code: '#F15025' },
              { name: 'Lichtreclame Smit', status: 'in uitvoering', statusBg: '#FAE5E0', statusColor: '#943520', code: '#F15025' },
              { name: 'Signing Kantoor Jansen', status: 'betaald', statusBg: '#E2F0F0', statusColor: '#1A535C', code: '#F15025' },
            ].map((project, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 border border-black/[0.05]"
                style={{ boxShadow: '0 1px 3px rgba(100,80,40,0.04)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[8px] font-semibold text-ink/80 mb-0.5">{project.name}</p>
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[7px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: project.statusBg, color: project.statusColor }}
                      >
                        {project.status}<span style={{ color: '#F15025' }}>.</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-[7px] text-muted/40 font-mono">Flame</span>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.code }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DeviceFrame>
  )
}
