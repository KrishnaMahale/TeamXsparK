import { PowerFlowResult, BeforeAfterComparisonData, SimulationResponse } from '../types/simulation'
import { mockBuses, mockFeeders, mockNetwork } from './networkMock'
import { mockViolations } from './violationMock'
import { mockCorrectiveActions } from './actionMock'
import { Bus, Feeder } from '../types/network'
import { GridViolation } from '../types/violation'

export const defaultComparisonData: BeforeAfterComparisonData = {
  b3Voltage: {
    before: 1.074,
    after: 1.038,
    limit: 1.05,
    status: 'safe',
  },
  f02Loading: {
    before: 108,
    after: 92,
    limit: 100,
    status: 'safe',
  },
  solarUsed: {
    before: 240,
    after: 240,
    capacity: 250,
  },
  batterySoc: {
    before: 62,
    after: 62,
  },
  isSafe: true,
  renewableUseMaintainedPercent: 100,
  selectedActionTitle: 'Feeder Reconfiguration (F-02 → F-03)',
}

/**
 * Deterministically computes grid values for any time between 06:00 and 24:00
 */
export const calculateTimeBasedGridState = (timeString: string): {
  buses: Bus[]
  feeders: Feeder[]
  violations: GridViolation[]
  solarTotalKw: number
  loadTotalKw: number
} => {
  const [hStr, mStr] = timeString.split(':')
  const hours = parseFloat(hStr || '12') + parseFloat(mStr || '0') / 60

  // Solar follows sun bell curve peak around 12:30 - 13:30
  let solarFactor = 0
  if (hours >= 6 && hours <= 19) {
    solarFactor = Math.sin(((hours - 6) / 13) * Math.PI)
  }
  solarFactor = Math.max(0, solarFactor)

  // Load profile has two peaks: mid-day commercial (12-14) and evening residential (18-21)
  let loadFactor = 0.5 + 0.3 * Math.sin(((hours - 6) / 18) * Math.PI)
  if (hours >= 18 && hours <= 21) {
    loadFactor += 0.25
  }

  const solarTotalKw = Math.round(250 * solarFactor)
  const loadTotalKw = Math.round(180 * loadFactor)

  // Voltage at B3 rises as solarFactor increases
  const b3Voltage = +(1.00 + 0.08 * solarFactor - 0.02 * (loadFactor - 0.5)).toFixed(3)
  const b2Voltage = +(1.00 + 0.02 * solarFactor).toFixed(3)
  const b1Voltage = 1.02
  const b4Voltage = +(1.00 - 0.01 * loadFactor).toFixed(3)

  // Feeder F-02 loading
  const f02Load = Math.round(65 + 48 * solarFactor)
  const f01Load = Math.round(45 + 30 * loadFactor)

  const isB3Overvoltage = b3Voltage > 1.050
  const isF02Overloaded = f02Load > 100

  const buses: Bus[] = [
    {
      ...mockBuses[0],
      voltage: b1Voltage,
      lineLoadingPercent: f01Load,
      status: 'normal',
    },
    {
      ...mockBuses[1],
      voltage: b2Voltage,
      solarKw: Math.round(solarTotalKw * 0.65),
      loadKw: Math.round(loadTotalKw * 0.4),
      status: 'normal',
    },
    {
      ...mockBuses[2],
      voltage: b3Voltage,
      solarKw: Math.round(solarTotalKw * 0.35),
      loadKw: Math.round(loadTotalKw * 0.3),
      lineLoadingPercent: f02Load,
      temperatureC: isB3Overvoltage ? 42 : 36,
      status: isB3Overvoltage ? 'critical' : 'normal',
    },
    {
      ...mockBuses[3],
      voltage: b4Voltage,
      loadKw: Math.round(loadTotalKw * 0.3),
      status: 'normal',
    },
  ]

  const feeders: Feeder[] = mockFeeders.map((f) => {
    if (f.id === 'F-02') {
      return {
        ...f,
        loadingPercent: f02Load,
        activePowerKw: Math.round(300 * (f02Load / 100)),
        status: isF02Overloaded ? 'critical' : 'normal',
      }
    }
    if (f.id === 'F-01') {
      return {
        ...f,
        loadingPercent: f01Load,
        status: f01Load > 100 ? 'warning' : 'normal',
      }
    }
    return f
  })

  const violations: GridViolation[] = []
  if (isB3Overvoltage) {
    violations.push({
      id: 'VIO-VOLT-B3',
      time: timeString,
      componentType: 'bus',
      componentId: 'B3',
      componentName: 'Bus 3',
      issue: 'Over-voltage',
      type: 'over_voltage',
      value: b3Voltage,
      unit: 'pu',
      formattedValue: `${b3Voltage} pu`,
      limit: 1.050,
      formattedLimit: '1.050 pu',
      severity: 'critical',
      status: 'active',
      recommendationHint: 'Execute feeder reconfiguration or battery charging/curtailment',
    })
  }

  if (isF02Overloaded) {
    violations.push({
      id: 'VIO-FEED-F02',
      time: timeString,
      componentType: 'feeder',
      componentId: 'F-02',
      componentName: 'Feeder F-02',
      issue: 'Overloaded',
      type: 'feeder_overload',
      value: f02Load,
      unit: '%',
      formattedValue: `${f02Load}%`,
      limit: 100,
      formattedLimit: '100%',
      severity: 'critical',
      status: 'active',
      recommendationHint: 'Shift tie-line load to Feeder F-03',
    })
  }

  return {
    buses,
    feeders,
    violations,
    solarTotalKw,
    loadTotalKw,
  }
}

export const mockDefaultPowerFlow: PowerFlowResult = {
  timestamp: '13:15',
  converged: true,
  iterations: 4,
  buses: mockBuses,
  feeders: mockFeeders,
  violations: mockViolations.filter((v) => v.status === 'active').slice(0, 2),
  totalLossKw: 14.2,
  totalGenerationKw: 230,
  totalDemandKw: 270,
}

export const mockDefaultSimulationResponse: SimulationResponse = {
  powerFlow: mockDefaultPowerFlow,
  availableActions: mockCorrectiveActions,
  recommendedActionId: 'ACT-02',
  comparisonData: defaultComparisonData,
}
