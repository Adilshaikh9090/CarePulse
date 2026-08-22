import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, BarChart3, Bell, CalendarCheck, BrainCircuit, ClipboardList,
  FileBarChart2, HeartPulse, LayoutDashboard, LogOut, Menu, Settings,
  ShieldAlert, Sparkles, UserCog, Users, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import * as api from '../../services'
import type { NotificationT } from '../../types'
import { FOOTER_NOTE } from '../../types'
import { fmtDateTime, initials } from '../../utils/format'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

const PERSONNEL_NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/checkin', label: 'Daily Check-In', icon: CalendarCheck },
  { to: '/app/prediction', label: 'AI Prediction', icon: BrainCircuit },
  { to: '/app/history', label: 'My History', icon: Activity },
  { to: '/app/recommendations', label: 'Recommendations', icon: Sparkles },
  { to: '/app/wellness', label: 'Wellness Hub', icon: HeartPulse },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

const OFFICER_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/early-warning', label: 'Early Warning', icon: ShieldAlert },
  { to: '/admin/alerts', label: 'Alert Review', icon: ClipboardList },
  { to: '/admin/interventions', label: 'Interventions', icon: HeartPulse },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/audit', label: 'Audit Log', icon: UserCog },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotificationT[]>([])
  const [unread, setUnread] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const isAdminArea = location.pathname.startsWith('/admin')
  const nav = isAdminArea
    ? [...OFFICER_NAV, ...(user?.role === 'administrator' ? ADMIN_NAV : [])]
    : PERSONNEL_NAV

  const loadNotifs = () => {
    api.fetchNotifications().then((d) => {
      setNotifs(d.items)
      setUnread(d.unread_count)
    }).catch(() => undefined)
  }

  useEffect(loadNotifs, [])
  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAll = async () => {
    await api.markAllNotificationsRead()
    loadNotifs()
  }

  const openNotifs = async () => {
    setNotifOpen((v) => !v)
    if (!notifOpen) loadNotifs()
  }

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-200">
      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-navy-900 transition-transform lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30">
            <HeartPulse size={18} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-50">PersonnelAI</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Welfare Monitoring</p>
          </div>
          <button className="ml-auto text-slate-400 lg:hidden" onClick={() => setDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            onClick={() => navigate(isAdminArea ? '/app' : '/admin')}
            className="mb-2 w-full rounded-xl bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300 ring-1 ring-white/10 hover:bg-white/[0.07]"
          >
            Switch to {isAdminArea ? 'personal view' : 'command view'}
          </button>
          <button
            onClick={() => { signOut(); navigate('/login') }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* main */}
      <div className="flex min-h-screen w-full flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/5 bg-navy-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="text-slate-400 lg:hidden" onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden sm:block">
            <p className="text-xs text-slate-500">
              {isAdminArea ? 'Welfare & Administration Workspace' : 'Personal Wellbeing Space'}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3" ref={notifRef}>
            <div className="relative">
              <button
                onClick={openNotifs}
                className="relative rounded-xl p-2 text-slate-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-slate-200"
                aria-label="Notifications"
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 max-h-[420px] w-80 overflow-y-auto rounded-2xl bg-navy-800 shadow-xl ring-1 ring-white/10">
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-200">Notifications</p>
                    <button onClick={markAll} className="text-[11px] text-sky-300 hover:text-sky-200">
                      Mark all read
                    </button>
                  </div>
                  {notifs.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">No notifications yet.</p>}
                  {notifs.map((n) => (
                    <div key={n.id} className={`border-b border-white/5 px-4 py-3 last:border-0 ${!n.read ? 'bg-sky-500/[0.06]' : ''}`}>
                      <p className="text-xs font-semibold text-slate-100">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">{n.body}</p>
                      <p className="mt-1 text-[10px] text-slate-600">{fmtDateTime(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] py-1.5 pl-1.5 pr-3 ring-1 ring-white/10">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-[11px] font-bold text-white">
                {user ? initials(user.full_name) : '?'}
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-xs font-semibold text-slate-100">{user?.full_name}</span>
                <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                  {user?.role.replace('_', ' ')} · {user?.personnel_id}
                </span>
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-white/5 px-4 py-3 text-center text-[11px] text-slate-600 lg:px-8">
          {FOOTER_NOTE} · All data is synthetic and stored locally.
        </footer>
      </div>
    </div>
  )
}

