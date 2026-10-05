import { GridNetwork, Bus, Feeder } from '../../types/network'
import { mockNetwork } from '../../mocks/networkMock'
import { apiClient, IS_MOCK_API, simulateLatency } from './apiClient'

const STORAGE_KEY_GRIDS = 'grid_twin_saved_grids'
const STORAGE_KEY_ACTIVE_ID = 'grid_twin_active_grid_id'

const getLocalGrids = (): GridNetwork[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GRIDS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.warn('Failed to parse local grids', e)
  }
  const defaultList = [JSON.parse(JSON.stringify(mockNetwork))]
  saveLocalGrids(defaultList)
  return defaultList
}

const saveLocalGrids = (grids: GridNetwork[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_GRIDS, JSON.stringify(grids))
  } catch (e) {
    console.warn('Failed to save local grids', e)
  }
}

const getLocalActiveId = (): string => {
  try {
    const id = localStorage.getItem(STORAGE_KEY_ACTIVE_ID)
    if (id) return id
  } catch (e) {
    console.warn('Failed to get local active grid id', e)
  }
  return 'default-grid'
}

const saveLocalActiveId = (id: string) => {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id)
  } catch (e) {
    console.warn('Failed to save local active grid id', e)
  }
}

export const gridService = {
  /**
   * Fetch all saved grids (backend with local fallback)
   */
  async getGrids(): Promise<GridNetwork[]> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return getLocalGrids()
    }
    try {
      const response = await apiClient.get<GridNetwork[]>('/networks/grids')
      if (Array.isArray(response.data) && response.data.length > 0) {
        saveLocalGrids(response.data)
        return response.data
      }
    } catch (err) {
      console.warn('Backend /networks/grids unavailable, using local cache', err)
    }
    return getLocalGrids()
  },

  /**
   * Fetch active grid ID
   */
  async getActiveGridId(): Promise<string> {
    if (IS_MOCK_API) {
      await simulateLatency()
      return getLocalActiveId()
    }
    try {
      const response = await apiClient.get<{ active_grid_id: string }>('/networks/grids/active')
      if (response.data?.active_grid_id) {
        saveLocalActiveId(response.data.active_grid_id)
        return response.data.active_grid_id
      }
    } catch (err) {
      console.warn('Backend /networks/grids/active unavailable, using local active ID', err)
    }
    return getLocalActiveId()
  },

  /**
   * Set active grid ID
   */
  async setActiveGridId(gridId: string): Promise<string> {
    saveLocalActiveId(gridId)
    if (!IS_MOCK_API) {
      try {
        await apiClient.put('/networks/grids/active', { grid_id: gridId })
      } catch (err) {
        console.warn('Failed to sync active grid to backend', err)
      }
    }
    return gridId
  },

  /**
   * Fetch specific grid by ID
   */
  async getGrid(id: string): Promise<GridNetwork> {
    if (!IS_MOCK_API) {
      try {
        const response = await apiClient.get<GridNetwork>(`/networks/grids/${id}`)
        if (response.data) {
          return response.data
        }
      } catch (err) {
        console.warn(`Backend /networks/grids/${id} failed, checking local`, err)
      }
    }
    const local = getLocalGrids().find((g) => g.id === id)
    if (local) return local
    return JSON.parse(JSON.stringify(mockNetwork))
  },

  /**
   * Create a new grid
   */
  async createGrid(grid: Partial<GridNetwork>): Promise<GridNetwork> {
    const id = grid.id || `GRID-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
    const newGrid: GridNetwork = {
      id,
      name: grid.name || `Grid ${id}`,
      gridConnectionStatus: grid.gridConnectionStatus || 'connected',
      gridFrequencyHz: grid.gridFrequencyHz || 50.0,
      substation: grid.substation || JSON.parse(JSON.stringify(mockNetwork.substation)),
      buses: grid.buses || [],
      feeders: grid.feeders || [],
      solarUnits: grid.solarUnits || [],
      batteries: grid.batteries || [],
      loads: grid.loads || [],
      lastUpdated: new Date().toISOString(),
    }

    // Save locally
    const current = getLocalGrids()
    const updated = [...current.filter((g) => g.id !== id), newGrid]
    saveLocalGrids(updated)
    saveLocalActiveId(id)

    if (!IS_MOCK_API) {
      try {
        const response = await apiClient.post<GridNetwork>('/networks/grids', newGrid)
        if (response.data) {
          await this.setActiveGridId(response.data.id)
          return response.data
        }
      } catch (err) {
        console.warn('Failed to sync created grid to backend', err)
      }
    }

    return newGrid
  },

  /**
   * Update an existing grid
   */
  async updateGrid(id: string, grid: GridNetwork): Promise<GridNetwork> {
    grid.lastUpdated = new Date().toISOString()

    // Save locally
    const current = getLocalGrids()
    const index = current.findIndex((g) => g.id === id)
    if (index >= 0) {
      current[index] = grid
    } else {
      current.push(grid)
    }
    saveLocalGrids(current)

    if (!IS_MOCK_API) {
      try {
        const response = await apiClient.put<GridNetwork>(`/networks/grids/${id}`, grid)
        if (response.data) return response.data
      } catch (err) {
        console.warn(`Failed to update grid ${id} on backend`, err)
      }
    }

    return grid
  },

  /**
   * Delete a grid
   */
  async deleteGrid(id: string): Promise<boolean> {
    if (id === 'default-grid') {
      console.warn('Cannot delete the default grid')
      return false
    }

    // Remove locally
    const current = getLocalGrids()
    const updated = current.filter((g) => g.id !== id)
    saveLocalGrids(updated)

    if (getLocalActiveId() === id) {
      saveLocalActiveId('default-grid')
    }

    if (!IS_MOCK_API) {
      try {
        await apiClient.delete(`/networks/grids/${id}`)
      } catch (err) {
        console.warn(`Failed to delete grid ${id} from backend`, err)
      }
    }

    return true
  },

  /**
   * Legacy getNetwork helper
   */
  async getNetwork(): Promise<GridNetwork> {
    const activeId = await this.getActiveGridId()
    return this.getGrid(activeId)
  },

  /**
   * Fetch specific Bus details by ID
   */
  async getBusDetails(id: string): Promise<Bus | undefined> {
    const net = await this.getNetwork()
    return net.buses.find((b) => b.id === id)
  },

  /**
   * Fetch specific Feeder details by ID
   */
  async getFeederDetails(id: string): Promise<Feeder | undefined> {
    const net = await this.getNetwork()
    return net.feeders.find((f) => f.id === id)
  },
}
