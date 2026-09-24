export type ScenarioId =
  | 'NORMAL_DAY'
  | 'HIGH_SOLAR'
  | 'EVENING_PEAK'
  | 'HIGH_SOLAR_LOW_LOAD'
  | 'EXTREME_INFEASIBLE'

export interface GridScenario {
  id: ScenarioId
  name: string
  description: string
  solarKw: number
  loadKw: number
  batterySocPercent: number
  expectedCondition: string
  status: 'optimal' | 'warning' | 'critical' | 'infeasible'
  violationsExpected: number
  recommendedActionHint: string
  simulatedTime: string // e.g. "13:15"
}

export interface ScenarioExecutionResponse {
  scenario: GridScenario
  executedAt: string
  initialViolations: number
  resolvedViolations: number
  recommendedAction: string
  isFeasible: boolean
}
