const META: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Betaald', cls: 'border-green-300 bg-green-100 text-green-800' },
  pending: { label: 'In behandeling', cls: 'border-amber-300 bg-amber-100 text-amber-800' },
  open: { label: 'Open', cls: 'border-ink/20 bg-ink/10 text-ink' },
  failed: { label: 'Mislukt', cls: 'border-red-300 bg-red-100 text-red-700' },
  expired: { label: 'Verlopen', cls: 'border-red-200 bg-red-50 text-red-600' },
  canceled: { label: 'Geannuleerd', cls: 'border-ink/20 bg-ink/10 text-ink/60' },
  refunded: { label: 'Terugbetaald', cls: 'border-blue-300 bg-blue-100 text-blue-700' },
}

export function statusLabel(status: string): string {
  return META[status]?.label ?? status
}

export default function StatusBadge({ status }: { status: string }) {
  const m = META[status] ?? { label: status, cls: 'border-ink/20 bg-ink/10 text-ink' }
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>
      {m.label}
    </span>
  )
}
