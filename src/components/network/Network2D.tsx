import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Sun,
  BatteryMedium,
  Factory,
  Home,
  Building,
  Zap,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Compass,
  Maximize2,
  Minimize2,
  Radio,
} from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { useUIStore } from '../../store/uiStore'
import { Bus, Feeder, SolarUnit, Battery, Load, ComponentType } from '../../types/network'
import { SolarRooftopVillaSvg } from './assets/SolarRooftopIcon'

export interface Network2DProps {
  readOnly?: boolean
  heightClassName?: string
}

export const Network2D: React.FC<Network2DProps> = ({
  readOnly = false,
  heightClassName,
}) => {
  const { network, currentTime, updateComponentPosition } = useGridStore()
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
  const svgRef = useRef<SVGSVGElement>(null)
  const sceneGroupRef = useRef<SVGGElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 2D Interactive Drag & Move Component State
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const lastDragEndTimeRef = useRef<number>(0)
  const lastFrozenBoundsRef = useRef<{
    minX: number
    maxX: number
    minZ: number
    maxZ: number
    centerX: number
    centerZ: number
    scale: number
  }>({ minX: -15, maxX: 15, minZ: -15, maxZ: 15, centerX: 0, centerZ: 0, scale: 20 })

  const dragInfoRef = useRef<{
    id: string
    type: 'transformer' | 'bus' | 'solar' | 'battery' | 'load'
    startGridPos: { x: number; z: number }
    startSvgPos: { x: number; y: number }
    offsetSvg: { x: number; y: number }
    currentGridPos: { x: number; z: number }
    hasMoved: boolean
    bounds: { centerX: number; centerZ: number; scale: number }
  } | null>(null)

  const rafIdRef = useRef<number | null>(null)
  const pendingPointerRef = useRef<{ clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

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

  // Helper: map pointer screen coordinates (clientX, clientY) through SVG inverse transformation matrix
  const getScenePoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current || !sceneGroupRef.current) return null
    const ctm = sceneGroupRef.current.getScreenCTM()
    if (!ctm) return null
    const pt = svgRef.current.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const transformed = pt.matrixTransform(ctm.inverse())
    return { x: transformed.x, y: transformed.y }
  }

  // Pointer Down on background canvas: initiates pan
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    const isInteractive =
      target.closest('[data-component]') ||
      target.closest('.cursor-pointer') ||
      target.closest('button')
    if (isInteractive) return
    if (e.button !== 0) return

    setIsPanning(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  // Pointer Move on container: handles active component drag or canvas panning with RAF coalescing
  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragInfoRef.current && isDraggingNode) {
      e.stopPropagation()
      pendingPointerRef.current = { clientX: e.clientX, clientY: e.clientY }

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null
          if (!dragInfoRef.current || !pendingPointerRef.current) return
          const scenePt = getScenePoint(
            pendingPointerRef.current.clientX,
            pendingPointerRef.current.clientY
          )
          if (!scenePt) return

          const { offsetSvg, bounds: frozenBounds, id } = dragInfoRef.current
          const targetSvgX = scenePt.x - offsetSvg.x
          const targetSvgY = scenePt.y - offsetSvg.y

          const dx = targetSvgX - dragInfoRef.current.startSvgPos.x
          const dy = targetSvgY - dragInfoRef.current.startSvgPos.y
          if (Math.abs(dx) > 2.5 || Math.abs(dy) > 2.5) {
            dragInfoRef.current.hasMoved = true
          }

          // Convert SVG scene space (500, 340 center) back to 3D grid space (x, z)
          const newGridX = (targetSvgX - 500) / frozenBounds.scale + frozenBounds.centerX
          const newGridZ = (targetSvgY - 340) / frozenBounds.scale + frozenBounds.centerZ

          const roundedX = Math.round(newGridX * 10) / 10
          const roundedZ = Math.round(newGridZ * 10) / 10

          dragInfoRef.current.currentGridPos = { x: roundedX, z: roundedZ }

          const elevationY = id === network.substation?.id ? 0.6 : 0

          // Continuous vsync-aligned update to shared store: immediately synchronizes 2D and 3D views
          updateComponentPosition(id, { x: roundedX, y: elevationY, z: roundedZ }, false)
        })
      }
      return
    }

    if (isPanning) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      })
    }
  }

  // Pointer Up on container: commits final position and releases pointer capture
  const handlePointerUp = async (e: React.PointerEvent) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    if (dragInfoRef.current) {
      const { id, currentGridPos, hasMoved } = dragInfoRef.current
      const elevationY = id === network.substation?.id ? 0.6 : 0

      if (hasMoved) {
        lastDragEndTimeRef.current = Date.now()
        await updateComponentPosition(
          id,
          { x: currentGridPos.x, y: elevationY, z: currentGridPos.z },
          true
        )
      }

      dragInfoRef.current = null
      setDraggingId(null)
      setIsDraggingNode(false)
      try {
        ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
      } catch {}
      return
    }

    setIsPanning(false)
  }

  // Pointer Down on movable component node: initiates 2D component dragging
  const handleStartNodeDrag = (
    e: React.PointerEvent,
    id: string,
    type: 'transformer' | 'bus' | 'solar' | 'battery' | 'load',
    componentData: any
  ) => {
    if (readOnly) return
    if (e.button !== 0) return // Primary left button only

    e.stopPropagation()

    setSelectedComponent({
      type,
      id,
      data: componentData,
    })

    const scenePt = getScenePoint(e.clientX, e.clientY)
    if (!scenePt) return

    const currentSvg = getSvgCoords(id)
    if (!currentSvg) return

    const currentGrid = nodePositions[id] || { x: 0, z: 0 }
    const frozenBounds = { ...lastFrozenBoundsRef.current }

    dragInfoRef.current = {
      id,
      type,
      startGridPos: { ...currentGrid },
      startSvgPos: { ...currentSvg },
      offsetSvg: {
        x: scenePt.x - currentSvg.x,
        y: scenePt.y - currentSvg.y,
      },
      currentGridPos: { ...currentGrid },
      hasMoved: false,
      bounds: frozenBounds,
    }

    setDraggingId(id)
    setIsDraggingNode(true)
    try {
      ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    } catch {}
  }

  // Click on movable component node: select component if not dragging
  const handleClickNode = (
    e: React.MouseEvent,
    type: ComponentType,
    id: string,
    data: any
  ) => {
    e.stopPropagation()
    // Avoid re-selecting immediately after dragging release
    if (Date.now() - lastDragEndTimeRef.current < 250) return
    setSelectedComponent({ type, id, data })
  }

  const handleZoomIn = () => setZoom((z) => Math.min(3.5, +(z * 1.2).toFixed(2)))
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z * 0.8).toFixed(2)))
  const handleRotateLeft = () => setRotation((r) => (r - 90) % 360)
  const handleRotateRight = () => setRotation((r) => (r + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setRotation(0)
  }

  // Compute spatial positions from user-configured 3D positions (x, z)
  const { nodePositions, bounds } = useMemo(() => {
    const pos: Record<string, { x: number; z: number }> = {}

    // 1. Substation
    if (network.substation) {
      pos[network.substation.id] = {
        x: network.substation.position?.x ?? 0,
        z: network.substation.position?.z ?? -10,
      }
    }

    // 2. Buses
    const defaultBusZ = [-5, 0, 6, 12]
    network.buses.forEach((b, idx) => {
      pos[b.id] = {
        x: b.position?.x ?? 0,
        z: b.position?.z ?? (defaultBusZ[idx] ?? idx * 6),
      }
    })

    // 3. Solar Units
    network.solarUnits.forEach((s, idx) => {
      const busPos = s.busId ? pos[s.busId] : null
      pos[s.id] = {
        x: s.position?.x ?? (busPos ? busPos.x - 4 : -7),
        z: s.position?.z ?? (busPos ? busPos.z : idx === 0 ? 0 : 3),
      }
    })

    // 4. Batteries
    network.batteries.forEach((bat) => {
      const busPos = bat.busId ? pos[bat.busId] : null
      pos[bat.id] = {
        x: bat.position?.x ?? (busPos ? busPos.x - 4 : -7),
        z: bat.position?.z ?? (busPos ? busPos.z + 2 : 6),
      }
    })

    // 5. Loads
    const defaultLoadZ = [0, 6, 12]
    network.loads.forEach((l, idx) => {
      const busPos = l.busId ? pos[l.busId] : null
      pos[l.id] = {
        x: l.position?.x ?? (busPos ? busPos.x + 4 : 7),
        z: l.position?.z ?? (busPos ? busPos.z : defaultLoadZ[idx] ?? idx * 6),
      }
    })

    // If actively dragging, retain frozen bounds to guarantee zero jitter and skip min/max recalculation
    if (isDraggingNode) {
      return {
        nodePositions: pos,
        bounds: lastFrozenBoundsRef.current,
      }
    }

    // Calculate bounding box for normalization into 2D SVG canvas
    const allPos = Object.values(pos)
    if (allPos.length === 0) {
      return {
        nodePositions: pos,
        bounds: { minX: -15, maxX: 15, minZ: -15, maxZ: 15, centerX: 0, centerZ: 0, scale: 20 },
      }
    }

    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity

    allPos.forEach((p) => {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.z < minZ) minZ = p.z
      if (p.z > maxZ) maxZ = p.z
    })

    const spanX = Math.max(16, maxX - minX)
    const spanZ = Math.max(16, maxZ - minZ)
    const centerX = (minX + maxX) / 2
    const centerZ = (minZ + maxZ) / 2

    // ViewBox is 1000 x 680. Usable area: 840 x 540 with margin
    const scaleX = 840 / spanX
    const scaleZ = 540 / spanZ
    const scale = Math.min(scaleX, scaleZ)

    const computedBounds = { minX, maxX, minZ, maxZ, centerX, centerZ, scale }
    if (!isDraggingNode) {
      lastFrozenBoundsRef.current = computedBounds
    }

    return {
      nodePositions: pos,
      bounds: computedBounds,
    }
  }, [network, isDraggingNode])

  // Helper to project 3D (x, z) coordinates to SVG canvas (x, y)
  const getSvgCoords = (id: string): { x: number; y: number } | null => {
    const p = nodePositions[id]
    if (!p) return null
    const b = isDraggingNode ? lastFrozenBoundsRef.current : bounds
    const svgX = 500 + (p.x - b.centerX) * b.scale
    const svgY = 340 + (p.z - b.centerZ) * b.scale
    return { x: Math.round(svgX * 10) / 10, y: Math.round(svgY * 10) / 10 }
  }

  // Calculate live power metrics
  const totalSolar = network.solarUnits.reduce((acc, s) => acc + (s.generationKw || 0), 0)
  const totalLoad = network.loads.reduce((acc, l) => acc + (l.powerKw || 0), 0)
  const netPower = totalSolar - totalLoad

  const isSelected = (type: string, id: string) =>
    selectedComponent?.type === type && selectedComponent?.id === id

  // Dynamic Theme Colors for SVG
  const cardBg = isDark ? '#111827' : '#FFFFFF'
  const cardBorder = isDark ? '#1E293B' : '#E2E8F0'
  const textMain = isDark ? '#F8FAFC' : '#0F172A'
  const textMuted = isDark ? '#94A3B8' : '#64748B'

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

  const getLoadIcon = (name: string, category?: string) => {
    const n = (name + (category || '')).toLowerCase()
    if (n.includes('factory') || n.includes('industrial') || n.includes('manufacturing')) return Factory
    if (n.includes('commercial') || n.includes('office') || n.includes('mall') || n.includes('hospital')) return Building
    return Home
  }

  const ContinuousFlowArrows2D: React.FC<{
    id: string
    from: { x: number; y: number }
    to: { x: number; y: number }
    color: string
    duration?: number
  }> = ({
    id,
    from,
    to,
    color,
    duration = 2.3,
  }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 10) return null

    const pathId = `flowpath-${id}`
    const tandemSpacing = 20 // Distance between the 2 coupled arrows in the entity (with clear visible gap)

    return (
      <g key={id}>
        <path
          id={pathId}
          d={`M ${from.x.toFixed(1)} ${from.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`}
          fill="none"
          stroke="none"
        />
        {/* Single entity containing 2 arrows moving one behind the other simultaneously */}
        <g>
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            rotate="auto"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>

          {/* Lead Arrow (Arrow 1 in front) */}
          <polygon
            points="-8,-3.8 9,0 -8,3.8 -4.5,0"
            fill={color}
            stroke={color}
            strokeWidth="0.5"
            strokeLinejoin="miter"
          />

          {/* Follower Arrow (Arrow 2 directly behind Arrow 1, treated as one entity) */}
          <g transform={`translate(-${tandemSpacing}, 0)`}>
            <polygon
              points="-8,-3.8 9,0 -8,3.8 -4.5,0"
              fill={color}
              stroke={color}
              strokeWidth="0.5"
              strokeLinejoin="miter"
            />
          </g>
        </g>
      </g>
    )
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ cursor: isDraggingNode ? 'grabbing' : isPanning ? 'grabbing' : 'grab' }}
      className={`relative w-full flex items-center justify-center overflow-hidden transition-all select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none bg-white dark:bg-[#0B1220] p-4'
          : `${heightClassName || 'h-[520px] xl:h-[560px]'} rounded-xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 shadow-xs p-2 sm:p-4`
      }`}
    >
      {/* Subtle Grid Background Pattern */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] bg-[radial-gradient(#0284C7_1px,transparent_1px)] dark:bg-[radial-gradient(#38BDF8_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Live Telemetry Stream Chip (Top-Left HUD) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs text-xs select-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-800 dark:text-slate-100">LIVE</span>
        <span className="text-slate-400">•</span>
        <span className="font-mono text-slate-600 dark:text-slate-300">{currentTime}</span>
        <span className="text-slate-400">•</span>
        <span
          className={`font-mono font-bold ${
            netPower >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
          }`}
        >
          NET: {netPower >= 0 ? `+${netPower}` : netPower} kW
        </span>
        <span className="text-slate-400">•</span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {network.buses.length} Buses • {network.feeders.length} Feeders
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
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 1000 680"
        className="w-full h-full object-contain select-none"
      >
        <rect id="canvas-backdrop" width="1000" height="680" fill="transparent" />
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
            .flow-line-solar {
              stroke-dasharray: 6 6;
              animation: flow-reverse 1.0s linear infinite;
            }
            .flow-line-fast {
              stroke-dasharray: 5 4;
              animation: flow-forward 0.6s linear infinite;
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
            id="arrow-solar"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#10B981" />
          </marker>
        </defs>

        {/* Dynamic Zoom & Pan Transformed Group */}
        <g
          ref={sceneGroupRef}
          transform={`translate(${500 + pan.x}, ${340 + pan.y}) scale(${zoom}) rotate(${rotation}) translate(-500, -340)`}
          style={{
            transition: isPanning || isDraggingNode ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {/* ===================================================
              1. FEEDER LINES (Inter-Bus & Substation Connections)
              =================================================== */}
          {network.feeders.map((f) => {
            const from = getSvgCoords(f.fromBus)
            const to = getSvgCoords(f.toBus)
            if (!from || !to) return null

            const isSel = isSelected('feeder', f.id)
            const isCritical = f.status === 'critical' || f.loadingPercent > 100
            const isTie = !f.isSwitchClosed && f.isReconfigurableAlternate
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2
            const strokeColor = getFeederStroke(f.status, f.loadingPercent, isSel)

            return (
              <g
                key={`feeder-${f.id}`}
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedComponent({ type: 'feeder', id: f.id, data: f })
                }}
              >
                {/* Clickable hit-area */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="transparent"
                  strokeWidth="14"
                />

                {/* Base Feeder Path */}
                {isTie ? (
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={textMuted}
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    opacity="0.7"
                  />
                ) : (
                  <>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={strokeColor}
                      strokeWidth={isSel ? '4.5' : isCritical ? '3.5' : '2.5'}
                      markerEnd={isCritical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
                    />

                    {/* Continuous Moving Power Flow Arrows */}
                    {f.isSwitchClosed && (
                      f.activePowerKw < 0 ? (
                        <ContinuousFlowArrows2D
                          id={`feeder-flow-${f.id}`}
                          from={to}
                          to={from}
                          color="#10B981"
                          duration={isCritical ? 1.5 : 2.3}
                        />
                      ) : (
                        <ContinuousFlowArrows2D
                          id={`feeder-flow-${f.id}`}
                          from={from}
                          to={to}
                          color={isCritical ? dangerColor : primaryColor}
                          duration={isCritical ? 1.5 : 2.3}
                        />
                      )
                    )}
                  </>
                )}

                {/* Midpoint Loading Badge */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-32"
                    y="-9"
                    width="64"
                    height="18"
                    rx="4"
                    fill={cardBg}
                    stroke={isSel ? primaryColor : isCritical ? dangerColor : cardBorder}
                    strokeWidth={isSel ? '2' : '1'}
                    className="shadow-xs"
                  />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fill={isCritical ? dangerColor : textMain}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {isTie ? 'TIE (OFF)' : `${f.id}: ${Math.round(f.loadingPercent || 0)}%`}
                  </text>
                </g>
              </g>
            )
          })}

          {/* ===================================================
              2. ASSET LINES (Solar, Battery, Load -> Bus Connections)
              =================================================== */}
          {/* Solar & Solarrooftop Lines */}
          {network.solarUnits.map((s) => {
            if (!s.busId) return null
            const busCoord = getSvgCoords(s.busId)
            const solarCoord = getSvgCoords(s.id)
            if (!busCoord || !solarCoord) return null

            const isRooftop = Boolean(
              s.isSolarRooftop ||
              s.name.toLowerCase().includes('rooftop') ||
              s.name.toLowerCase().includes('solarrooftop') ||
              s.name.includes('[Rooftop]') ||
              s.name.toLowerCase().includes('solar roof')
            )

            if (isRooftop) {
              const dx = solarCoord.x - busCoord.x
              const dy = solarCoord.y - busCoord.y
              const len = Math.sqrt(dx * dx + dy * dy) || 1
              const nx = -dy / len
              const ny = dx / len
              const offset = 6

              // Left side of feeder (looking from Bus to House): Load arrows (Blue) flowing towards House
              const loadFrom = { x: busCoord.x + offset * nx, y: busCoord.y + offset * ny }
              const loadTo = { x: solarCoord.x + offset * nx, y: solarCoord.y + offset * ny }

              // Right side of feeder (looking from Bus to House): Generated electricity arrows (Green) flowing towards Bus
              const genFrom = { x: solarCoord.x - offset * nx, y: solarCoord.y - offset * ny }
              const genTo = { x: busCoord.x - offset * nx, y: busCoord.y - offset * ny }

              return (
                <g key={`solar-line-${s.id}`}>
                  {/* Central overhead feeder wire */}
                  <line
                    x1={busCoord.x}
                    y1={busCoord.y}
                    x2={solarCoord.x}
                    y2={solarCoord.y}
                    stroke="#64748B"
                    strokeWidth="2"
                    opacity="0.65"
                  />
                  {/* Separate Load arrows on LEFT of feeder (Blue) */}
                  <ContinuousFlowArrows2D
                    id={`solarrooftop-load-${s.id}`}
                    from={loadFrom}
                    to={loadTo}
                    color="#0284C7"
                  />
                  {/* Separate Generated solar arrows on RIGHT of feeder (Green) */}
                  <ContinuousFlowArrows2D
                    id={`solarrooftop-gen-${s.id}`}
                    from={genFrom}
                    to={genTo}
                    color="#10B981"
                  />
                </g>
              )
            }

            return (
              <g key={`solar-line-${s.id}`}>
                <line
                  x1={solarCoord.x}
                  y1={solarCoord.y}
                  x2={busCoord.x}
                  y2={busCoord.y}
                  stroke="#10B981"
                  strokeWidth="2"
                  opacity="0.75"
                />
                {s.generationKw > 0 && (
                  <ContinuousFlowArrows2D
                    id={`solar-flow-${s.id}`}
                    from={solarCoord}
                    to={busCoord}
                    color="#10B981"
                  />
                )}
              </g>
            )
          })}

          {/* Battery Lines */}
          {network.batteries.map((b) => {
            if (!b.busId) return null
            const busCoord = getSvgCoords(b.busId)
            const batCoord = getSvgCoords(b.id)
            if (!busCoord || !batCoord) return null

            return (
              <g key={`bat-line-${b.id}`}>
                <line
                  x1={batCoord.x}
                  y1={batCoord.y}
                  x2={busCoord.x}
                  y2={busCoord.y}
                  stroke={b.powerKw < 0 ? '#0284C7' : '#10B981'}
                  strokeWidth="2"
                  opacity="0.75"
                />
                {b.powerKw !== 0 && (
                  b.powerKw < 0 ? (
                    <ContinuousFlowArrows2D
                      id={`bat-flow-${b.id}`}
                      from={busCoord}
                      to={batCoord}
                      color="#0284C7"
                    />
                  ) : (
                    <ContinuousFlowArrows2D
                      id={`bat-flow-${b.id}`}
                      from={batCoord}
                      to={busCoord}
                      color="#10B981"
                    />
                  )
                )}
              </g>
            )
          })}

          {/* Load Lines */}
          {network.loads.map((l) => {
            if (!l.busId) return null
            const busCoord = getSvgCoords(l.busId)
            const loadCoord = getSvgCoords(l.id)
            if (!busCoord || !loadCoord) return null

            return (
              <g key={`load-line-${l.id}`}>
                <line
                  x1={busCoord.x}
                  y1={busCoord.y}
                  x2={loadCoord.x}
                  y2={loadCoord.y}
                  stroke="#0284C7"
                  strokeWidth="2"
                  opacity="0.75"
                />
                {l.powerKw > 0 && (
                  <ContinuousFlowArrows2D
                    id={`load-flow-${l.id}`}
                    from={busCoord}
                    to={loadCoord}
                    color="#0284C7"
                  />
                )}
              </g>
            )
          })}

          {/* ===================================================
              3. SUBSTATION TRANSFORMER NODE
              =================================================== */}
          {network.substation && (() => {
            const subCoord = getSvgCoords(network.substation.id)
            if (!subCoord) return null
            const isSel = isSelected('transformer', network.substation.id)
            const isDragging = isDraggingNode && draggingId === network.substation.id

            return (
              <g
                key="substation-node"
                data-component="true"
                transform={`translate(${subCoord.x}, ${subCoord.y})`}
                className={
                  readOnly
                    ? 'cursor-pointer'
                    : isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab group'
                }
                onPointerDown={(e) =>
                  handleStartNodeDrag(e, network.substation.id, 'transformer', network.substation)
                }
                onClick={(e) =>
                  handleClickNode(e, 'transformer', network.substation.id, network.substation)
                }
              >
                {/* Dragging Active Halo & Elevation Ring */}
                {isDragging && (
                  <>
                    <rect
                      x="-62"
                      y="-33"
                      width="124"
                      height="66"
                      rx="12"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.95"
                    />
                    <g transform="translate(0, -44)">
                      <rect x="-38" y="-8" width="76" height="16" rx="4" fill="#0284C7" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        X:{(nodePositions[network.substation.id]?.x ?? 0).toFixed(1)} Z:{(nodePositions[network.substation.id]?.z ?? -10).toFixed(1)}
                      </text>
                    </g>
                  </>
                )}

                <rect
                  x="-55"
                  y="-26"
                  width="110"
                  height="52"
                  rx="8"
                  fill={cardBg}
                  stroke={isDragging ? '#38BDF8' : isSel ? primaryColor : lineBaseColor}
                  strokeWidth={isDragging || isSel ? '2.5' : '1.8'}
                  className="shadow-sm"
                />
                <rect
                  x="-55"
                  y="-26"
                  width="110"
                  height="16"
                  rx="6"
                  fill={isDragging ? '#0284C7' : primaryColor}
                  opacity="0.9"
                />
                <text
                  x="0"
                  y="-14"
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize="9"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                  letterSpacing="0.5"
                >
                  MAIN SUBSTATION
                </text>
                <text
                  x="0"
                  y="6"
                  textAnchor="middle"
                  fill={textMain}
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {network.substation.name}
                </text>
                <text
                  x="0"
                  y="18"
                  textAnchor="middle"
                  fill={textMuted}
                  fontSize="8"
                  fontFamily="monospace"
                >
                  33/11kV • {network.substation.ratingKva || 2500}kVA ({Math.round(network.substation.loadingPercent || 68)}%)
                </text>
              </g>
            )
          })()}

          {/* ===================================================
              4. BUS NODES (Live Voltage Indicators & Health Rings)
              =================================================== */}
          {network.buses.map((b) => {
            const coord = getSvgCoords(b.id)
            if (!coord) return null
            const isSel = isSelected('bus', b.id)
            const isDragging = isDraggingNode && draggingId === b.id
            const isCritical = b.status === 'critical' || b.voltage > 1.05 || b.voltage < 0.95
            const isUnder = b.voltage < 0.95
            const nodeColor = isDragging ? '#38BDF8' : getNodeColor(b.status, b.voltage, isSel)

            return (
              <g
                key={`bus-${b.id}`}
                data-component="true"
                transform={`translate(${coord.x}, ${coord.y})`}
                className={
                  readOnly
                    ? 'cursor-pointer'
                    : isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab group'
                }
                onPointerDown={(e) => handleStartNodeDrag(e, b.id, 'bus', b)}
                onClick={(e) => handleClickNode(e, 'bus', b.id, b)}
              >
                {/* Dragging Active Halo Ring & Coordinate Badge */}
                {isDragging && (
                  <>
                    <circle
                      r="22"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      strokeDasharray="5 3"
                      opacity="0.95"
                    />
                    <g transform="translate(0, -44)">
                      <rect x="-32" y="-8" width="64" height="16" rx="4" fill="#0284C7" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        X:{(nodePositions[b.id]?.x ?? 0).toFixed(1)} Z:{(nodePositions[b.id]?.z ?? 0).toFixed(1)}
                      </text>
                    </g>
                  </>
                )}

                {/* Critical Pulse Ring */}
                {isCritical && !isDragging && (
                  <circle
                    r="20"
                    fill="none"
                    stroke={dangerColor}
                    strokeWidth="1.5"
                    className="animate-ping"
                    opacity="0.4"
                  />
                )}

                {/* Base Bus Outer Circle */}
                <circle
                  r="13"
                  fill={cardBg}
                  stroke={nodeColor}
                  strokeWidth={isDragging || isSel ? '3.5' : '2.5'}
                  className="shadow-sm"
                />

                {/* Bus Center Dot */}
                <circle r="4.5" fill={nodeColor} />

                {/* Bus ID Text */}
                <text
                  x="0"
                  y="-17"
                  textAnchor="middle"
                  fill={textMain}
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {b.id}
                </text>

                {/* Voltage Metric Pill */}
                <g transform="translate(0, 22)">
                  <rect
                    x="-26"
                    y="-8"
                    width="52"
                    height="16"
                    rx="3"
                    fill={cardBg}
                    stroke={nodeColor}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    fill={nodeColor}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {b.voltage?.toFixed(3) || '1.000'} pu
                  </text>
                </g>

                {/* Violation Warning Tag */}
                {isCritical && !isDragging && (
                  <g transform="translate(0, -32)">
                    <rect
                      x="-38"
                      y="-7"
                      width="76"
                      height="15"
                      rx="3"
                      fill={dangerColor}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {isUnder ? 'UNDER-VOLTAGE' : 'OVER-VOLTAGE'}
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* ===================================================
              5. SOLAR PV & SOLARROOFTOP NODES
              =================================================== */}
          {network.solarUnits.map((s) => {
            const coord = getSvgCoords(s.id)
            if (!coord) return null
            const isSel = isSelected('solar', s.id)
            const isRooftop = Boolean(
              s.isSolarRooftop ||
              s.name.toLowerCase().includes('rooftop') ||
              s.name.toLowerCase().includes('solarrooftop') ||
              s.name.includes('[Rooftop]') ||
              s.name.toLowerCase().includes('solar roof')
            )

            if (isRooftop) {
              const isDragging = isDraggingNode && draggingId === s.id
              return (
                <g
                  key={`solar-node-${s.id}`}
                  data-component="true"
                  transform={`translate(${coord.x}, ${coord.y})`}
                  className={
                    readOnly
                      ? 'cursor-pointer'
                      : isDragging
                      ? 'cursor-grabbing'
                      : 'cursor-grab group'
                  }
                  onPointerDown={(e) => handleStartNodeDrag(e, s.id, 'solar', s)}
                  onClick={(e) => handleClickNode(e, 'solar', s.id, s)}
                >
                  {/* Dragging Active Halo Ring & Coordinate Badge */}
                  {isDragging && (
                    <>
                      <rect
                        x="-54"
                        y="-28"
                        width="108"
                        height="56"
                        rx="10"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        opacity="0.95"
                      />
                      <g transform="translate(0, -38)">
                        <rect x="-30" y="-8" width="60" height="16" rx="4" fill="#047857" />
                        <text
                          x="0"
                          y="3.5"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          X:{(nodePositions[s.id]?.x ?? 0).toFixed(1)} Z:{(nodePositions[s.id]?.z ?? 0).toFixed(1)}
                        </text>
                      </g>
                    </>
                  )}

                  {/* Outer Card with emerald highlight */}
                  <rect
                    x="-48"
                    y="-22"
                    width="96"
                    height="44"
                    rx="8"
                    fill={cardBg}
                    stroke={isDragging ? '#10B981' : isSel ? primaryColor : '#10B981'}
                    strokeWidth={isDragging || isSel ? '2.5' : '1.8'}
                    className="shadow-sm"
                  />
                  {/* Modern Villa Solar Rooftop Icon matching reference image */}
                  <SolarRooftopVillaSvg x="-45" y="-18" size={32} />

                  {/* Title */}
                  <text
                    x="-10"
                    y="-8"
                    fill={textMain}
                    fontSize="8.5"
                    fontFamily="sans-serif"
                    fontWeight="bold"
                  >
                    {s.name.replace(/\[.*?\]\s*/, '').substring(0, 11)}
                  </text>
                  {/* Dual Metrics */}
                  <text
                    x="-10"
                    y="3"
                    fill="#10B981"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    ☀️ +{s.generationKw} kW
                  </text>
                  <text
                    x="-10"
                    y="13"
                    fill="#0284C7"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    🏠 -{s.loadKw ?? 60} kW
                  </text>
                </g>
              )
            }

            const isDragging = isDraggingNode && draggingId === s.id
            return (
              <g
                key={`solar-node-${s.id}`}
                data-component="true"
                transform={`translate(${coord.x}, ${coord.y})`}
                className={
                  readOnly
                    ? 'cursor-pointer'
                    : isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab group'
                }
                onPointerDown={(e) => handleStartNodeDrag(e, s.id, 'solar', s)}
                onClick={(e) => handleClickNode(e, 'solar', s.id, s)}
              >
                {/* Dragging Active Halo Ring & Coordinate Badge */}
                {isDragging && (
                  <>
                    <rect
                      x="-46"
                      y="-24"
                      width="92"
                      height="48"
                      rx="8"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.95"
                    />
                    <g transform="translate(0, -34)">
                      <rect x="-30" y="-8" width="60" height="16" rx="4" fill="#D97706" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        X:{(nodePositions[s.id]?.x ?? 0).toFixed(1)} Z:{(nodePositions[s.id]?.z ?? 0).toFixed(1)}
                      </text>
                    </g>
                  </>
                )}

                <rect
                  x="-40"
                  y="-18"
                  width="80"
                  height="36"
                  rx="6"
                  fill={cardBg}
                  stroke={isDragging ? '#F59E0B' : isSel ? primaryColor : '#F59E0B'}
                  strokeWidth={isDragging || isSel ? '2.5' : '1.5'}
                  className="shadow-xs"
                />
                <circle cx="-26" cy="0" r="8" fill="#FEF3C7" />
                <path
                  d="M -26 -5 L -26 5 M -31 0 L -21 0 M -29.5 -3.5 L -22.5 3.5 M -29.5 3.5 L -22.5 -3.5"
                  stroke="#D97706"
                  strokeWidth="1.2"
                />
                <text
                  x="-12"
                  y="-4"
                  fill={textMain}
                  fontSize="8.5"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {s.name.replace(/\[.*?\]\s*/, '').substring(0, 10)}
                </text>
                <text
                  x="-12"
                  y="8"
                  fill="#D97706"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {s.generationKw} kW
                </text>
              </g>
            )
          })}

          {/* ===================================================
              6. BATTERY STORAGE NODES (BESS)
              =================================================== */}
          {network.batteries.map((b) => {
            const coord = getSvgCoords(b.id)
            if (!coord) return null
            const isSel = isSelected('battery', b.id)
            const isDragging = isDraggingNode && draggingId === b.id

            return (
              <g
                key={`bat-node-${b.id}`}
                data-component="true"
                transform={`translate(${coord.x}, ${coord.y})`}
                className={
                  readOnly
                    ? 'cursor-pointer'
                    : isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab group'
                }
                onPointerDown={(e) => handleStartNodeDrag(e, b.id, 'battery', b)}
                onClick={(e) => handleClickNode(e, 'battery', b.id, b)}
              >
                {/* Dragging Active Halo Ring & Coordinate Badge */}
                {isDragging && (
                  <>
                    <rect
                      x="-48"
                      y="-24"
                      width="96"
                      height="48"
                      rx="8"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.95"
                    />
                    <g transform="translate(0, -34)">
                      <rect x="-30" y="-8" width="60" height="16" rx="4" fill="#047857" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        X:{(nodePositions[b.id]?.x ?? 0).toFixed(1)} Z:{(nodePositions[b.id]?.z ?? 0).toFixed(1)}
                      </text>
                    </g>
                  </>
                )}

                <rect
                  x="-42"
                  y="-18"
                  width="84"
                  height="36"
                  rx="6"
                  fill={cardBg}
                  stroke={isDragging ? '#10B981' : isSel ? primaryColor : '#10B981'}
                  strokeWidth={isDragging || isSel ? '2.5' : '1.5'}
                  className="shadow-xs"
                />
                <circle cx="-28" cy="0" r="8" fill="#D1FAE5" />
                <rect x="-31" y="-4" width="6" height="8" rx="1" fill="#059669" />
                <text
                  x="-14"
                  y="-4"
                  fill={textMain}
                  fontSize="8.5"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {b.name.replace(/\[.*?\]\s*/, '').substring(0, 10)}
                </text>
                <text
                  x="-14"
                  y="8"
                  fill="#059669"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {b.socPercent}% • {b.powerKw}kW
                </text>
              </g>
            )
          })}

          {/* ===================================================
              7. LOAD NODES (Consumer Demand)
              =================================================== */}
          {network.loads.map((l) => {
            const coord = getSvgCoords(l.id)
            if (!coord) return null
            const isSel = isSelected('load', l.id)
            const isDragging = isDraggingNode && draggingId === l.id
            const isInd = l.name.toLowerCase().includes('factory') || l.name.toLowerCase().includes('industrial')
            const isCom = l.name.toLowerCase().includes('commercial') || l.name.toLowerCase().includes('office') || l.name.toLowerCase().includes('mall')

            return (
              <g
                key={`load-node-${l.id}`}
                data-component="true"
                transform={`translate(${coord.x}, ${coord.y})`}
                className={
                  readOnly
                    ? 'cursor-pointer'
                    : isDragging
                    ? 'cursor-grabbing'
                    : 'cursor-grab group'
                }
                onPointerDown={(e) => handleStartNodeDrag(e, l.id, 'load', l)}
                onClick={(e) => handleClickNode(e, 'load', l.id, l)}
              >
                {/* Dragging Active Halo Ring & Coordinate Badge */}
                {isDragging && (
                  <>
                    <rect
                      x="-46"
                      y="-24"
                      width="92"
                      height="48"
                      rx="8"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      opacity="0.95"
                    />
                    <g transform="translate(0, -34)">
                      <rect x="-30" y="-8" width="60" height="16" rx="4" fill="#0284C7" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        X:{(nodePositions[l.id]?.x ?? 0).toFixed(1)} Z:{(nodePositions[l.id]?.z ?? 0).toFixed(1)}
                      </text>
                    </g>
                  </>
                )}

                <rect
                  x="-40"
                  y="-18"
                  width="80"
                  height="36"
                  rx="6"
                  fill={cardBg}
                  stroke={isDragging ? '#38BDF8' : isSel ? primaryColor : isInd ? '#64748B' : isCom ? '#0284C7' : '#94A3B8'}
                  strokeWidth={isDragging || isSel ? '2.5' : '1.5'}
                  className="shadow-xs"
                />
                <circle cx="-26" cy="0" r="8" fill={isDark ? '#1E293B' : '#F1F5F9'} />
                {/* Stylized icon symbol */}
                <text x="-26" y="3.5" textAnchor="middle" fontSize="9">
                  {isInd ? '🏭' : isCom ? '🏢' : '🏠'}
                </text>
                <text
                  x="-12"
                  y="-4"
                  fill={textMain}
                  fontSize="8.5"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {l.name.replace(/\[.*?\]\s*/, '').substring(0, 10)}
                </text>
                <text
                  x="-12"
                  y="8"
                  fill={textMain}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {l.powerKw} kW
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] shadow-xs select-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-300 font-medium">Normal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-600 dark:text-slate-300 font-medium">Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-slate-600 dark:text-slate-300 font-medium">Violation</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span className="text-slate-600 dark:text-slate-300 font-medium">Selected</span>
        </div>
      </div>
    </div>
  )
}

export default Network2D
