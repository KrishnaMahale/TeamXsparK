export type ScenarioId =
  | 'NORMAL_DAY'
  | 'HIGH_SOLAR'
  | 'EVENING_PEAK'
  | 'HIGH_SOLAR_LOW_LOAD'
  | 'EXTREME_INFEASIBLE'
  | 'STORM_CLOUD_RAMP'
  | 'EV_CHARGING_SURGE'
  | 'PHASE_UNBALANCE_PEAK'
  | 'NIGHT_QUIET'
  | string

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
  gridType?: 'industrial' | 'domestic' | 'any'
  peakVoltagePu?: number
  maxFeederLoadingPct?: number
  vufPercent?: number
  tags?: string[]
}

export interface ScenarioExecutionResponse {
  scenario: GridScenario
  executedAt: string
  initialViolations: number
  resolvedViolations: number
  recommendedAction: string
  isFeasible: boolean
  gridType?: 'industrial' | 'domestic' | string
  voltageMaxPu?: number
  voltageMinPu?: number
  feederLoadingMaxPct?: number
  transformerLoadingPct?: number
  lossesKw?: number
  vufPercent?: number
  violations?: any[]
  powerFlowResult?: any
  availableActions?: any[]
  comparisonData?: any
}
