import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Receipt, Users, BarChart3,
  Settings, LogOut, Menu, X, ChevronRight
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

function Logo() {
  return (
    <img
      src="/logo.png"
      alt="Classic Glass & Stone Arts"
      className="h-10 w-auto object-contain"
    />
  )
}

function NavItem({ path, label, icon: Icon, onClick }: { path: string; label: string; icon: typeof LayoutDashboard; onClick?: () => void }) {
  const location = useLocation()
  const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-input text-sm font-medium transition-all duration-200 group',
        isActive
          ? 'bg-gold/10 text-gold border border-gold/20 shadow-gold'
          : 'text-text-muted hover:text-text hover:bg-surface-2'
      )}
    >
      <Icon size={18} className={cn(isActive ? 'text-gold' : 'text-text-muted group-hover:text-text', 'transition-colors')} />
      {label}
      {isActive && <ChevronRight size={14} className="ml-auto text-gold" />}
    </Link>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-border flex-shrink-0 shadow-sm">
        <div className="p-5 border-b border-border">
          <Logo />
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm font-medium text-text-muted hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => (
                <NavItem key={item.path} {...item} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="p-3 border-t border-border">
              <button
                onClick={signOut}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-input text-sm font-medium text-text-muted hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-text-muted hover:text-text">
            <Menu size={22} />
          </button>
          <Logo />
          <div className="w-6" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.slice(0, 5).map(({ path, label, icon: Icon }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-input text-xs transition-all',
                isActive ? 'text-gold' : 'text-text-muted'
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
