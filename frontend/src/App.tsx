import { Navigate, Route, Routes } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import PersonnelDashboard from './pages/personnel/Dashboard'
import CheckIn from './pages/personnel/CheckIn'
import Prediction from './pages/personnel/Prediction'
import History from './pages/personnel/History'
import Recommendations from './pages/personnel/Recommendations'
import Wellness from './pages/personnel/Wellness'
import Settings from './pages/personnel/Settings'
import AdminDashboard from './pages/admin/AdminDashboard'
import Analytics from './pages/admin/Analytics'
import EarlyWarning from './pages/admin/EarlyWarning'
import AlertReview from './pages/admin/AlertReview'
import Interventions from './pages/admin/Interventions'
import Reports from './pages/admin/Reports'
import UserManagement from './pages/admin/UserManagement'
import AuditLogPage from './pages/admin/AuditLog'

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={user.role === 'personnel' ? '/app' : '/admin'} replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'personnel' ? '/app' : '/admin'} replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />

      <Route path="/app" element={<Protected><Layout /></Protected>}>
        <Route index element={<PersonnelDashboard />} />
        <Route path="checkin" element={<CheckIn />} />
        <Route path="prediction" element={<Prediction />} />
        <Route path="history" element={<History />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="wellness" element={<Wellness />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/admin" element={
        <RoleRoute roles={['welfare_officer', 'administrator']}><Layout /></RoleRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="early-warning" element={<EarlyWarning />} />
        <Route path="alerts" element={<AlertReview />} />
        <Route path="interventions" element={<Interventions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<RoleRoute roles={['administrator']}><UserManagement /></RoleRoute>} />
        <Route path="audit" element={<RoleRoute roles={['administrator']}><AuditLogPage /></RoleRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
