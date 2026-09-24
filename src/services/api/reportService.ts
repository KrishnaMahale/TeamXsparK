import { GridReportSummary, ReportExportData } from '../../types/report'
import { mockNetwork } from '../../mocks/networkMock'
import { mockViolations } from '../../mocks/violationMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const reportService = {
  /**
   * Generate an operational summary report for current or selected scenario
   */
  async generateReport(scenarioName: string = 'High Solar', simulationTime: string = '13:15'): Promise<GridReportSummary> {
    if (IS_MOCK_API) {
      await simulateLatency(400)
      return {
        scenarioName,
        simulationTime,
        initialViolations: 2,
        finalViolations: 0,
        renewableUtilizationPercent: 96,
        recommendedAction: 'Feeder Reconfiguration (F-02 → F-03)',
        peakSolarKw: 240,
        peakLoadKw: 150,
        curtailedEnergyKwh: 0,
        batteryThroughputKwh: 24.5,
        gridLossPercent: 3.2,
        voltageStabilityIndex: 0.98,
        generatedAt: new Date().toISOString(),
      }
    }
    const response = await apiClient.post<GridReportSummary>('/reports/generate', {
      scenarioName,
      simulationTime,
    })
    return response.data
  },

  /**
   * Export client-side JSON formatted report
   */
  exportReportJson(data: ReportExportData): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `GridDigitalTwin_Report_${data.timestamp.replace(/[:.]/g, '-')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  /**
   * Export client-side CSV report
   */
  exportReportCsv(summary: GridReportSummary): void {
    const headers = ['Metric', 'Value']
    const rows = [
      ['Scenario', summary.scenarioName],
      ['Simulation Time', summary.simulationTime],
      ['Initial Violations', summary.initialViolations.toString()],
      ['Final Violations', summary.finalViolations.toString()],
      ['Renewable Utilization (%)', `${summary.renewableUtilizationPercent}%`],
      ['Recommended Action', summary.recommendedAction],
      ['Peak Solar (kW)', summary.peakSolarKw.toString()],
      ['Peak Load (kW)', summary.peakLoadKw.toString()],
      ['Curtailed Energy (kWh)', summary.curtailedEnergyKwh.toString()],
      ['Loss (%)', `${summary.gridLossPercent}%`],
      ['Generated At', summary.generatedAt],
    ]
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `GridDigitalTwin_Report_${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}
