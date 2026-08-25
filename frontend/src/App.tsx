import { Navigate, Route, Routes } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import PersonnelDashboard from './pages/personnel/Dashboard'
import CheckIn from './pages/personnel/CheckIn'
import Prediction from './pages/personnel/Prediction'
import PredictionDemo from './pages/personnel/PredictionDemo'
import AiAnalytics from './pages/personnel/AiAnalytics'
import History from './pages/personnel/History'
import Recommendations from './pages/personnel/Recommendations'
import Wellness from './pages/personnel/Wellness'
import Settings from './pages/personnel/Settings'
import PrivacyCenter from './pages/PrivacyCenter'
import NotificationCenter from './pages/Notifications'
import CommandDashboard from './pages/officer/CommandDashboard'
import PersonnelTable from './pages/officer/PersonnelTable'
import PersonnelDetail from './pages/officer/PersonnelDetail'
import OrganizationalAnalytics from './pages/officer/OrganizationalAnalytics'
import AdminDashboard from './pages/admin/AdminDashboard'
import Analytics from './pages/admin/Analytics'
import EarlyWarning from './pages/admin/EarlyWarning'
import AlertReview from './pages/admin/AlertReview'
import Interventions from './pages/admin/Interventions'
import Reports from './pages/admin/Reports'
import UserManagement from './pages/admin/UserManagement'
import AuditLogPage from './pages/admin/AuditLog'
import SystemSettings from './pages/admin/SystemSettings'

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === 'personnel' ? '/app'
      : user.role === 'commander' ? '/admin/command' : '/admin'} replace />
  }
  return <>{children}</>
}

const AGGREGATE_ROLES = ['welfare_officer', 'commander', 'administrator']
const OFFICER_ROLES = ['welfare_officer', 'administrator']

export default function App() {
  const { user } = useAuth()
  const home = user?.role === 'personnel' ? '/app'
    : user?.role === 'commander' ? '/admin/command' : '/admin'
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={home} replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Register />} />
      <Route path="/register" element={<Register />} />
      <Route path="/prediction" element={<Navigate to="/app/prediction-demo" replace />} />

      {/* shared authenticated shell */}
      <Route path="/notifications" element={<Protected><Layout /></Protected>}>
        <Route index element={<NotificationCenter />} />
      </Route>

      <Route path="/app" element={<Protected><Layout /></Protected>}>
        <Route index element={<PersonnelDashboard />} />
        <Route path="checkin" element={<CheckIn />} />
        <Route path="prediction" element={<Prediction />} />
        <Route path="prediction-demo" element={<PredictionDemo />} />
        <Route path="ai-analytics" element={<AiAnalytics />} />
        <Route path="history" element={<History />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="wellness" element={<Wellness />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* officer + commander aggregate workspace */}
      <Route path="/officer" element={<RoleRoute roles={AGGREGATE_ROLES}><Layout /></RoleRoute>}>
        <Route path="personnel" element={<RoleRoute roles={OFFICER_ROLES}><PersonnelTable /></RoleRoute>} />
        <Route path="personnel/:userId" element={<RoleRoute roles={OFFICER_ROLES}><PersonnelDetail /></RoleRoute>} />
      </Route>

      <Route path="/admin" element={<RoleRoute roles={AGGREGATE_ROLES}><Layout /></RoleRoute>}>
        <Route index element={<RoleRoute roles={OFFICER_ROLES}><AdminDashboard /></RoleRoute>} />
        <Route path="command" element={<CommandDashboard />} />
        <Route path="analytics-org" element={<OrganizationalAnalytics />} />
        <Route path="analytics" element={<RoleRoute roles={OFFICER_ROLES}><Analytics /></RoleRoute>} />
        <Route path="early-warning" element={<RoleRoute roles={OFFICER_ROLES}><EarlyWarning /></RoleRoute>} />
        <Route path="alerts" element={<RoleRoute roles={OFFICER_ROLES}><AlertReview /></RoleRoute>} />
        <Route path="interventions" element={<RoleRoute roles={OFFICER_ROLES}><Interventions /></RoleRoute>} />
        <Route path="reports" element={<RoleRoute roles={OFFICER_ROLES}><Reports /></RoleRoute>} />
        <Route path="users" element={<RoleRoute roles={['administrator']}><UserManagement /></RoleRoute>} />
        <Route path="system" element={<RoleRoute roles={['administrator']}><SystemSettings /></RoleRoute>} />
        <Route path="audit" element={<RoleRoute roles={['administrator']}><AuditLogPage /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
