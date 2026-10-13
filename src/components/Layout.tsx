import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, LayoutDashboard, LineChart, ChevronLeft, ChevronRight, LogOut, PiggyBank, Settings, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import { displayName, signOut } from '../services/auth'
import { cx, ErrorBox, Spinner, useToast } from './ui'

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Início', icon: LayoutDashboard, end: true },
  { to: '/transacoes', label: 'Transações', short: 'Transações', icon: ArrowLeftRight },
  { to: '/fluxo-de-caixa', label: 'Fluxo de caixa', short: 'Fluxo', icon: LineChart },
  { to: '/meta', label: 'Meta semanal', short: 'Meta', icon: PiggyBank },
  { to: '/configuracoes', label: 'Configurações', short: 'Ajustes', icon: Settings },
]

const SIDEBAR_KEY = 'sidebar-open'
const item = 'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition'

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1'
  } catch {
    return false
  }
}

export default function Layout() {
  const { loading, error, reload } = useData()
  const { user } = useAuth()
  const toast = useToast()
  const [leaving, setLeaving] = useState(false)
  const [open, setOpen] = useState(readSidebarOpen)
  const firstName = displayName(user).split(' ')[0]

  function toggleSidebar() {
    setOpen((value) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, value ? '0' : '1')
      } catch {
        /* sem armazenamento local: só não lembra a escolha */
      }
      return !value
    })
  }

  async function handleSignOut() {
    setLeaving(true)
    try {
      await signOut()
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível sair.'))
      setLeaving(false)
    }
  }

  return (
    <div className="min-h-dvh">
      {/* Barra lateral (desktop) */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-bg px-3.5 py-5 transition-[width] duration-200 md:flex',
          open ? 'w-56' : 'w-[72px]',
        )}
      >
        <div className="mb-8 flex h-10 items-center gap-3 px-0.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <TrendingUp className="h-5 w-5" />
          </div>
          {open && <span className="truncate font-display text-lg text-neutral-50">Gastei Tudo</span>}
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          title={open ? 'Recolher menu' : 'Abrir menu'}
          aria-label={open ? 'Recolher menu' : 'Abrir menu'}
          aria-expanded={open}
          className="absolute -right-3 top-[154px] flex h-6 w-6 items-center justify-center rounded-full bg-brand text-black shadow-md shadow-black/50 transition hover:bg-green-400"
        >
          {open ? <ChevronLeft className="h-4 w-4" strokeWidth={2.5} /> : <ChevronRight className="h-4 w-4" strokeWidth={2.5} />}
        </button>
        <nav className="flex flex-1 flex-col gap-2" aria-label="Principal">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={open ? undefined : label}
              aria-label={label}
              className={({ isActive }) =>
                cx(item, isActive ? 'bg-brand/10 text-brand' : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-100')
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {open && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={leaving}
          title={open ? undefined : 'Sair'}
          aria-label="Sair"
          className={cx(item, 'text-neutral-500 hover:bg-danger/10 hover:text-danger disabled:opacity-50')}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {open && <span className="truncate">Sair</span>}
        </button>
      </aside>

      {/* Topo (celular) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-sm md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="truncate font-display text-lg text-neutral-50">{firstName ? `Olá, ${firstName}` : 'Gastei Tudo'}</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={leaving}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-400 hover:text-danger disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </header>

      <div className={cx('transition-[padding] duration-200', open ? 'md:pl-56' : 'md:pl-[72px]')}>
        {/* Topo (desktop) */}
        {firstName && (
          <div className="hidden items-center justify-end gap-3 border-b border-line px-8 py-3 md:flex">
            <p className="truncate text-sm text-neutral-400">Olá, <span className="font-medium text-neutral-100">{firstName}</span></p>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold uppercase text-brand" aria-hidden>
              {firstName[0]}
            </div>
          </div>
        )}
        <main className="px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
          {loading ? <Spinner label="Carregando seus dados…" /> : error ? <ErrorBox message={error} onRetry={reload} /> : <Outlet />}
        </main>
      </div>

      {/* Barra inferior (celular) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
        aria-label="Principal"
      >
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition',
                isActive ? 'text-brand' : 'text-neutral-500',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
