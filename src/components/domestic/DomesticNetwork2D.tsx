import React, { useState, useMemo } from 'react'
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
} from 'lucide-react'
import { useDomesticStore } from '../../store/domesticStore'
import { useUIStore } from '../../store/uiStore'
import { HouseNode, DomesticPreset, DomesticControlAction } from '../../types/domestic'

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

  // Display mode: 'realistic' (architectural suburban street) vs 'electrical' (single-line overlay)
  const [viewMode, setViewMode] = useState<'realistic' | 'electrical'>('realistic')
  // Phase filter: 'all' | 'L1' | 'L2' | 'L3'
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'L1' | 'L2' | 'L3'>('all')
  // Hovered item for real-time inspector HUD
  const [hoveredHouseId, setHoveredHouseId] = useState<string | null>(null)
  const [hoveredSubstation, setHoveredSubstation] = useState(false)
  const [hoveredPoleIdx, setHoveredPoleIdx] = useState<number | null>(null)
  // Toggle animated power flow particles
  const [showFlowAnimation, setShowFlowAnimation] = useState(true)

  const isReverseFlow = network.transformer.flowDirection === 'reverse_export_to_grid'
  const hasCriticalOvervoltage = network.overVoltageHousesCount > 0

  // Voltage color-coding based on standard statutory limits (IEEE 1547 / EN 50160)
  const getVoltageColor = (volts: number) => {
    if (volts > 253.0) return '#EF4444' // Red Critical Over-Voltage
    if (volts > 248.0) return '#F59E0B' // Amber Warning High
    if (volts < 216.0) return '#3B82F6' // Blue Under-Voltage Sag
    return '#10B981' // Green Safe Operating Band
  }

  const getVoltageStatusBadge = (volts: number) => {
    if (volts > 253.0) return { label: 'CRITICAL (>253V)', color: 'bg-red-950/80 text-red-400 border-red-500' }
    if (volts > 248.0) return { label: 'HIGH (248–253V)', color: 'bg-amber-950/80 text-amber-400 border-amber-500' }
    if (volts < 216.0) return { label: 'UNDER-VOLTAGE', color: 'bg-blue-950/80 text-blue-400 border-blue-500' }
    return { label: 'NORMAL (230V)', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-500' }
  }

  // Phase color scheme (IEC / National standards)
  const getPhaseColor = (phase: string) => {
    if (phase === 'L1') return '#F97316' // Orange / Brown
    if (phase === 'L2') return '#EAB308' // Yellow / Amber
    if (phase === 'L3') return '#38BDF8' // Sky Blue
    return '#94A3B8'
  }

  // Pre-configured real-world architectural layout coordinates for the 8 suburban parcels
  // North side of Sunburst Way: Houses 1, 2, 3, 4 (Even house numbers)
  // South side of Sunburst Way: Houses 5, 6, 7, 8 (Odd house numbers)
  const houseLayoutMap: Record<
    string,
    {
      x: number
      y: number
      poleIdx: number
      dropMastX: number
      dropMastY: number
      roofType: 'gable' | 'craftsman' | 'modern_shed' | 'ranch' | 'two_story'
      accentColor: string
      carType?: 'tesla' | 'sedan' | 'suv'
      hasGardenTree?: boolean
      isHeavilyShaded?: boolean
    }
  > = {
    'HOUSE-01': {
      x: 180,
      y: 28,
      poleIdx: 0,
      dropMastX: 250,
      dropMastY: 180,
      roofType: 'gable',
      accentColor: '#38BDF8',
      carType: 'sedan',
      hasGardenTree: true,
    },
    'HOUSE-02': {
      x: 420,
      y: 28,
      poleIdx: 1,
      dropMastX: 490,
      dropMastY: 180,
      roofType: 'craftsman',
      accentColor: '#F59E0B',
      carType: 'sedan',
    },
    'HOUSE-03': {
      x: 660,
      y: 28,
      poleIdx: 2,
      dropMastX: 730,
      dropMastY: 180,
      roofType: 'modern_shed',
      accentColor: '#10B981',
      carType: 'tesla', // EV charging in driveway
      hasGardenTree: true,
    },
    'HOUSE-04': {
      x: 900,
      y: 28,
      poleIdx: 3,
      dropMastX: 970,
      dropMastY: 180,
      roofType: 'ranch',
      accentColor: '#94A3B8',
      isHeavilyShaded: true, // Tree canopy explains NO SOLAR
      carType: 'sedan',
    },
    'HOUSE-05': {
      x: 180,
      y: 440,
      poleIdx: 0,
      dropMastX: 250,
      dropMastY: 450,
      roofType: 'craftsman',
      accentColor: '#F59E0B',
      carType: 'sedan',
      hasGardenTree: true,
    },
    'HOUSE-06': {
      x: 420,
      y: 440,
      poleIdx: 1,
      dropMastX: 490,
      dropMastY: 450,
      roofType: 'two_story',
      accentColor: '#38BDF8',
      carType: 'suv',
    },
    'HOUSE-07': {
      x: 660,
      y: 440,
      poleIdx: 2,
      dropMastX: 730,
      dropMastY: 450,
      roofType: 'gable',
      accentColor: '#10B981',
      carType: 'sedan',
    },
    'HOUSE-08': {
      x: 900,
      y: 440,
      poleIdx: 3,
      dropMastX: 970,
      dropMastY: 450,
      roofType: 'two_story',
      accentColor: '#EF4444',
      carType: 'tesla',
      hasGardenTree: true,
    },
  }

  // 4 Suburban Utility Poles spaced along the street
  const poles = [
    { id: 'POLE-01', x: 300, y: 310, dropHouses: ['HOUSE-01', 'HOUSE-05'] },
    { id: 'POLE-02', x: 540, y: 310, dropHouses: ['HOUSE-02', 'HOUSE-06'] },
    { id: 'POLE-03', x: 780, y: 310, dropHouses: ['HOUSE-03', 'HOUSE-07'] },
    { id: 'POLE-04', x: 1020, y: 310, dropHouses: ['HOUSE-04', 'HOUSE-08'] },
  ]

  // Active hovered or selected house for HUD inspection
  const activeInspectionHouse = useMemo(() => {
    const idToFind = hoveredHouseId || selectedHouseId || 'HOUSE-08'
    return network.houses.find((h) => h.id === idToFind) || network.houses[0]
  }, [hoveredHouseId, selectedHouseId, network.houses])

  return (
    <div className="relative w-full flex flex-col bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-md overflow-hidden select-none">
      {/* 1. Header Toolbar: Mode Toggle, Phase Filtering, Legend, Quick Actions */}
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

      {/* 2. Main High-Resolution Real-World SVG Canvas */}
      <div className={`relative w-full aspect-[16/10] max-h-[680px] min-h-[500px] overflow-hidden ${isDark ? 'bg-[#070F1E]' : 'bg-[#E2E8F0]'}`}>
        <svg
          viewBox="0 0 1180 690"
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

            {/* Photovoltaic Monocrystalline Silicon Panel Gradient */}
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
          {/* LAYER 1: NEIGHBORHOOD ENVIRONMENTAL LANDSCAPE (LAWNS, ROADS, LOTS)  */}
          {/* ==================================================================== */}
          {/* Background Suburban Subdivision Lawn */}
          <rect x="0" y="0" width="1180" height="690" fill="url(#lushLawn)" />

          {/* Property Lot Boundaries (Hedges & Fencelines) */}
          {[170, 410, 650, 890, 1130].map((fenceX, i) => (
            <g key={`fence-${i}`}>
              {/* North side lot dividers */}
              <line x1={fenceX} y1="15" x2={fenceX} y2="280" stroke="#163C31" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
              {/* South side lot dividers */}
              <line x1={fenceX} y1="435" x2={fenceX} y2="675" stroke="#163C31" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
            </g>
          ))}

          {/* Sunburst Way Central Road Corridor */}
          <g id="street-infrastructure">
            {/* North Concrete Sidewalk */}
            <rect x="160" y="278" width="1020" height="24" fill="url(#concreteSidewalk)" stroke="#1E293B" strokeWidth="0.8" />
            {/* Sidewalk Expansion Joint Lines */}
            {[220, 280, 340, 400, 460, 520, 580, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120].map((jointX) => (
              <line key={`sw-joint-n-${jointX}`} x1={jointX} y1="278" x2={jointX} y2="302" stroke="#1E293B" strokeWidth="1" opacity="0.5" />
            ))}

            {/* Asphalt Roadway (Sunburst Way) */}
            <rect x="160" y="302" width="1020" height="110" fill="url(#asphaltRoad)" stroke="#0F172A" strokeWidth="1.5" />

            {/* Curbs with Shading */}
            <line x1="160" y1="302" x2="1180" y2="302" stroke="#64748B" strokeWidth="2.5" />
            <line x1="160" y1="412" x2="1180" y2="412" stroke="#64748B" strokeWidth="2.5" />

            {/* South Concrete Sidewalk */}
            <rect x="160" y="412" width="1020" height="24" fill="url(#concreteSidewalk)" stroke="#1E293B" strokeWidth="0.8" />
            {[220, 280, 340, 400, 460, 520, 580, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120].map((jointX) => (
              <line key={`sw-joint-s-${jointX}`} x1={jointX} y1="412" x2={jointX} y2="436" stroke="#1E293B" strokeWidth="1" opacity="0.5" />
            ))}

            {/* Roadway Centerline Striping (Double Yellow + Passing Dashes) */}
            <line x1="180" y1="354" x2="1160" y2="354" stroke="#FBBF24" strokeWidth="1.8" strokeDasharray="14 12" opacity="0.85" />
            <line x1="180" y1="358" x2="1160" y2="358" stroke="#FBBF24" strokeWidth="1.8" strokeDasharray="14 12" opacity="0.85" />

            {/* Roadway White Pedestrian Crosswalks */}
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

            {/* Painted Road Signage */}
            <text x="320" y="342" fill="#475569" fontSize="12" fontWeight="bold" letterSpacing="3" opacity="0.8">
              SUNBURST WAY
            </text>
            <text x="320" y="378" fill="#334155" fontSize="9" fontWeight="bold" letterSpacing="1">
              LOW-VOLTAGE 400V/230V DISTRIBUTION CORRIDOR
            </text>

            <text x="600" y="342" fill="#475569" fontSize="11" fontWeight="bold" letterSpacing="2" opacity="0.7">
              SPEED LIMIT 25
            </text>
            <text x="600" y="378" fill="#334155" fontSize="8.5" fontFamily="monospace">
              RADIAL FEEDER LENGTH: 300m • 4x70mm² AL ABC
            </text>
          </g>

          {/* Paved Private Driveways from Street to Homes */}
          {network.houses.map((house) => {
            const layout = houseLayoutMap[house.id]
            if (!layout) return null
            const isNorth = layout.y < 300
            const driveX = layout.x + 130
            const driveY = isNorth ? layout.y + 130 : 412
            const driveHeight = isNorth ? 302 - (layout.y + 130) : layout.y - 412 + 20

            return (
              <g key={`driveway-${house.id}`}>
                {/* Driveway Pavers */}
                <rect
                  x={driveX}
                  y={driveY}
                  width="48"
                  height={Math.max(20, driveHeight)}
                  fill="url(#drivewayPavers)"
                  stroke="#1E293B"
                  strokeWidth="1"
                />
                {/* Paver Texture Lines */}
                <line x1={driveX + 24} y1={driveY} x2={driveX + 24} y2={driveY + driveHeight} stroke="#334155" strokeWidth="0.8" strokeDasharray="4 4" />

                {/* Parked Vehicle in Driveway */}
                {layout.carType && (
                  <g transform={`translate(${driveX + 8}, ${isNorth ? driveY + 15 : driveY + 30})`}>
                    {/* Car Body Shadow */}
                    <ellipse cx="16" cy="22" rx="16" ry="24" fill="#000000" opacity="0.4" />
                    {/* Car Chassis */}
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
                    {/* Windshield & Rear Glass */}
                    <rect x="5" y="8" width="22" height="9" rx="2" fill="#0F172A" />
                    <rect x="5" y="27" width="22" height="7" rx="2" fill="#0F172A" />
                    <rect x="5" y="18" width="22" height="8" fill="#1E293B" />
                    {/* Wheels */}
                    <rect x="0" y="5" width="3" height="7" rx="1" fill="#0F172A" />
                    <rect x="29" y="5" width="3" height="7" rx="1" fill="#0F172A" />
                    <rect x="0" y="32" width="3" height="7" rx="1" fill="#0F172A" />
                    <rect x="29" y="32" width="3" height="7" rx="1" fill="#0F172A" />

                    {/* EV Charging Cord Pulsing (for EV Homes 3, 6, 8) */}
                    {layout.carType === 'tesla' && (
                      <g>
                        <path
                          d="M -6,15 Q -1,18 2,20"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                        />
                        <circle cx="-6" cy="15" r="2.5" fill="#10B981" />
                        <text x="-8" y="28" fill="#10B981" fontSize="6" fontWeight="bold">
                          EV
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 2: 11kV SUBSTATION & PAD-MOUNTED TRANSFORMER (REAL-WORLD ENCL)  */}
          {/* ==================================================================== */}
          <g
            id="substation-compound"
            transform="translate(15, 250)"
            className="cursor-pointer"
            onClick={() => selectHouse('HOUSE-01')}
            onMouseEnter={() => setHoveredSubstation(true)}
            onMouseLeave={() => setHoveredSubstation(false)}
          >
            {/* Concrete Plinth Foundation Slab */}
            <rect x="0" y="0" width="145" height="190" rx="4" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />
            <rect x="4" y="4" width="137" height="182" rx="3" fill="#0F172A" opacity="0.6" />

            {/* Perimeter Security Chain-Link Fence */}
            <rect
              x="6"
              y="6"
              width="133"
              height="178"
              rx="4"
              fill="none"
              stroke="#64748B"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* Barbed Wire Warning Corner Posts */}
            <circle cx="6" cy="6" r="3" fill="#94A3B8" />
            <circle cx="139" cy="6" r="3" fill="#94A3B8" />
            <circle cx="6" cy="184" r="3" fill="#94A3B8" />
            <circle cx="139" cy="184" r="3" fill="#94A3B8" />

            {/* Pad-Mounted Distribution Transformer Enclosure */}
            <g transform="translate(18, 16)">
              {/* Transformer Steel Housing */}
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

              {/* Cooling Radiator Fins (Left & Right) */}
              <g id="cooling-fins-left">
                <rect x="-6" y="15" width="6" height="55" rx="1" fill="#1D4ED8" stroke="#1E293B" strokeWidth="0.5" />
                <line x1="-3" y1="20" x2="-3" y2="65" stroke="#60A5FA" strokeWidth="1" />
              </g>
              <g id="cooling-fins-right">
                <rect x="105" y="15" width="6" height="55" rx="1" fill="#1D4ED8" stroke="#1E293B" strokeWidth="0.5" />
                <line x1="108" y1="20" x2="108" y2="65" stroke="#60A5FA" strokeWidth="1" />
              </g>

              {/* High-Voltage Primary Bushings (11kV Grid Incomer) */}
              <g transform="translate(20, -10)">
                <line x1="-30" y1="2" x2="10" y2="2" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="12" cy="2" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
                <circle cx="32" cy="2" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
                <circle cx="52" cy="2" r="5" fill="#475569" stroke="#94A3B8" strokeWidth="1.5" />
                <text x="32" y="-6" fill="#94A3B8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  11 kV MV FEED
                </text>
              </g>

              {/* Transformer Dual Coils / Magnetic Core Symbol */}
              <circle cx="40" cy="35" r="16" fill="none" stroke="#60A5FA" strokeWidth="2" opacity="0.8" />
              <circle cx="65" cy="35" r="16" fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.8" />
              <Zap className="w-4 h-4 text-amber-300" x="45" y="27" />

              {/* Substation Nameplate */}
              <text x="52" y="60" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                DISTRIBUTION TX
              </text>
              <text x="52" y="72" fill="#93C5FD" fontSize="8" fontFamily="monospace" textAnchor="middle">
                100 kVA • 11kV/230V
              </text>
            </g>

            {/* Low-Voltage Distribution Feeder Pillar Cabinet (Busbar Panel) */}
            <g transform="translate(18, 110)">
              <rect x="0" y="0" width="105" height="42" rx="4" fill="#0B132B" stroke="#334155" strokeWidth="1.5" />
              <text x="8" y="14" fill="#94A3B8" fontSize="7.5" fontWeight="bold">
                LV FEEDER BUSBAR
              </text>

              {/* Phase Indicators */}
              <g transform="translate(8, 20)">
                <circle cx="4" cy="8" r="4" fill="#F97316" />
                <text x="12" y="11" fill="#FDBA74" fontSize="7" fontWeight="bold">L1</text>

                <circle cx="34" cy="8" r="4" fill="#EAB308" />
                <text x="42" y="11" fill="#FDE047" fontSize="7" fontWeight="bold">L2</text>

                <circle cx="64" cy="8" r="4" fill="#38BDF8" />
                <text x="72" y="11" fill="#BAE6FD" fontSize="7" fontWeight="bold">L3</text>
              </g>

              {/* Real-time Substation Loading Meter */}
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

            {/* Substation Warning Hazard Sign */}
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
                {isReverseFlow ? '▲ REVERSE' : '▼ IMPORT'} {network.transformer.loadingPercent}% (
                {network.transformer.currentLoadKw} kW)
              </text>
            </g>
          </g>

          {/* ==================================================================== */}
          {/* LAYER 3: 4 SUBURBAN UTILITY POLES & OVERHEAD CONDUCTOR CATENARY LINE */}
          {/* ==================================================================== */}
          {/* Main 3-Phase + Neutral Overhead Conductor Feeder Running Down Sunburst Way */}
          {/* Catenary drooping arcs between poles */}
          <g id="overhead-distribution-feeders">
            {/* Line from Substation to Pole 1 */}
            <path
              d="M 125,325 Q 210,332 300,310"
              fill="none"
              stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
              strokeWidth="4"
              className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
            />
            {/* Pole 1 to Pole 2 */}
            <path
              d="M 300,310 Q 420,322 540,310"
              fill="none"
              stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
              strokeWidth="4"
              className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
            />
            {/* Pole 2 to Pole 3 */}
            <path
              d="M 540,310 Q 660,322 780,310"
              fill="none"
              stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
              strokeWidth="4"
              className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
            />
            {/* Pole 3 to Pole 4 */}
            <path
              d="M 780,310 Q 900,322 1020,310"
              fill="none"
              stroke={isReverseFlow ? '#F59E0B' : '#38BDF8'}
              strokeWidth="4"
              className={showFlowAnimation ? (isReverseFlow ? 'export-flow' : 'import-flow') : ''}
            />
          </g>

          {/* Render Utility Poles */}
          {poles.map((pole, idx) => {
            const isHovered = hoveredPoleIdx === idx
            return (
              <g
                key={pole.id}
                transform={`translate(${pole.x}, ${pole.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoleIdx(idx)}
                onMouseLeave={() => setHoveredPoleIdx(null)}
              >
                {/* Streetlight Ambient Light Glow on Pavement */}
                {(idx === 1 || idx === 3) && (
                  <circle cx="0" cy="50" r="70" fill="url(#streetlightGlow)" />
                )}

                {/* Pole Crossarm (Holds Insulators for L1, L2, L3, N) */}
                <line x1="-24" y1="-8" x2="24" y2="-8" stroke="#94A3B8" strokeWidth="4" />
                {/* 4 Porcelain Pin Insulators */}
                <circle cx="-18" cy="-11" r="3.5" fill="#F97316" stroke="#0F172A" strokeWidth="1" />
                <circle cx="-6" cy="-11" r="3.5" fill="#EAB308" stroke="#0F172A" strokeWidth="1" />
                <circle cx="6" cy="-11" r="3.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="1" />
                <circle cx="18" cy="-11" r="3.5" fill="#64748B" stroke="#0F172A" strokeWidth="1" />

                {/* Vertical Pole Column (Treated Wood / Concrete) */}
                <line x1="0" y1="-8" x2="0" y2="40" stroke="#475569" strokeWidth="6" strokeLinecap="round" />
                <line x1="-1" y1="-8" x2="-1" y2="40" stroke="#64748B" strokeWidth="2" />
                {/* Base Foundation Collar */}
                <circle cx="0" cy="38" r="6" fill="#1E293B" stroke="#334155" strokeWidth="1.5" />

                {/* Modern Cobra-Head Streetlight Fixture */}
                {(idx === 1 || idx === 3) && (
                  <g transform="translate(-16, -16)">
                    <path d="M 16,8 Q 0,4 -10,12" fill="none" stroke="#94A3B8" strokeWidth="2.5" />
                    <rect x="-16" y="10" width="12" height="5" rx="2" fill="#FDE68A" stroke="#475569" strokeWidth="1" />
                  </g>
                )}

                {/* Pole ID Badge */}
                <rect x="-20" y="44" width="40" height="13" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
                <text x="0" y="53.5" fill="#94A3B8" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  {pole.id}
                </text>
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 4: REALISTIC SERVICE DROPS FROM UTILITY POLE TO HOUSE MASTS    */}
          {/* ==================================================================== */}
          {network.houses.map((house) => {
            const layout = houseLayoutMap[house.id]
            if (!layout) return null
            const pole = poles[layout.poleIdx]
            const isSelected = selectedHouseId === house.id
            const isHovered = hoveredHouseId === house.id
            const isExporting = house.telemetry.flowDirection === 'export'
            const vColor = getVoltageColor(house.telemetry.voltageV)
            const phaseColor = getPhaseColor(house.phase)

            // Dim if filtered by phase
            const isPhaseMatch = phaseFilter === 'all' || phaseFilter === house.phase
            const opacity = isPhaseMatch ? 1.0 : 0.2

            return (
              <g key={`servicedrop-${house.id}`} opacity={opacity}>
                {/* Aerial Service Cable (Triplex) with Catenary Sag */}
                <path
                  d={`M ${pole.x},${pole.y - 8} Q ${(pole.x + layout.dropMastX) / 2},${(pole.y + layout.dropMastY) / 2 + (layout.y < 300 ? -12 : 12)} ${layout.dropMastX},${layout.dropMastY}`}
                  fill="none"
                  stroke={viewMode === 'electrical' ? phaseColor : isExporting ? '#F59E0B' : '#38BDF8'}
                  strokeWidth={isSelected || isHovered ? '3.5' : '2'}
                  strokeDasharray="4 3"
                  className={showFlowAnimation ? (isExporting ? 'export-flow' : 'import-flow') : ''}
                />

                {/* Point of Attachment (POA) Insulator Knob on House */}
                <circle cx={layout.dropMastX} cy={layout.dropMastY} r="4" fill={vColor} stroke="#0F172A" strokeWidth="1.5" />

                {/* Conduit pipe descending down the house wall to Smart Meter */}
                <line
                  x1={layout.dropMastX}
                  y1={layout.dropMastY}
                  x2={layout.dropMastX}
                  y2={layout.y < 300 ? layout.dropMastY - 35 : layout.dropMastY + 35}
                  stroke="#64748B"
                  strokeWidth="2.5"
                />
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 5: 8 DETAILED ARCHITECTURAL RESIDENTIAL HOMES & SOLAR ARRAYS  */}
          {/* ==================================================================== */}
          {network.houses.map((house) => {
            const layout = houseLayoutMap[house.id]
            if (!layout) return null
            const isSelected = selectedHouseId === house.id
            const isHovered = hoveredHouseId === house.id
            const hasSolar = house.rooftopSolar.hasSolar
            const volts = house.telemetry.voltageV
            const vColor = getVoltageColor(volts)
            const isCritical = house.telemetry.status === 'critical'
            const isExporting = house.telemetry.flowDirection === 'export'
            const solar = house.rooftopSolar
            const battery = house.battery
            const isNorth = layout.y < 300

            // Phase Dimming Filter
            const isPhaseMatch = phaseFilter === 'all' || phaseFilter === house.phase
            const lotOpacity = isPhaseMatch ? 1.0 : 0.25

            return (
              <g
                key={house.id}
                id={`parcel-${house.id}`}
                transform={`translate(${layout.x}, ${layout.y})`}
                className="cursor-pointer transition-transform duration-200"
                onClick={() => selectHouse(house.id)}
                onMouseEnter={() => setHoveredHouseId(house.id)}
                onMouseLeave={() => setHoveredHouseId(null)}
                opacity={lotOpacity}
              >
                {/* 1. Property Lot Blueprint / Selection Ring */}
                {isSelected && (
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
                {isCritical && (
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

                {/* 2. Manicured Lawn Parcel */}
                <rect
                  x="0"
                  y="0"
                  width="220"
                  height="220"
                  rx="10"
                  fill="#0E2E25"
                  stroke="#164E3D"
                  strokeWidth="1.2"
                />

                {/* 3. Front Garden Pathway to Entrance */}
                <path
                  d={isNorth ? 'M 60,140 L 60,220' : 'M 60,80 L 60,0'}
                  stroke="#334155"
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.8"
                />

                {/* Landscaping Trees & Foliage */}
                {layout.hasGardenTree && (
                  <g transform={`translate(${isNorth ? 175 : 25}, ${isNorth ? 185 : 40})`}>
                    <circle cx="0" cy="0" r="18" fill="#064E3B" opacity="0.6" />
                    <circle cx="0" cy="0" r="15" fill="#047857" opacity="0.8" />
                    <circle cx="-3" cy="-3" r="10" fill="#10B981" opacity="0.6" />
                  </g>
                )}

                {/* Heavy Overhanging Tree Canopy on House 4 (Explaining NO SOLAR) */}
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

                {/* 4. Architectural House Structure */}
                <g id="house-dwelling" transform="translate(15, 20)">
                  {/* Building Exterior Walls */}
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

                  {/* Windows with warm ambient interior light */}
                  <rect x="20" y="85" width="22" height="24" rx="2" fill="#FDE68A" stroke="#1E293B" strokeWidth="1" opacity="0.9" />
                  <line x1="31" y1="85" x2="31" y2="109" stroke="#1E293B" strokeWidth="1" />
                  <line x1="20" y1="97" x2="42" y2="97" stroke="#1E293B" strokeWidth="1" />

                  {/* Front Door */}
                  <rect x="52" y="80" width="18" height="36" rx="2" fill="#78350F" stroke="#1E293B" strokeWidth="1" />
                  <circle cx="66" cy="98" r="1.5" fill="#FDE68A" />

                  {/* Garage Door with Horizontal Paneling */}
                  <rect x="110" y="70" width="70" height="48" rx="3" fill="#1E293B" stroke="#334155" strokeWidth="1.2" />
                  {[78, 86, 94, 102, 110].map((panelY) => (
                    <line key={`garage-panel-${panelY}`} x1="110" y1={panelY} x2="180" y2={panelY} stroke="#334155" strokeWidth="1" />
                  ))}

                  {/* 5. Architectural Roof Structure with Pitched Planes */}
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
                    {/* Roof Ridge Line */}
                    <line x1="0" y1="2" x2="182" y2="2" stroke="#64748B" strokeWidth="1.5" />

                    {/* 6. Realistic Photovoltaic Solar Panels */}
                    {hasSolar ? (
                      <g id="solar-pv-array" transform="translate(6, 6)">
                        {/* Monocrystalline Solar Panel Modules Array */}
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

                        {/* Silicon Photovoltaic Wafer Cells & Silver Busbars Grid */}
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

                        {/* Floating Live Generation Ribbon on Roof */}
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
                      /* No Solar (Tenant Occupied / Heavy Tree Canopy) */
                      <g transform="translate(10, 16)">
                        <rect x="0" y="0" width="162" height="26" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
                        <text x="81" y="16.5" fill="#94A3B8" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                          NO SOLAR (TENANT / SHADED)
                        </text>
                      </g>
                    )}
                  </g>

                  {/* 7. Wall-Mounted Exterior Electrical Equipment */}
                  {/* Smart Inverter Unit */}
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

                  {/* Home Battery Storage (Tesla Powerwall / Enphase / BYD) */}
                  {battery?.installed && (
                    <g transform="translate(112, 74)">
                      <rect x="0" y="0" width="24" height="22" rx="3" fill="#0F172A" stroke="#10B981" strokeWidth="1" />
                      {/* Vertical LED SOC Battery Gauge */}
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

                  {/* Smart Utility Bi-Directional Electric Meter */}
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

                {/* 8. House Label & Address Banner */}
                <g transform="translate(15, 152)">
                  {/* Name & Phase Pill */}
                  <text x="4" y="14" fill="#FFFFFF" fontSize="10.5" fontWeight="bold">
                    {house.name}
                  </text>
                  <text x="4" y="27" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                    {house.address} • {house.distanceMeters}m
                  </text>

                  {/* Phase Tag (L1, L2, L3) */}
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

                {/* 9. Real-Time Terminal Voltage & Flow Status Badge */}
                <g transform="translate(15, 185)">
                  {/* Voltage Reading Pill */}
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

                  {/* Flow Pill: Export vs Import */}
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

                {/* 10. Critical Over-Voltage Warning Beacon (Ash Manor etc.) */}
                {isCritical && (
                  <g transform="translate(195, 25)">
                    <circle cx="0" cy="0" r="10" fill="#EF4444" className="animate-ping" opacity="0.8" />
                    <circle cx="0" cy="0" r="7" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x="0" y="3.5" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                      !
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* ==================================================================== */}
          {/* LAYER 6: REAL-WORLD LEGEND & ELECTRICAL STANDARDS STATUS STRIP       */}
          {/* ==================================================================== */}
          <g transform="translate(20, 638)">
            <rect x="0" y="0" width="1140" height="42" rx="8" fill="#0B132B" stroke="#1E293B" strokeWidth="1.2" />

            {/* Solar Reverse Export */}
            <circle cx="25" cy="21" r="5" fill="#F59E0B" />
            <text x="36" y="25" fill="#FDE68A" fontSize="9" fontWeight="bold">
              Solar Reverse Export (▲)
            </text>

            {/* Grid Supply */}
            <circle cx="170" cy="21" r="5" fill="#38BDF8" />
            <text x="181" y="25" fill="#BAE6FD" fontSize="9" fontWeight="bold">
              Grid Supply Import (▼)
            </text>

            {/* Safe Voltage */}
            <circle cx="310" cy="21" r="5" fill="#10B981" />
            <text x="321" y="25" fill="#94A3B8" fontSize="9">
              Safe Band (216–248V)
            </text>

            {/* Warning High */}
            <circle cx="440" cy="21" r="5" fill="#F59E0B" />
            <text x="451" y="25" fill="#94A3B8" fontSize="9">
              Warning (248–253V)
            </text>

            {/* Critical Over-Voltage Violation */}
            <circle cx="570" cy="21" r="5.5" fill="#EF4444" />
            <text x="582" y="25" fill="#FCA5A5" fontSize="9" fontWeight="bold">
              Over-Voltage (&gt; 253V IEEE 1547 Limit)
            </text>

            {/* Phase Identifiers */}
            <text x="800" y="25" fill="#94A3B8" fontSize="9" fontWeight="bold">
              Phases:
            </text>
            <circle cx="848" cy="21" r="4" fill="#F97316" />
            <text x="856" y="25" fill="#FDBA74" fontSize="8.5" fontWeight="bold">L1</text>
            <circle cx="882" cy="21" r="4" fill="#EAB308" />
            <text x="890" y="25" fill="#FDE047" fontSize="8.5" fontWeight="bold">L2</text>
            <circle cx="916" cy="21" r="4" fill="#38BDF8" />
            <text x="924" y="25" fill="#BAE6FD" fontSize="8.5" fontWeight="bold">L3</text>

            {/* Interaction Hint */}
            <text x="1125" y="25" fill="#64748B" fontSize="8.5" fontFamily="monospace" textAnchor="end">
              Click any property to inspect telemetry & inverters
            </text>
          </g>
        </svg>
      </div>

      {/* 3. Bottom Live Inspection HUD Bar (Synchronized with Hover & Selection) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[var(--surface-secondary)] border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              activeInspectionHouse.telemetry.status === 'critical'
                ? 'bg-red-500 animate-ping'
                : 'bg-emerald-500'
            }`}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {activeInspectionHouse.name} ({activeInspectionHouse.address})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--surface)] text-amber-500 dark:text-amber-400 border border-[var(--border)]">
                Phase {activeInspectionHouse.phase} • {activeInspectionHouse.distanceMeters}m from Substation
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  getVoltageStatusBadge(activeInspectionHouse.telemetry.voltageV).color
                }`}
              >
                {getVoltageStatusBadge(activeInspectionHouse.telemetry.voltageV).label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-1">
              <span>
                Terminal Voltage:{' '}
                <strong className="text-[var(--text-primary)] font-mono">
                  {activeInspectionHouse.telemetry.voltageV} V
                </strong>
              </span>
              <span>
                Rooftop Solar:{' '}
                <strong className="text-amber-500 dark:text-amber-400 font-mono">
                  {activeInspectionHouse.rooftopSolar.hasSolar
                    ? `${activeInspectionHouse.rooftopSolar.currentGenerationKw} kW (${activeInspectionHouse.rooftopSolar.installedCapacityKw} kWp)`
                    : 'None (Shaded)'}
                </strong>
              </span>
              <span>
                Home Battery:{' '}
                <strong className="text-emerald-500 font-mono">
                  {activeInspectionHouse.battery?.installed
                    ? `${activeInspectionHouse.battery.currentSocPercent}% SOC (${activeInspectionHouse.battery.currentPowerKw > 0 ? 'Discharging' : activeInspectionHouse.battery.currentPowerKw < 0 ? 'Charging' : 'Idle'})`
                    : 'None'}
                </strong>
              </span>
              <span>
                Net Metering:{' '}
                <strong
                  className={
                    activeInspectionHouse.telemetry.flowDirection === 'export'
                      ? 'text-amber-500 dark:text-amber-400 font-mono'
                      : 'text-sky-600 dark:text-sky-400 font-mono'
                  }
                >
                  {activeInspectionHouse.telemetry.flowDirection === 'export'
                    ? `Exporting +${activeInspectionHouse.telemetry.netPowerKw} kW`
                    : `Importing ${activeInspectionHouse.telemetry.netPowerKw} kW`}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Button to focus house in detail panel */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectHouse(activeInspectionHouse.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Deep Dive Telemetry</span>
          </button>
        </div>
      </div>
    </div>
  )
}
