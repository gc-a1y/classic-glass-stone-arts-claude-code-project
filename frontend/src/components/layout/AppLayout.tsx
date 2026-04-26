import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Receipt, Users, BarChart3,
  Settings, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

function SidebarLogo() {
  return (
    <div>
      <img src="/logo.png" alt="Classic Glass & Stone Arts" className="h-10 w-auto object-contain" />
      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.18em] mt-2 pl-0.5">
        Business Portal
      </p>
    </div>
  )
}

function NavItem({ path, label, icon: Icon, onClick }: {
  path: string; label: string; icon: typeof LayoutDashboard; onClick?: () => void
}) {
  const location = useLocation()
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium transition-all duration-150 group',
        isActive
          ? 'bg-gold/[0.07] text-gold'
          : 'text-text-muted hover:text-text hover:bg-surface-2'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-gold rounded-r-full" />
      )}
      <Icon
        size={17}
        strokeWidth={isActive ? 2.2 : 1.8}
        className={cn(
          'flex-shrink-0 transition-colors',
          isActive ? 'text-gold' : 'text-text-muted group-hover:text-text'
        )}
      />
      <span>{label}</span>
    </Link>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border flex-shrink-0">
        <div className="px-5 py-5 border-b border-border">
          <SidebarLogo />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm font-medium text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-150"
          >
            <LogOut size={17} strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-text/20 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-border flex flex-col animate-slide-in-left"
            style={{ boxShadow: '4px 0 24px rgba(26,23,20,0.10)' }}
          >
            <div className="px-5 py-5 border-b border-border flex items-start justify-between">
              <SidebarLogo />
              <button
                onClick={() => setMobileOpen(false)}
                className="text-text-muted hover:text-text p-1 mt-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.path} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="p-3 border-t border-border">
              <button
                onClick={signOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm font-medium text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-150"
              >
                <LogOut size={17} strokeWidth={1.8} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-border flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-text-muted hover:text-text p-2 -ml-2 rounded-input transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <img src="/logo.png" alt="Classic Glass & Stone Arts" className="h-8 w-auto object-contain" />
          <div className="w-10" />
        </header>

        {/* Page Content — key prop triggers entrance animation on route change */}
        <main className="flex-1 overflow-y-auto">
          <div
            key={location.pathname}
            className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-slide-up pb-24 md:pb-8"
          >
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.slice(0, 5).map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-semibold uppercase tracking-wide transition-colors',
                isActive ? 'text-gold' : 'text-text-muted'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
