import { create } from 'zustand'
import {
  DomesticGridNetwork,
  DomesticPreset,
  DomesticControlAction,
  DomesticTimeSeriesPoint,
  GridType,
  HouseNode,
} from '../types/domestic'
import {
  calculateDomesticPowerFlow,
  generateDomestic24hProfile,
} from '../mocks/domesticMock'

interface DomesticState {
  gridType: GridType
  currentTime: string
  isPlaying: boolean
  activePreset: DomesticPreset
  activeControl: DomesticControlAction
  selectedHouseId: string | null
  network: DomesticGridNetwork
  timeSeriesHistory: DomesticTimeSeriesPoint[]

  // Actions
  setGridType: (type: GridType) => void
  setTime: (time: string) => void
  setPreset: (preset: DomesticPreset) => void
  setControlAction: (action: DomesticControlAction) => void
  selectHouse: (houseId: string | null) => void
  togglePlay: () => void
  stepForward: () => void
  stepBackward: () => void
  getSelectedHouse: () => HouseNode | undefined
  reset: () => void
}

const initialPreset: DomesticPreset = 'SUNNY_NOON_EXPORT'
const initialControl: DomesticControlAction = 'NONE'
const initialTime = '12:30'
const initialNetwork = calculateDomesticPowerFlow(initialTime, initialPreset, initialControl)
const initialHistory = generateDomestic24hProfile(initialPreset, initialControl)

export const useDomesticStore = create<DomesticState>((set, get) => ({
  gridType: 'industrial', // Default keeps existing view intact, user can switch to domestic with 1 click
  currentTime: initialTime,
  isPlaying: false,
  activePreset: initialPreset,
  activeControl: initialControl,
  selectedHouseId: 'HOUSE-08', // Highlight interesting end-of-line house
  network: initialNetwork,
  timeSeriesHistory: initialHistory,

  setGridType: (gridType) => set({ gridType }),

  setTime: (time) => {
    const { activePreset, activeControl } = get()
    const newNetwork = calculateDomesticPowerFlow(time, activePreset, activeControl)
    set({ currentTime: time, network: newNetwork })
  },

  setPreset: (preset) => {
    const { activeControl } = get()
    const targetTime =
      preset === 'SUNNY_NOON_EXPORT'
        ? '12:30'
        : preset === 'EVENING_PEAK'
        ? '19:30'
        : preset === 'BALANCED_STORAGE'
        ? '13:00'
        : '11:00'

    const newNetwork = calculateDomesticPowerFlow(targetTime, preset, activeControl)
    const newHistory = generateDomestic24hProfile(preset, activeControl)
    set({
      activePreset: preset,
      currentTime: targetTime,
      network: newNetwork,
      timeSeriesHistory: newHistory,
    })
  },

  setControlAction: (action) => {
    const { currentTime, activePreset } = get()
    const newNetwork = calculateDomesticPowerFlow(currentTime, activePreset, action)
    const newHistory = generateDomestic24hProfile(activePreset, action)
    set({
      activeControl: action,
      network: newNetwork,
      timeSeriesHistory: newHistory,
    })
  },

  selectHouse: (houseId) => set({ selectedHouseId: houseId }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  stepForward: () => {
    const { currentTime } = get()
    const [h, m] = currentTime.split(':').map(Number)
    let nextH = h + 1
    if (nextH > 24) nextH = 6
    const nextTime = `${nextH.toString().padStart(2, '0')}:00`
    get().setTime(nextTime)
  },

  stepBackward: () => {
    const { currentTime } = get()
    const [h, m] = currentTime.split(':').map(Number)
    let prevH = h - 1
    if (prevH < 6) prevH = 24
    const prevTime = `${prevH.toString().padStart(2, '0')}:00`
    get().setTime(prevTime)
  },

  getSelectedHouse: () => {
    const { network, selectedHouseId } = get()
    return network.houses.find((h) => h.id === selectedHouseId) || network.houses[0]
  },

  reset: () => {
    const defaultNet = calculateDomesticPowerFlow(initialTime, initialPreset, initialControl)
    const defaultHist = generateDomestic24hProfile(initialPreset, initialControl)
    set({
      currentTime: initialTime,
      activePreset: initialPreset,
      activeControl: initialControl,
      selectedHouseId: 'HOUSE-08',
      network: defaultNet,
      timeSeriesHistory: defaultHist,
      isPlaying: false,
    })
  },
}))
