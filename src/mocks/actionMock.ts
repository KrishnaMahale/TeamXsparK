import { CorrectiveAction, ActionComparisonRow, ActionExecutionResult } from '../types/action'

export const mockCorrectiveActions: CorrectiveAction[] = [
  {
    id: 'ACT-01',
    type: 'battery_discharge',
    title: 'Battery Discharge',
    description: 'Discharge local BESS unit at Bus 3 to absorb voltage rise and offset feeder current.',
    parameterDelta: '-40 kW',
    durationMinutes: 30,
    isFeasible: true,
    expectedVoltagePu: 1.045,
    expectedFeederLoadPercent: 98,
    solarUsedKw: 240,
    batterySocPercent: 48,
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
    solarUsedKw: 240,
    batterySocPercent: 62,
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
    solarUsedKw: 210,
    batterySocPercent: 62,
    resolvedViolationsCount: 2,
    remainingViolationsCount: 0,
    renewableUtilizationPercent: 87.5,
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
    solarUsedKw: 240,
    batterySocPercent: 15,
    resolvedViolationsCount: 0,
    remainingViolationsCount: 2,
    renewableUtilizationPercent: 100,
  },
]

export const mockActionComparisonRows: ActionComparisonRow[] = [
  {
    actionId: 'BASELINE',
    actionTitle: 'Baseline (Current State)',
    voltage: '1.074 pu',
    feederLoading: '108%',
    solarUsed: '240 kW',
    batterySoc: '62%',
    violationsRemaining: 2,
    isFeasible: true,
    infeasibleNote: 'Pre-action condition',
  },
  {
    actionId: 'ACT-01',
    actionTitle: 'Battery Discharge',
    voltage: '1.045 pu',
    feederLoading: '98%',
    solarUsed: '240 kW',
    batterySoc: '48%',
    violationsRemaining: 0,
    isFeasible: true,
  },
  {
    actionId: 'ACT-02',
    actionTitle: 'Feeder Reconfiguration',
    voltage: '1.038 pu',
    feederLoading: '92%',
    solarUsed: '240 kW',
    batterySoc: '62%',
    violationsRemaining: 0,
    isFeasible: true,
  },
  {
    actionId: 'ACT-03',
    actionTitle: 'Solar Curtailment',
    voltage: '1.032 pu',
    feederLoading: '90%',
    solarUsed: '210 kW',
    batterySoc: '62%',
    violationsRemaining: 0,
    isFeasible: true,
  },
  {
    actionId: 'ACT-04',
    actionTitle: 'Max Battery Discharge',
    voltage: '1.068 pu',
    feederLoading: '105%',
    solarUsed: '240 kW',
    batterySoc: '15%',
    violationsRemaining: 2,
    isFeasible: false,
    infeasibleNote: 'Exceeds battery safe reserve threshold',
  },
]

export const createExecutionResult = (action: CorrectiveAction): ActionExecutionResult => {
  const baseViolations = [
    {
      id: 'VIO-B3-13:15',
      time: '13:15',
      componentType: 'bus' as const,
      componentId: 'B3',
      componentName: 'Bus 3',
      issue: 'Over-voltage',
      type: 'over_voltage' as const,
      value: 1.074,
      unit: 'pu',
      formattedValue: '1.074 pu',
      limit: 1.05,
      formattedLimit: '1.050 pu',
      severity: 'critical' as const,
      status: 'active' as const,
      recommendationHint: 'Execute feeder reconfiguration or battery charging/curtailment',
    },
    {
      id: 'VIO-F02-13:15',
      time: '13:15',
      componentType: 'feeder' as const,
      componentId: 'F-02',
      componentName: 'Feeder F-02',
      issue: 'Overloaded',
      type: 'feeder_overload' as const,
      value: 108,
      unit: '%',
      formattedValue: '108%',
      limit: 100,
      formattedLimit: '100%',
      severity: 'critical' as const,
      status: 'active' as const,
      recommendationHint: 'Shift tie-line load to Feeder F-03',
    },
  ]

  let afterViolations: typeof baseViolations = []
  if (!action.isFeasible) {
    afterViolations = [...baseViolations]
  } else if (action.remainingViolationsCount === 1) {
    if (action.expectedVoltagePu > 1.05) {
      afterViolations = [
        {
          ...baseViolations[0],
          value: action.expectedVoltagePu,
          formattedValue: `${action.expectedVoltagePu.toFixed(3)} pu`,
        },
      ]
    } else {
      afterViolations = [
        {
          ...baseViolations[1],
          value: action.expectedFeederLoadPercent,
          formattedValue: `${action.expectedFeederLoadPercent.toFixed(0)}%`,
        },
      ]
    }
  } else if (action.remainingViolationsCount === 0) {
    afterViolations = []
  }

  return {
    actionId: action.id,
    executedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    success: action.isFeasible,
    message: action.isFeasible
      ? `Successfully executed ${action.title}. Feeder loading reduced to ${action.expectedFeederLoadPercent}% and Bus 3 voltage normalized to ${action.expectedVoltagePu} pu.`
      : `Execution halted: ${action.infeasibleReason}`,
    beforeState: {
      b3Voltage: 1.074,
      f02LoadingPercent: 108,
      solarUsedKw: 240,
      batterySocPercent: 62,
      violationsCount: baseViolations.length,
      violations: baseViolations,
    },
    afterState: {
      b3Voltage: action.expectedVoltagePu,
      f02LoadingPercent: action.expectedFeederLoadPercent,
      solarUsedKw: action.solarUsedKw,
      batterySocPercent: action.batterySocPercent,
      violationsCount: action.remainingViolationsCount,
      renewableUseMaintainedPercent: action.renewableUtilizationPercent,
      isSafe: action.isFeasible && action.remainingViolationsCount === 0,
      violations: afterViolations,
    },
  }
}
