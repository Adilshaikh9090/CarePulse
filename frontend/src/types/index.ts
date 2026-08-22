export type Role = 'personnel' | 'welfare_officer' | 'administrator'

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
}

export interface RiskFactorT {
  name: string
  impact: number
  direction: 'increasing' | 'decreasing'
  description: string
}

export interface Prediction {
  id?: number
  created_at?: string
  timestamp?: string
  risk_level: 'Low' | 'Moderate' | 'High'
  risk_score: number
  confidence: number
  model_version: string
  top_factors: RiskFactorT[]
  all_factors?: RiskFactorT[]
  explanation: string
  recommendations: string[]
  recommendation_items?: RecommendationItem[]
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

export type RiskLevel = 'Low' | 'Moderate' | 'High'

export interface PredictionHistory {
  items: HistoryItem[]
  counts: Record<RiskLevel, number>
  trend: 'rising' | 'improving' | 'stable'
}

export interface RecommendationItem {
  id: number
  title: string
  reason: string
  timeframe: string
  priority: number
  status: 'pending' | 'accepted' | 'dismissed' | 'completed'
  created_at: string
}

export interface NotificationT {
  id: number
  category: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export interface AlertT {
  id: number
  code: string
  scope: 'individual' | 'unit'
  title: string
  severity: 'high' | 'moderate' | 'low'
  detected_at: string
  factors: string[]
  recommendation: string
  status: string
  subject_label: string
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
  'This prediction is an AI-generated welfare indicator and is not a medical diagnosis. ' +
  'Human review by authorized welfare personnel is required before any action.'

export const FOOTER_NOTE =
  'Prototype for demonstration purposes • Synthetic data • Not an official Government of India system'
