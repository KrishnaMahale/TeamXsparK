export interface ForecastDataPoint {
  time: string // "HH:MM", e.g. "13:00"
  timestamp?: string // ISO 8601 with timezone, e.g. "2025-06-10T13:00:00+05:30"
  solarGenerationKw: number
  loadDemandKw: number
  predictedSolarKw: number
  predictedLoadKw: number
  netPowerKw: number // solarGenerationKw - loadDemandKw
  confidenceLowerKw?: number
  confidenceUpperKw?: number
}

export interface ForecastMetrics {
  currentSolarKw: number
  currentLoadKw: number
  netPowerKw: number
  peakSolarKw: number
  peakLoadKw: number
  solarAccuracyPercent?: number | null
  loadAccuracyPercent?: number | null
  modelType: string
  forecastHorizonHours: number
  isMockDemo: boolean
  gridId?: string
  targetDate?: string
  timezone?: string
  resolutionMinutes?: number
}

export interface ForecastResponse {
  timestamp: string
  horizonHours: number
  metrics: ForecastMetrics
  dataPoints: ForecastDataPoint[]
}
