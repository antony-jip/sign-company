import AdminNav from '@/components/admin/AdminNav'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Beheer · Kunstdoekje',
  robots: { index: false, follow: false },
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}
