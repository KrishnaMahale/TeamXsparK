export type ComponentStatus = 'normal' | 'warning' | 'critical'

export type ComponentType = 'bus' | 'feeder' | 'solar' | 'battery' | 'load' | 'transformer' | 'substation'

export interface Position3D {
  x: number
  y: number
  z: number
}

export interface Bus {
  id: string
  name: string
  voltage: number // per unit (pu), e.g. 1.02
  voltageLimitMin: number // e.g. 0.95 pu
  voltageLimitMax: number // e.g. 1.05 pu
  loadKw: number
  solarKw: number
  lineLoadingPercent: number
  temperatureC: number
  status: ComponentStatus
  connectedFeeders: string[]
  connectedAssets: {
    solar?: string
    battery?: string
    load?: string
  }
  position?: Position3D
}

export interface Feeder {
  id: string
  name: string
  fromBus: string
  toBus: string
  loadingPercent: number
  loadingLimitPercent: number // e.g. 100%
  capacityKw: number
  activePowerKw: number
  reactivePowerKvar: number
  status: ComponentStatus
  isSwitchClosed: boolean
  isReconfigurableAlternate?: boolean
}

export interface SolarUnit {
  id: string
  name: string
  busId: string
  generationKw: number
  capacityKw: number
  irradianceWm2: number
  curtailedKw: number
  status: ComponentStatus
  position?: Position3D
}

export interface Battery {
  id: string
  name: string
  busId: string
  powerKw: number // positive = discharging, negative = charging
  maxDischargeKw: number
  maxChargeKw: number
  socPercent: number // State of Charge (0 - 100)
  capacityKwh: number
  status: ComponentStatus
  cycleCount: number
  position?: Position3D
}

export interface Load {
  id: string
  name: string
  busId: string
  powerKw: number
  powerFactor: number
  status: ComponentStatus
  position?: Position3D
}

export interface Transformer {
  id: string
  name: string
  ratingKva: number
  primaryVoltageKv: number
  secondaryVoltageKv: number
  loadingPercent: number
  temperatureC: number
  status: ComponentStatus
  position?: Position3D
}

export interface GridNetwork {
  id: string
  name: string
  gridConnectionStatus: 'connected' | 'islanded'
  gridFrequencyHz: number
  substation: Transformer
  buses: Bus[]
  feeders: Feeder[]
  solarUnits: SolarUnit[]
  batteries: Battery[]
  loads: Load[]
  lastUpdated: string
}

export interface ComponentSelection {
  type: ComponentType
  id: string
  data: Bus | Feeder | SolarUnit | Battery | Load | Transformer
}
