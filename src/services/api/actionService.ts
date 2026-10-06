import { CorrectiveAction, ActionExecutionResult } from '../../types/action'
import { mockCorrectiveActions, createExecutionResult } from '../../mocks/actionMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

export const actionService = {
  /**
   * Fetch available corrective actions evaluated by backend engine
   */
  async getActions(gridId?: string): Promise<CorrectiveAction[]> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return JSON.parse(JSON.stringify(mockCorrectiveActions))
    }
    try {
      const response = await apiClient.get<CorrectiveAction[]>('/actions', {
        params: gridId ? { grid_id: gridId } : undefined,
      })
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data
      }
      return mockCorrectiveActions
    } catch (err) {
      console.warn('[actionService] Falling back to mock actions due to backend error:', err)
      return mockCorrectiveActions
    }
  },

  /**
   * Execute a specific corrective action
   */
  async executeAction(actionId: string, gridId?: string): Promise<ActionExecutionResult> {
    if (IS_MOCK_API) {
      await simulateLatency(400)
      const action = mockCorrectiveActions.find((a) => a.id === actionId) || mockCorrectiveActions[0]
      return createExecutionResult(action)
    }
    try {
      const response = await apiClient.post<ActionExecutionResult>(
        `/actions/${actionId}/execute`,
        null,
        { params: gridId ? { grid_id: gridId } : undefined }
      )
      return response.data
    } catch (err) {
      console.warn('[actionService] Falling back to local execution result:', err)
      const action = mockCorrectiveActions.find((a) => a.id === actionId) || mockCorrectiveActions[0]
      return createExecutionResult(action)
    }
  },
}
