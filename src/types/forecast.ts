export interface ForecastDataPoint {
  time: string // "HH:MM", e.g. "13:00"
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
  solarAccuracyPercent: number
  loadAccuracyPercent: number
  modelType: string // "Random Forest Regressor"
  forecastHorizonHours: number
  isMockDemo: boolean
}

export interface ForecastResponse {
  timestamp: string
  horizonHours: number
  metrics: ForecastMetrics
  dataPoints: ForecastDataPoint[]
}
