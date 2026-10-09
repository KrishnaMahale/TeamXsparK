import { Bus, Feeder } from './network'
import { GridViolation } from './violation'
import { CorrectiveAction, ActionExecutionResult } from './action'

export interface TimeSeriesSolarPoint {
  id: string
  time: string // "HH:MM"
  solarKw: number
}

export interface TimeSeriesLoadPoint {
  id: string
  time: string // "HH:MM"
  loadKw: number
}

export interface NetworkLimitsConfig {
  voltageMinPu: number
  voltageMaxPu: number
  feederLoadingLimitPercent: number
  transformerLoadingLimitPercent: number
  feederTopology: 'normal' | 'alternative' // 'normal' = F-02 energized, 'alternative' = F-03 energized
}

export interface BatteryStorageConfig {
  capacityKwh: number
  initialSocPercent: number
  maxChargeKw: number
  maxDischargeKw: number
}

export interface SimulationInput {
  gridId?: string
  scenarioName: string
  scenarioDescription: string
  simulationDate: string
  simulationDuration: '6 hours' | '12 hours' | '24 hours'
  timeResolution: '15 minutes' | '30 minutes' | '1 hour'
  simulationSource?: 'scenario' | 'forecast'
  installedSolarCapacityKw: number
  currentSolarKw: number
  solarTimeSeries: TimeSeriesSolarPoint[]
  peakLoadKw: number
  currentLoadKw: number
  loadTimeSeries: TimeSeriesLoadPoint[]
  networkConfig: NetworkLimitsConfig
  batteryConfig: BatteryStorageConfig
}

export interface SimulationProgressStep {
  id: string
  title: string
  subtitle: string
  status: 'waiting' | 'processing' | 'done'
}

export interface BeforeAfterMetric {
  label: string
  beforeValue: string
  afterValue: string
  unit: string
  isImproved: boolean
  isViolationResolved: boolean
}

export interface BeforeAfterComparisonData {
  b3Voltage: {
    before: number
    after: number
    limit: number
    status: 'safe' | 'violation'
  }
  f02Loading: {
    before: number
    after: number
    limit: number
    status: 'safe' | 'violation'
  }
  solarUsed: {
    before: number
    after: number
    capacity: number
  }
  batterySoc: {
    before: number
    after: number
  }
  isSafe: boolean
  renewableUseMaintainedPercent: number
  selectedActionTitle: string
  monitoredBusId?: string
  monitoredBusName?: string
  monitoredFeederId?: string
  monitoredFeederName?: string
  beforeViolationsCount?: number
  afterViolationsCount?: number
  gridId?: string
  gridName?: string
}

export interface PowerFlowResult {
  timestamp: string
  converged: boolean
  iterations: number
  buses: Bus[]
  feeders: Feeder[]
  violations: GridViolation[]
  totalLossKw: number
  totalGenerationKw: number
  totalDemandKw: number
  batterySocPercent?: number
}

export interface SimulationSummaryInfo {
  scenarioName: string
  simulationTime: string
  solarKw: number
  loadKw: number
  netPowerKw: number
  status: 'safe' | 'warning' | 'violations_detected' | 'infeasible'
  initialViolations: number
  resolvedViolations: number
  recommendedAction: string
  isActionFeasible: boolean
}

export interface FullSimulationResult {
  scenarioId?: string
  input: SimulationInput
  timeStepResults: Record<string, PowerFlowResult>
  availableActions: CorrectiveAction[]
  recommendedActionId: string
  comparisonData: BeforeAfterComparisonData
  summary: SimulationSummaryInfo
}

export interface SimulationResponse {
  powerFlow: PowerFlowResult
  availableActions: CorrectiveAction[]
  recommendedActionId: string
  comparisonData: BeforeAfterComparisonData
  executionResult?: ActionExecutionResult
}
