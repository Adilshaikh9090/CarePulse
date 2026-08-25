export type Role = 'personnel' | 'welfare_officer' | 'commander' | 'administrator'

export interface User {
  id: number
  personnel_id: string
  full_name: string
  role: Role
  unit: string | null
  designation: string
  joining_date: string
  email: string
  phone: string
  twofa_enabled?: boolean
}

export interface RiskFactorT {
  name: string
  impact: number
  direction: 'increasing' | 'decreasing'
  description: string
}

export interface SubScores {
  stress: number
  burnout: number
  fatigue: number
}

export interface Prediction {
  id?: number
  created_at?: string
  timestamp?: string
  risk_level: RiskLevel
  risk_score: number
  confidence: number
  model_version: string
  sub_scores?: SubScores | null
  top_factors: RiskFactorT[]
  all_factors?: RiskFactorT[]
  explanation: string
  recommendations: string[]
  recommendation_items?: RecommendationItem[]
  follow_up?: FollowUp
  disclaimer: string
}

export interface AssessmentRow {
  date: string
  feeling: number
  sleep_quality: number
  fatigue: number
  workload: number
  job_satisfaction: number
  duty_hours: number
  overtime: boolean
  rest_breaks: 'Adequate' | 'Limited' | 'None'
  comment: string | null
}

export interface HistoryItem {
  id: number
  date: string
  iso_date: string
  risk_level: RiskLevel
  risk_score: number
  confidence: number
}

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical'

export interface PredictionHistory {
  items: HistoryItem[]
  counts: Record<RiskLevel, number>
  trend: 'rising' | 'improving' | 'stable'
}

export type RecTier = 'high' | 'recommended' | 'optional'

export interface RecommendationItem {
  id: number
  title: string
  reason: string
  timeframe: string
  priority: number
  status: 'pending' | 'accepted' | 'dismissed' | 'completed'
  tier?: RecTier | null
  category?: string | null
  actions?: string[] | null
  support_text?: string | null
  snoozed_until?: string | null
  created_at: string
}

export interface FollowUp {
  cadence_days: number
  last_checkin: string | null
  next_recommended: string
  days_until: number
  reminder_set: boolean
}

export interface PlanStep {
  title: string
  reason: string
  timeframe: string
  actions: string[]
  tier: RecTier
  category?: string
  support?: { title: string; lines: string[] }
}

export interface DemoPrediction {
  is_demo: true
  risk_level: RiskLevel
  risk_score: number
  confidence: number
  model_version: string
  explanation: string
  top_factors: RiskFactorT[]
  all_factors?: RiskFactorT[]
  recommendations: string[]
  plan: PlanStep[]
  disclaimer: string
}

export interface NotificationT {
  id: number
  category: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export type AlertSeverity = 'critical' | 'high' | 'moderate' | 'low'
export type AlertStatus = 'new' | 'reviewing' | 'assigned' | 'resolved' | 'closed_no_action'

export interface AlertT {
  id: number
  code: string
  scope: 'individual' | 'unit'
  title: string
  severity: AlertSeverity
  detected_at: string
  factors: string[]
  recommendation: string
  status: string
  subject_label: string
  reason_code?: string | null
  assigned_officer_name?: string | null
}

export interface DutyT {
  id: number
  title: string
  date: string
  shift: string
  location: string
}

export interface LeaveEntitlement {
  type: string
  entitled: number
  used: number
  pending: number
  remaining: number
}

export interface LeaveSummary {
  year: number
  summary: Record<string, { entitled: number; used: number; pending: number; remaining: number }>
  recent: { id: number; type: string; days: number; start: string; end: string; status: string }[]
}

export interface CommandDashboard {
  risk_counts: Record<RiskLevel, number>
  unit_risk: { unit: string; low: number; moderate: number; high: number; critical: number; total: number }[]
  workforce_wellness_score: number
  active_checkins_today: number
  weekly_stress: { week: string; value: number }[]
  burnout_trend: { week: string; burnout: number }[]
  fatigue_trend: { week: string; fatigue: number }[]
  open_interventions: number
  needs_followup: { anon_id: string; level: RiskLevel; last_checkin: string | null }[]
  department_distribution: { department: string; count: number }[]
  generated_at: string
  note: string
}

export interface PersonnelRow {
  personnel_id: string | null
  display_name: string | null
  anon_id: string
  unit: string
  risk_level: RiskLevel
  stress_score: number | null
  burnout_score: number | null
  fatigue_score: number | null
  last_checkin: string | null
  deployment_status: string | null
  follow_up_status: 'none' | string
  user_id?: number
}

export interface PersonnelDetailT {
  profile: {
    anon_id: string
    unit: string | null
    designation: string | null
    deployment_status: string | null
    years_of_service: number | null
    leave_balance_summary: string | null
  }
  latest_prediction: (Prediction & { sub_scores?: SubScores | null }) | null
  trends: { date: string; stress_index: number | null; sleep_quality: number | null; workload: number | null }[]
  recent_checkins: { date: string; feeling: number; sleep_quality: number; workload: number;
    energy_level: number | null; emotional_fatigue: number | null; comment: string | null }[]
  deployments: { type: string; location: string; intensity: string; started_on: string;
    ended_on: string | null; status: string }[]
  leave_records: { type: string; days: number; start_date: string; end_date: string; status: string }[]
  interventions: InterventionT[]
}

export interface InsightItem {
  id: string
  tone: string
  title: string
  body: string
}

export interface AnalyticsSummary {
  range_days: number
  heatmap: { days: string[]; rows: { unit: string; values: (number | null)[] }[] }
  stress_trend: { date: string; value: number }[]
  burnout_trend: { week: string; burnout: number }[]
  fatigue_trend: { week: string; fatigue: number }[]
  risk_trend: Record<string, number>[]
  unit_comparison: { unit: string; workload: number; fatigue: number; stress: number; checkins: number }[]
  workload_analysis: { bucket: string; count: number; avg_stress: number }[]
  correlations: {
    workload_vs_stress: { workload_bucket: string; avg_stress: number; n: number }[]
    sleep_vs_stress: { sleep: number; avg_stress: number; n: number }[]
    deployment_vs_risk: { type: string; avg_risk: number; n: number }[]
  }
  leave_utilization: Record<string, { used: number; entitled: number; pct: number }>
  intervention_effectiveness: { total: number; completed: number; completion_rate: number;
    avg_days_to_complete: number | null }
  note: string
  generated_at: string
}

export interface PrivacyOverview {
  what_why_who: { item: string; why: string; who: string }[]
  rbac_matrix: { role: string; access: string; individual_data: boolean }[]
  my_data_counts: { checkins: number; predictions: number; recommendations: number }
  encryption: Record<string, string>
  retention: { data: string; retention: string }[]
  consent: { wellbeing_checkins: boolean; optional_feedback: boolean;
    notifications_enabled: boolean; biometric_consent: boolean }
  biometrics: { enabled_by_default: boolean; status: string; metrics: string[]; notice: string }
  access_history: AuditEntry[]
  generated_at: string
}

export interface ModelConfigT {
  model_version: string
  algorithm: string
  training_records: number
  features: number
  metrics: Record<string, number>
  thresholds: { moderate_min: number; high_min: number; critical_min: number; confidence_floor: number }
  retrain_available: boolean
  note: string
}

export interface InterventionT {
  id: number
  subject_label: string
  risk_level: string
  action: string
  officer: string
  created_at: string
  due_date: string | null
  status: 'pending' | 'in_review' | 'support_offered' | 'completed'
  notes: string
}

export interface ReportT {
  id: number
  title: string
  category: string
  period: string
  generated_by: string
  created_at: string
}

export interface AuditEntry {
  timestamp: string
  actor: string
  role: string
  action: string
  resource: string
}

export interface AdminUser {
  id: number
  personnel_id: string
  full_name: string
  role: Role
  unit: string | null
  designation: string
  email: string
  phone: string
  active: boolean
  joining_date: string
}

export interface UnitStat {
  id: number
  name: string
  code: string
  location: string
  strength: number
  high_risk: number
  avg_workload: number
}

export const DISCLAIMER =
  'AI-generated wellness indicator — not a medical diagnosis. ' +
  'Human welfare review is required before any intervention.'

export const FOOTER_NOTE =
  'Prototype for demonstration purposes • Synthetic data • Not an official Government of India system'
