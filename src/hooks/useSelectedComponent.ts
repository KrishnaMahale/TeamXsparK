import { useGridStore } from '../store/gridStore'
import { ComponentSelection } from '../types/network'

export const useSelectedComponent = () => {
  const { selectedComponent, setSelectedComponent, network } = useGridStore()

  // Always keep selected data synced with live network changes
  const liveSelectedData = (() => {
    if (!selectedComponent) return null

    if (selectedComponent.type === 'bus') {
      const bus = network.buses.find((b) => b.id === selectedComponent.id)
      return bus ? { type: 'bus' as const, id: bus.id, data: bus } : selectedComponent
    }
    if (selectedComponent.type === 'feeder') {
      const feeder = network.feeders.find((f) => f.id === selectedComponent.id)
      return feeder ? { type: 'feeder' as const, id: feeder.id, data: feeder } : selectedComponent
    }
    if (selectedComponent.type === 'solar') {
      const solar = network.solarUnits.find((s) => s.id === selectedComponent.id)
      return solar ? { type: 'solar' as const, id: solar.id, data: solar } : selectedComponent
    }
    if (selectedComponent.type === 'battery') {
      const battery = network.batteries.find((b) => b.id === selectedComponent.id)
      return battery ? { type: 'battery' as const, id: battery.id, data: battery } : selectedComponent
    }
    if (selectedComponent.type === 'load') {
      const load = network.loads.find((l) => l.id === selectedComponent.id)
      return load ? { type: 'load' as const, id: load.id, data: load } : selectedComponent
    }
    if (selectedComponent.type === 'transformer') {
      return { type: 'transformer' as const, id: network.substation.id, data: network.substation }
    }
    return selectedComponent
  })()

  return {
    selectedComponent: liveSelectedData,
    setSelectedComponent,
    clearSelection: () => setSelectedComponent(null),
  }
}
