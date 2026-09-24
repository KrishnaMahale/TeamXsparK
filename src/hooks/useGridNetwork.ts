import { useEffect } from 'react'
import { useGridStore } from '../store/gridStore'

export const useGridNetwork = () => {
  const { network, isLoading, error, fetchNetwork } = useGridStore()

  useEffect(() => {
    fetchNetwork()
  }, [fetchNetwork])

  return {
    network,
    buses: network.buses,
    feeders: network.feeders,
    solarUnits: network.solarUnits,
    batteries: network.batteries,
    loads: network.loads,
    substation: network.substation,
    isLoading,
    error,
    refresh: fetchNetwork,
  }
}
