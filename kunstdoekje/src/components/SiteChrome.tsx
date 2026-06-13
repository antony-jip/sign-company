'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Toont de marketing-navbar + footer op de site, maar verbergt ze op /admin
 * zodat de beheeromgeving een eigen, schone chrome heeft. De navbar/footer
 * worden als props (server-rendered nodes) doorgegeven en alleen op de site
 * daadwerkelijk in de boom gezet.
 */
export default function SiteChrome({
  navbar,
  footer,
  children,
}: {
  navbar: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) {
    return <main className="flex-1">{children}</main>
  }
  return (
    <>
      {navbar}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  )
}
