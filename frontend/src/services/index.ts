import { get, post, put } from '../api/client'
import type {
  AdminUser, AlertT, AnalyticsSummary, AssessmentRow, AuditEntry, CommandDashboard,
  DutyT, HistoryItem, InsightItem, InterventionT, LeaveSummary, ModelConfigT, NotificationT,
  PersonnelDetailT, PersonnelRow, Prediction, PredictionHistory, PrivacyOverview,
  RecommendationItem, ReportT, UnitStat, User,
} from '../types'

/* ---------- auth ---------- */
export const login = (login_id: string, password: string, otp?: string) =>
  post<{ access_token: string; user: User }>('/auth/login', { login_id, password, otp })

export interface TwoFaRequired {
  code: '2fa_required'
  message: string
}
export const forgotPassword = (login_id: string) =>
  post<{ message: string; reset_token?: string; expires_in_minutes?: number }>(
    '/auth/forgot-password', { login_id })
export const resetPassword = (token: string, new_password: string) =>
  post<{ message: string }>('/auth/reset-password', { token, new_password })
export const setup2fa = (enabled: boolean) =>
  post<{ twofa_enabled: boolean; demo_code: string | null }>('/auth/2fa/setup', { enabled })
export const fetch2faStatus = () =>
  get<{ twofa_enabled: boolean }>('/auth/2fa/status')

export interface RegisterPayload {
  full_name: string
  email: string
  phone?: string
  designation?: string
  unit_id?: number | null
  password: string
}
export const register = (payload: RegisterPayload) =>
  post<{ access_token: string; user: User }>('/auth/register', payload)
export const fetchUnits = () => get<{ items: { id: number; name: string }[] }>('/auth/units')

/* ---------- personnel ---------- */
export const fetchProfile = () => get<User>('/personnel/profile')
export const updateProfile = (payload: Partial<User>) => put<User>('/personnel/profile', payload)
export const changePassword = (current_password: string, new_password: string) =>
  post<{ message: string }>('/personnel/change-password', { current_password, new_password })

export const fetchAssessments = (days = 30) =>
  get<{ items: AssessmentRow[]; count: number }>(`/personnel/assessments?days=${days}`)
export const submitCheckIn = (payload: Record<string, unknown>) =>
  post<{ message: string; prediction_id: number; prediction: Prediction }>('/personnel/assessments', payload)

export const fetchLatestPrediction = () => get<Prediction | null>('/personnel/predictions/latest')
export const fetchPredictionHistory = () => get<PredictionHistory>('/personnel/predictions/history')
export const runPrediction = (features: Record<string, number>) =>
  post<Prediction>('/personnel/predictions', features)
export const runDemoPrediction = (features: Record<string, number>) =>
  post<import('../types').DemoPrediction>('/ai/demo-predict', features)

export const fetchRecommendations = (status?: string) =>
  get<{ items: RecommendationItem[] }>(
    `/personnel/recommendations${status ? `?status=${status}` : ''}`)
export const recommendAction = (id: number, action: string) =>
  post<{ message: string }>(`/personnel/recommendations/${id}/action`, { action })
export const scheduleReminder = () =>
  post<{ message: string; next_check_in: string; reminder_set: boolean }>(
    '/personnel/follow-up/reminder')

export const fetchConsent = () => get<Record<string, unknown>>('/personnel/consent')
export const updateConsent = (payload: Record<string, boolean>) =>
  put<{ message: string }>('/personnel/consent', payload)

export const fetchDuties = () => get<{ items: DutyT[] }>('/personnel/duties')
export const fetchLeave = () => get<LeaveSummary>('/personnel/leave')

export const fetchNotifications = (unreadOnly = false) =>
  get<{ items: NotificationT[]; unread_count: number }>(
    `/personnel/notifications${unreadOnly ? '?unread_only=true' : ''}`)
export const markNotificationRead = (id: number) =>
  post<{ ok: boolean }>(`/personnel/notifications/${id}/read`)
export const markAllNotificationsRead = () => post<{ ok: boolean }>('/personnel/notifications/read-all')

export const chatWithAssistant = (messages: { role: 'user' | 'assistant'; content: string }[]) =>
  post<{ reply: string; disclaimer: string }>('/personnel/assistant/chat', { messages })

export const exportMyData = () => get<Record<string, unknown>>('/personnel/export-data')

/* ---------- ai / analytics ---------- */
export const fetchModelInfo = () => get<Record<string, any>>('/ai/model-info')
export const fetchUnitTrends = (days = 30) =>
  get<{ window_days: number; units: { unit: string; avg_workload: number; avg_fatigue: number;
    avg_sleep: number; assessments: number }[] }>(`/ai/analytics/unit-trends?days=${days}`)

/* ---------- welfare ---------- */
export const fetchAlerts = (params = '') => get<{ items: AlertT[]; open_counts: Record<string, number> }>(
  `/welfare/alerts${params ? `?${params}` : ''}`)
export const reviewAlert = (id: number, decision: string, notes?: string, assign_officer_id?: number) =>
  post<{ message: string; intervention_id: number | null }>(`/welfare/alerts/${id}/review`,
    { decision, notes, assign_officer_id })

export const fetchInterventions = (params = '') =>
  get<{ items: InterventionT[]; counts: Record<string, number> }>(
    `/welfare/interventions${params ? `?${params}` : ''}`)
export const createIntervention = (payload: Record<string, unknown>) =>
  post<{ message: string; id: number }>('/welfare/interventions', payload)
export const updateIntervention = (id: number, payload: Record<string, unknown>) =>
  put<{ message: string; changes: string[] }>(`/welfare/interventions/${id}`, payload)

export const fetchReportsList = () => get<{ items: ReportT[] }>('/welfare/reports/list')
export const fetchOverviewReport = () => get<Record<string, any>>('/welfare/reports/overview')

/* ---------- officer / commander v2 ---------- */
export const fetchCommandDashboard = () => get<CommandDashboard>('/welfare/command-dashboard')
export const fetchPersonnelTable = (params = '') =>
  get<{ items: PersonnelRow[] }>(`/welfare/personnel-table${params ? `?${params}` : ''}`)
export const fetchPersonnelDetail = (userId: number | string) =>
  get<PersonnelDetailT>(`/welfare/personnel/${userId}/detail`)
export const fetchWelfareOfficers = () =>
  get<{ items: { id: number; name: string; designation: string }[] }>('/welfare/officers')
export const setAlertStatus = (id: number, status: string, assign_officer_id?: number) =>
  put<{ message: string; status: string; assigned_officer?: string }>(
    `/welfare/alerts/${id}/status`, { status, assign_officer_id })

/* ---------- analytics + insights ---------- */
export const fetchAnalyticsSummary = (rangeDays = 30) =>
  get<AnalyticsSummary>(`/analytics/summary?range_days=${rangeDays}`)
export const fetchInsights = () =>
  get<{ items: InsightItem[]; label: string }>('/analytics/insights')

/* ---------- privacy center ---------- */
export const fetchPrivacyOverview = () => get<PrivacyOverview>('/privacy/overview')

/* ---------- admin ---------- */
export const fetchAnalyticsOverview = (days = 30) => get<Record<string, any>>(`/admin/analytics/overview?days=${days}`)
export const fetchRiskDistribution = () => get<Record<string, number>>('/admin/analytics/risk-distribution')
export const fetchUnitStats = () => get<{ units: UnitStat[] }>('/admin/analytics/units')
export const fetchAdminUsers = (q = '', role = '') =>
  get<{ items: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ''}`)
export const createAdminUser = (payload: Record<string, unknown>) => post<AdminUser>('/admin/users', payload)
export const updateAdminUser = (id: number, payload: Record<string, unknown>) =>
  put<{ message: string; changes: string[] }>(`/admin/users/${id}`, payload)
export const resetUserPassword = (id: number) =>
  post<{ message: string }>(`/admin/users/${id}/reset-password`)
export const broadcastNotification = (title: string, body: string) =>
  post<{ message: string }>('/admin/notifications/broadcast', { title, body })

export const fetchAdminUnits = () =>
  get<{ items: { id: number; name: string; code: string; location: string; strength: number }[] }>(
    '/admin/units')
export const createAdminUnit = (payload: Record<string, unknown>) =>
  post<{ message: string; id: number }>('/admin/units', payload)
export const updateAdminUnit = (id: number, payload: Record<string, unknown>) =>
  put<{ message: string }>(`/admin/units/${id}`, payload)
export const fetchSystemSettings = () =>
  get<{ notifications: Record<string, unknown>; system: Record<string, unknown> }>('/admin/settings')
export const saveSystemSettings = (payload: Record<string, unknown>) =>
  put<{ message: string }>('/admin/settings', payload)
export const fetchModelConfig = () => get<ModelConfigT>('/admin/model-config')
export const saveModelConfig = (payload: Record<string, unknown>) =>
  put<{ message: string }>('/admin/model-config', payload)
export const retrainModel = () => post<{ message: string; metrics: Record<string, number> }>(
  '/admin/model/retrain')
export const fetchPermissionsMatrix = () =>
  get<{ roles: { role: string; permissions: string[] }[] }>('/admin/permissions')
