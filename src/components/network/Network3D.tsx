import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGridStore } from '../../store/gridStore'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { useUIStore } from '../../store/uiStore'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Compass,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  Link2,
  Zap,
  Home,
  Building2,
  Factory,
  Sun,
  SunMedium,
  BatteryCharging,
  Trash2,
  Sparkles,
} from 'lucide-react'
import {
  FactoryAsset,
  ResidentialAsset,
  CommercialAsset,
  SolarUtilityAsset,
  SolarRooftopAsset,
  SubstationTransformerAsset,
  BatteryStorageAsset,
} from './assets/GridAssets3D'

// --- Reusable 3D Nodes ---

const Bus3DNode: React.FC<{
  id: string
  position: [number, number, number]
  name: string
  voltage: number
  isCritical?: boolean
  onClick: () => void
  isSelected: boolean
  isConnectionSource?: boolean
  isDragging?: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
}> = ({ position, name, isCritical, onClick, isSelected, isConnectionSource, isDragging, onPointerDown }) => {
  const meshRef = useRef<THREE.Group>(null)
  const internalRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if ((isCritical || isConnectionSource) && internalRef.current) {
      const scale = 1 + 0.08 * Math.sin(state.clock.getElapsedTime() * 4)
      internalRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => {
        if (!isDragging) document.body.style.cursor = 'default'
      }}
    >
      {/* Ground marker halo when dragging, selected, or connection source */}
      {(isDragging || isSelected || isConnectionSource) && (
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.85, 1.25, 32]} />
          <meshBasicMaterial
            color={isConnectionSource ? '#eab308' : isDragging ? '#38bdf8' : isSelected ? '#0284c7' : '#10b981'}
            transparent
            opacity={isDragging ? 0.85 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Realistic Utility Distribution Pole & Busbar Assembly */}
      <group position={[0, isDragging ? 0.2 : 0, 0]}>
        {/* Concrete Base Footing Pad */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.12, 24]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Distribution Mast / Utility Pole Upright */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 1.25, 16]} />
          <meshStandardMaterial color="#57534e" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Steel Crossarm */}
        <mesh position={[0, 1.18, 0]}>
          <boxGeometry args={[1.2, 0.08, 0.1]} />
          <meshStandardMaterial color="#44403c" roughness={0.6} metalness={0.5} />
        </mesh>

        {/* 3 Porcelain Ceramic Disc Insulators */}
        {[-0.45, 0, 0.45].map((ix, idx) => (
          <group key={`ins-${idx}`} position={[ix, 1.26, 0]}>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.04, 0.08, 0.12, 10]} />
              <meshStandardMaterial color="#854d0e" roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        ))}

        {/* Central Busbar Collector Disc with Live Voltage Status Glow */}
        <mesh ref={internalRef} position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.22, 32]} />
          <meshStandardMaterial
            color={
              isConnectionSource
                ? '#eab308'
                : isCritical
                ? '#dc2626'
                : isSelected
                ? '#0284c7'
                : isDragging
                ? '#0ea5e9'
                : '#16a34a'
            }
            roughness={0.3}
            metalness={0.5}
            emissive={
              isDragging
                ? '#0284c7'
                : isCritical
                ? '#ef4444'
                : isSelected
                ? '#0284c7'
                : '#16a34a'
            }
            emissiveIntensity={isDragging || isSelected ? 0.4 : isCritical ? 0.5 : 0.2}
          />
        </mesh>
      </group>

      {/* Dynamic HTML Badge (Restrained z-index so it never overlaps Tool Palette) */}
      <Html position={[0, (isDragging ? 1.85 : 1.6), 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
        <div
          className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider whitespace-nowrap shadow-md border transition-all ${
            isConnectionSource
              ? 'bg-yellow-50 text-yellow-800 border-yellow-300 ring-2 ring-yellow-400'
              : isDragging
              ? 'bg-sky-600 text-white border-sky-400 ring-2 ring-sky-300 scale-105 shadow-xl'
              : isCritical
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : isSelected
              ? 'bg-sky-50 text-sky-800 border-sky-300 ring-2 ring-sky-300'
              : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
          }`}
        >
          {name}
          {isDragging && (
            <span className="ml-1.5 text-[9px] font-normal opacity-90 text-sky-100">
              ({position[0].toFixed(1)}, {position[2].toFixed(1)})
            </span>
          )}
        </div>
      </Html>
    </group>
  )
}

const Component3DNode: React.FC<{
  id: string
  position: [number, number, number]
  name: string
  type: 'solar' | 'battery' | 'load' | 'transformer'
  kw?: number
  onClick: () => void
  isConnectionSource?: boolean
  isDragging?: boolean
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
}> = ({ position, name, type, kw, onClick, isConnectionSource, isDragging, onPointerDown }) => {
  const meshRef = useRef<THREE.Group>(null)
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (isConnectionSource && groupRef.current) {
      const scale = 1 + 0.05 * Math.sin(state.clock.getElapsedTime() * 4)
      groupRef.current.scale.set(scale, scale, scale)
    }
  })

  const renderAsset = () => {
    if (type === 'transformer') return <SubstationTransformerAsset />
    if (type === 'battery') return <BatteryStorageAsset />
    if (type === 'solar') {
      if (name.includes('[Rooftop]')) return <SolarRooftopAsset />
      return <SolarUtilityAsset />
    }
    if (type === 'load') {
      if (name.includes('[Factory]')) return <FactoryAsset />
      if (name.includes('[Commercial]')) return <CommercialAsset />
      return <ResidentialAsset />
    }
    return null
  }

  return (
    <group
      ref={meshRef}
      position={position}
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'grab'
      }}
      onPointerOut={() => {
        if (!isDragging) document.body.style.cursor = 'default'
      }}
    >
      {/* Ground marker halo when dragging or connection source */}
      {(isDragging || isConnectionSource) && (
        <mesh position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 2.0, 32]} />
          <meshBasicMaterial
            color={isConnectionSource ? '#eab308' : '#38bdf8'}
            transparent
            opacity={isDragging ? 0.85 : 0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      <group ref={groupRef} position={[0, isDragging ? 0.25 : 0, 0]}>
        {renderAsset()}
        {isConnectionSource && (
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshBasicMaterial color="#eab308" />
          </mesh>
        )}
      </group>

      {/* Dynamic Asset HTML Badge (Restrained z-index so it never overlaps Tool Palette) */}
      <Html position={[0, (type === 'load' && name.includes('[Commercial]') ? 4.1 : type === 'transformer' ? 3.0 : 2.5) + (isDragging ? 0.35 : 0), 0]} center distanceFactor={15} zIndexRange={[10, 0]}>
        <div
          className={`px-2.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-md backdrop-blur-md transition-all ${
            isConnectionSource
              ? 'bg-[#0f172a]/95 text-yellow-300 border border-yellow-400 ring-2 ring-yellow-400'
              : isDragging
              ? 'bg-sky-600 text-white border border-sky-300 ring-2 ring-sky-300 scale-105 shadow-xl'
              : 'bg-[#0f172a]/90 text-[#e2e8f0] border border-[#06b6d4]'
          }`}
        >
          {name.replace(/\[.*?\]\s*/, '')}
          {kw !== undefined && <div className="text-[8px] text-[#94a3b8]">{kw} kW</div>}
          {isDragging && <div className="text-[8px] text-sky-200">({position[0].toFixed(1)}, {position[2].toFixed(1)})</div>}
        </div>
      </Html>
    </group>
  )
}

// Reusable static vector and matrix scratch objects to eliminate GC pauses and 60FPS allocations
const _startVec = new THREE.Vector3()
const _endVec = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _upZ = new THREE.Vector3(0, 0, 1)
const _mid = new THREE.Vector3()
const _orientation = new THREE.Matrix4()

const DynamicFeederLine: React.FC<{
  startPos: [number, number, number]
  endPos: [number, number, number]
  color?: string
  isCritical?: boolean
  flowDirection?: 'forward' | 'reverse' | 'none'
  flowMagnitude?: number
  onClick?: () => void
}> = ({ startPos, endPos, color = '#0284c7', isCritical = false, flowDirection = 'forward', flowMagnitude = 500, onClick }) => {
  const groupRef = useRef<THREE.Group>(null)
  const wireOffsets = [-0.15, 0, 0.15]

  const cylinderRefs = useRef<(THREE.Mesh | null)[]>([])
  const hitMeshRefs = useRef<(THREE.Mesh | null)[]>([])
  const particle1Ref = useRef<THREE.Mesh>(null)
  const particle2Ref = useRef<THREE.Mesh>(null)
  const distRef = useRef<number>(1)
  const prevCoordsRef = useRef({ x1: NaN, y1: NaN, z1: NaN, x2: NaN, y2: NaN, z2: NaN })

  const updateGeometry = () => {
    if (!groupRef.current) return
    const p = prevCoordsRef.current
    if (
      p.x1 === startPos[0] &&
      p.y1 === startPos[1] &&
      p.z1 === startPos[2] &&
      p.x2 === endPos[0] &&
      p.y2 === endPos[1] &&
      p.z2 === endPos[2]
    ) {
      return
    }
    p.x1 = startPos[0]
    p.y1 = startPos[1]
    p.z1 = startPos[2]
    p.x2 = endPos[0]
    p.y2 = endPos[1]
    p.z2 = endPos[2]

    _startVec.set(startPos[0], startPos[1] + 0.35, startPos[2])
    _endVec.set(endPos[0], endPos[1] + 0.35, endPos[2])
    const distance = _startVec.distanceTo(_endVec)
    distRef.current = distance

    if (distance < 0.08) {
      groupRef.current.visible = false
      return
    }
    groupRef.current.visible = true

    _mid.copy(_startVec).lerp(_endVec, 0.5)
    groupRef.current.position.copy(_mid)

    _dir.copy(_endVec).sub(_startVec).normalize()
    const upVec = Math.abs(_dir.y) > 0.98 ? _upZ : _up
    _orientation.lookAt(_startVec, _endVec, upVec)
    groupRef.current.rotation.setFromRotationMatrix(_orientation)

    wireOffsets.forEach((_, i) => {
      if (cylinderRefs.current[i]) cylinderRefs.current[i]!.scale.set(1, 1, distance)
      if (hitMeshRefs.current[i]) hitMeshRefs.current[i]!.scale.set(1, 1, distance)
    })
  }

  useEffect(() => {
    updateGeometry()
  })

  useFrame((state) => {
    updateGeometry()

    if (flowDirection !== 'none') {
      const distance = distRef.current
      const speed = (isCritical ? 1.5 : 0.7) + Math.min(Math.abs(flowMagnitude) / 1000, 2.0)
      const t1 = (state.clock.elapsedTime * speed) % 1
      const t2 = (t1 + 0.5) % 1
      const factor1 = flowDirection === 'reverse' ? 1 - t1 : t1
      const factor2 = flowDirection === 'reverse' ? 1 - t2 : t2

      const z1 = (distance / 2) - (factor1 * distance)
      const z2 = (distance / 2) - (factor2 * distance)
      if (particle1Ref.current) particle1Ref.current.position.z = z1
      if (particle2Ref.current) particle2Ref.current.position.z = z2
    }
  })

  return (
    <group ref={groupRef}>
      {wireOffsets.map((offsetX, i) => (
        <group key={`wire-${i}`} position={[offsetX, 0, 0]}>
          {/* Overhead Conductor Cable (Sleek High-Conductivity Steel Aluminum Wire) */}
          <mesh ref={(el) => { if (el) cylinderRefs.current[i] = el }} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 1, 8]} />
            <meshStandardMaterial
              color={isCritical ? '#dc2626' : '#64748b'}
              roughness={0.25}
              metalness={0.85}
              emissive={isCritical ? '#ef4444' : '#000000'}
              emissiveIntensity={isCritical ? 0.35 : 0}
            />
          </mesh>

          {/* Invisible Hit Testing Mesh for line clicks */}
          <mesh 
            ref={(el) => { if (el) hitMeshRefs.current[i] = el }}
            rotation={[Math.PI / 2, 0, 0]} 
            onClick={(e) => {
              if (onClick) {
                e.stopPropagation()
                onClick()
              }
            }}
          >
            <cylinderGeometry args={[0.35, 0.35, 1, 4]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </group>
      ))}

      {/* High-Performance Power Flow Energy Pulses on Central Conductor */}
      {flowDirection !== 'none' && (
        <>
          <mesh ref={particle1Ref} position={[0, 0, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={isCritical ? '#ef4444' : color} />
          </mesh>
          <mesh ref={particle2Ref} position={[0, 0, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial color={isCritical ? '#ef4444' : color} />
          </mesh>
        </>
      )}
    </group>
  )
}

// --- Scene Drag Manager: Smooth Real-time Ground Plane Raycasting ---

const SceneDragManager: React.FC<{
  onDragMove: (id: string, x: number, y: number, z: number) => void
  onDragEnd: (id: string, hasMoved: boolean) => void
  dragStateRef: React.MutableRefObject<{
    id: string
    y: number
    plane: THREE.Plane
    offset: THREE.Vector3
    startPos: [number, number, number]
    currentPos: [number, number, number]
    hasMoved: boolean
  } | null>
}> = ({ onDragMove, onDragEnd, dragStateRef }) => {
  const { camera, raycaster, gl } = useThree()

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const state = dragStateRef.current
      if (!state) return

      const rect = gl.domElement.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(state.plane, hit)) {
        let newX = hit.x + state.offset.x
        let newZ = hit.z + state.offset.z

        // Grid arena boundary limits [-45, 45]
        newX = Math.max(-45, Math.min(45, newX))
        newZ = Math.max(-45, Math.min(45, newZ))

        const dist = Math.hypot(newX - state.startPos[0], newZ - state.startPos[2])
        if (dist > 0.08) {
          state.hasMoved = true
        }

        state.currentPos = [newX, state.y, newZ]
        onDragMove(state.id, newX, state.y, newZ)
      }
    }

    const handlePointerUp = () => {
      const state = dragStateRef.current
      if (!state) return

      const id = state.id
      const hasMoved = state.hasMoved
      dragStateRef.current = null
      onDragEnd(id, hasMoved)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [camera, raycaster, gl, onDragMove, onDragEnd, dragStateRef])

  return null
}

// --- Main 3D Digital Twin Component ---

export interface Network3DProps {
  readOnly?: boolean
  heightClassName?: string
}

export const Network3D: React.FC<Network3DProps> = ({
  readOnly = false,
  heightClassName,
}) => {
  const { network, updateNetwork, pastNetworks, futureNetworks, undo, redo } = useGridStore()
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  // Undo & Redo Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    if (readOnly) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault()
          redo()
        } else {
          e.preventDefault()
          undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, undo, redo])

  const orbitRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [positions, setPositions] = useState<Record<string, [number, number, number]>>({})

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
  const positionsRef = useRef<Record<string, [number, number, number]>>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isDraggingNode, setIsDraggingNode] = useState(false)
  const lastDragEndTimeRef = useRef<number>(0)

  const dragStateRef = useRef<{
    id: string
    y: number
    plane: THREE.Plane
    offset: THREE.Vector3
    startPos: [number, number, number]
    currentPos: [number, number, number]
    hasMoved: boolean
  } | null>(null)

  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [connectionSource, setConnectionSource] = useState<{type: string, id: string} | null>(null)

  // Ensure cursor returns to default if user navigates away while hovering or dragging in 3D
  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [])

  // Initialize and synchronize 3D positions with layout spacing
  useEffect(() => {
    if (dragStateRef.current) return // Do not clobber during active drag

    const newPos: Record<string, [number, number, number]> = {}
    if (network.substation) {
      newPos[network.substation.id] = [
        network.substation.position?.x ?? 0,
        network.substation.position?.y ?? 0.6,
        network.substation.position?.z ?? -10
      ]
    }

    const defaultBusZ = [-5, 0, 6, 12]
    network.buses.forEach((b, idx) => {
      newPos[b.id] = [
        b.position?.x ?? 0,
        b.position?.y ?? 0,
        b.position?.z ?? (defaultBusZ[idx] ?? (idx * 6))
      ]
    })

    network.solarUnits.forEach((s, idx) => {
      newPos[s.id] = [
        s.position?.x ?? -7,
        s.position?.y ?? 0,
        s.position?.z ?? (idx === 0 ? 0 : 3)
      ]
    })

    network.batteries.forEach((b) => {
      newPos[b.id] = [
        b.position?.x ?? -7,
        b.position?.y ?? 0,
        b.position?.z ?? 6
      ]
    })

    const defaultLoadZ = [0, 6, 12]
    network.loads.forEach((l, idx) => {
      newPos[l.id] = [
        l.position?.x ?? 7,
        l.position?.y ?? 0,
        l.position?.z ?? (defaultLoadZ[idx] ?? (idx * 6))
      ]
    })

    setPositions(newPos)
    positionsRef.current = newPos
  }, [network])

  // Fast drag move callback: updates positions state in real-time
  const handleDragMove = useCallback((id: string, x: number, y: number, z: number) => {
    positionsRef.current[id] = [x, y, z]
    setPositions(prev => ({
      ...prev,
      [id]: [x, y, z]
    }))
  }, [])

  // Drag release: commits new coordinates and persists to gridStore
  const handleDragEnd = useCallback(async (id: string, hasMoved: boolean) => {
    setDraggingId(null)
    setIsDraggingNode(false)
    if (orbitRef.current) orbitRef.current.enabled = true
    document.body.style.cursor = 'default'

    if (hasMoved) {
      lastDragEndTimeRef.current = Date.now()
      const finalPos = positionsRef.current[id]
      if (!finalPos) return

      const [x, y, z] = finalPos
      const updatedNetwork = JSON.parse(JSON.stringify(network))
      if (updatedNetwork.substation?.id === id) {
        updatedNetwork.substation.position = { x, y, z }
      }
      const compLists = [
        updatedNetwork.buses,
        updatedNetwork.solarUnits,
        updatedNetwork.batteries,
        updatedNetwork.loads,
      ]
      compLists.forEach(list => {
        const item = list.find((i: any) => i.id === id)
        if (item) {
          item.position = { x, y, z }
        }
      })

      try {
        await updateNetwork(updatedNetwork)
      } catch (e) {
        console.error("Failed to persist moved position", e)
      }
    }
  }, [network, updateNetwork])

  // Pointer down on component node: starts drag operation
  const handleStartNodeDrag = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (readOnly) return // Read-only mode prevents moving/dragging components
    if (activeTool) return // Tool mode (connect / delete) takes priority
    if (e.button !== 0) return // Left mouse button only

    e.stopPropagation()
    if (orbitRef.current) orbitRef.current.enabled = false
    setIsDraggingNode(true)
    setDraggingId(id)
    document.body.style.cursor = 'grabbing'

    const currentPos = positionsRef.current[id] || [0, 0, 0]
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -currentPos[1])
    const hit = new THREE.Vector3()
    e.ray.intersectPlane(plane, hit)

    dragStateRef.current = {
      id,
      y: currentPos[1],
      plane,
      offset: new THREE.Vector3(currentPos[0] - hit.x, 0, currentPos[2] - hit.z),
      startPos: [...currentPos],
      currentPos: [...currentPos],
      hasMoved: false,
    }
  }

  // Camera Controls
  const handleRotateCamera = (deg: number) => {
    if (!orbitRef.current) return
    const controls = orbitRef.current
    const rad = (deg * Math.PI) / 180
    const cam = controls.object as THREE.PerspectiveCamera
    const target = controls.target || new THREE.Vector3(0, 0, 0)
    const offset = cam.position.clone().sub(target)
    const newX = offset.x * Math.cos(rad) - offset.z * Math.sin(rad)
    const newZ = offset.x * Math.sin(rad) + offset.z * Math.cos(rad)
    cam.position.set(target.x + newX, cam.position.y, target.z + newZ)
    controls.update()
  }

  const handleTiltCamera = (deltaY: number) => {
    if (!orbitRef.current) return
    const controls = orbitRef.current
    const cam = controls.object as THREE.PerspectiveCamera
    cam.position.y = Math.max(3, Math.min(30, cam.position.y + deltaY))
    controls.update()
  }

  const handleZoomCamera = (delta: number) => {
    if (!orbitRef.current) return
    const controls = orbitRef.current
    const cam = controls.object as THREE.PerspectiveCamera
    const target = controls.target || new THREE.Vector3(0, 0, 0)
    const dir = cam.position.clone().sub(target).normalize()
    const newPos = cam.position.clone().addScaledVector(dir, delta)
    const dist = newPos.distanceTo(target)
    if (dist >= 3 && dist <= 80) {
      cam.position.copy(newPos)
      controls.update()
    }
  }

  const handleResetCamera = () => {
    if (!orbitRef.current) return
    const controls = orbitRef.current
    controls.target.set(0, 0, 0)
    const cam = controls.object as THREE.PerspectiveCamera
    cam.position.set(0, 14, 18)
    controls.update()
  }

  // Deletion tool handler
  const handleDeleteComponent = async (target: { type: string; id: string; data?: any }) => {
    if (target.type === 'transformer') {
      alert("Cannot delete primary substation!")
      return
    }
    const updatedGrid = JSON.parse(JSON.stringify(network))
    
    if (target.type === 'bus') {
      updatedGrid.buses = updatedGrid.buses.filter((b: any) => b.id !== target.id)
      updatedGrid.feeders = updatedGrid.feeders.filter((f: any) => f.fromBus !== target.id && f.toBus !== target.id)
      updatedGrid.solarUnits.forEach((s: any) => { if (s.busId === target.id) s.busId = '' })
      updatedGrid.batteries.forEach((b: any) => { if (b.busId === target.id) b.busId = '' })
      updatedGrid.loads.forEach((l: any) => { if (l.busId === target.id) l.busId = '' })
    } else if (target.type === 'solar') {
      updatedGrid.solarUnits = updatedGrid.solarUnits.filter((s: any) => s.id !== target.id)
    } else if (target.type === 'battery') {
      updatedGrid.batteries = updatedGrid.batteries.filter((b: any) => b.id !== target.id)
    } else if (target.type === 'load') {
      updatedGrid.loads = updatedGrid.loads.filter((l: any) => l.id !== target.id)
    } else if (target.type === 'feeder') {
      updatedGrid.feeders = updatedGrid.feeders.filter((f: any) => f.id !== target.id)
    } else if (target.type === 'connection' && target.data) {
      if (target.data.assetType === 'solar') {
        const item = updatedGrid.solarUnits.find((s: any) => s.id === target.id)
        if (item) item.busId = ''
      } else if (target.data.assetType === 'load') {
        const item = updatedGrid.loads.find((l: any) => l.id === target.id)
        if (item) item.busId = ''
      } else if (target.data.assetType === 'battery') {
        const item = updatedGrid.batteries.find((b: any) => b.id === target.id)
        if (item) item.busId = ''
      }
    }
    
    await updateNetwork(updatedGrid)
  }

  // Spawning new component onto grid floor
  const handleSpawnComponent = async (tool: string, pos: [number, number, number]) => {
    const updatedGrid = JSON.parse(JSON.stringify(network))
    const p = { x: Math.round(pos[0] * 10) / 10, y: 0, z: Math.round(pos[2] * 10) / 10 }
    const id = `${tool.split('-')[0].toUpperCase()}-${Math.floor(Math.random() * 10000)}`

    if (tool === 'bus') {
      updatedGrid.buses.push({
        id,
        name: `Bus ${updatedGrid.buses.length + 1}`,
        voltage: 1.0,
        voltageLimitMin: 0.95,
        voltageLimitMax: 1.05,
        loadKw: 0,
        solarKw: 0,
        lineLoadingPercent: 0,
        temperatureC: 30,
        status: 'normal',
        connectedFeeders: [],
        connectedAssets: {},
        position: p
      })
    } else if (tool.startsWith('solar')) {
      const isUtility = tool.includes('utility')
      updatedGrid.solarUnits.push({
        id, name: isUtility ? `[Utility] Solar Array` : `[Rooftop] Solar Panel`, busId: '', generationKw: isUtility ? 500 : 50, capacityKw: isUtility ? 500 : 50,
        irradianceWm2: 800, curtailedKw: 0, status: 'normal', position: p
      })
    } else if (tool.startsWith('load')) {
      let cap = 50, n = '[Residential] House'
      if (tool.includes('factory')) { cap = 1000; n = '[Factory] Heavy Industry' }
      if (tool.includes('commercial')) { cap = 300; n = '[Commercial] Office Block' }
      updatedGrid.loads.push({
        id, name: n, busId: '', powerKw: cap, powerFactor: 0.9, status: 'normal', position: p
      })
    } else if (tool === 'battery') {
      updatedGrid.batteries.push({
        id, name: `Battery Storage`, busId: '', powerKw: 0, maxDischargeKw: 100, maxChargeKw: 100,
        socPercent: 50, capacityKwh: 500, status: 'normal', position: p
      })
    }
    
    setPositions(prev => ({ ...prev, [id]: [p.x, p.y, p.z] }))
    positionsRef.current[id] = [p.x, p.y, p.z]

    await updateNetwork(updatedGrid)
  }

  // Connection Tool: Connects Bus to Bus, Substation to Bus, or Asset to Bus
  const handleCreateConnection = async (source: {type: string, id: string}, target: {type: string, id: string}) => {
    const updatedGrid = JSON.parse(JSON.stringify(network))
    
    // Feeder Line between Bus/Substation and Bus/Substation
    if ((source.type === 'bus' || source.type === 'transformer') && (target.type === 'bus' || target.type === 'transformer')) {
      const fId = `F-${Math.floor(Math.random() * 10000)}`
      updatedGrid.feeders.push({
        id: fId,
        name: `Feeder ${source.id}-${target.id}`,
        fromBus: source.id,
        toBus: target.id,
        loadingPercent: 0,
        loadingLimitPercent: 100,
        capacityKw: 1000,
        activePowerKw: 0,
        reactivePowerKvar: 0,
        status: 'normal',
        isSwitchClosed: true
      })
    } 
    // Asset to Bus (or Bus to Asset)
    else {
      let busId = source.type === 'bus' ? source.id : target.type === 'bus' ? target.id : null
      let assetInfo = source.type !== 'bus' ? source : target.type !== 'bus' ? target : null
      
      if (busId && assetInfo) {
        if (assetInfo.type === 'solar') {
          const item = updatedGrid.solarUnits.find((s:any) => s.id === assetInfo.id)
          if (item) item.busId = busId
        } else if (assetInfo.type === 'load') {
          const item = updatedGrid.loads.find((l:any) => l.id === assetInfo.id)
          if (item) item.busId = busId
        } else if (assetInfo.type === 'battery') {
          const item = updatedGrid.batteries.find((b:any) => b.id === assetInfo.id)
          if (item) item.busId = busId
        }
      } else {
        alert("Invalid connection. Connect Bus to Bus / Substation (Feeder) or Asset to Bus.")
        return
      }
    }

    await updateNetwork(updatedGrid)
  }

  // Node Click: Inspect component or apply active tool
  const handleNodeClick = (type: string, id: string, data: any) => {
    // Avoid triggering if the user was dragging
    if (Date.now() - lastDragEndTimeRef.current < 250) return

    if (activeTool === 'connect') {
      if (!connectionSource) {
        setConnectionSource({ type, id })
      } else {
        if (connectionSource.id !== id) {
          handleCreateConnection(connectionSource, { type, id })
        }
        setConnectionSource(null)
        setActiveTool(null)
      }
    } else if (activeTool === 'delete') {
      handleDeleteComponent({ type, id, data })
    } else {
      if (['bus', 'feeder', 'solar', 'battery', 'load', 'transformer'].includes(type)) {
        setSelectedComponent({ type: type as any, id, data })
      }
    }
  }

  const tools = [
    { id: 'connect', icon: '🔗', label: 'Connect' },
    { id: 'bus', icon: '⚡', label: 'Bus Node' },
    { id: 'load-residential', icon: '🏠', label: 'Residential' },
    { id: 'load-commercial', icon: '🏢', label: 'Commercial' },
    { id: 'load-factory', icon: '🏭', label: 'Factory' },
    { id: 'solar-utility', icon: '☀️', label: 'Solar Utility' },
    { id: 'solar-rooftop', icon: '🏡', label: 'Solar Roof' },
    { id: 'battery', icon: '🔋', label: 'Battery' },
    { id: 'delete', icon: '🗑️', label: 'Delete' },
  ]

  return (
    <div
      ref={containerRef}
      className={`relative w-full transition-all select-none overflow-hidden ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none bg-[#0B1220]'
          : `${heightClassName || 'h-[580px] xl:h-[620px]'} rounded-xl bg-slate-100 dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 shadow-xs`
      }`}
    >
      
      {/* Visual Spawn & Edit Palette with Previous Icons (z-50 ensures 3D labels never overlap it) */}
      {!readOnly && (
        <div className="absolute top-3 left-3 z-50 flex flex-col gap-1.5 select-none pointer-events-auto">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 shadow-md font-bold text-center">
            {activeTool 
              ? (activeTool === 'connect' 
                  ? (connectionSource ? 'Target' : 'Source') 
                  : (activeTool === 'delete' ? 'Delete' : 'Spawn')) 
              : 'Tools'}
          </div>
          <div className="flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTool(activeTool === t.id ? null : t.id)
                  setConnectionSource(null)
                }}
                className={`group relative w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-sm cursor-pointer ${
                  activeTool === t.id 
                    ? (t.id === 'delete' ? 'bg-rose-500 text-white ring-2 ring-rose-300 scale-110 z-20' : 'bg-sky-500 text-white ring-2 ring-sky-300 scale-110 z-20')
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:scale-105'
                }`}
              >
                <span className="text-[26px] leading-none select-none">{t.icon}</span>
                <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg border border-slate-700">
                  {t.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Canvas
        dpr={[1, 1.5]}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          stencil: false,
          depth: true,
        }}
        camera={{ position: [0, 14, 18], fov: 45 }}
        style={{ width: '100%', height: '100%', cursor: activeTool ? 'crosshair' : isDraggingNode ? 'grabbing' : 'default' }}
      >
        <ambientLight intensity={isDark ? 0.75 : 0.9} />
        <directionalLight position={[12, 24, 16]} intensity={isDark ? 1.1 : 1.35} />
        <hemisphereLight
          args={[isDark ? '#38bdf8' : '#e0f2fe', isDark ? '#0c1322' : '#cbd5e1', 0.4]}
        />
        <pointLight position={[0, 8, 0]} intensity={0.5} color="#38bdf8" />

        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableRotate={!isDraggingNode && !activeTool}
          enableZoom={true}
          enablePan={!isDraggingNode && !activeTool}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={2}
          maxDistance={120}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />

        {/* Global Real-time Drag Event Controller */}
        <SceneDragManager
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          dragStateRef={dragStateRef}
        />

        {/* Ground Floor Plane */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, -0.05, 0]}
          onClick={(e) => {
            if (readOnly) return
            if (Date.now() - lastDragEndTimeRef.current < 250) return
            if (activeTool && activeTool !== 'connect' && activeTool !== 'delete') {
              e.stopPropagation()
              handleSpawnComponent(activeTool, [e.point.x, e.point.y, e.point.z])
              setActiveTool(null)
            }
          }}
        >
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color={isDark ? '#0c1322' : '#f1f5f9'} roughness={0.9} metalness={0.1} />
        </mesh>
        <gridHelper args={[70, 70, isDark ? '#1e293b' : '#cbd5e1', isDark ? '#131e33' : '#e2e8f0']} position={[0, 0, 0]} />

        {/* 1. Substation Transformer Node */}
        {network.substation && positions[network.substation.id] && (
          <Component3DNode
            id={network.substation.id}
            position={positions[network.substation.id]}
            name={network.substation.name}
            type="transformer"
            onClick={() => handleNodeClick('transformer', network.substation.id, network.substation)}
            onPointerDown={(e) => handleStartNodeDrag(network.substation.id, e)}
            isDragging={draggingId === network.substation.id}
            isConnectionSource={connectionSource?.id === network.substation.id}
          />
        )}

        {/* 2. Bus Nodes */}
        {network.buses.map(b => positions[b.id] && (
          <Bus3DNode
            key={b.id}
            id={b.id}
            position={positions[b.id]}
            name={b.name}
            voltage={b.voltage}
            isCritical={readOnly ? b.status === 'critical' : false}
            isSelected={selectedComponent?.id === b.id}
            onClick={() => handleNodeClick('bus', b.id, b)}
            onPointerDown={(e) => handleStartNodeDrag(b.id, e)}
            isDragging={draggingId === b.id}
            isConnectionSource={connectionSource?.id === b.id}
          />
        ))}

        {/* 3. Solar Unit Nodes */}
        {network.solarUnits.map(s => positions[s.id] && (
          <Component3DNode
            key={s.id}
            id={s.id}
            position={positions[s.id]}
            name={s.name}
            type="solar"
            kw={s.capacityKw}
            onClick={() => handleNodeClick('solar', s.id, s)}
            onPointerDown={(e) => handleStartNodeDrag(s.id, e)}
            isDragging={draggingId === s.id}
            isConnectionSource={connectionSource?.id === s.id}
          />
        ))}

        {/* 4. Battery Storage Nodes */}
        {network.batteries.map(bat => positions[bat.id] && (
          <Component3DNode
            key={bat.id}
            id={bat.id}
            position={positions[bat.id]}
            name={bat.name}
            type="battery"
            kw={bat.capacityKwh}
            onClick={() => handleNodeClick('battery', bat.id, bat)}
            onPointerDown={(e) => handleStartNodeDrag(bat.id, e)}
            isDragging={draggingId === bat.id}
            isConnectionSource={connectionSource?.id === bat.id}
          />
        ))}

        {/* 5. Load Nodes */}
        {network.loads.map(l => positions[l.id] && (
          <Component3DNode
            key={l.id}
            id={l.id}
            position={positions[l.id]}
            name={l.name}
            type="load"
            kw={l.powerKw}
            onClick={() => handleNodeClick('load', l.id, l)}
            onPointerDown={(e) => handleStartNodeDrag(l.id, e)}
            isDragging={draggingId === l.id}
            isConnectionSource={connectionSource?.id === l.id}
          />
        ))}

        {/* 6. Dynamic Feeder Lines connecting Bus <-> Bus / Substation */}
        {network.feeders.map(f => {
          if (!f.isSwitchClosed && !f.isReconfigurableAlternate) return null
          const startPos = positions[f.fromBus]
          const endPos = positions[f.toBus]
          if (!startPos || !endPos) return null

          return (
            <DynamicFeederLine
              key={f.id}
              startPos={startPos}
              endPos={endPos}
              color={readOnly && f.status === 'critical' ? '#dc2626' : '#047857'}
              isCritical={readOnly && f.status === 'critical'}
              flowDirection={f.isSwitchClosed ? (f.activePowerKw > 0 ? "forward" : "none") : "none"}
              flowMagnitude={Math.abs(f.activePowerKw || 0)}
              onClick={() => handleNodeClick('feeder', f.id, f)}
            />
          )
        })}

        {/* 7. Dynamic Asset Lines: Solar <-> Bus */}
        {network.solarUnits.map(s => {
          if (!s.busId) return null
          const startPos = positions[s.busId]
          const endPos = positions[s.id]
          if (!startPos || !endPos) return null

          return (
            <DynamicFeederLine
              key={`conn-${s.id}`}
              startPos={startPos}
              endPos={endPos}
              color="#10b981"
              flowDirection={s.generationKw > 0 ? "reverse" : "none"}
              flowMagnitude={s.generationKw}
              onClick={() => handleNodeClick('connection', s.id, { assetType: 'solar' })}
            />
          )
        })}

        {/* 8. Dynamic Asset Lines: Battery <-> Bus */}
        {network.batteries.map(b => {
          if (!b.busId) return null
          const startPos = positions[b.busId]
          const endPos = positions[b.id]
          if (!startPos || !endPos) return null

          return (
            <DynamicFeederLine
              key={`conn-${b.id}`}
              startPos={startPos}
              endPos={endPos}
              color="#10b981"
              flowDirection={b.powerKw < 0 ? "reverse" : b.powerKw > 0 ? "forward" : "none"}
              flowMagnitude={Math.abs(b.powerKw)}
              onClick={() => handleNodeClick('connection', b.id, { assetType: 'battery' })}
            />
          )
        })}

        {/* 9. Dynamic Asset Lines: Load <-> Bus */}
        {network.loads.map(l => {
          if (!l.busId) return null
          const startPos = positions[l.busId]
          const endPos = positions[l.id]
          if (!startPos || !endPos) return null

          return (
            <DynamicFeederLine
              key={`conn-${l.id}`}
              startPos={startPos}
              endPos={endPos}
              color="#0284c7"
              flowDirection="forward"
              flowMagnitude={l.powerKw}
              onClick={() => handleNodeClick('connection', l.id, { assetType: 'load' })}
            />
          )
        })}
      </Canvas>

      {/* 3D Navigation Controls with Undo & Redo (Per Requirement 4) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 dark:bg-[#122C1F]/95 backdrop-blur-md p-1.5 rounded-xl border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 shadow-md select-none">
        {/* Undo & Redo Buttons */}
        {!readOnly && (
          <>
            <button
              onClick={() => undo()}
              disabled={pastNetworks.length === 0}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                pastNetworks.length > 0
                  ? 'hover:bg-[#ECFDF3] dark:hover:bg-[#163826] text-[#047857] dark:text-[#86EFAC] active:scale-95'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
              }`}
              title="Undo Grid Change (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => redo()}
              disabled={futureNetworks.length === 0}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                futureNetworks.length > 0
                  ? 'hover:bg-[#ECFDF3] dark:hover:bg-[#163826] text-[#047857] dark:text-[#86EFAC] active:scale-95'
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
              }`}
              title="Redo Grid Change (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-[#BBF7D0]/70 dark:bg-[#86EFAC]/20 mx-0.5" />
          </>
        )}
        <button
          onClick={() => handleZoomCamera(-3)}
          className="p-1.5 rounded-lg hover:bg-[#ECFDF3] dark:hover:bg-[#163826] text-[#10251A] dark:text-[#ECFDF3] transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoomCamera(3)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          onClick={() => handleRotateCamera(25)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Rotate Left"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleRotateCamera(-25)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Rotate Right"
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleTiltCamera(2)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Tilt Up"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleTiltCamera(-2)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Tilt Down"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <button
          onClick={handleResetCamera}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title="Reset 3D View"
        >
          <Compass className="w-4 h-4" />
        </button>
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
