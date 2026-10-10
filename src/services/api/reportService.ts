import { GridReportSummary } from '../../types/report'
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
}
