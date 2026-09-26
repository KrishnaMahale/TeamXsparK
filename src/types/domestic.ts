export type ComponentStatus = 'normal' | 'warning' | 'critical'

export interface ApplianceItem {
  id: string
  name: string
  powerKw: number
  category: 'hvac' | 'ev' | 'kitchen' | 'laundry' | 'general'
  isActive: boolean
  powerSource: 'solar' | 'battery' | 'grid' | 'hybrid'
}

export interface RooftopSolarSystem {
  hasSolar: boolean
  installedCapacityKw: number
  panelCount: number
  panelType: string
  cellTechnology: string
  moduleWattageW: number
  totalSurfaceAreaM2: number
  tiltDeg: number
  azimuth: string
  irradianceWm2: number
  ambientTempC: number
  cellTemperatureC: number
  tempCoefficientPmax: number // % per °C, typically -0.32%
  dcPowerGeneratedKw: number
  mpptEfficiencyPercent: number
  inverterCapacityKw: number
  inverterModel: string
  inverterEfficiencyPercent: number
  inverterDcVoltageV: number
  inverterDcCurrentA: number
  inverterAcPowerKw: number
  currentGenerationKw: number
  inverterAcCurrentA: number
  gridFrequencyHz: number
  operatingPowerFactor: number
  reactivePowerKvar: number
  voltVarActive: boolean
  voltWattActive: boolean
  curtailedKw: number
  curtailmentPercent: number
  dailyYieldKwh: number
  monthlyYieldKwh: number
  lifetimeMwh: number
  avoidedCo2Kg: number
}

export interface HomeBatterySystem {
  installed: boolean
  brand: string
  cellChemistry: string
  capacityKwh: number
  usableCapacityKwh: number
  currentSocPercent: number
  maxChargeKw: number
  maxDischargeKw: number
  currentPowerKw: number // Positive = discharging, Negative = charging, 0 = idle
  mode: 'charge' | 'discharge' | 'idle'
  roundTripEfficiencyPercent: number
  dcBusVoltageV: number
  chargeCurrentA: number
  temperatureC: number
  cycleCount: number
  healthPercent: number
}

export interface DomesticConsumption {
  currentLoadKw: number
  baseLoadKw: number
  dailyConsumptionKwh: number
  powerFactor: number
  solarSelfConsumedKw: number
  batterySelfConsumedKw: number
  gridImportConsumedKw: number
  activeAppliances: ApplianceItem[]
  hasEv: boolean
  evCharging: boolean
  evPowerKw: number
  evSocPercent?: number
}

export interface DomesticTelemetry {
  voltageV: number
  voltagePu: number
  nominalVoltageV: number
  phaseVoltageL1: number
  phaseVoltageL2: number
  phaseVoltageL3: number
  voltageUnbalanceFactorPercent: number
  currentAmps: number
  netPowerKw: number // Positive = export surplus, Negative = import deficit
  flowDirection: 'export' | 'import' | 'self_sufficient'
  powerFactor: number
  reactivePowerKvar: number
  frequencyHz: number
  thdVoltagePercent: number
  lineLossesKw: number
  status: ComponentStatus
  selfConsumptionPercent: number
  p2pSharedKw: number
  gridExportKw: number
  gridImportKw: number
  dailyCostSavings: number
}

export interface HouseNode {
  id: string
  name: string
  address: string
  houseNumber: number
  distanceMeters: number
  phase: 'L1' | 'L2' | 'L3'
  coords: { x: number; y: number }
  rooftopSolar: RooftopSolarSystem
  battery?: HomeBatterySystem
  consumption: DomesticConsumption
  telemetry: DomesticTelemetry
}

export interface DomesticTransformer {
  id: string
  name: string
  ratingKva: number
  primaryVoltageKv: number // 11 kV
  secondaryVoltageV: number // 230/400 V
  currentLoadKw: number
  currentLoadKva: number
  loadingPercent: number
  flowDirection: 'import_from_grid' | 'reverse_export_to_grid'
  powerFactor: number
  tapPosition: number // -2, -1, 0, +1, +2
  tapRatioPercent: number // -5.0%, -2.5%, 0.0%, +2.5%, +5.0%
  phaseLoadingL1Percent: number
  phaseLoadingL2Percent: number
  phaseLoadingL3Percent: number
  voltageUnbalanceFactorPercent: number
  status: ComponentStatus
  ambientTemperatureC: number
  oilTemperatureC: number
}

export interface StreetSegment {
  id: string
  fromNode: string
  toNode: string
  lengthMeters: number
  cableType: string
  rOhm: number
  xOhm: number
  currentAmps: number
  voltageDropV: number
  loadingPercent: number
  status: ComponentStatus
}

export interface DomesticGridViolation {
  id: string
  houseId: string
  houseName: string
  type: 'over_voltage' | 'under_voltage' | 'line_overload' | 'transformer_overload' | 'phase_imbalance'
  severity: 'warning' | 'critical'
  message: string
  standardRef: string // IEEE 1547 / EN 50160 / AS 4777
  currentValue: number
  thresholdValue: number
  unit: string
  timestamp: string
  resolvingActionHint: string
}

export interface DomesticGridNetwork {
  transformer: DomesticTransformer
  houses: HouseNode[]
  segments: StreetSegment[]
  timestamp: string
  totalGenerationKw: number
  totalLoadKw: number
  netGridExchangeKw: number // Positive = neighborhood exports to 11kV grid, Negative = imports
  peakVoltageV: number
  lowestVoltageV: number
  averageVoltageV: number
  overVoltageHousesCount: number
  underVoltageHousesCount: number
  phaseUnbalanceMaxPercent: number
  selfConsumptionRatePercent: number
  totalStorageKwh: number
  averageBatterySocPercent: number
  p2pEnergyExchangedKw: number
  totalLineLossesKw: number
  violations: DomesticGridViolation[]
}

export type DomesticPreset =
  | 'SUNNY_NOON_EXPORT'
  | 'EVENING_PEAK'
  | 'BALANCED_STORAGE'
  | 'OVERCAST_IMPORT'

export type DomesticControlAction =
  | 'NONE'
  | 'VOLT_VAR_DROOP'
  | 'VOLT_WATT_THROTTLE'
  | 'TRANSFORMER_TAP_CHANGE'
  | 'BATTERY_PEAK_SHAVING'
  | 'EV_SMART_CHARGING'
  | 'PHASE_REBALANCING'

export interface DomesticTimeSeriesPoint {
  time: string
  solarGenerationKw: number
  householdLoadKw: number
  gridExchangeKw: number
  maxVoltageV: number
  minVoltageV: number
  batterySocPercent: number
  transformerLoadingPercent: number
  voltageUnbalancePercent: number
}

export type GridType = 'industrial' | 'domestic'
