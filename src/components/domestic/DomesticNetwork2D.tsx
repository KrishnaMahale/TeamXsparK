import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Sun,
  Battery,
  BatteryCharging,
  Zap,
  Home,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Activity,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Eye,
  Sliders,
  CheckCircle2,
  Maximize2,
  Gauge,
  Cable,
  RotateCcw,
  Move,
} from 'lucide-react'
import { useDomesticStore } from '../../store/domesticStore'
import { useUIStore } from '../../store/uiStore'
import { HouseNode, DomesticPreset, DomesticControlAction } from '../../types/domestic'

// Default architectural layout coordinates for the 8 suburban parcels
const DEFAULT_HOUSE_LAYOUT: Record<
  string,
  {
    x: number
    y: number
    poleIdx: number
    roofType: 'gable' | 'craftsman' | 'modern_shed' | 'ranch' | 'two_story'
    accentColor: string
    carType?: 'tesla' | 'sedan' | 'suv'
    hasGardenTree?: boolean
    isHeavilyShaded?: boolean
  }
> = {
  'HOUSE-01': { x: 180, y: 28, poleIdx: 0, roofType: 'gable', accentColor: '#38BDF8', carType: 'sedan', hasGardenTree: true },
  'HOUSE-02': { x: 420, y: 28, poleIdx: 1, roofType: 'craftsman', accentColor: '#F59E0B', carType: 'sedan' },
  'HOUSE-03': { x: 660, y: 28, poleIdx: 2, roofType: 'modern_shed', accentColor: '#10B981', carType: 'tesla', hasGardenTree: true },
  'HOUSE-04': { x: 900, y: 28, poleIdx: 3, roofType: 'ranch', accentColor: '#94A3B8', isHeavilyShaded: true, carType: 'sedan' },
  'HOUSE-05': { x: 180, y: 440, poleIdx: 0, roofType: 'craftsman', accentColor: '#F59E0B', carType: 'sedan', hasGardenTree: true },
  'HOUSE-06': { x: 420, y: 440, poleIdx: 1, roofType: 'two_story', accentColor: '#38BDF8', carType: 'suv' },
  'HOUSE-07': { x: 660, y: 440, poleIdx: 2, roofType: 'gable', accentColor: '#10B981', carType: 'sedan' },
  'HOUSE-08': { x: 900, y: 440, poleIdx: 3, roofType: 'two_story', accentColor: '#EF4444', carType: 'tesla', hasGardenTree: true },
}

const DEFAULT_POLES = [
  { id: 'POLE-01', x: 300, y: 310, dropHouses: ['HOUSE-01', 'HOUSE-05'] },
  { id: 'POLE-02', x: 540, y: 310, dropHouses: ['HOUSE-02', 'HOUSE-06'] },
  { id: 'POLE-03', x: 780, y: 310, dropHouses: ['HOUSE-03', 'HOUSE-07'] },
  { id: 'POLE-04', x: 1020, y: 310, dropHouses: ['HOUSE-04', 'HOUSE-08'] },
]

const DEFAULT_SUBSTATION = { x: 15, y: 250 }
const DOMESTIC_POSITIONS_STORAGE_KEY = 'domestic_network_custom_positions_v2'

const loadSavedPositions = () => {
  try {
    const raw = localStorage.getItem(DOMESTIC_POSITIONS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.houses && parsed.poles && parsed.substation) {
        return parsed
      }
    }
  } catch (e) {
    console.warn("Could not load domestic positions", e)
  }
  return null
}

export const DomesticNetwork2D: React.FC = () => {
  const {
    network,
    selectedHouseId,
    selectHouse,
    activePreset,
    activeControl,
    setControlAction,
  } = useDomesticStore()
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  // Display mode: 'realistic' vs 'electrical'
  const [viewMode, setViewMode] = useState<'realistic' | 'electrical'>('realistic')
  // Phase filter: 'all' | 'L1' | 'L2' | 'L3'
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'L1' | 'L2' | 'L3'>('all')
  // Hovered item for real-time inspector HUD
  const [hoveredHouseId, setHoveredHouseId] = useState<string | null>(null)
  const [hoveredSubstation, setHoveredSubstation] = useState(false)
  const [hoveredPoleIdx, setHoveredPoleIdx] = useState<number | null>(null)
  // Toggle animated power flow particles
  const [showFlowAnimation, setShowFlowAnimation] = useState(true)

  // --- Dynamic Positioning State for Domestic Grid ---
  const savedLayout = useMemo(() => loadSavedPositions(), [])

  const [housePositions, setHousePositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedLayout?.houses || Object.fromEntries(Object.entries(DEFAULT_HOUSE_LAYOUT).map(([k, v]) => [k, { x: v.x, y: v.y }]))
  )
  const [poles, setPoles] = useState<Array<{ id: string; x: number; y: number; dropHouses: string[] }>>(
    () => savedLayout?.poles || DEFAULT_POLES
  )
  const [substationPos, setSubstationPos] = useState<{ x: number; y: number }>(
    () => savedLayout?.substation || DEFAULT_SUBSTATION
  )

  // Dragging interaction state
  const svgRef = useRef<SVGSVGElement>(null)
  const dragItemRef = useRef<{
    type: 'house' | 'pole' | 'substation'
    id: string
    offset: { x: number; y: number }
    startPos: { x: number; y: number }
    hasMoved: boolean
  } | null>(null)
  const [draggingItem, setDraggingItem] = useState<{ type: string; id: string } | null>(null)
  const lastDragEndTimeRef = useRef<number>(0)

  // Convert client viewport coordinates to SVG 1180x690 viewBox coordinates
  const getSvgPoint = useCallback((e: MouseEvent | React.MouseEvent | PointerEvent | React.PointerEvent) => {
    if (!svgRef.current) return { x: e.clientX, y: e.clientY }
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse())
      return { x: transformed.x, y: transformed.y }
    }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 1180,
      y: ((e.clientY - rect.top) / rect.height) * 690,
    }
  }, [])

  // Global window pointermove and pointerup listeners for smooth, un-interrupted dragging
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragItemRef.current
      if (!drag) return

      const svgPt = getSvgPoint(e)
      let newX = svgPt.x + drag.offset.x
      let newY = svgPt.y + drag.offset.y

      if (drag.type === 'house') {
        newX = Math.max(10, Math.min(950, newX))
        newY = Math.max(10, Math.min(460, newY))
      } else if (drag.type === 'pole') {
        newX = Math.max(80, Math.min(1100, newX))
        newY = Math.max(180, Math.min(440, newY))
      } else if (drag.type === 'substation') {
        newX = Math.max(5, Math.min(300, newX))
        newY = Math.max(50, Math.min(480, newY))
      }

      const dist = Math.hypot(newX - drag.startPos.x, newY - drag.startPos.y)
      if (dist > 4) {
        drag.hasMoved = true
      }

      if (drag.type === 'house') {
        setHousePositions(prev => ({
          ...prev,
          [drag.id]: { x: Math.round(newX), y: Math.round(newY) }
        }))
      } else if (drag.type === 'pole') {
        setPoles(prev => prev.map(p => p.id === drag.id ? { ...p, x: Math.round(newX), y: Math.round(newY) } : p))
      } else if (drag.type === 'substation') {
        setSubstationPos({ x: Math.round(newX), y: Math.round(newY) })
      }
    }

    const handlePointerUp = () => {
      const drag = dragItemRef.current
      if (!drag) return

      const hasMoved = drag.hasMoved
      dragItemRef.current = null
      setDraggingItem(null)
      document.body.style.cursor = 'default'

      if (hasMoved) {
        lastDragEndTimeRef.current = Date.now()
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [getSvgPoint])

  // Persist modified positions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DOMESTIC_POSITIONS_STORAGE_KEY, JSON.stringify({
        houses: housePositions,
        poles,
        substation: substationPos
      }))
    } catch {}
  }, [housePositions, poles, substationPos])

  // Reset domestic neighborhood layout to pristine architectural default
  const handleResetLayout = () => {
    try {
      localStorage.removeItem(DOMESTIC_POSITIONS_STORAGE_KEY)
    } catch {}
    setHousePositions(Object.fromEntries(Object.entries(DEFAULT_HOUSE_LAYOUT).map(([k, v]) => [k, { x: v.x, y: v.y }])))
    setPoles(DEFAULT_POLES)
    setSubstationPos(DEFAULT_SUBSTATION)
  }

  // Pointer down initiator
  const handleStartDrag = (
    type: 'house' | 'pole' | 'substation',
    id: string,
    currentPos: { x: number; y: number },
    e: React.PointerEvent
  ) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()

    const svgPt = getSvgPoint(e)
    dragItemRef.current = {
      type,
      id,
      offset: { x: currentPos.x - svgPt.x, y: currentPos.y - svgPt.y },
      startPos: { ...currentPos },
      hasMoved: false,
    }
    setDraggingItem({ type, id })
    document.body.style.cursor = 'grabbing'
  }

  // Calculate live dynamic layout properties for a house
  const getHouseLayout = useCallback((houseId: string) => {
    const config = DEFAULT_HOUSE_LAYOUT[houseId]
    if (!config) return null
    const pos = housePositions[houseId] || { x: config.x, y: config.y }
    const isNorth = pos.y < 300
    const dropMastX = pos.x + 70
    const dropMastY = isNorth ? pos.y + 152 : pos.y + 10
    return {
      ...config,
      x: pos.x,
      y: pos.y,
      isNorth,
      dropMastX,
      dropMastY,
    }
  }, [housePositions])

  const isReverseFlow = network.transformer.flowDirection === 'reverse_export_to_grid'
  const hasCriticalOvervoltage = network.overVoltageHousesCount > 0

  // Voltage color-coding based on standard statutory limits (IEEE 1547 / EN 50160)
  const getVoltageColor = (volts: number) => {
    if (volts > 253.0) return '#EF4444' // Red Critical Over-Voltage
    if (volts > 248.0) return '#F59E0B' // Amber Warning High
    if (volts < 216.0) return '#3B82F6' // Blue Under-Voltage Sag
    return '#10B981' // Green Safe Operating Band
  }

  // Phase color scheme (IEC / National standards)
  const getPhaseColor = (phase: string) => {
    if (phase === 'L1') return '#F97316' // Orange
    if (phase === 'L2') return '#EAB308' // Yellow
    if (phase === 'L3') return '#38BDF8' // Sky Blue
    return '#94A3B8'
  }



  return (
    <div className="relative w-full flex flex-col bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-md overflow-hidden select-none">
      {/* 1. Header Toolbar: Mode Toggle, Phase Filtering, Reset Layout, Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--surface-secondary)] border-b border-[var(--border)] z-20">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--surface)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setViewMode('realistic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'realistic'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Real-World Neighborhood</span>
            </button>
            <button
              onClick={() => setViewMode('electrical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'electrical'
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Cable className="w-3.5 h-3.5" />
              <span>Electrical Grid X-Ray</span>
            </button>
          </div>

          {/* Particle flow animation toggle */}
          <button
            onClick={() => setShowFlowAnimation(!showFlowAnimation)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showFlowAnimation
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]'
            }`}
            title="Toggle animated current flow particles"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Flow Motion</span>
          </button>

          {/* Drag & Drop Help Indicator */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
            <Move className="w-3 h-3 text-sky-500" />
            <span>Interactive Drag: Houses & Poles</span>
          </div>

          {/* Reset Layout Button */}
          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Reset houses and poles to default neighborhood layout"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset Layout</span>
          </button>
        </div>

        {/* Center: Phase Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[var(--surface)] px-2 py-1 rounded-lg border border-[var(--border)]">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mr-1">
            Phase:
          </span>
          {(['all', 'L1', 'L2', 'L3'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPhaseFilter(p)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                phaseFilter === p
                  ? p === 'L1'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : p === 'L2'
                    ? 'bg-amber-500 text-slate-900 shadow-xs'
                    : p === 'L3'
                    ? 'bg-sky-500 text-slate-900 shadow-xs'
                    : 'bg-slate-700 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p === 'all' ? 'All (3-Ph)' : p}
            </button>
          ))}
        </div>

        {/* Right: Voltage Health Summary & Mitigation Shortcut */}
        <div className="flex items-center gap-2">
          {hasCriticalOvervoltage && activeControl === 'NONE' ? (
            <button
              onClick={() => setControlAction('VOLT_VAR_DROOP')}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-sm animate-pulse transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Mitigate Overvoltage ({network.peakVoltageV}V)</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isReverseFlow ? 'Solar Reverse Export' : 'Grid Supply OK'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main High-Resolution Real-World SVG Canvas with Dynamic Interactive Elements */}
      <div className={`relative w-full aspect-[16/10] max-h-[680px] min-h-[500px] overflow-hidden ${isDark ? 'bg-[#070F1E]' : 'bg-[#E2E8F0]'}`}>
        <svg
          ref={svgRef}
          viewBox="0 0 1180 690"
          style={{ touchAction: 'none' }}
          className="w-full h-full object-contain select-none"
        >
          <defs>
            <style>{`
              @keyframes flow-forward {
                from { stroke-dashoffset: 32; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes flow-reverse {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: 32; }
              }
              @keyframes ping-slow {
                0% { transform: scale(1); opacity: 0.9; }
                50% { transform: scale(1.3); opacity: 0.2; }
                100% { transform: scale(1); opacity: 0.9; }
              }
              @keyframes sun-shimmer {
                0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.4)); }
                50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)); }
              }
              .export-flow {
                stroke-dasharray: 8 6;
                animation: flow-reverse 1.1s linear infinite;
              }
              .import-flow {
                stroke-dasharray: 8 6;
                animation: flow-forward 1.1s linear infinite;
              }
              .solar-beam {
                animation: sun-shimmer 2.5s ease-in-out infinite;
              }
            `}</style>

            {/* Realistic Landscape Gradients */}
            <linearGradient id="lushLawn" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0B231D" />
              <stop offset="50%" stopColor="#0E2C24" />
              <stop offset="100%" stopColor="#081C17" />
            </linearGradient>

            <linearGradient id="asphaltRoad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E2838" />
              <stop offset="20%" stopColor="#161F2E" />
              <stop offset="50%" stopColor="#121A27" />
              <stop offset="80%" stopColor="#161F2E" />
              <stop offset="100%" stopColor="#1E2838" />
            </linearGradient>

            <linearGradient id="concreteSidewalk" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            <linearGradient id="drivewayPavers" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A384F" />
              <stop offset="100%" stopColor="#1E2738" />
            </linearGradient>

            {/* Architectural Shingle & Tile Gradients */}
            <linearGradient id="slateRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="craftsmanRoofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A3B32" />
              <stop offset="50%" stopColor="#2E241E" />
              <stop offset="100%" stopColor="#1B1512" />
            </linearGradient>

            <linearGradient id="modernRoofGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0B132B" />
            </linearGradient>

            {/* Photovoltaic Silicon Panel Gradient */}
            <linearGradient id="pvCellGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="30%" stopColor="#1E3A8A" />
              <stop offset="70%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#030712" />
            </linearGradient>

            {/* Substation Transformer Tank Gradients */}
            <linearGradient id="txTankRealistic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="50%" stopColor="#172554" />
              <stop offset="100%" stopColor="#0B1226" />
            </linearGradient>

            {/* Streetlight Glow Radial Filter */}
            <radialGradient id="streetlightGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            {/* Overvoltage Alert Aura */}
            <filter id="overvoltageGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ==================================================================== */}
          {/* LAYER 1: NEIGHBORHOOD ENVIRONMENTAL LANDSCAPE                        */}
          {/* ==================================================================== */}
          <rect x="0" y="0" width="1180" height="690" fill="url(#lushLawn)" />

          {/* Property Lot Boundaries (Hedges & Fencelines) */}
          {[170, 410, 650, 890, 1130].map((fenceX, i) => (
            <g key={`fence-${i}`}>
              <line x1={fenceX} y1="15" x2={fenceX} y2="280" stroke="#163C31" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
              <line x1={fenceX} y1="435" x2={fenceX} y2="675" stroke="#163C31" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
            </g>
          ))}

          {/* Sunburst Way Central Road Corridor */}
          <g id="street-infrastructure">
            <rect x="160" y="278" width="1020" height="24" fill="url(#concreteSidewalk)" stroke="#1E293B" strokeWidth="0.8" />
            {[220, 280, 340, 400, 460, 520, 580, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120].map((jointX) => (
              <line key={`sw-joint-n-${jointX}`} x1={jointX} y1="278" x2={jointX} y2="302" stroke="#1E293B" strokeWidth="1" opacity="0.5" />
            ))}

            <rect x="160" y="302" width="1020" height="110" fill="url(#asphaltRoad)" stroke="#0F172A" strokeWidth="1.5" />
            <line x1="160" y1="302" x2="1180" y2="302" stroke="#64748B" strokeWidth="2.5" />
            <line x1="160" y1="412" x2="1180" y2="412" stroke="#64748B" strokeWidth="2.5" />

            <rect x="160" y="412" width="1020" height="24" fill="url(#concreteSidewalk)" stroke="#1E293B" strokeWidth="0.8" />
            {[220, 280, 340, 400, 460, 520, 580, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120].map((jointX) => (
              <line key={`sw-joint-s-${jointX}`} x1={jointX} y1="412" x2={jointX} y2="436" stroke="#1E293B" strokeWidth="1" opacity="0.5" />
            ))}

            <line x1="180" y1="354" x2="1160" y2="354" stroke="#FBBF24" strokeWidth="1.8" strokeDasharray="14 12" opacity="0.85" />
            <line x1="180" y1="358" x2="1160" y2="358" stroke="#FBBF24" strokeWidth="1.8" strokeDasharray="14 12" opacity="0.85" />

            <g id="crosswalk-west" opacity="0.75">
              {[0, 12, 24, 36, 48].map((offset) => (
                <rect key={`cw-w-${offset}`} x={215 + offset} y="306" width="6" height="102" fill="#F8FAFC" />
              ))}
            </g>
            <g id="crosswalk-east" opacity="0.75">
              {[0, 12, 24, 36, 48].map((offset) => (
                <rect key={`cw-e-${offset}`} x={815 + offset} y="306" width="6" height="102" fill="#F8FAFC" />
              ))}
            </g>

            <text x="320" y="342" fill="#475569" fontSize="12" fontWeight="bold" letterSpacing="3" opacity="0.8">
              SUNBURST WAY
            </text>
            <text x="320" y="378" fill="#334155" fontSize="9" fontWeight="bold" letterSpacing="1">
              LOW-VOLTAGE 400V/230V DISTRIBUTION CORRIDOR
            </text>
          </g>

          {/* Dynamically Positioned Private Driveways */}
          {network.houses.map((house) => {
            const layout = getHouseLayout(house.id)
            if (!layout) return null
            const isNorth = layout.isNorth
            const driveX = layout.x + 130
            const driveY = isNorth ? layout.y + 130 : 412
            const driveHeight = isNorth ? Math.max(20, 302 - (layout.y + 130)) : Math.max(20, layout.y - 412 + 20)

            return (
              <g key={`driveway-${house.id}`}>
                <rect
                  x={driveX}
                  y={driveY}
                  width="48"
                  height={driveHeight}
                  fill="url(#drivewayPavers)"
                  stroke="#1E293B"
                  strokeWidth="1"
                />
                <line x1={driveX + 24} y1={driveY} x2={driveX + 24} y2={driveY + driveHeight} stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />

                {layout.carType && (
                  <g transform={`translate(${driveX + 8}, ${isNorth ? driveY + 15 : driveY + 25})`}>
                    <ellipse cx="16" cy="22" rx="16" ry="24" fill="#000000" opacity="0.4" />
                    <rect
                      x="2"
                      y="0"
                      width="28"
                      height="44"
                      rx="6"
                      fill={layout.carType === 'tesla' ? '#DC2626' : '#2563EB'}
                      stroke="#0F172A"
                      strokeWidth="1.5"
                    />
                    <rect x="5" y="8" width="22" height="9" rx="2" fill="#0F172A" />
                    <rect x="5" y="27" width="22" height="7" rx="2" fill="#0F172A" />
                    <rect x="5" y="18" width="22" height="8" fill="#1E293B" />
                    <rect x="0" y="5" width="3" height="7" rx="1" fill="#0F172A" />
                    <rect x="29" y="5" width="3" height="7" rx="1" fill="#0F172A" />
                    <rect x="0" y="32" width="3" height="7" rx="1" fill="#0F172A" />
                    <rect x="29" y="32" width="3" height="7" rx="1" fill="#0F172A" />

                    {layout.carType === 'tesla' && (
                      <g>
                        <path d="M -6,15 Q -1,18 2,20" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="2 2" />
                        <circle cx="-6" cy="15" r="2.5" fill="#10B981" />
                        <text x="-8" y="28" fill="#10B981" fontSize="6" fontWeight="bold">EV</text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 2: 11kV SUBSTATION & PAD-MOUNTED TRANSFORMER (DRAGGABLE)       */}
          {/* ==================================================================== */}
          <g
            id="substation-compound"
            transform={`translate(${substationPos.x}, ${substationPos.y})`}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => handleStartDrag('substation', 'substation', substationPos, e)}
            onClick={() => {
              if (Date.now() - lastDragEndTimeRef.current < 250) return
              selectHouse('HOUSE-01')
            }}
            onMouseEnter={() => setHoveredSubstation(true)}
            onMouseLeave={() => setHoveredSubstation(false)}
          >
            {/* Dragging Active Aura */}
            {draggingItem?.type === 'substation' && (
              <rect
                x="-6"
                y="-6"
                width="157"
                height="202"
                rx="8"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="3"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
            )}

            {/* Foundation Slab */}
            <rect x="0" y="0" width="145" height="190" rx="4" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
            <rect x="4" y="4" width="137" height="182" rx="3" fill="#0F172A" opacity="0.6" />

            {/* Perimeter Fence */}
            <rect
              x="6"
              y="6"
              width="133"
              height="178"
              rx="4"
              fill="none"
              stroke={draggingItem?.type === 'substation' ? '#38BDF8' : '#64748B'}
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <circle cx="6" cy="6" r="3" fill="#94A3B8" />
            <circle cx="139" cy="6" r="3" fill="#94A3B8" />
            <circle cx="6" cy="184" r="3" fill="#94A3B8" />
            <circle cx="139" cy="184" r="3" fill="#94A3B8" />

            {/* Transformer Steel Housing */}
            <g transform="translate(18, 16)">
              <rect
                x="0"
                y="0"
                width="105"
                height="85"
                rx="6"
                fill="url(#txTankRealistic)"
                stroke={isReverseFlow ? '#F59E0B' : '#3B82F6'}
                strokeWidth="2.5"
              />

              <g id="cooling-fins-left">
                <rect x="-6" y="15" width="6" height="55" rx="1" fill="#1D4ED8" stroke="#1E293B" strokeWidth="0.5" />
                <line x1="-3" y1="20" x2="-3" y2="65" stroke="#60A5FA" strokeWidth="1" />
              </g>
              <g id="cooling-fins-right">
                <rect x="105" y="15" width="6" height="55" rx="1" fill="#1D4ED8" stroke="#1E293B" strokeWidth="0.5" />
                <line x1="108" y1="20" x2="108" y2="65" stroke="#60A5FA" strokeWidth="1" />
              </g>

              <g transform="translate(20, -10)">
                <line x1="-30" y1="2" x2="10" y2="2" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="12" cy="2" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
                <circle cx="32" cy="2" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
                <circle cx="52" cy="2" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="32" y="-6" fill="#94A3B8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  11 kV MV FEED
                </text>
              </g>

              <circle cx="40" cy="35" r="16" fill="none" stroke="#60A5FA" strokeWidth="2" opacity="0.8" />
              <circle cx="65" cy="35" r="16" fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.8" />
              <Zap className="w-4 h-4 text-amber-300" x="45" y="27" />

              <text x="52" y="60" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                DISTRIBUTION TX
              </text>
              <text x="52" y="72" fill="#93C5FD" fontSize="8" fontFamily="monospace" textAnchor="middle">
                100 kVA • 11kV/230V
              </text>
            </g>

            {/* Low-Voltage Busbar Pillar Cabinet */}
            <g transform="translate(18, 110)">
              <rect x="0" y="0" width="105" height="42" rx="4" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
              <text x="8" y="14" fill="#94A3B8" fontSize="7.5" fontWeight="bold">
                LV FEEDER BUSBAR
              </text>
              <g transform="translate(8, 20)">
                <circle cx="4" cy="8" r="4" fill="#F97316" />
                <text x="12" y="11" fill="#FDBA74" fontSize="7" fontWeight="bold">L1</text>
                <circle cx="34" cy="8" r="4" fill="#EAB308" />
                <text x="42" y="11" fill="#FDE047" fontSize="7" fontWeight="bold">L2</text>
                <circle cx="64" cy="8" r="4" fill="#38BDF8" />
                <text x="72" y="11" fill="#BAE6FD" fontSize="7" fontWeight="bold">L3</text>
              </g>
              <rect x="8" y="35" width="89" height="3" rx="1.5" fill="#1E293B" />
              <rect
                x="8"
                y="35"
                width={Math.min(89, Math.round((89 * network.transformer.loadingPercent) / 100))}
                height="3"
                rx="1.5"
                fill={isReverseFlow ? '#F59E0B' : '#38BDF8'}
              />
            </g>

            <g transform="translate(26, 160)">
              <rect x="0" y="0" width="90" height="18" rx="3" fill="#78350F" stroke="#F59E0B" strokeWidth="1" />
              <text x="45" y="12.5" fill="#FEF08A" fontSize="8" fontWeight="bold" textAnchor="middle">
                ⚡ DANGER 11,000V
              </text>
            </g>

            {/* Live Flow Badge Floating Above Substation */}
            <g transform="translate(12, -18)">
              <rect
                x="0"
                y="0"
                width="120"
                height="22"
                rx="5"
                fill="#0F172A"
                stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
                strokeWidth="1.5"
              />
              <text
                x="60"
                y="14.5"
                fill={isReverseFlow ? '#FBBF24' : '#38BDF8'}
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {isReverseFlow ? '▲ REVERSE' : '▼ IMPORT'} {network.transformer.loadingPercent}%
              </text>
            </g>

            {/* Dragging Coordinates HUD Tag */}
            {draggingItem?.type === 'substation' && (
              <g transform="translate(20, -42)">
                <rect x="0" y="0" width="105" height="18" rx="4" fill="#0284C7" />
                <text x="52.5" y="12.5" fill="#FFFFFF" fontSize="8.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  TX ({substationPos.x}, {substationPos.y})
                </text>
              </g>
            )}
          </g>

          {/* ==================================================================== */}
          {/* LAYER 3: DYNAMIC OVERHEAD DISTRIBUTION FEEDER CABLES (CONNECTED)     */}
          {/* ==================================================================== */}
          <g id="overhead-distribution-feeders">
            {/* Feeder Segment 1: Substation Busbar to Pole 1 */}
            {poles[0] && (
              <path
                d={`M ${substationPos.x + 110},${substationPos.y + 75} Q ${(substationPos.x + 110 + poles[0].x) / 2},${(substationPos.y + 75 + poles[0].y) / 2 + 15} ${poles[0].x},${poles[0].y}`}
                fill="none"
                stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
                strokeWidth="4"
                className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
              />
            )}

            {/* Feeder Segment 2: Pole 1 to Pole 2 */}
            {poles[0] && poles[1] && (
              <path
                d={`M ${poles[0].x},${poles[0].y} Q ${(poles[0].x + poles[1].x) / 2},${(poles[0].y + poles[1].y) / 2 + 12} ${poles[1].x},${poles[1].y}`}
                fill="none"
                stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
                strokeWidth="4"
                className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
              />
            )}

            {/* Feeder Segment 3: Pole 2 to Pole 3 */}
            {poles[1] && poles[2] && (
              <path
                d={`M ${poles[1].x},${poles[1].y} Q ${(poles[1].x + poles[2].x) / 2},${(poles[1].y + poles[2].y) / 2 + 12} ${poles[2].x},${poles[2].y}`}
                fill="none"
                stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
                strokeWidth="4"
                className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
              />
            )}

            {/* Feeder Segment 4: Pole 3 to Pole 4 */}
            {poles[2] && poles[3] && (
              <path
                d={`M ${poles[2].x},${poles[2].y} Q ${(poles[2].x + poles[3].x) / 2},${(poles[2].y + poles[3].y) / 2 + 12} ${poles[3].x},${poles[3].y}`}
                fill="none"
                stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
                strokeWidth="4"
                className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
              />
            )}
          </g>

          {/* ==================================================================== */}
          {/* LAYER 4: DYNAMIC UTILITY POLES (DRAGGABLE)                           */}
          {/* ==================================================================== */}
          {poles.map((pole, idx) => {
            const isHovered = hoveredPoleIdx === idx
            const isDraggingThis = draggingItem?.type === 'pole' && draggingItem?.id === pole.id

            return (
              <g
                key={pole.id}
                transform={`translate(${pole.x}, ${pole.y})`}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handleStartDrag('pole', pole.id, { x: pole.x, y: pole.y }, e)}
                onMouseEnter={() => setHoveredPoleIdx(idx)}
                onMouseLeave={() => setHoveredPoleIdx(null)}
              >
                {/* Streetlight Ambient Light Glow */}
                {(idx === 1 || idx === 3) && (
                  <circle cx="0" cy="50" r="70" fill="url(#streetlightGlow)" />
                )}

                {/* Dragging Target Ring */}
                {isDraggingThis && (
                  <circle cx="0" cy="38" r="16" fill="none" stroke="#38BDF8" strokeWidth="2.5" className="animate-ping" opacity="0.8" />
                )}

                {/* Pole Crossarm */}
                <line x1="-24" y1="-8" x2="24" y2="-8" stroke={isDraggingThis ? '#38BDF8' : '#94A3B8'} strokeWidth="4" />
                <circle cx="-18" cy="-11" r="3.5" fill="#F97316" stroke="#0F172A" strokeWidth="1" />
                <circle cx="-6" cy="-11" r="3.5" fill="#EAB308" stroke="#0F172A" strokeWidth="1" />
                <circle cx="6" cy="-11" r="3.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="1" />
                <circle cx="18" cy="-11" r="3.5" fill="#64748B" stroke="#0F172A" strokeWidth="1" />

                {/* Vertical Pole Column */}
                <line x1="0" y1="-8" x2="0" y2="40" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                <line x1="-1" y1="-8" x2="-1" y2="40" stroke={isDraggingThis ? '#38BDF8' : '#64748B'} strokeWidth="2" />
                <circle cx="0" cy="38" r="6" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />

                {/* Modern Cobra-Head Streetlight Fixture */}
                {(idx === 1 || idx === 3) && (
                  <g transform="translate(-16, -16)">
                    <path d="M 16,8 Q 0,4 -10,12" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
                    <rect x="-16" y="10" width="12" height="5" rx="2" fill="#FDE68A" stroke="#475569" strokeWidth="1" />
                  </g>
                )}

                {/* Pole ID Badge */}
                <rect x="-22" y="44" width="44" height="13" rx="3" fill="#0F172A" stroke={isDraggingThis ? '#38BDF8' : '#334155'} strokeWidth="0.8" />
                <text x="0" y="53.5" fill={isDraggingThis ? '#38BDF8' : '#94A3B8'} fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  {pole.id}
                </text>

                {/* Live Coordinates HUD while Dragging */}
                {isDraggingThis && (
                  <g transform="translate(-32, -34)">
                    <rect x="0" y="0" width="64" height="16" rx="4" fill="#0284C7" />
                    <text x="32" y="11.5" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      ({pole.x}, {pole.y})
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 5: DYNAMIC SERVICE DROP WIRES CONNECTING POLES TO HOUSES       */}
          {/* ==================================================================== */}
          {network.houses.map((house) => {
            const layout = getHouseLayout(house.id)
            if (!layout) return null
            const pole = poles[layout.poleIdx]
            if (!pole) return null

            const isSelected = selectedHouseId === house.id
            const isHovered = hoveredHouseId === house.id
            const isExporting = house.telemetry.flowDirection === 'export'
            const vColor = getVoltageColor(house.telemetry.voltageV)
            const phaseColor = getPhaseColor(house.phase)

            const isPhaseMatch = phaseFilter === 'all' || phaseFilter === house.phase
            const opacity = isPhaseMatch ? 1.0 : 0.2

            // Dynamic catenary curve math between pole crossarm and house mast
            const poleX = pole.x
            const poleY = pole.y - 8
            const mastX = layout.dropMastX
            const mastY = layout.dropMastY
            const midX = (poleX + mastX) / 2
            const midY = (poleY + mastY) / 2 + (layout.isNorth ? -14 : 14)

            return (
              <g key={`servicedrop-${house.id}`} opacity={opacity}>
                {/* Dynamically Re-oriented Aerial Service Drop Cable */}
                <path
                  d={`M ${poleX},${poleY} Q ${midX},${midY} ${mastX},${mastY}`}
                  fill="none"
                  stroke={viewMode === 'electrical' ? phaseColor : isExporting ? '#F59E0B' : '#38BDF8'}
                  strokeWidth={isSelected || isHovered ? '3.5' : '2'}
                  strokeDasharray="4 3"
                  className={showFlowAnimation ? (isExporting ? 'export-flow' : 'import-flow') : ''}
                />

                {/* Point of Attachment (POA) Insulator Knob on House */}
                <circle cx={mastX} cy={mastY} r="4" fill={vColor} stroke="#0F172A" strokeWidth="1.5" />

                {/* Conduit pipe descending down house wall to Smart Meter */}
                <line
                  x1={mastX}
                  y1={mastY}
                  x2={mastX}
                  y2={layout.isNorth ? mastY - 35 : mastY + 35}
                  stroke="#64748B"
                  strokeWidth="2.5"
                />
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 6: 8 RESIDENTIAL HOMES & SOLAR PARCELS (DRAGGABLE)             */}
          {/* ==================================================================== */}
          {network.houses.map((house) => {
            const layout = getHouseLayout(house.id)
            if (!layout) return null
            const isSelected = selectedHouseId === house.id
            const isHovered = hoveredHouseId === house.id
            const isDraggingThis = draggingItem?.type === 'house' && draggingItem?.id === house.id

            const hasSolar = house.rooftopSolar.hasSolar
            const volts = house.telemetry.voltageV
            const vColor = getVoltageColor(volts)
            const isCritical = house.telemetry.status === 'critical'
            const isExporting = house.telemetry.flowDirection === 'export'
            const solar = house.rooftopSolar
            const battery = house.battery
            const isNorth = layout.isNorth

            const isPhaseMatch = phaseFilter === 'all' || phaseFilter === house.phase
            const lotOpacity = isPhaseMatch ? 1.0 : 0.25

            return (
              <g
                key={house.id}
                id={`parcel-${house.id}`}
                transform={`translate(${layout.x}, ${layout.y})`}
                className="cursor-grab active:cursor-grabbing transition-transform duration-75"
                onPointerDown={(e) => handleStartDrag('house', house.id, { x: layout.x, y: layout.y }, e)}
                onClick={() => {
                  if (Date.now() - lastDragEndTimeRef.current < 250) return
                  selectHouse(house.id)
                }}
                onMouseEnter={() => setHoveredHouseId(house.id)}
                onMouseLeave={() => setHoveredHouseId(null)}
                opacity={lotOpacity}
              >
                {/* Dragging Active Halo */}
                {isDraggingThis && (
                  <rect
                    x="-6"
                    y="-6"
                    width="232"
                    height="232"
                    rx="14"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="3.5"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                )}

                {/* Property Selection Ring */}
                {isSelected && !isDraggingThis && (
                  <rect
                    x="-6"
                    y="-6"
                    width="232"
                    height="232"
                    rx="14"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                )}
                {isCritical && !isDraggingThis && (
                  <rect
                    x="-6"
                    y="-6"
                    width="232"
                    height="232"
                    rx="14"
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth="3.5"
                    filter="url(#overvoltageGlow)"
                    className="animate-pulse"
                  />
                )}

                {/* Manicured Lawn Parcel */}
                <rect
                  x="0"
                  y="0"
                  width="220"
                  height="220"
                  rx="10"
                  fill="#0E2E25"
                  stroke={isDraggingThis ? '#38BDF8' : '#164E3D'}
                  strokeWidth={isDraggingThis ? '2' : '1.2'}
                />

                {/* Front Walkway Entrance */}
                <path
                  d={isNorth ? 'M 60,140 L 60,220' : 'M 60,80 L 60,0'}
                  stroke="#334155"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.8"
                />

                {layout.hasGardenTree && (
                  <g transform={`translate(${isNorth ? 175 : 25}, ${isNorth ? 185 : 40})`}>
                    <circle cx="0" cy="0" r="18" fill="#064E3B" opacity="0.6" />
                    <circle cx="0" cy="0" r="15" fill="#047857" opacity="0.8" />
                    <circle cx="-3" cy="-3" r="10" fill="#10B981" opacity="0.6" />
                  </g>
                )}

                {layout.isHeavilyShaded && (
                  <g transform="translate(140, 60)">
                    <circle cx="0" cy="0" r="38" fill="#064E3B" opacity="0.75" />
                    <circle cx="5" cy="5" r="32" fill="#047857" opacity="0.85" />
                    <circle cx="-5" cy="-5" r="24" fill="#059669" opacity="0.9" />
                    <text x="0" y="4" fill="#A7F3D0" fontSize="7.5" fontWeight="bold" textAnchor="middle">
                      DENSE SHADE
                    </text>
                  </g>
                )}

                {/* House Dwelling Structure */}
                <g id="house-dwelling" transform="translate(15, 20)">
                  <rect
                    x="0"
                    y="0"
                    width="190"
                    height="125"
                    rx="8"
                    fill="url(#slateRoofGrad)"
                    stroke={isSelected ? '#3B82F6' : isCritical ? '#EF4444' : '#1E293B'}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="shadow-xl"
                  />

                  {/* Windows */}
                  <rect x="20" y="85" width="22" height="24" rx="2" fill="#FDE68A" stroke="#1E293B" strokeWidth="1" opacity="0.9" />
                  <line x1="31" y1="85" x2="31" y2="109" stroke="#1E293B" strokeWidth="1" />
                  <line x1="20" y1="97" x2="42" y2="97" stroke="#1E293B" strokeWidth="1" />

                  {/* Door */}
                  <rect x="52" y="80" width="18" height="36" rx="2" fill="#78350F" stroke="#1E293B" strokeWidth="1" />
                  <circle cx="66" cy="98" r="1.5" fill="#FDE68A" />

                  {/* Garage Door */}
                  <rect x="110" y="70" width="70" height="48" rx="3" fill="#1E293B" stroke="#334155" strokeWidth="1.2" />
                  {[78, 86, 94, 102, 110].map((panelY) => (
                    <line key={`garage-panel-${panelY}`} x1="110" y1={panelY} x2="180" y2={panelY} stroke="#334155" strokeWidth="1" />
                  ))}

                  {/* Roof Structure */}
                  <g id="roof-plane" transform="translate(4, 4)">
                    <rect
                      x="0"
                      y="0"
                      width="182"
                      height="58"
                      rx="5"
                      fill={layout.roofType === 'craftsman' ? 'url(#craftsmanRoofGrad)' : 'url(#slateRoofGrad)'}
                      stroke="#475569"
                      strokeWidth="1.2"
                    />
                    <line x1="0" y1="2" x2="182" y2="2" stroke="#64748B" strokeWidth="1.5" />

                    {/* Solar PV Panels */}
                    {hasSolar ? (
                      <g id="solar-pv-array" transform="translate(6, 6)">
                        <rect
                          x="0"
                          y="0"
                          width="170"
                          height="46"
                          rx="3"
                          fill="url(#pvCellGrad)"
                          stroke="#38BDF8"
                          strokeWidth="1"
                          className="solar-beam"
                        />
                        {[28, 56, 84, 112, 140].map((barX) => (
                          <line
                            key={`solar-busbar-v-${barX}`}
                            x1={barX}
                            y1="0"
                            x2={barX}
                            y2="46"
                            stroke="#60A5FA"
                            strokeWidth="0.8"
                            strokeDasharray="3 1"
                            opacity="0.8"
                          />
                        ))}
                        <line x1="0" y1="15" x2="170" y2="15" stroke="#93C5FD" strokeWidth="0.8" opacity="0.6" />
                        <line x1="0" y1="31" x2="170" y2="31" stroke="#93C5FD" strokeWidth="0.8" opacity="0.6" />

                        <g transform="translate(6, 6)">
                          <rect x="0" y="0" width="80" height="18" rx="4" fill="#78350F" stroke="#F59E0B" strokeWidth="1" />
                          <text x="40" y="12.5" fill="#FEF08A" fontSize="9" fontWeight="bold" textAnchor="middle">
                            ☀ {solar.currentGenerationKw} kW
                          </text>
                        </g>

                        <text
                          x="162"
                          y="18"
                          fill="#93C5FD"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {solar.installedCapacityKw} kWp
                        </text>
                      </g>
                    ) : (
                      <g transform="translate(10, 16)">
                        <rect x="0" y="0" width="162" height="26" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                        <text x="81" y="16.5" fill="#94A3B8" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                          NO SOLAR (TENANT / SHADED)
                        </text>
                      </g>
                    )}
                  </g>

                  {/* Inverter */}
                  {hasSolar && (
                    <g transform="translate(85, 80)">
                      <rect x="0" y="0" width="22" height="16" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" />
                      <circle cx="4" cy="4" r="1.5" fill="#10B981" />
                      <text x="11" y="8" fill="#94A3B8" fontSize="5.5" textAnchor="middle">INV</text>
                      <text x="11" y="13" fill="#38BDF8" fontSize="6.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        {solar.inverterAcPowerKw}k
                      </text>
                    </g>
                  )}

                  {/* Battery */}
                  {battery?.installed && (
                    <g transform="translate(112, 74)">
                      <rect x="0" y="0" width="24" height="22" rx="3" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
                      <rect x="3" y="4" width="18" height="3" rx="1.5" fill="#1E293B" />
                      <rect
                        x="3"
                        y="4"
                        width={Math.round((18 * battery.currentSocPercent) / 100)}
                        height="3"
                        rx="1.5"
                        fill="#10B981"
                      />
                      <text x="12" y="13" fill="#94A3B8" fontSize="5.5" textAnchor="middle">BAT</text>
                      <text x="12" y="19" fill="#10B981" fontSize="7" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                        {battery.currentSocPercent}%
                      </text>
                    </g>
                  )}

                  {/* Smart Bi-Directional Meter */}
                  <g transform="translate(142, 74)">
                    <rect x="0" y="0" width="34" height="22" rx="3" fill="#0F172A" stroke="#F59E0B" strokeWidth="1" />
                    <text x="17" y="8" fill="#94A3B8" fontSize="5.5" textAnchor="middle">METER</text>
                    <text
                      x="17"
                      y="18"
                      fill={isExporting ? '#FBBF24' : '#38BDF8'}
                      fontSize="7"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {isExporting ? `+${house.telemetry.netPowerKw}` : house.telemetry.netPowerKw}kW
                    </text>
                  </g>
                </g>

                {/* House Label */}
                <g transform="translate(15, 152)">
                  <text x="4" y="14" fill="#FFFFFF" fontSize="10.5" fontWeight="bold">
                    {house.name}
                  </text>
                  <text x="4" y="27" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                    {house.address} • {house.distanceMeters}m
                  </text>

                  <g transform="translate(150, 2)">
                    <rect
                      x="0"
                      y="0"
                      width="26"
                      height="16"
                      rx="3"
                      fill="#1E293B"
                      stroke={getPhaseColor(house.phase)}
                      strokeWidth="1.2"
                    />
                    <text
                      x="13"
                      y="11.5"
                      fill={getPhaseColor(house.phase)}
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {house.phase}
                    </text>
                  </g>
                </g>

                {/* Voltage & Flow Status Badge */}
                <g transform="translate(15, 185)">
                  <rect
                    x="0"
                    y="0"
                    width="75"
                    height="22"
                    rx="5"
                    fill="#0F172A"
                    stroke={vColor}
                    strokeWidth="1.8"
                  />
                  <text
                    x="37.5"
                    y="15"
                    fill={vColor}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {volts} V
                  </text>

                  <rect
                    x="80"
                    y="0"
                    width="96"
                    height="22"
                    rx="5"
                    fill={isExporting ? '#451A03' : '#082F49'}
                    stroke={isExporting ? '#B45309' : '#0284C7'}
                    strokeWidth="1.2"
                  />
                  <text
                    x="128"
                    y="14.5"
                    fill={isExporting ? '#FDE68A' : '#BAE6FD'}
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {isExporting ? '▲ EXPORT' : '▼ IMPORT'}
                  </text>
                </g>

                {/* Over-Voltage Warning Ping */}
                {isCritical && (
                  <g transform="translate(195, 25)">
                    <circle cx="0" cy="0" r="10" fill="#EF4444" className="animate-ping" opacity="0.8" />
                    <circle cx="0" cy="0" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x="0" y="3.5" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                      !
                    </text>
                  </g>
                )}

                {/* Live Coordinates HUD Tag while Dragging House */}
                {isDraggingThis && (
                  <g transform="translate(50, -22)">
                    <rect x="0" y="0" width="120" height="20" rx="4" fill="#0284C7" stroke="#38BDF8" strokeWidth="1" />
                    <text x="60" y="13.5" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      {house.id} ({layout.x}, {layout.y})
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 7: LEGEND & ELECTRICAL STANDARDS BAR                           */}
          {/* ==================================================================== */}
          <g transform="translate(20, 638)">
            <rect x="0" y="0" width="1140" height="42" rx="8" fill="#0B132B" stroke="#1E293B" strokeWidth="1.2" />

            <circle cx="25" cy="21" r="5" fill="#F59E0B" />
            <text x="36" y="25" fill="#FDE68A" fontSize="9" fontWeight="bold">
              Solar Reverse Export (▲)
            </text>

            <circle cx="170" cy="21" r="5" fill="#38BDF8" />
            <text x="181" y="25" fill="#BAE6FD" fontSize="9" fontWeight="bold">
              Grid Supply Import (▼)
            </text>

            <circle cx="310" cy="21" r="5" fill="#10B981" />
            <text x="321" y="25" fill="#94A3B8" fontSize="9">
              Safe Band (216–248V)
            </text>

            <circle cx="440" cy="21" r="5" fill="#F59E0B" />
            <text x="451" y="25" fill="#94A3B8" fontSize="9">
              Warning (248–253V)
            </text>

            <circle cx="570" cy="21" r="5.5" fill="#EF4444" />
            <text x="582" y="25" fill="#FCA5A5" fontSize="9" fontWeight="bold">
              Over-Voltage (&gt; 253V IEEE 1547 Limit)
            </text>

            <text x="800" y="25" fill="#94A3B8" fontSize="9" fontWeight="bold">
              Phases:
            </text>
            <circle cx="848" cy="21" r="4" fill="#F97316" />
            <text x="856" y="25" fill="#FDBA74" fontSize="8.5" fontWeight="bold">L1</text>
            <circle cx="882" cy="21" r="4" fill="#EAB308" />
            <text x="890" y="25" fill="#FDE047" fontSize="8.5" fontWeight="bold">L2</text>
            <circle cx="916" cy="21" r="4" fill="#38BDF8" />
            <text x="924" y="25" fill="#BAE6FD" fontSize="8.5" fontWeight="bold">L3</text>

            <text x="1125" y="25" fill="#64748B" fontSize="8.5" fontFamily="monospace" textAnchor="end">
              Drag houses, poles, or substation to rearrange
            </text>
          </g>
        </svg>
      </div>

      {/* 3. Lightweight Network Status & Tip Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[var(--surface-secondary)] border-t border-[var(--border)] text-xs">
        <div className="flex items-center gap-3 text-[var(--text-muted)] text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Safe Band (&lt;248V)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Elevated (248–253V)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Over-Voltage (&gt;253V)</span>
          </span>
          <span className="hidden md:inline text-[var(--border)]">|</span>
          <span className="hidden md:inline">Drag houses or poles to rearrange layout</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-[var(--text-muted)]">
            Distribution Transformer:{' '}
            <strong className="text-[var(--text-primary)] font-mono">
              {network.transformer.currentLoadKw} kW ({network.transformer.loadingPercent}% load)
            </strong>
          </span>
          <span className="text-[var(--text-muted)]">
            Feeder Peak Voltage:{' '}
            <strong className={`font-mono font-bold ${network.peakVoltageV > 253 ? 'text-red-500' : 'text-emerald-500'}`}>
              {network.peakVoltageV} V
            </strong>
          </span>
        </div>
      </div>
    </div>
  )
}
