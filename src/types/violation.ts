export type ViolationSeverity = 'critical' | 'warning' | 'resolved'

export type ViolationType =
  | 'over_voltage'
  | 'under_voltage'
  | 'feeder_overload'
  | 'transformer_overload'
  | 'reverse_power_flow'

export interface GridViolation {
  id: string
  time: string
  componentType: 'bus' | 'feeder' | 'transformer'
  componentId: string
  componentName: string
  issue: string // e.g. "Over-voltage", "Overloaded"
  type: ViolationType
  value: number
  unit: string // "pu", "%", "kW"
  formattedValue: string
  limit: number
  formattedLimit: string
  severity: ViolationSeverity
  status: 'active' | 'resolved'
  recommendationHint?: string
}

export interface ViolationSummary {
  total: number
  critical: number
  warning: number
  resolved: number
  hasViolations: boolean
}
