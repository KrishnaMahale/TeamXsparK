import { GridNetwork } from '../../types/network'
import { forecastService } from '../../services/api/forecastService'
import { ForecastDataPoint } from '../../types/forecast'

export interface DayAheadForecastPoint {
  time: string // "00:00" through "23:45"
  solarKw: number // Expected solar PV generation (kW)
  loadKw: number // Expected consumer load demand (kW)
  netDemandKw: number // Net Demand = Load Demand - Solar Generation (kW)
  isSurplus: boolean // true when solarKw > loadKw
}

export interface DayAheadSummary {
  peakSolarKw: number
  peakSolarTime: string
  peakLoadKw: number
  peakLoadTime: string
  totalSolarKwh: number // Total daily renewable generation (kWh)
  totalLoadKwh: number // Total daily load demand (kWh)
  maxSurplusKw: number // Maximum generation exceeding load (kW)
  surplusStartTime: string | null
  surplusEndTime: string | null
  minNetDemandKw: number
  maxNetDemandKw: number
  energyCoveragePercent: number
  modelType: string
  forecastStatus: string
}

export interface DayAheadForecastResult {
  gridId: string
  gridName: string
  simulationDate: string
  dataPoints: DayAheadForecastPoint[]
  summary: DayAheadSummary
  insights: string[]
}

/**
 * Computes summary statistics and dynamic operational insights from 24-hour profile.
 * Supports both 96-point (15m) and 24-point horizons using fractional integration.
 */
export function computeSummaryAndInsights(
  points: DayAheadForecastPoint[],
  grid: GridNetwork,
  dateStr: string,
  modelType: string = 'Step 4C ML Models'
): { summary: DayAheadSummary; insights: string[] } {
  let peakSolar = 0
  let peakSolarTime = '12:00'
  let peakLoad = 0
  let peakLoadTime = '19:00'
  let totalSolarKwh = 0
  let totalLoadKwh = 0
  let maxSurplus = 0
  let surplusStart: string | null = null
  let surplusEnd: string | null = null
  let minNetDemand = Infinity
  let maxNetDemand = -Infinity

  // Resolution integration factor (e.g. 0.25h for 96 points, 1.0h for 24 points)
  const dtHours = points.length > 0 ? 24.0 / points.length : 0.25

  points.forEach((pt) => {
    totalSolarKwh += pt.solarKw * dtHours
    totalLoadKwh += pt.loadKw * dtHours

    if (pt.solarKw > peakSolar) {
      peakSolar = pt.solarKw
      peakSolarTime = pt.time
    }

    if (pt.loadKw > peakLoad) {
      peakLoad = pt.loadKw
      peakLoadTime = pt.time
    }

    if (pt.netDemandKw < minNetDemand) {
      minNetDemand = pt.netDemandKw
    }

    if (pt.netDemandKw > maxNetDemand) {
      maxNetDemand = pt.netDemandKw
    }

    if (pt.isSurplus) {
      const surplus = pt.solarKw - pt.loadKw
      if (surplus > maxSurplus) {
        maxSurplus = surplus
      }
      if (!surplusStart) surplusStart = pt.time
      surplusEnd = pt.time
    }
  })

  totalSolarKwh = Math.round(totalSolarKwh * 10) / 10
  totalLoadKwh = Math.round(totalLoadKwh * 10) / 10
  minNetDemand = Math.round(minNetDemand * 10) / 10
  maxNetDemand = Math.round(maxNetDemand * 10) / 10
  maxSurplus = Math.round(maxSurplus * 10) / 10

  const coveragePercent =
    totalLoadKwh > 0 ? Math.min(100, Math.round((totalSolarKwh / totalLoadKwh) * 1000) / 10) : 0

  const summary: DayAheadSummary = {
    peakSolarKw: peakSolar,
    peakSolarTime,
    peakLoadKw: peakLoad,
    peakLoadTime,
    totalSolarKwh,
    totalLoadKwh,
    maxSurplusKw: maxSurplus,
    surplusStartTime: surplusStart,
    surplusEndTime: surplusEnd,
    minNetDemandKw: minNetDemand,
    maxNetDemandKw: maxNetDemand,
    energyCoveragePercent: coveragePercent,
    modelType,
    forecastStatus: 'Generated',
  }

  // Derive factual engineering insights directly from numbers
  const solarCap = grid.solarUnits.reduce((acc, s) => acc + (s.capacityKw || 0), 0)
  const bessCap = grid.batteries.reduce((acc, b) => acc + (b.capacityKwh || 0), 0)
  const insights: string[] = []

  // 1. Peak Solar Timing
  if (peakSolar > 0) {
    const capDenom = solarCap > 0 ? solarCap : peakSolar
    insights.push(
      `Peak solar generation is forecasted at ${peakSolar.toFixed(1)} kW at ${peakSolarTime}, representing ${Math.round((peakSolar / capDenom) * 100)}% of installed PV capacity.`
    )
  }

  // 2. Peak Demand Timing
  insights.push(
    `Maximum consumer demand is projected at ${peakLoad.toFixed(1)} kW at ${peakLoadTime}.`
  )

  // 3. Surplus / Reverse Flow Window
  if (surplusStart && surplusEnd && maxSurplus > 0) {
    insights.push(
      `Renewable generation exceeds local demand between ${surplusStart} and ${surplusEnd} (peak surplus of ${maxSurplus.toFixed(1)} kW), creating potential reverse power flow into the primary substation.`
    )
  } else {
    insights.push(
      `Solar generation offsets daylight demand but remains below peak consumption; net demand remains positive throughout the 24-hour cycle.`
    )
  }

  // 4. Diurnal Energy Balance
  insights.push(
    `Projected daily solar yield is ${totalSolarKwh.toLocaleString()} kWh against total demand of ${totalLoadKwh.toLocaleString()} kWh, providing ${coveragePercent}% renewable energy coverage.`
  )

  // 5. Grid Asset Context
  if (grid.batteries.length > 0 && bessCap > 0) {
    insights.push(
      `Active grid configuration '${grid.name}' includes ${grid.batteries.length} BESS unit(s) (${bessCap} kWh capacity) available for solar absorption during surplus hours.`
    )
  } else {
    insights.push(
      `Active grid configuration '${grid.name}' contains ${grid.buses.length} buses and ${grid.solarUnits.length} solar generation assets.`
    )
  }

  return { summary, insights }
}

/**
 * Service adapter for the Forecasts page:
 * Queries the real backend ML forecast API for the selected grid and target date.
 * No client-side 250/270 scaling or synthetic fallback.
 */
export async function fetchDayAheadForecast(
  grid: GridNetwork,
  dateStr: string
): Promise<DayAheadForecastResult> {
  const rawResponse = await forecastService.getForecast(24, grid.id, dateStr)

  if (!rawResponse || !Array.isArray(rawResponse.dataPoints) || rawResponse.dataPoints.length === 0) {
    throw new Error('Forecast API returned an empty or invalid response.')
  }

  // Backend performs real physics and grid scaling. Use API values directly.
  const dataPoints: DayAheadForecastPoint[] = rawResponse.dataPoints.map((pt: ForecastDataPoint) => {
    const solarKw = Math.max(0, Math.round((pt.predictedSolarKw ?? pt.solarGenerationKw ?? 0) * 10) / 10)
    const loadKw = Math.max(0, Math.round((pt.predictedLoadKw ?? pt.loadDemandKw ?? 0) * 10) / 10)
    const netDemandKw = Math.round((loadKw - solarKw) * 10) / 10

    return {
      time: pt.time,
      solarKw,
      loadKw,
      netDemandKw,
      isSurplus: solarKw > loadKw,
    }
  })

  const { summary, insights } = computeSummaryAndInsights(
    dataPoints,
    grid,
    dateStr,
    rawResponse.metrics?.modelType || 'Step 4C ML Models'
  )

  return {
    gridId: grid.id,
    gridName: grid.name,
    simulationDate: dateStr,
    dataPoints,
    summary,
    insights,
  }
}
