export type ActionType =
  | 'battery_discharge'
  | 'feeder_reconfiguration'
  | 'solar_curtailment'
  | 'max_battery_discharge'

export interface CorrectiveAction {
  id: string
  type: ActionType
  title: string
  description: string
  parameterDelta: string // e.g. "-40 kW", "Switch F-02 → F-03", "-30 kW"
  durationMinutes?: number
  isFeasible: boolean
  infeasibleReason?: string
  expectedVoltagePu: number
  expectedFeederLoadPercent: number
  solarUsedKw: number
  batterySocPercent: number
  resolvedViolationsCount: number
  remainingViolationsCount: number
  renewableUtilizationPercent: number
  targetComponentId?: string
  targetComponentName?: string
  gridId?: string
  dispatchKw?: number
  curtailmentKw?: number
  targetTopology?: string
  controlDirection?: string
}

export interface ActionComparisonRow {
  actionId: string
  actionTitle: string
  voltage: string // e.g. "1.045 pu"
  feederLoading: string // e.g. "98%"
  solarUsed: string // e.g. "240 kW"
  batterySoc: string // e.g. "48%"
  violationsRemaining: number
  isFeasible: boolean
  infeasibleNote?: string
}

export interface ActionExecutionResult {
  actionId: string
  executedAt: string
  success: boolean
  message: string
  beforeState: {
    b3Voltage: number
    f02LoadingPercent: number
    solarUsedKw: number
    batterySocPercent: number
    violationsCount: number
    monitoredBusId?: string
    monitoredBusName?: string
    monitoredFeederId?: string
    monitoredFeederName?: string
    gridId?: string
    gridName?: string
  }
  afterState: {
    b3Voltage: number
    f02LoadingPercent: number
    solarUsedKw: number
    batterySocPercent: number
    violationsCount: number
    renewableUseMaintainedPercent: number
    isSafe: boolean
    monitoredBusId?: string
    monitoredBusName?: string
    monitoredFeederId?: string
    monitoredFeederName?: string
    gridId?: string
    gridName?: string
  }
}
