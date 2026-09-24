import {
  SimulationInput,
  TimeSeriesSolarPoint,
  TimeSeriesLoadPoint,
  NetworkLimitsConfig,
  BatteryStorageConfig,
} from '../types/simulation'

export const defaultNetworkConfig: NetworkLimitsConfig = {
  voltageMinPu: 0.95,
  voltageMaxPu: 1.05,
  feederLoadingLimitPercent: 100,
  transformerLoadingLimitPercent: 100,
  feederTopology: 'normal',
}

export const defaultBatteryConfig: BatteryStorageConfig = {
  capacityKwh: 100,
  initialSocPercent: 62,
  maxChargeKw: 40,
  maxDischargeKw: 40,
}

/**
 * Generates a realistic bell-shaped daytime solar generation profile
 */
export const generateSampleSolarProfile = (installedCapacityKw: number = 250): TimeSeriesSolarPoint[] => {
  const times = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
  ]

  return times.map((t, idx) => {
    const hour = 6 + idx
    let factor = 0
    if (hour >= 6 && hour <= 19) {
      // Sinusoidal bell curve peak at 13:00
      factor = Math.sin(((hour - 6) / 13) * Math.PI)
    }
    const solarKw = Math.round(installedCapacityKw * Math.max(0, factor))
    return {
      id: `solar-${t}`,
      time: t,
      solarKw,
    }
  })
}

/**
 * Generates a realistic dual-peak electricity load demand profile
 */
export const generateSampleLoadProfile = (peakLoadKw: number = 180): TimeSeriesLoadPoint[] => {
  const times = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '24:00'
  ]

  // Base profile curve weights normalized around 0.35 to 1.0
  const weights: Record<string, number> = {
    '06:00': 0.35, '07:00': 0.42, '08:00': 0.52, '09:00': 0.60,
    '10:00': 0.65, '11:00': 0.70, '12:00': 0.73, '13:00': 0.75,
    '14:00': 0.78, '15:00': 0.82, '16:00': 0.85, '17:00': 0.90,
    '18:00': 1.00, '19:00': 0.96, '20:00': 0.88, '21:00': 0.78,
    '22:00': 0.65, '23:00': 0.50, '24:00': 0.42,
  }

  return times.map((t) => ({
    id: `load-${t}`,
    time: t,
    loadKw: Math.round(peakLoadKw * (weights[t] || 0.5)),
  }))
}

export const scenarioPresets: Record<string, Partial<SimulationInput>> = {
  HIGH_SOLAR_LOW_LOAD: {
    scenarioName: 'High Solar - Low Load',
    scenarioDescription: 'Peak midday rooftop generation with depressed commercial load causing critical Bus 3 voltage rise (1.074 pu) and Feeder F-02 overload.',
    installedSolarCapacityKw: 250,
    currentSolarKw: 240,
    peakLoadKw: 140,
    currentLoadKw: 120,
    batteryConfig: {
      capacityKwh: 100,
      initialSocPercent: 62,
      maxChargeKw: 40,
      maxDischargeKw: 40,
    },
  },
  HIGH_SOLAR: {
    scenarioName: 'High Solar',
    scenarioDescription: 'Intense noon solar irradiance creating reverse power flow, Bus 3 voltage rise, and Feeder F-02 thermal overload.',
    installedSolarCapacityKw: 250,
    currentSolarKw: 240,
    peakLoadKw: 160,
    currentLoadKw: 120,
    batteryConfig: {
      capacityKwh: 100,
      initialSocPercent: 62,
      maxChargeKw: 40,
      maxDischargeKw: 40,
    },
  },
  EVENING_PEAK: {
    scenarioName: 'Evening Peak',
    scenarioDescription: 'Post-sunset residential cooking & HVAC load surge with zero solar generation causing feeder congestion and low battery reserve.',
    installedSolarCapacityKw: 250,
    currentSolarKw: 15,
    peakLoadKw: 180,
    currentLoadKw: 175,
    batteryConfig: {
      capacityKwh: 100,
      initialSocPercent: 30,
      maxChargeKw: 40,
      maxDischargeKw: 40,
    },
  },
  NORMAL_DAY: {
    scenarioName: 'Normal Day',
    scenarioDescription: 'Balanced distributed generation and residential/commercial demand with all assets operating within statutory limits.',
    installedSolarCapacityKw: 250,
    currentSolarKw: 95,
    peakLoadKw: 150,
    currentLoadKw: 110,
    batteryConfig: {
      capacityKwh: 100,
      initialSocPercent: 70,
      maxChargeKw: 40,
      maxDischargeKw: 40,
    },
  },
  EXTREME_INFEASIBLE: {
    scenarioName: 'Extreme / Infeasible Scenario',
    scenarioDescription: 'Severe solar overgeneration with critically low battery reserves (15% SOC). Requested maximum battery discharge fails because SOC is below safe technical depth-of-discharge limits.',
    installedSolarCapacityKw: 250,
    currentSolarKw: 250,
    peakLoadKw: 150,
    currentLoadKw: 80,
    batteryConfig: {
      capacityKwh: 100,
      initialSocPercent: 15, // Depleted battery
      maxChargeKw: 40,
      maxDischargeKw: 80,
    },
  },
}

export const createSimulationInputFromPreset = (presetKey: string = 'HIGH_SOLAR_LOW_LOAD'): SimulationInput => {
  const preset = scenarioPresets[presetKey] || scenarioPresets.HIGH_SOLAR_LOW_LOAD
  const installedSolar = preset.installedSolarCapacityKw || 250
  const peakLoad = preset.peakLoadKw || 180

  return {
    scenarioName: preset.scenarioName || 'High Solar - Low Load',
    scenarioDescription: preset.scenarioDescription || '',
    simulationDate: '24 September 2026',
    simulationDuration: '24 hours',
    timeResolution: '1 hour',
    installedSolarCapacityKw: installedSolar,
    currentSolarKw: preset.currentSolarKw ?? 150,
    solarTimeSeries: generateSampleSolarProfile(installedSolar),
    peakLoadKw: peakLoad,
    currentLoadKw: preset.currentLoadKw ?? 120,
    loadTimeSeries: generateSampleLoadProfile(peakLoad),
    networkConfig: { ...defaultNetworkConfig },
    batteryConfig: preset.batteryConfig ? { ...preset.batteryConfig } : { ...defaultBatteryConfig },
  }
}
