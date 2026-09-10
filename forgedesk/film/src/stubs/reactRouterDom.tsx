import type { ReactNode } from 'react'
// Router-stand-in: navigatie doet niets, Link is een <a>. Deterministisch.
export const useNavigate = () => () => {}
export const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null, key: 'film' })
export const useParams = () => ({}) as Record<string, string>
export const useSearchParams = () => [new URLSearchParams(), () => {}] as const
export const Link = ({ to, children, ...rest }: { to: string; children?: ReactNode; [k: string]: unknown }) => (
  <a href={String(to)} {...rest}>{children}</a>
)
export const NavLink = Link
export const MemoryRouter = ({ children }: { children?: ReactNode }) => <>{children}</>
export const Navigate = () => null
export const Outlet = () => null
