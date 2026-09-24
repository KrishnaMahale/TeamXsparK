import { ForecastDataPoint, ForecastMetrics, ForecastResponse } from '../types/forecast'

export const mockForecastDataPoints: ForecastDataPoint[] = [
  { time: '00:00', solarGenerationKw: 0, loadDemandKw: 75, predictedSolarKw: 0, predictedLoadKw: 73, netPowerKw: -75 },
  { time: '02:00', solarGenerationKw: 0, loadDemandKw: 65, predictedSolarKw: 0, predictedLoadKw: 67, netPowerKw: -65 },
  { time: '04:00', solarGenerationKw: 0, loadDemandKw: 58, predictedSolarKw: 0, predictedLoadKw: 60, netPowerKw: -58 },
  { time: '06:00', solarGenerationKw: 10, loadDemandKw: 60, predictedSolarKw: 12, predictedLoadKw: 62, netPowerKw: -50 },
  { time: '07:30', solarGenerationKw: 55, loadDemandKw: 75, predictedSolarKw: 52, predictedLoadKw: 74, netPowerKw: -20 },
  { time: '09:00', solarGenerationKw: 120, loadDemandKw: 90, predictedSolarKw: 118, predictedLoadKw: 93, netPowerKw: 30 },
  { time: '10:30', solarGenerationKw: 180, loadDemandKw: 105, predictedSolarKw: 175, predictedLoadKw: 108, netPowerKw: 75 },
  { time: '12:00', solarGenerationKw: 220, loadDemandKw: 120, predictedSolarKw: 215, predictedLoadKw: 118, netPowerKw: 100 },
  { time: '13:15', solarGenerationKw: 240, loadDemandKw: 120, predictedSolarKw: 238, predictedLoadKw: 122, netPowerKw: 120 },
  { time: '15:00', solarGenerationKw: 240, loadDemandKw: 150, predictedSolarKw: 235, predictedLoadKw: 148, netPowerKw: 90 },
  { time: '16:30', solarGenerationKw: 195, loadDemandKw: 145, predictedSolarKw: 190, predictedLoadKw: 142, netPowerKw: 50 },
  { time: '18:00', solarGenerationKw: 150, loadDemandKw: 140, predictedSolarKw: 145, predictedLoadKw: 138, netPowerKw: 10 },
  { time: '19:30', solarGenerationKw: 80, loadDemandKw: 130, predictedSolarKw: 78, predictedLoadKw: 134, netPowerKw: -50 },
  { time: '21:00', solarGenerationKw: 40, loadDemandKw: 110, predictedSolarKw: 38, predictedLoadKw: 112, netPowerKw: -70 },
  { time: '22:30', solarGenerationKw: 10, loadDemandKw: 95, predictedSolarKw: 8, predictedLoadKw: 96, netPowerKw: -85 },
  { time: '24:00', solarGenerationKw: 0, loadDemandKw: 85, predictedSolarKw: 0, predictedLoadKw: 84, netPowerKw: -85 },
]

export const mockForecastMetrics: ForecastMetrics = {
  currentSolarKw: 150,
  currentLoadKw: 120,
  netPowerKw: 30,
  peakSolarKw: 240,
  peakLoadKw: 150,
  solarAccuracyPercent: 92,
  loadAccuracyPercent: 89,
  modelType: 'Random Forest Regressor (ML Demo)',
  forecastHorizonHours: 24,
  isMockDemo: true,
}

export const mockForecastResponse: ForecastResponse = {
  timestamp: new Date().toISOString(),
  horizonHours: 24,
  metrics: mockForecastMetrics,
  dataPoints: mockForecastDataPoints,
}
