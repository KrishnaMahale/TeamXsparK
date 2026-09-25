import {
  PowerFlowResult,
  SimulationResponse,
  BeforeAfterComparisonData,
  SimulationInput,
  FullSimulationResult,
} from '../../types/simulation'
import { CorrectiveAction, ActionExecutionResult } from '../../types/action'
import { Bus, Feeder } from '../../types/network'
import { GridViolation } from '../../types/violation'
import { mockBuses, mockFeeders, mockNetwork } from '../../mocks/networkMock'
import { createSimulationInputFromPreset } from '../../mocks/simulationInputMock'
import { mockCorrectiveActions, createExecutionResult } from '../../mocks/actionMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

/**
 * Frontend Mock Power-Flow Engine.
 * Computes deterministic power-flow telemetry and threshold violations
 * directly from the user's configured solar and load time-series profiles.
 */
export const runMockPowerFlow = (input: SimulationInput): FullSimulationResult => {
  const timeStepResults: Record<string, PowerFlowResult> = {}
  const allViolations: GridViolation[] = []

  const isAlternativeTopology = input.networkConfig.feederTopology === 'alternative'
  const vMax = input.networkConfig.voltageMaxPu || 1.05
  const vMin = input.networkConfig.voltageMinPu || 0.95
  const feederMax = input.networkConfig.feederLoadingLimitPercent || 100

  // Combine unique timestamps from solar and load
  const times = Array.from(
    new Set([
      ...input.solarTimeSeries.map((s) => s.time),
      ...input.loadTimeSeries.map((l) => l.time),
    ])
  ).sort()

  times.forEach((timeStr) => {
    const solarPt = input.solarTimeSeries.find((s) => s.time === timeStr)
    const loadPt = input.loadTimeSeries.find((l) => l.time === timeStr)

    const solarKw = solarPt ? solarPt.solarKw : 0
    const loadKw = loadPt ? loadPt.loadKw : 0

    // Conceptual Power-Flow calculation:
    // Net reverse power injection at B2/B3 drives voltage rise
    const refSolarKw = input.installedSolarCapacityKw >= 240 ? 240 : Math.max(1, input.installedSolarCapacityKw)
    const solarPenetrationRatio = Math.min(1.0, solarKw / refSolarKw)

    // Voltage profile across buses
    // B1: Substation feeder head (regulated)
    const b1Voltage = 1.02

    // B2: Near Solar Farm Alpha
    const b2Voltage = +(1.00 + 0.02 * solarPenetrationRatio).toFixed(3)

    // B3: Critical midpoint bus with high reverse power sensitivity
    // If alternative topology is active (F-03 tie-line energized), impedance drops and voltage is moderated!
    const voltageRiseFactor = isAlternativeTopology ? 0.038 : 0.074
    const b3Voltage = +(
      1.00 +
      voltageRiseFactor * solarPenetrationRatio -
      0.02 * Math.max(0, (loadKw - 100) / 100)
    ).toFixed(3)

    // B4: Remote branch bus
    const b4Voltage = +(1.00 - 0.015 * (loadKw / 180)).toFixed(3)

    // Feeder loadings:
    // F-01: Main substation feeder
    const f01Loading = Math.min(130, Math.round(45 + 35 * (loadKw / 180) + 15 * solarPenetrationRatio))

    // F-02: Intermediate feeder B2 -> B3
    // Under normal topology, carries both local solar export and load; under alternative topology, tie-line relieves F-02
    let f02Loading = Math.round(55 + 53 * solarPenetrationRatio)
    let f03Loading = 0
    if (isAlternativeTopology) {
      f02Loading = Math.round(f02Loading * 0.8518) // Relieved by tie-line F-03 (108% -> 92%)
      f03Loading = 46 // F-03 energized
    }

    const f04Loading = Math.round(30 + 35 * (loadKw / 180))

    // Check violations at this time step
    const stepViolations: GridViolation[] = []

    if (b3Voltage > vMax) {
      stepViolations.push({
        id: `VIO-B3-${timeStr}`,
        time: timeStr,
        componentType: 'bus',
        componentId: 'B3',
        componentName: 'Bus 3',
        issue: 'Over-voltage',
        type: 'over_voltage',
        value: b3Voltage,
        unit: 'pu',
        formattedValue: `${b3Voltage} pu`,
        limit: vMax,
        formattedLimit: `${vMax.toFixed(3)} pu`,
        severity: 'critical',
        status: 'active',
        recommendationHint: 'Execute feeder reconfiguration or dispatch BESS discharge / limited curtailment',
      })
    } else if (b3Voltage < vMin) {
      stepViolations.push({
        id: `VIO-B3-UV-${timeStr}`,
        time: timeStr,
        componentType: 'bus',
        componentId: 'B3',
        componentName: 'Bus 3',
        issue: 'Under-voltage',
        type: 'under_voltage',
        value: b3Voltage,
        unit: 'pu',
        formattedValue: `${b3Voltage} pu`,
        limit: vMin,
        formattedLimit: `${vMin.toFixed(3)} pu`,
        severity: 'warning',
        status: 'active',
        recommendationHint: 'Switch capacitor bank or inject battery active power',
      })
    }

    if (f02Loading > feederMax) {
      stepViolations.push({
        id: `VIO-F02-${timeStr}`,
        time: timeStr,
        componentType: 'feeder',
        componentId: 'F-02',
        componentName: 'Feeder F-02',
        issue: 'Overloaded',
        type: 'feeder_overload',
        value: f02Loading,
        unit: '%',
        formattedValue: `${f02Loading}%`,
        limit: feederMax,
        formattedLimit: `${feederMax}%`,
        severity: 'critical',
        status: 'active',
        recommendationHint: 'Shift tie-line branch flow to Feeder F-03',
      })
    }

    const stepBuses: Bus[] = [
      { ...mockBuses[0], voltage: b1Voltage, lineLoadingPercent: f01Loading, status: 'normal' },
      { ...mockBuses[1], voltage: b2Voltage, solarKw: Math.round(solarKw * 0.65), loadKw: Math.round(loadKw * 0.4), status: 'normal' },
      {
        ...mockBuses[2],
        voltage: b3Voltage,
        solarKw: Math.round(solarKw * 0.35),
        loadKw: Math.round(loadKw * 0.3),
        lineLoadingPercent: f02Loading,
        temperatureC: b3Voltage > vMax ? 42 : 35,
        status: b3Voltage > vMax ? 'critical' : 'normal',
      },
      { ...mockBuses[3], voltage: b4Voltage, loadKw: Math.round(loadKw * 0.3), lineLoadingPercent: f04Loading, status: 'normal' },
    ]

    const stepFeeders: Feeder[] = [
      { ...mockFeeders[0], loadingPercent: f01Loading, activePowerKw: Math.round(600 * (f01Loading / 100)), status: f01Loading > feederMax ? 'warning' : 'normal' },
      { ...mockFeeders[1], loadingPercent: Math.round((f01Loading + f02Loading) / 2), status: 'normal' },
      {
        ...mockFeeders[2],
        loadingPercent: f02Loading,
        activePowerKw: Math.round(300 * (f02Loading / 100)),
        status: f02Loading > feederMax ? 'critical' : 'normal',
        isSwitchClosed: !isAlternativeTopology,
      },
      {
        ...mockFeeders[3],
        loadingPercent: f03Loading,
        status: 'normal',
        isSwitchClosed: isAlternativeTopology,
      },
      { ...mockFeeders[4], loadingPercent: f04Loading, status: 'normal' },
    ]

    timeStepResults[timeStr] = {
      timestamp: timeStr,
      converged: true,
      iterations: 4,
      buses: stepBuses,
      feeders: stepFeeders,
      violations: stepViolations,
      totalLossKw: +(8.5 + 4.5 * solarPenetrationRatio).toFixed(1),
      totalGenerationKw: solarKw,
      totalDemandKw: loadKw,
      batterySocPercent: input.batteryConfig.initialSocPercent,
    }

    stepViolations.forEach((v) => allViolations.push(v))
  })

  // Evaluate representative snapshot time (default 13:15 or midday)
  const peakTime = times.includes('13:15') ? '13:15' : times.includes('13:00') ? '13:00' : times[Math.floor(times.length / 2)] || '12:00'
  const peakResult = timeStepResults[peakTime] || Object.values(timeStepResults)[0]

  const peakSolar = Math.max(...input.solarTimeSeries.map((s) => s.solarKw), 0)
  const peakLoad = Math.max(...input.loadTimeSeries.map((l) => l.loadKw), 0)

  // Determine corrective actions and feasibility
  const isBatteryDepleted = input.batteryConfig.initialSocPercent <= 15
  const neededKwhAct1 = (Math.min(40, input.batteryConfig.maxDischargeKw) * 0.5) / 0.92
  const availableKwhAct1 = ((input.batteryConfig.initialSocPercent - 20) / 100) * input.batteryConfig.capacityKwh
  const canDischargeAct1 = input.batteryConfig.maxDischargeKw >= 40 && availableKwhAct1 >= neededKwhAct1 && input.batteryConfig.initialSocPercent > 20
  const socDeltaAct1 = (neededKwhAct1 / input.batteryConfig.capacityKwh) * 100
  const act1Soc = canDischargeAct1
    ? Math.max(0, +(input.batteryConfig.initialSocPercent - socDeltaAct1).toFixed(1))
    : input.batteryConfig.initialSocPercent

  const curtailedUsed = Math.max(0, peakSolar - 30)
  const utilization3 = peakSolar > 0 ? Math.round((curtailedUsed / peakSolar) * 100) : 100

  const actions: CorrectiveAction[] = [
    {
      id: 'ACT-01',
      type: 'battery_discharge',
      title: 'Battery Discharge',
      description: 'Discharge local BESS unit at Bus 3 to absorb voltage rise and offset feeder current.',
      parameterDelta: `-${Math.min(40, input.batteryConfig.maxDischargeKw)} kW`,
      durationMinutes: 30,
      isFeasible: canDischargeAct1,
      infeasibleReason: !canDischargeAct1
        ? `Battery SOC too low (${input.batteryConfig.initialSocPercent.toFixed(0)}% <= 20% safe floor or insufficient reserve).`
        : undefined,
      expectedVoltagePu: 1.045,
      expectedFeederLoadPercent: 98,
      solarUsedKw: peakSolar,
      batterySocPercent: act1Soc,
      resolvedViolationsCount: 2,
      remainingViolationsCount: 0,
      renewableUtilizationPercent: 100,
    },
    {
      id: 'ACT-02',
      type: 'feeder_reconfiguration',
      title: 'Feeder Reconfiguration',
      description: 'Open tie switch on congested Feeder F-02 and close alternate switch to Feeder F-03.',
      parameterDelta: 'Switch F-02 → F-03',
      durationMinutes: 60,
      isFeasible: true,
      expectedVoltagePu: 1.038,
      expectedFeederLoadPercent: 92,
      solarUsedKw: peakSolar,
      batterySocPercent: input.batteryConfig.initialSocPercent,
      resolvedViolationsCount: 2,
      remainingViolationsCount: 0,
      renewableUtilizationPercent: 100,
    },
    {
      id: 'ACT-03',
      type: 'solar_curtailment',
      title: 'Solar Curtailment',
      description: 'Limit rooftop generation at B3 by 30 kW to relieve local voltage and branch thermal stress.',
      parameterDelta: '-30 kW (Limited)',
      durationMinutes: 45,
      isFeasible: true,
      expectedVoltagePu: 1.032,
      expectedFeederLoadPercent: 90,
      solarUsedKw: curtailedUsed,
      batterySocPercent: input.batteryConfig.initialSocPercent,
      resolvedViolationsCount: 2,
      remainingViolationsCount: 0,
      renewableUtilizationPercent: utilization3,
    },
    {
      id: 'ACT-04',
      type: 'max_battery_discharge',
      title: 'Max Battery Discharge',
      description: 'Forced high-rate discharge past technical minimum SOC threshold.',
      parameterDelta: '-80 kW',
      durationMinutes: 15,
      isFeasible: false,
      infeasibleReason: 'Requested battery discharge exceeds available SOC and violates depth-of-discharge constraints (target SOC 15% < safe floor 20%).',
      expectedVoltagePu: 1.068,
      expectedFeederLoadPercent: 105,
      solarUsedKw: peakSolar,
      batterySocPercent: 15,
      resolvedViolationsCount: 0,
      remainingViolationsCount: 2,
      renewableUtilizationPercent: 100,
    },
  ]

  const comparisonData: BeforeAfterComparisonData = {
    b3Voltage: {
      before: peakResult?.buses.find((b) => b.id === 'B3')?.voltage || 1.074,
      after: 1.038,
      limit: vMax,
      status: 'safe',
    },
    f02Loading: {
      before: peakResult?.feeders.find((f) => f.id === 'F-02')?.loadingPercent || 108,
      after: 92,
      limit: feederMax,
      status: 'safe',
    },
    solarUsed: {
      before: peakSolar,
      after: peakSolar,
      capacity: input.installedSolarCapacityKw,
    },
    batterySoc: {
      before: input.batteryConfig.initialSocPercent,
      after: input.batteryConfig.initialSocPercent,
    },
    isSafe: true,
    renewableUseMaintainedPercent: 100,
    selectedActionTitle: 'Feeder Reconfiguration (F-02 → F-03)',
  }

  const initialViolationsCount = peakResult?.violations.length || 0

  return {
    scenarioId: input.scenarioName,
    input,
    timeStepResults,
    availableActions: actions,
    recommendedActionId: 'ACT-02',
    comparisonData,
    summary: {
      scenarioName: input.scenarioName,
      simulationTime: peakTime,
      solarKw: peakSolar,
      loadKw: peakLoad,
      netPowerKw: peakSolar - peakLoad,
      status: isBatteryDepleted ? 'infeasible' : (initialViolationsCount > 0 ? 'violations_detected' : 'safe'),
      initialViolations: initialViolationsCount,
      resolvedViolations: isBatteryDepleted ? 0 : initialViolationsCount,
      recommendedAction: 'Feeder Reconfiguration (F-02 → F-03)',
      isActionFeasible: !isBatteryDepleted,
    },
  }
}

let activeSimulationCache: FullSimulationResult | null = null

export const simulationService = {
  /**
   * Set active simulation result in service cache
   */
  setActiveSimulation(result: FullSimulationResult | null) {
    activeSimulationCache = result
  },

  /**
   * Get active simulation result from service cache
   */
  getActiveSimulation(): FullSimulationResult | null {
    return activeSimulationCache
  },

  /**
   * Run full time-series simulation from user-configured input
   */
  async runSimulation(input: SimulationInput): Promise<FullSimulationResult> {
    if (IS_MOCK_API) {
      await simulateLatency(500)
      const res = runMockPowerFlow(input)
      activeSimulationCache = res
      return res
    }
    const response = await apiClient.post<FullSimulationResult>('/simulations/run', input)
    activeSimulationCache = response.data
    return response.data
  },

  /**
   * Run power-flow analysis for a single timestamp
   */
  async runPowerFlow(time: string, scenarioId?: string): Promise<PowerFlowResult> {
    if (IS_MOCK_API) {
      await simulateLatency(150)
      if (activeSimulationCache && activeSimulationCache.timeStepResults[time]) {
        return activeSimulationCache.timeStepResults[time]
      }
      const defaultInput = createSimulationInputFromPreset('HIGH_SOLAR_LOW_LOAD')
      const full = activeSimulationCache || runMockPowerFlow(defaultInput)
      activeSimulationCache = full

      if (full.timeStepResults[time]) {
        return full.timeStepResults[time]
      }

      // Dynamically compute power-flow for intermediate timestamps e.g. 13:15
      const inputToUse = full.input || defaultInput
      const [h, m] = time.split(':').map(Number)
      const tFloat = (h || 0) + (m || 0) / 60
      let solarKw = 0
      if (tFloat >= 6 && tFloat <= 19) {
        solarKw = Math.round((inputToUse.installedSolarCapacityKw || 250) * Math.sin(((tFloat - 6) / 13) * Math.PI))
      }
      const peakL = inputToUse.peakLoadKw || 180
      const loadKw = Math.round(peakL * (0.35 + 0.3 * Math.exp(-((tFloat - 10) ** 2) / 8) + 0.35 * Math.exp(-((tFloat - 19) ** 2) / 8)))

      const dynamicInput: SimulationInput = {
        ...inputToUse,
        solarTimeSeries: [...inputToUse.solarTimeSeries, { id: `s-${time}`, time, solarKw }],
        loadTimeSeries: [...inputToUse.loadTimeSeries, { id: `l-${time}`, time, loadKw }],
      }
      const dynamicFull = runMockPowerFlow(dynamicInput)
      const dynamicStep = dynamicFull.timeStepResults[time]
      if (dynamicStep) {
        activeSimulationCache.timeStepResults[time] = dynamicStep
        return dynamicStep
      }

      return Object.values(full.timeStepResults)[0]
    }
    const response = await apiClient.post<PowerFlowResult>('/simulation/power-flow', {
      time,
      scenarioId,
    })
    return response.data
  },

  /**
   * Run and evaluate corrective actions
   */
  async runCorrectiveActions(violationIds?: string[]): Promise<SimulationResponse> {
    if (IS_MOCK_API) {
      await simulateLatency(450)
      const defaultInput = createSimulationInputFromPreset('HIGH_SOLAR_LOW_LOAD')
      const full = runMockPowerFlow(defaultInput)
      const peak = full.timeStepResults['13:15'] || Object.values(full.timeStepResults)[0]

      return {
        powerFlow: peak,
        availableActions: full.availableActions,
        recommendedActionId: full.recommendedActionId,
        comparisonData: full.comparisonData,
      }
    }
    const response = await apiClient.post<SimulationResponse>('/simulation/corrective-actions', {
      violationIds,
    })
    return response.data
  },

  /**
   * Execute a specific corrective action
   */
  async executeAction(actionId: string): Promise<ActionExecutionResult> {
    if (IS_MOCK_API) {
      await simulateLatency(400)
      const action = mockCorrectiveActions.find((a) => a.id === actionId) || mockCorrectiveActions[0]
      return createExecutionResult(action)
    }
    const response = await apiClient.post<ActionExecutionResult>(`/simulation/actions/${actionId}/execute`)
    return response.data
  },
}
