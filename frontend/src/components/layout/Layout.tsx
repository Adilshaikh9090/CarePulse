import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, BarChart3, Bell, BrainCircuit, CalendarCheck, ClipboardList,
  FileBarChart2, HeartPulse, LayoutDashboard, LogOut, Menu, Radar, Settings,
  ShieldAlert, ShieldCheck, Sparkles, UserCog, Users, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ThemeToggle } from '../ThemeToggle'
import AuroraBackground from '../visuals/AuroraBackground'
import * as api from '../../services'
import type { NotificationT } from '../../types'
import { FOOTER_NOTE } from '../../types'
import { fmtDateTime, initials } from '../../utils/format'

interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean; roles?: string[] }

const PERSONNEL_NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/checkin', label: 'Daily Check-In', icon: CalendarCheck },
  { to: '/app/prediction', label: 'AI Prediction', icon: BrainCircuit },
  { to: '/app/ai-analytics', label: 'AI Analytics', icon: Sparkles },
  { to: '/app/history', label: 'My History', icon: Activity },
  { to: '/app/recommendations', label: 'Recommendations', icon: HeartPulse },
  { to: '/app/wellness', label: 'Wellness Hub', icon: HeartPulse },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

const OFFICER_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['welfare_officer', 'administrator'] },
  { to: '/admin/command', label: 'Command Wellness', icon: Radar, end: true, roles: ['commander'] },
  { to: '/officer/personnel', label: 'Personnel Register', icon: Users, roles: ['welfare_officer', 'administrator'] },
  { to: '/admin/analytics-org', label: 'Org Analytics', icon: BarChart3 },
  { to: '/admin/early-warning', label: 'Early Warning', icon: ShieldAlert, roles: ['welfare_officer', 'administrator'] },
  { to: '/admin/alerts', label: 'Alert Review', icon: ClipboardList, roles: ['welfare_officer', 'administrator'] },
  { to: '/admin/interventions', label: 'Interventions', icon: HeartPulse, roles: ['welfare_officer', 'administrator'] },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart2, roles: ['welfare_officer', 'administrator'] },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/system', label: 'System Settings', icon: UserCog },
  { to: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
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

  const isAdminArea = location.pathname.startsWith('/admin') || location.pathname.startsWith('/officer')
  const nav = (isAdminArea
    ? [...OFFICER_NAV, ...(user?.role === 'administrator' ? ADMIN_NAV : [])]
    : PERSONNEL_NAV
  ).filter((n) => !n.roles || (user && n.roles.includes(user.role)))

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
    <>
      <AuroraBackground density={0.45} />
      <div className="relative flex min-h-screen text-slate-200">
      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-navy-900 transition-transform lg:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
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
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'text-sky-200' : 'text-slate-400 hover:bg-hoverc hover:text-slate-200'
                }`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-sky-500/15 ring-1 ring-sky-500/30"
                    />
                  )}
                  <Icon size={17} className="relative z-10" />
                  <span className="relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <button
            onClick={() => { signOut(); navigate('/login') }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 hover:bg-hoverc hover:text-rose-300"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* main */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-navy-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <button className="text-slate-400 lg:hidden" onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden sm:block">
            <p className="text-xs text-slate-500">
              {isAdminArea ? 'Welfare & Administration Workspace' : 'Personal Wellbeing Space'}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3" ref={notifRef}>
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={openNotifs}
                className="relative rounded-xl p-2 text-slate-400 ring-1 ring-linestrong hover:bg-hoverc hover:text-slate-200"
                aria-label="Notifications"
              >
                <Bell size={17} />
                {unread > 0 && (
                  <motion.span
                    key={unread}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: [1, 1.18, 1], opacity: 1 }}
                    transition={{
                      scale: { duration: 0.5, repeat: Infinity, repeatDelay: 2.6 },
                      opacity: { duration: 0.2 },
                    }}
                    className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-rose-500/40"
                  >
                    {unread}
                  </motion.span>
                )}
              </button>
              <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 max-h-[420px] w-80 overflow-y-auto rounded-2xl bg-navy-800 ring-1 ring-linestrong card-elevate"
                >
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <p className="text-xs font-semibold text-slate-200">Notifications</p>
                    <div className="flex items-center gap-3">
                      <button onClick={markAll} className="text-[11px] text-sky-300 hover:text-sky-200">
                        Mark all read
                      </button>
                      <NavLink to="/notifications" onClick={() => setNotifOpen(false)}
                               className="text-[11px] font-medium text-violet-300 hover:text-violet-200">
                        View all
                      </NavLink>
                    </div>
                  </div>
                  {notifs.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">No notifications yet.</p>}
                  {notifs.map((n) => {
                    const IconFor = n.category === 'checkin_reminder' ? CalendarCheck
                      : n.category === 'support' ? HeartPulse
                      : n.category === 'alert' ? ShieldAlert
                      : Bell
                    return (
                      <div key={n.id} className={`flex items-start gap-2.5 border-b border-line px-4 py-3 last:border-0 ${!n.read ? 'bg-sky-500/[0.06]' : ''}`}>
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${
                          n.category === 'alert' ? 'bg-rose-500/10 text-rose-300 ring-rose-500/25'
                            : n.category === 'support' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25'
                            : 'bg-sky-500/10 text-sky-300 ring-sky-500/25'}`}>
                          <IconFor size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-100">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-400">{n.body}</p>
                          <p className="mt-1 text-[10px] text-slate-600">{fmtDateTime(n.created_at)}</p>
                        </div>
                        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-400" />}
                      </div>
                    )
                  })}
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-subtle py-1.5 pl-1.5 pr-3 ring-1 ring-linestrong">
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

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 py-6 lg:px-8 lg:pb-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t border-line px-4 py-3 text-center text-[11px] text-slate-600 lg:px-8">
          {FOOTER_NOTE} · All data is synthetic and stored locally.
        </footer>
      </div>

      {/* mobile bottom navigation */}
      <MobileBottomNav isAdminArea={isAdminArea} />
      </div>
    </>
  )
}

function MobileBottomNav({ isAdminArea }: { isAdminArea: boolean }) {
  const { user } = useAuth()
  if (!user) return null
  const items = isAdminArea
    ? [
        ...(user.role === 'commander'
          ? [{ to: '/admin/command', label: 'Home', icon: Radar }]
          : [{ to: '/admin', label: 'Home', icon: LayoutDashboard }]),
        { to: '/admin/analytics-org', label: 'Analytics', icon: BarChart3 },
        { to: '/admin/early-warning', label: 'Alerts', icon: ShieldAlert },
        { to: '/notifications', label: 'Inbox', icon: Bell },
        ...(user.role === 'welfare_officer' || user.role === 'administrator'
          ? [{ to: '/officer/personnel', label: 'People', icon: Users }]
          : []),
      ]
    : [
        { to: '/app', label: 'Home', icon: LayoutDashboard },
        { to: '/app/checkin', label: 'Check-in', icon: CalendarCheck },
        { to: '/app/ai-analytics', label: 'Insights', icon: Sparkles },
        { to: '/notifications', label: 'Inbox', icon: Bell },
        { to: '/app/settings', label: 'Profile', icon: Settings },
      ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-line bg-navy-900/95 backdrop-blur lg:hidden">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/app' || to === '/admin'}
                 className={({ isActive }) =>
                   `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium transition-colors ${
                     isActive ? 'text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}>
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

