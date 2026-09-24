export interface GridReportSummary {
  scenarioName: string
  simulationTime: string
  initialViolations: number
  finalViolations: number
  renewableUtilizationPercent: number
  recommendedAction: string
  peakSolarKw: number
  peakLoadKw: number
  curtailedEnergyKwh: number
  batteryThroughputKwh: number
  gridLossPercent: number
  voltageStabilityIndex: number
  generatedAt: string
}

export interface ReportExportData {
  reportId: string
  timestamp: string
  summary: GridReportSummary
  buses: Array<{ id: string; name: string; voltage: number; status: string }>
  feeders: Array<{ id: string; name: string; loadingPercent: number; status: string }>
  violations: Array<{ id: string; issue: string; component: string; severity: string }>
}
