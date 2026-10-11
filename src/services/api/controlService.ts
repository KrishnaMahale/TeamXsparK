import { apiClient } from './apiClient'

export type ControllerActionType =
  | 'idle'
  | 'battery_dispatch'
  | 'feeder_reconfiguration'
  | 'solar_curtailment'
  | 'hybrid_plan'

export type PlanStatus = 'FEASIBLE' | 'INFEASIBLE' | 'ERROR'

export interface SequentialForecastPoint {
  time: string
  solarKw: number
  loadKw: number
  timestamp?: string
}

export interface SequentialControlRequest {
  gridId: string
  startTimestep?: string
  horizonSteps?: number
  stepDurationHours?: number
  initialSocPercent?: number
  batterySocs?: Record<string, number>
  initialTopology?: string
  forecastData?: SequentialForecastPoint[]
  installedSolarCapacityKw?: number
  recedingHorizonMode?: boolean
  allowSurrogateScreening?: boolean
}

export interface PlannedStepAction {
  stepIndex: number
  time: string
  actionType: ControllerActionType
  title: string
  batteryPowerKw: number
  curtailmentKw: number
  targetTopology: string
  batterySocBefore: number
  batterySocAfter: number
  batterySocsAfter?: Record<string, number>
  expectedVoltagePu: number
  expectedFeederLoadPercent: number
  expectedTxLoadingPercent: number
  totalLossKw: number
  violationsCount: number
  isPhysicallyVerified: boolean
  solverConverged: boolean
  stepCost: number
}

export interface SequentialControlResponse {
  gridId: string
  startTimestep: string
  horizonSteps: number
  durationHours: number
  status: PlanStatus
  isFeasible: boolean
  fallbackReason?: string | null
  recommendedFirstAction?: PlannedStepAction | null
  plannedTrajectory: PlannedStepAction[]
  initialViolationsTotal: number
  remainingViolationsTotal: number
  totalSolarCurtailmentKwh: number
  totalLossKwh: number
  switchingOperationsCount: number
  terminalSocPercent: number
  physicalSolveCount: number
  planningLatencyMs: number
}

export const controlService = {
  /**
   * Request multi-step receding-horizon trajectory optimization from the backend sequential controller.
   */
  async planSequentialControl(
    request: SequentialControlRequest
  ): Promise<SequentialControlResponse> {
    const response = await apiClient.post<SequentialControlResponse>(
      '/control/sequential/plan',
      request
    )
    return response.data
  },
}
