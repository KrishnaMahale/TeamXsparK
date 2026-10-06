import React, { useState, useRef, useEffect } from 'react'
import {
  Sun,
  BatteryCharging,
  Factory,
  Home,
  Building,
  Zap,
  AlertTriangle,
  Radio,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Compass,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { useUIStore } from '../../store/uiStore'

export const Network2D: React.FC = () => {
  const { network, currentTime } = useGridStore()
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  // Zoom, Pan & Rotate Navigation State
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Toggle Full Screen View
  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!isFullscreen && !document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullscreen(true)
        })
      } else {
        setIsFullscreen(true)
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          setIsFullscreen(false)
        })
      } else {
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement && document.fullscreenElement === containerRef.current))
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  // Non-passive wheel listener to zoom smoothly without scrolling the page
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      setZoom((z) => Math.min(3.5, Math.max(0.4, +(z * factor).toFixed(2))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on canvas background, not on interactive component nodes
    const target = e.target as HTMLElement
    const isInteractive = target.closest('[data-component]') || target.closest('.cursor-pointer')
    if (!isInteractive && e.button === 0) {
      setIsPanning(true)
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      })
    }
  }

  const handleMouseUp = () => setIsPanning(false)

  const handleZoomIn = () => setZoom((z) => Math.min(3.5, +(z * 1.2).toFixed(2)))
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z * 0.83).toFixed(2)))
  const handleRotateLeft = () => setRotation((r) => (r - 90 + 360) % 360)
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setRotation(0)
  }

  const b1 = network.buses.find((b) => b.id === 'B1') || network.buses[0]
  const b2 = network.buses.find((b) => b.id === 'B2') || network.buses[1]
  const b3 = network.buses.find((b) => b.id === 'B3') || network.buses[2]
  const b4 = network.buses.find((b) => b.id === 'B4') || network.buses[3]

  const f01 = network.feeders.find((f) => f.id === 'F-01')
  const f12 = network.feeders.find((f) => f.id === 'F-LINE-12')
  const f02 = network.feeders.find((f) => f.id === 'F-02')
  const f03 = network.feeders.find((f) => f.id === 'F-03')
  const f04 = network.feeders.find((f) => f.id === 'F-04')

  const solar01 = network.solarUnits.find((s) => s.id === 'SOLAR-01') || network.solarUnits[0]
  const solar02 = network.solarUnits.find((s) => s.id === 'SOLAR-02') || network.solarUnits[1]
  const bat01 = network.batteries.find((b) => b.id === 'BAT-01') || network.batteries[0]
  const load01 = network.loads.find((l) => l.id === 'LOAD-01') || network.loads[0]
  const load02 = network.loads.find((l) => l.id === 'LOAD-02') || network.loads[1]
  const load03 = network.loads.find((l) => l.id === 'LOAD-03') || network.loads[2]

  const isB2Critical = (b2?.voltage !== undefined && b2.voltage > 1.05) || b2?.status === 'critical'
  const isB2UnderVoltage = b2?.voltage !== undefined && b2.voltage < 0.95

  const isB3Critical = (b3?.voltage !== undefined && b3.voltage > 1.05) || b3?.status === 'critical'
  const isB3UnderVoltage = b3?.voltage !== undefined && b3.voltage < 0.95
  const isB3Safe = !isB3Critical && !isB3UnderVoltage

  const isF01Critical = (f01?.loadingPercent !== undefined && f01.loadingPercent > 100) || f01?.status === 'critical'
  const isF12Critical = (f12?.loadingPercent !== undefined && f12.loadingPercent > 100) || f12?.status === 'critical'
  const isF02Critical = (f02?.loadingPercent !== undefined && f02.loadingPercent > 100) || f02?.status === 'critical'
  const isF03Energized = Boolean(f03?.isSwitchClosed)
  const isF04Critical = (f04?.loadingPercent !== undefined && f04.loadingPercent > 100) || f04?.status === 'critical'

  const totalSolar = (solar01?.generationKw || 0) + (solar02?.generationKw || 0)
  const totalLoad = (load01?.powerKw || 0) + (load02?.powerKw || 0) + (load03?.powerKw || 0)
  const netPower = totalSolar - totalLoad

  const isSelected = (type: string, id: string) =>
    selectedComponent?.type === type && selectedComponent?.id === id

  // Dynamic Theme Colors for SVG
  const cardBg = isDark ? '#111827' : '#FFFFFF'
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0'
  const textMain = isDark ? '#F8FAFC' : '#0F172A'
  const textMuted = isDark ? '#94A3B8' : '#64748B'
  const hudBg = isDark ? '#0E172C' : '#F8FAFC'
  const hudBorder = isDark ? '#1E293B' : '#CBD5E1'

  const primaryColor = isDark ? '#38BDF8' : '#0284C7'
  const successColor = isDark ? '#22C55E' : '#16A34A'
  const warningColor = isDark ? '#FBBF24' : '#D97706'
  const dangerColor = isDark ? '#F87171' : '#DC2626'
  const lineBaseColor = isDark ? '#38BDF8' : '#0284C7'
  const flowColorNormal = isDark ? '#93C5FD' : '#0284C7'

  const getNodeColor = (status?: string, voltage?: number, isSel?: boolean) => {
    if (isSel) return primaryColor
    if (voltage !== undefined) {
      if (voltage > 1.05) return dangerColor
      if (voltage < 0.95) return warningColor
      return successColor
    }
    if (status === 'critical') return dangerColor
    if (status === 'warning') return warningColor
    return successColor
  }

  const getFeederStroke = (status?: string, loading?: number, isSel?: boolean) => {
    if (isSel) return primaryColor
    if (loading !== undefined && loading > 100) return dangerColor
    if (status === 'critical') return dangerColor
    if (status === 'warning') return warningColor
    return lineBaseColor
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      className={`relative w-full flex items-center justify-center overflow-hidden transition-all select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none bg-white dark:bg-[#0B1220] p-4'
          : 'h-[580px] xl:h-[620px] rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 shadow-xs p-2 sm:p-4'
      }`}
    >
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] bg-[radial-gradient(#0284C7_1px,transparent_1px)] dark:bg-[radial-gradient(#38BDF8_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Live Telemetry Stream Chip (Top-Left HUD) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-xs select-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-700 dark:text-slate-300">LIVE</span>
        <span className="text-slate-400 dark:text-slate-500">•</span>
        <span className="font-mono text-slate-600 dark:text-slate-400">{currentTime}</span>
        <span className="text-slate-400 dark:text-slate-500">•</span>
        <span className={`font-mono font-bold ${netPower >= 0 ? 'text-amber-500' : 'text-sky-500'}`}>
          NET: {netPower >= 0 ? '+' : ''}{Math.round(netPower)} kW
        </span>
      </div>

      {/* Floating 2D Navigation Controls Bar (Top-Right HUD) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md select-none">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-300 w-11 text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          onClick={handleRotateLeft}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Rotate Counter-Clockwise (90°)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleRotateRight}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Rotate Clockwise (90°)"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Reset View"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      <svg
        viewBox="0 0 920 620"
        className="w-full h-full object-contain select-none"
      >
        <rect id="canvas-backdrop" width="920" height="620" fill="transparent" />
        <defs>
          <style>{`
            @keyframes flow-forward {
              from { stroke-dashoffset: 24; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes flow-reverse {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: 24; }
            }
            .flow-line-normal {
              stroke-dasharray: 6 6;
              animation: flow-forward 1.2s linear infinite;
            }
            .flow-line-fast {
              stroke-dasharray: 5 4;
              animation: flow-forward 0.6s linear infinite;
            }
            .flow-line-solar {
              stroke-dasharray: 6 6;
              animation: flow-reverse 1.0s linear infinite;
            }
            .flow-line-tie {
              stroke-dasharray: 6 6;
              animation: flow-forward 1.0s linear infinite;
            }
          `}</style>

          {/* Arrow Markers for power flow */}
          <marker
            id="arrow-normal"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill={primaryColor} />
          </marker>
          <marker
            id="arrow-critical"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill={dangerColor} />
          </marker>
          <marker
            id="arrow-success"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill={successColor} />
          </marker>
          <marker
            id="arrow-solar"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill={warningColor} />
          </marker>
        </defs>

        {/* Dynamic Zoom & Pan Transformed Group */}
        <g
          transform={`translate(${460 + pan.x}, ${310 + pan.y}) scale(${zoom}) rotate(${rotation}) translate(-460, -310)`}
          style={{
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
        {/* ===================================================
            FEEDER LINES & BRANCHES
            =================================================== */}

        {/* 1. Grid Connection to Substation */}
        <line
          x1="460"
          y1="35"
          x2="460"
          y2="85"
          stroke={lineBaseColor}
          strokeWidth="3"
        />

        {/* 2. Substation to Bus B1 (Feeder F-01) */}
        <g
          className="cursor-pointer group"
          onClick={() => {
            if (f01) setSelectedComponent({ type: 'feeder', id: 'F-01', data: f01 })
          }}
        >
          {/* Hanging Wire */}
          <path
            d="M 460 145 Q 460 175 460 185"
            stroke={getFeederStroke(f01?.status, f01?.loadingPercent, isSelected('feeder', 'F-01'))}
            strokeWidth={isSelected('feeder', 'F-01') ? '5' : '3.5'}
            fill="none"
            markerEnd={isF01Critical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
          />
          {/* Flow Animation Overlay */}
          <path
            d="M 460 145 Q 460 175 460 185"
            stroke={flowColorNormal}
            strokeWidth="2"
            fill="none"
            opacity="0.8"
            className="flow-line-normal"
          />
          <rect
            x="480"
            y="150"
            width="68"
            height="22"
            rx="4"
            fill={cardBg}
            stroke={isF01Critical ? dangerColor : cardBorder}
            strokeWidth="1"
          />
          <text x="514" y="165" fill={isF01Critical ? dangerColor : textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
            F-01 {f01?.loadingPercent !== undefined ? Math.round(f01.loadingPercent) : 64}%
          </text>
        </g>

        {/* 3. Bus B1 to Bus B2 (Feeder F-LINE-12) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f12) setSelectedComponent({ type: 'feeder', id: 'F-LINE-12', data: f12 })
          }}
        >
          {/* Hanging Wire */}
          <path
            d="M 450 205 Q 370 270 290 280"
            stroke={getFeederStroke(f12?.status, f12?.loadingPercent, isSelected('feeder', 'F-LINE-12'))}
            strokeWidth={isSelected('feeder', 'F-LINE-12') ? '5' : '3'}
            fill="none"
            markerEnd="url(#arrow-normal)"
          />
          <path
            d="M 450 205 Q 370 270 290 280"
            stroke={flowColorNormal}
            strokeWidth="1.8"
            fill="none"
            opacity="0.8"
            className="flow-line-normal"
          />
          <rect
            x="325"
            y="235"
            width="72"
            height="22"
            rx="4"
            fill={cardBg}
            stroke={isF12Critical ? dangerColor : cardBorder}
            strokeWidth="1"
          />
          <text x="361" y="250" fill={isF12Critical ? dangerColor : textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
            F-12 {f12?.loadingPercent !== undefined ? Math.round(f12.loadingPercent) : 78}%
          </text>
        </g>

        {/* 4. Bus B2 to Bus B3 (Feeder F-02 - Critical Congestion Line) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f02) setSelectedComponent({ type: 'feeder', id: 'F-02', data: f02 })
          }}
        >
          <path
            d="M 300 295 Q 460 335 630 295"
            stroke={getFeederStroke(f02?.status, f02?.loadingPercent, isSelected('feeder', 'F-02'))}
            strokeWidth={isF02Critical ? '4.5' : '3.5'}
            fill="none"
            markerEnd={isF02Critical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
          />
          <path
            d="M 300 295 Q 460 335 630 295"
            stroke={isF02Critical ? dangerColor : flowColorNormal}
            strokeWidth="2.5"
            fill="none"
            className={isF02Critical ? 'flow-line-fast' : 'flow-line-normal'}
            opacity="0.9"
          />
          {/* Label badge */}
          <rect
            x="430"
            y="280"
            width="80"
            height="26"
            rx="4"
            fill={cardBg}
            stroke={isF02Critical ? dangerColor : successColor}
            strokeWidth="1.5"
          />
          <text
            x="470"
            y="297"
            fill={isF02Critical ? dangerColor : successColor}
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            F-02: {f02?.loadingPercent !== undefined ? Math.round(f02.loadingPercent) : 108}%
          </text>
        </g>

        {/* 5. Alternative Tie-Line: Bus B1 to Bus B3 (Feeder F-03) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f03) setSelectedComponent({ type: 'feeder', id: 'F-03', data: f03 })
          }}
        >
          <path
            d="M 480 215 Q 570 230 635 275"
            stroke={isF03Energized ? successColor : textMuted}
            strokeWidth={isF03Energized ? '3.5' : '2.5'}
            strokeDasharray={isF03Energized ? undefined : '5,5'}
            fill="none"
            markerEnd={isF03Energized ? 'url(#arrow-success)' : undefined}
          />
          {isF03Energized && (
            <path
              d="M 480 215 Q 570 230 630 273"
              stroke={successColor}
              strokeWidth="2"
              fill="none"
              className="flow-line-tie"
              opacity="0.9"
            />
          )}
          {/* Switch marker */}
          <circle cx="560" cy="240" r="11" fill={cardBg} stroke={isF03Energized ? successColor : textMuted} strokeWidth="2" />
          <text x="560" y="244" fill={isF03Energized ? successColor : textMuted} fontSize="9" fontWeight="bold" textAnchor="middle">
            {isF03Energized ? 'ON' : 'OFF'}
          </text>
          <text x="560" y="260" fill={isF03Energized ? successColor : textMuted} fontSize="10" fontWeight={isF03Energized ? 'bold' : 'normal'} textAnchor="middle">
            {isF03Energized ? `F-03 (${f03?.loadingPercent !== undefined ? Math.round(f03.loadingPercent) : 46}%)` : 'F-03 Tie-Switch'}
          </text>
        </g>

        {/* 6. Bus B3 to Bus B4 (Feeder F-04) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f04) setSelectedComponent({ type: 'feeder', id: 'F-04', data: f04 })
          }}
        >
          <path
            d="M 640 315 Q 660 385 640 455"
            stroke={getFeederStroke(f04?.status, f04?.loadingPercent, isSelected('feeder', 'F-04'))}
            strokeWidth={isSelected('feeder', 'F-04') ? '5' : '3'}
            fill="none"
            markerEnd={isF04Critical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
          />
          <path
            d="M 640 315 Q 660 385 640 455"
            stroke={flowColorNormal}
            strokeWidth="1.8"
            fill="none"
            className="flow-line-normal"
            opacity="0.8"
          />
          <rect
            x="655"
            y="380"
            width="65"
            height="22"
            rx="4"
            fill={cardBg}
            stroke={isF04Critical ? dangerColor : cardBorder}
            strokeWidth="1"
          />
          <text x="687" y="395" fill={isF04Critical ? dangerColor : textMuted} fontSize="11" textAnchor="middle" fontFamily="monospace">
            F-04 {f04?.loadingPercent !== undefined ? Math.round(f04.loadingPercent) : 52}%
          </text>
        </g>

        {/* 7. Branch: B2 to Solar Unit (SOLAR-01) */}
        <g>
          <path
            d="M 285 295 Q 220 320 160 295"
            stroke={solar01?.generationKw && solar01.generationKw > 0 ? warningColor : textMuted}
            strokeWidth="2.5"
            fill="none"
            markerEnd={solar01?.generationKw && solar01.generationKw > 0 ? 'url(#arrow-solar)' : undefined}
          />
          {solar01?.generationKw && solar01.generationKw > 0 ? (
            <path
              d="M 160 295 Q 220 320 280 295"
              stroke={warningColor}
              strokeWidth="2"
              fill="none"
              className="flow-line-solar"
              opacity="0.8"
            />
          ) : null}
        </g>

        {/* 8. Branch: B2 to Commercial Load (LOAD-01) */}
        <g>
          <path d="M 290 315 Q 310 370 290 425" fill="none" stroke={primaryColor} strokeWidth="2.5" markerEnd="url(#arrow-normal)" />
          <path d="M 290 315 Q 310 370 290 420" fill="none" stroke={flowColorNormal} strokeWidth="1.8" className="flow-line-normal" opacity="0.8" />
        </g>

        {/* 9. Branch: B3 to Battery Unit (BAT-01) */}
        <path
          d="M 660 295 Q 715 315 775 295"
          fill="none"
          stroke={bat01?.status === 'critical' ? dangerColor : successColor}
          strokeWidth="2.5"
        />

        {/* 10. Branch: B3 to Rooftop Solar Unit (SOLAR-02) */}
        <g>
          <path
            d="M 655 280 Q 710 215 760 195"
            stroke={solar02?.generationKw && solar02.generationKw > 0 ? warningColor : textMuted}
            strokeWidth="2.5"
            fill="none"
            markerEnd={solar02?.generationKw && solar02.generationKw > 0 ? 'url(#arrow-solar)' : undefined}
          />
          {solar02?.generationKw && solar02.generationKw > 0 ? (
            <path
              d="M 760 195 Q 710 215 655 280"
              stroke={warningColor}
              strokeWidth="1.8"
              fill="none"
              className="flow-line-solar"
              opacity="0.8"
            />
          ) : null}
        </g>

        {/* 11. Branch: B3 to Residential Load (LOAD-02) */}
        <g>
          <path d="M 620 310 Q 560 370 520 425" fill="none" stroke={primaryColor} strokeWidth="2.5" markerEnd="url(#arrow-normal)" />
          <path d="M 620 310 Q 560 370 525 420" fill="none" stroke={flowColorNormal} strokeWidth="1.8" className="flow-line-normal" opacity="0.8" />
        </g>

        {/* 12. Branch: B4 to Industrial Load (LOAD-03) */}
        <g>
          <path d="M 660 475 Q 715 495 775 475" fill="none" stroke={primaryColor} strokeWidth="2.5" markerEnd="url(#arrow-normal)" />
          <path d="M 660 475 Q 715 495 770 475" fill="none" stroke={flowColorNormal} strokeWidth="1.8" className="flow-line-normal" opacity="0.8" />
        </g>

        {/* ===================================================
            EQUIPMENT ASSETS & NODES
            =================================================== */}

        {/* GRID INJECTION ICON */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'transformer', id: 'GRID', data: network.substation })}>
          <rect x="420" y="8" width="80" height="26" rx="4" fill={isDark ? '#16223F' : '#E0F2FE'} stroke={primaryColor} strokeWidth="1.5" />
          <text x="460" y="25" fill={primaryColor} fontSize="11" fontWeight="bold" textAnchor="middle">
            MAIN GRID
          </text>
        </g>

        {/* PRIMARY SUBSTATION */}
        <g
          className="cursor-pointer"
          onClick={() =>
            setSelectedComponent({
              type: 'transformer',
              id: 'TX-MAIN',
              data: network.substation,
            })
          }
        >
          {/* Detailed Transformer Station */}
          <rect x="410" y="85" width="100" height="48" rx="6" fill={cardBg} stroke={isSelected('transformer', 'TX-MAIN') ? primaryColor : cardBorder} strokeWidth={isSelected('transformer', 'TX-MAIN') ? '2.5' : '1.5'} />
          <path d="M 430 85 L 430 75 M 460 85 L 460 75 M 490 85 L 490 75" stroke={textMuted} strokeWidth="2" />
          <rect x="425" y="70" width="10" height="5" rx="1" fill={textMain} />
          <rect x="455" y="70" width="10" height="5" rx="1" fill={textMain} />
          <rect x="485" y="70" width="10" height="5" rx="1" fill={textMain} />
          <text x="460" y="105" fill={textMain} fontSize="12" fontWeight="bold" textAnchor="middle">SUBSTATION</text>
          <text x="460" y="122" fill={textMuted} fontSize="10" textAnchor="middle">
            33/11kV ({network.substation?.loadingPercent ? Math.round(network.substation.loadingPercent) : Math.round(f01?.loadingPercent ?? 68)}%)
          </text>
        </g>

        {/* BUS 1 (B1) - Utility Pole */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'bus', id: 'B1', data: b1 })}>
          <line x1="460" y1="185" x2="460" y2="215" stroke={textMuted} strokeWidth="4" />
          <line x1="445" y1="195" x2="475" y2="195" stroke={textMuted} strokeWidth="3" />
          <circle cx="460" cy="205" r="8" fill={cardBg} stroke={getNodeColor(b1?.status, b1?.voltage, isSelected('bus', 'B1'))} strokeWidth="3" />
          <text x="440" y="225" fill={textMain} fontSize="11" fontWeight="bold" textAnchor="end">B1</text>
          <text x="480" y="225" fill={textMuted} fontSize="10" textAnchor="start" fontFamily="monospace">
            {b1?.voltage !== undefined ? b1.voltage.toFixed(3) : '1.020'} pu
          </text>
        </g>

        {/* BUS 2 (B2) - Utility Pole */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'bus', id: 'B2', data: b2 })}>
          <line x1="290" y1="275" x2="290" y2="305" stroke={textMuted} strokeWidth="4" />
          <line x1="275" y1="285" x2="305" y2="285" stroke={textMuted} strokeWidth="3" />
          <circle cx="290" cy="295" r="8" fill={cardBg} stroke={getNodeColor(b2?.status, b2?.voltage, isSelected('bus', 'B2'))} strokeWidth="3" />
          <text x="270" y="315" fill={textMain} fontSize="11" fontWeight="bold" textAnchor="end">B2</text>
          <text x="310" y="315" fill={textMuted} fontSize="10" textAnchor="start" fontFamily="monospace">
            {b2?.voltage !== undefined ? b2.voltage.toFixed(3) : '1.010'} pu
          </text>
          {isB2Critical && (
            <g transform="translate(195, 255)">
              <rect x="-4" y="-2" width="94" height="20" rx="3" fill={dangerColor} />
              <text x="43" y="12" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">OVER-VOLTAGE</text>
            </g>
          )}
        </g>

        {/* BUS 3 (B3) - Sub-transmission Pole */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'bus', id: 'B3', data: b3 })}>
          <line x1="640" y1="275" x2="640" y2="315" stroke={textMuted} strokeWidth="6" />
          <line x1="620" y1="285" x2="660" y2="285" stroke={textMuted} strokeWidth="4" />
          <line x1="620" y1="295" x2="660" y2="295" stroke={textMuted} strokeWidth="4" />
          <circle cx="640" cy="295" r="10" fill={cardBg} stroke={getNodeColor(b3?.status, b3?.voltage, isSelected('bus', 'B3'))} strokeWidth="3.5" />
          <text x="640" y="335" fill={textMain} fontSize="12" fontWeight="bold" textAnchor="middle">B3</text>
          <text x="640" y="350" fill={isB3Critical ? dangerColor : isB3Safe ? successColor : textMuted} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {b3?.voltage !== undefined ? b3.voltage.toFixed(3) : '1.074'} pu
          </text>
          {isB3Critical && (
            <g transform="translate(660, 265)">
              <rect x="-4" y="-2" width="94" height="20" rx="3" fill={dangerColor} />
              <text x="43" y="12" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">OVER-VOLTAGE</text>
            </g>
          )}
        </g>

        {/* BUS 4 (B4) - Utility Pole */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'bus', id: 'B4', data: b4 })}>
          <line x1="640" y1="455" x2="640" y2="485" stroke={textMuted} strokeWidth="4" />
          <line x1="625" y1="465" x2="655" y2="465" stroke={textMuted} strokeWidth="3" />
          <circle cx="640" cy="475" r="8" fill={cardBg} stroke={getNodeColor(b4?.status, b4?.voltage, isSelected('bus', 'B4'))} strokeWidth="3" />
          <text x="620" y="495" fill={textMain} fontSize="11" fontWeight="bold" textAnchor="end">B4</text>
          <text x="660" y="495" fill={textMuted} fontSize="10" textAnchor="start" fontFamily="monospace">
            {b4?.voltage !== undefined ? b4.voltage.toFixed(3) : '1.000'} pu
          </text>
        </g>

        {/* SOLAR FARM ALPHA (ATTACHED TO B2) */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'solar', id: 'SOLAR-01', data: solar01 })}>
          <rect x="70" y="265" width="90" height="60" rx="6" fill={cardBg} stroke={isSelected('solar', 'SOLAR-01') ? primaryColor : solar01?.generationKw && solar01.generationKw > 0 ? warningColor : cardBorder} strokeWidth="1.5" />
          {/* Detailed Solar Panel Art */}
          <g transform="translate(85, 272)">
            <polygon points="10,0 50,0 40,20 0,20" fill={isDark ? '#1E3A8A' : '#60A5FA'} stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="1" />
            <line x1="20" y1="0" x2="10" y2="20" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
            <line x1="30" y1="0" x2="20" y2="20" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
            <line x1="40" y1="0" x2="30" y2="20" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
            <line x1="5" y1="10" x2="45" y2="10" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
          </g>
          <text x="115" y="305" fill={textMain} fontSize="10" fontWeight="bold" textAnchor="middle">SOLAR FARM</text>
          <text x="115" y="318" fill={warningColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {solar01?.generationKw !== undefined ? Math.round(solar01.generationKw) : 150} kW
          </text>
        </g>

        {/* ROOFTOP SOLAR (ATTACHED TO B3) */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'solar', id: 'SOLAR-02', data: solar02 })}>
          <rect x="760" y="155" width="105" height="55" rx="6" fill={cardBg} stroke={isSelected('solar', 'SOLAR-02') ? primaryColor : isB3Critical && solar02?.generationKw && solar02.generationKw > 30 ? dangerColor : solar02?.generationKw && solar02.generationKw > 0 ? warningColor : cardBorder} strokeWidth="1.5" />
          <g transform="translate(790, 162)">
            <polygon points="10,0 40,0 35,15 5,15" fill={isDark ? '#1E3A8A' : '#60A5FA'} stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="1" />
            <line x1="20" y1="0" x2="15" y2="15" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
            <line x1="30" y1="0" x2="25" y2="15" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
            <line x1="7.5" y1="7.5" x2="37.5" y2="7.5" stroke={isDark ? '#3B82F6' : '#2563EB'} strokeWidth="0.5" />
          </g>
          <text x="812" y="190" fill={textMain} fontSize="9" fontWeight="bold" textAnchor="middle">ROOFTOP PV</text>
          <text x="812" y="202" fill={warningColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {solar02?.generationKw !== undefined ? Math.round(solar02.generationKw) : 80} kW
          </text>
        </g>

        {/* BATTERY STORAGE (ATTACHED TO B3) */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'battery', id: 'BAT-01', data: bat01 })}>
          <rect x="775" y="265" width="95" height="60" rx="6" fill={cardBg} stroke={isSelected('battery', 'BAT-01') ? primaryColor : bat01?.status === 'critical' ? dangerColor : successColor} strokeWidth="1.5" />
          {/* Detailed Battery Icon */}
          <g transform="translate(812, 275)">
            <rect x="-10" y="-5" width="20" height="15" rx="2" fill={isDark ? '#374151' : '#9CA3AF'} />
            <rect x="-5" y="-7" width="10" height="2" rx="1" fill={isDark ? '#4B5563' : '#6B7280'} />
            <rect x="-8" y="-3" width="16" height="11" rx="1" fill={isDark ? '#1F2937' : '#F3F4F6'} />
            <rect x="-8" y="-3" width="16" height="11" rx="1" fill={successColor} opacity={bat01?.socPercent ? bat01.socPercent / 100 : 0.62} />
            <path d="M-2,0 L-4,5 L0,5 L-2,9 L4,3 L0,3 Z" fill={isDark ? '#FFFFFF' : '#111827'} transform="scale(0.8) translate(1, -1)" />
          </g>
          <text x="822" y="303" fill={textMain} fontSize="10" fontWeight="bold" textAnchor="middle">BESS 100kWh</text>
          <text x="822" y="318" fill={bat01?.status === 'critical' ? dangerColor : successColor} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            SOC {bat01?.socPercent !== undefined ? Math.round(bat01.socPercent) : 62}%
          </text>
        </g>

        {/* LOAD 1: COMMERCIAL (B2) */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'load', id: 'LOAD-01', data: load01 })}>
          <rect x="240" y="425" width="100" height="55" rx="6" fill={cardBg} stroke={isSelected('load', 'LOAD-01') ? primaryColor : cardBorder} strokeWidth="1.5" />
          {/* Commercial Building Art */}
          <g transform="translate(280, 432)">
            <rect x="0" y="0" width="20" height="25" fill={isDark ? '#1E293B' : '#94A3B8'} />
            <rect x="3" y="3" width="4" height="4" fill={isDark ? '#38BDF8' : '#DBEAFE'} />
            <rect x="13" y="3" width="4" height="4" fill={isDark ? '#38BDF8' : '#DBEAFE'} />
            <rect x="3" y="10" width="4" height="4" fill={isDark ? '#38BDF8' : '#DBEAFE'} />
            <rect x="13" y="10" width="4" height="4" fill={isDark ? '#38BDF8' : '#DBEAFE'} />
            <rect x="8" y="17" width="4" height="8" fill={isDark ? '#0F172A' : '#475569'} />
          </g>
          <text x="290" y="470" fill={textMain} fontSize="9" textAnchor="middle">COMMERCIAL</text>
          <text x="290" y="470" fill={textMain} fontSize="9" textAnchor="middle"></text>
        </g>
        <text x="290" y="495" fill={textMuted} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {load01?.powerKw !== undefined ? Math.round(load01.powerKw) : 90} kW
        </text>

        {/* LOAD 2: RESIDENTIAL (B3) */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'load', id: 'LOAD-02', data: load02 })}>
          <rect x="465" y="425" width="100" height="55" rx="6" fill={cardBg} stroke={isSelected('load', 'LOAD-02') ? primaryColor : cardBorder} strokeWidth="1.5" />
          {/* Residential House Art */}
          <g transform="translate(505, 432)">
            <polygon points="10,0 20,10 0,10" fill={isDark ? '#991B1B' : '#EF4444'} />
            <rect x="2" y="10" width="16" height="15" fill={isDark ? '#1E293B' : '#94A3B8'} />
            <rect x="12" y="14" width="4" height="4" fill={isDark ? '#FDE047' : '#FEF08A'} />
            <rect x="4" y="17" width="5" height="8" fill={isDark ? '#0F172A' : '#475569'} />
          </g>
          <text x="515" y="470" fill={textMain} fontSize="9" textAnchor="middle">RESIDENTIAL</text>
        </g>
        <text x="515" y="495" fill={textMuted} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {load02?.powerKw !== undefined ? Math.round(load02.powerKw) : 60} kW
        </text>

        {/* LOAD 3: INDUSTRIAL (B4) */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'load', id: 'LOAD-03', data: load03 })}>
          <rect x="775" y="450" width="105" height="55" rx="6" fill={cardBg} stroke={isSelected('load', 'LOAD-03') ? primaryColor : cardBorder} strokeWidth="1.5" />
          {/* Factory Art */}
          <g transform="translate(815, 457)">
            <polygon points="0,20 0,10 8,10 8,20" fill={isDark ? '#1E293B' : '#94A3B8'} />
            <polygon points="8,20 8,5 16,10 16,20" fill={isDark ? '#334155' : '#64748B'} />
            <polygon points="16,20 16,0 24,10 24,20" fill={isDark ? '#1E293B' : '#94A3B8'} />
            <rect x="2" y="2" width="2" height="6" fill={isDark ? '#64748B' : '#CBD5E1'} />
            <rect x="18" y="0" width="2" height="8" fill={isDark ? '#64748B' : '#CBD5E1'} />
          </g>
          <text x="827" y="495" fill={textMain} fontSize="9" textAnchor="middle">INDUSTRIAL</text>
        </g>
        <text x="827" y="520" fill={textMuted} fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {load03?.powerKw !== undefined ? Math.round(load03.powerKw) : 120} kW
        </text>

        {/* Dynamic Zoom & Pan Transformed Group End */}
        </g>

        {/* Schematic Legend Watermark */}
        <g transform="translate(20, 565)">
          <rect x="0" y="0" width="310" height="34" rx="4" fill={hudBg} stroke={hudBorder} strokeWidth="1" />
          <circle cx="20" cy="17" r="5" fill={successColor} />
          <text x="32" y="21" fill={textMuted} fontSize="10">Normal</text>

          <circle cx="85" cy="17" r="5" fill={warningColor} />
          <text x="97" y="21" fill={textMuted} fontSize="10">Warning</text>

          <circle cx="155" cy="17" r="5" fill={dangerColor} />
          <text x="167" y="21" fill={textMuted} fontSize="10">Violation</text>

          <circle cx="230" cy="17" r="5" fill={primaryColor} />
          <text x="242" y="21" fill={textMuted} fontSize="10">Selected</text>
        </g>
      </svg>

      {/* Navigation Help Badge */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 bg-slate-900/70 text-slate-300 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-700/50 pointer-events-none select-none">
        <span>Scroll: Zoom</span>
        <span>•</span>
        <span>Drag canvas: Pan</span>
        {rotation !== 0 && (
          <>
            <span>•</span>
            <span className="text-sky-400">Rotated {rotation}°</span>
          </>
        )}
      </div>

      {/* Fullscreen Simulation Button (Bottom-Right in highlighted position) */}
      <div className="absolute bottom-3 right-3 z-20">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
          title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Simulation'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-sky-500" />
              <span>Exit Full Screen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
              <span>Full Screen</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
