import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  is3DEnabled: boolean
  isComparisonModalOpen: boolean
  activeTab: string
  theme: 'dark'

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggle3D: () => void
  set3DEnabled: (enabled: boolean) => void
  setComparisonModalOpen: (open: boolean) => void
  setActiveTab: (tab: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  is3DEnabled: false,
  isComparisonModalOpen: false,
  activeTab: 'network',
  theme: 'dark',

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  toggle3D: () => set((state) => ({ is3DEnabled: !state.is3DEnabled })),
  set3DEnabled: (enabled: boolean) => set({ is3DEnabled: enabled }),
  setComparisonModalOpen: (open: boolean) => set({ isComparisonModalOpen: open }),
  setActiveTab: (tab: string) => set({ activeTab: tab }),
}))
