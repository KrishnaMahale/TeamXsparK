import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem('teamxspark-theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // fallback
  }
  return 'light'
}

const applyThemeToDocument = (theme: ThemeMode) => {
  if (typeof document === 'undefined') return
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }
  try {
    localStorage.setItem('teamxspark-theme', theme)
  } catch {
    // ignore
  }
}

interface UIState {
  sidebarCollapsed: boolean
  is3DEnabled: boolean
  isComparisonModalOpen: boolean
  activeTab: string
  theme: ThemeMode

  // Actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggle3D: () => void
  set3DEnabled: (enabled: boolean) => void
  setComparisonModalOpen: (open: boolean) => void
  setActiveTab: (tab: string) => void
  toggleTheme: () => void
  setTheme: (theme: ThemeMode) => void
}

export const useUIStore = create<UIState>((set) => {
  const initialTheme = getInitialTheme()
  applyThemeToDocument(initialTheme)

  return {
    sidebarCollapsed: false,
    is3DEnabled: true,
    isComparisonModalOpen: false,
    activeTab: 'network',
    theme: initialTheme,

    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
    toggle3D: () => set((state) => ({ is3DEnabled: !state.is3DEnabled })),
    set3DEnabled: (enabled: boolean) => set({ is3DEnabled: enabled }),
    setComparisonModalOpen: (open: boolean) => set({ isComparisonModalOpen: open }),
    setActiveTab: (tab: string) => set({ activeTab: tab }),

    toggleTheme: () =>
      set((state) => {
        const nextTheme: ThemeMode = state.theme === 'light' ? 'dark' : 'light'
        applyThemeToDocument(nextTheme)
        return { theme: nextTheme }
      }),

    setTheme: (theme: ThemeMode) => {
      applyThemeToDocument(theme)
      set({ theme })
    },
  }
})
