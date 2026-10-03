import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, DragControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGridStore } from '../../store/gridStore'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'
import { useUIStore } from '../../store/uiStore'

// 3D Bus Node Component
const Bus3DNode: React.FC<{
  nodeRef: React.RefObject<THREE.Group>
  name: string
  voltage: number
  isCritical?: boolean
  onClick: () => void
  isSelected: boolean
}> = ({ nodeRef, name, voltage, isCritical, onClick, isSelected }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current && isCritical) {
      const scale = 1 + 0.08 * Math.sin(state.clock.getElapsedTime() * 3)
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group ref={nodeRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <meshStandardMaterial
          color={isCritical ? '#dc2626' : isSelected ? '#0284c7' : '#16a34a'}
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>

      {/* Clean HUD Label */}
      <Html position={[0, 1.2, 0]} center distanceFactor={15}>
        <div
          onClick={onClick}
          className={`cursor-pointer px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tracking-wider whitespace-nowrap shadow-sm border transition-colors ${
            isCritical
              ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
              : isSelected
              ? 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/90 dark:text-sky-200 dark:border-sky-800'
              : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900/90 dark:text-slate-200 dark:border-slate-700'
          }`}
        >
          {name}: {voltage.toFixed(3)} pu
        </div>
      </Html>
    </group>
  )
}

// 3D Feeder Power Line with Animated Flow
const Feeder3DLine: React.FC<{
  startRef: React.RefObject<THREE.Group>
  endRef: React.RefObject<THREE.Group>
  color?: string
  isCritical?: boolean
  flowDirection?: 'forward' | 'reverse' | 'none'
}> = ({ startRef, endRef, color = '#0284c7', isCritical = false, flowDirection = 'forward' }) => {
  const groupRef = useRef<THREE.Group>(null)
  const cylinderRef = useRef<THREE.Mesh>(null)
  const edgesRef = useRef<THREE.LineSegments>(null)
  
  // Animated Flow Particles
  const particleRef1 = useRef<THREE.Mesh>(null)
  const particleRef2 = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (!startRef.current || !endRef.current) return
    
    // Use world positions in case they are nested
    const startVec = new THREE.Vector3()
    startRef.current.getWorldPosition(startVec)
    
    const endVec = new THREE.Vector3()
    endRef.current.getWorldPosition(endVec)
    
    const distance = startVec.distanceTo(endVec)
    const position = startVec.clone().lerp(endVec, 0.5)

    if (groupRef.current) {
      groupRef.current.position.copy(position)
      const orientation = new THREE.Matrix4()
      orientation.lookAt(startVec, endVec, new THREE.Vector3(0, 1, 0))
      groupRef.current.rotation.setFromRotationMatrix(orientation)
    }

    if (cylinderRef.current) cylinderRef.current.scale.set(1, 1, distance)
    if (edgesRef.current) edgesRef.current.scale.set(1, 1, distance)

    if (flowDirection !== 'none') {
      const speed = isCritical ? 1.5 : 0.8
      let t1 = (state.clock.elapsedTime * speed) % 1
      let t2 = ((state.clock.elapsedTime * speed) + 0.5) % 1
      
      if (flowDirection === 'reverse') {
        t1 = 1 - t1
        t2 = 1 - t2
      }

      if (particleRef1.current) particleRef1.current.position.copy(startVec).lerp(endVec, t1)
      if (particleRef2.current) particleRef2.current.position.copy(startVec).lerp(endVec, t2)
    }
  })

  return (
    <group>
      <group ref={groupRef}>
        <mesh ref={cylinderRef} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 1, 8]} />
          <meshStandardMaterial color={isCritical ? '#dc2626' : '#1e293b'} roughness={0.4} metalness={0.8} />
        </mesh>
        <lineSegments ref={edgesRef} rotation={[Math.PI / 2, 0, 0]}>
          <edgesGeometry args={[new THREE.CylinderGeometry(0.06, 0.06, 1, 8)]} />
          <lineBasicMaterial color={isCritical ? '#f87171' : color} opacity={0.3} transparent />
        </lineSegments>
      </group>
      
      {/* Power Flow Energy Packets */}
      {flowDirection !== 'none' && (
        <>
          <mesh ref={particleRef1}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={isCritical ? '#ef4444' : color} />
          </mesh>
          <mesh ref={particleRef2}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={isCritical ? '#ef4444' : color} />
          </mesh>
        </>
      )}
    </group>
  )
}

// Stylized Solar Panel Array (Delta Solar Park style)
const SolarArray3D: React.FC<{ nodeRef: React.RefObject<THREE.Group>; onClick: () => void }> = ({
  nodeRef,
  onClick,
}) => {
  return (
    <group
      ref={nodeRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Central Transformer Hub */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.8, 0.8, 0.8]} />
        <meshStandardMaterial color="#0f172a" />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.8, 0.8, 0.8)]} />
          <lineBasicMaterial color="#06b6d4" />
        </lineSegments>
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.4, 0.1, 0.4]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Panel Grid Array - More Detailed Tilt */}
      <group position={[0, 0.3, 0]}>
        {[-1.2, 0, 1.2].map((x, i) =>
          [-1.0, 0, 1.0].map((z, j) => (
            <group position={[x, 0, z]} key={`${i}-${j}`}>
              {/* Individual support pole */}
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              {/* Tilted Panel */}
              <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 6, 0, 0]}>
                <boxGeometry args={[1.0, 0.05, 0.8]} />
                <meshStandardMaterial color="#0B1220" roughness={0.1} metalness={0.8} />
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(1.0, 0.05, 0.8)]} />
                  <lineBasicMaterial color="#06b6d4" />
                </lineSegments>
              </mesh>
              {/* Glowing Junction Box */}
              <mesh position={[0.3, 0.2, 0.3]}>
                <boxGeometry args={[0.1, 0.15, 0.1]} />
                <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
              </mesh>
            </group>
          ))
        )}
      </group>

      <Html position={[0, 2.2, 0]} center distanceFactor={15}>
        <div className="bg-[#0f172a]/90 text-[#e2e8f0] border border-[#06b6d4] px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-sm backdrop-blur-md">
          Delta Solar Park
        </div>
      </Html>
    </group>
  )
}

// Stylized Battery Storage
const Battery3D: React.FC<{ nodeRef: React.RefObject<THREE.Group>; onClick: () => void }> = ({
  nodeRef,
  onClick,
}) => {
  return (
    <group
      ref={nodeRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.8, 1.2, 1.2)]} />
          <lineBasicMaterial color="#10b981" />
        </lineSegments>
      </mesh>
      {/* Glowing Charge Indicators */}
      <mesh position={[0, 0.6, 0.61]}>
        <boxGeometry args={[1.2, 0.2, 0.05]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={1} />
      </mesh>
      <Html position={[0, 1.5, 0]} center distanceFactor={15}>
        <div className="bg-[#0f172a]/90 text-[#e2e8f0] border border-[#10b981] px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-sm backdrop-blur-md">
          BESS (SOC 62%)
        </div>
      </Html>
    </group>
  )
}

// SCADA Styled Buildings (HQ, Factory, Refinery)
const Building3D: React.FC<{
  nodeRef: React.RefObject<THREE.Group>
  name: string
  kw: number
  type: 'hq' | 'factory' | 'refinery'
  onClick: () => void
}> = ({ nodeRef, name, kw, type, onClick }) => {
  return (
    <group
      ref={nodeRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {type === 'hq' && (
        <group position={[0, 0, 0]}>
          {/* Multi-tier Base */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[2.6, 0.6, 2.0]} />
            <meshStandardMaterial color="#1e293b" />
            <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(2.6, 0.6, 2.0)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          {/* Main Tower */}
          <mesh position={[0, 1.4, 0]}>
            <boxGeometry args={[1.2, 1.6, 1.2]} />
            <meshStandardMaterial color="#0f172a" />
            <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.6, 1.2)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          {/* Roof Helipad & Antenna */}
          <mesh position={[0, 2.25, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 16]} />
            <meshStandardMaterial color="#334155" />
            <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          <mesh position={[0.4, 2.4, -0.4]}>
            <cylinderGeometry args={[0.02, 0.02, 0.5, 4]} />
            <meshStandardMaterial color="#e2e8f0" />
          </mesh>
          {/* Horizontal glowing window bands */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((y, i) => (
             <mesh position={[0, 1.4 + y, 0.61]} key={i}>
               <boxGeometry args={[1.0, 0.1, 0.05]} />
               <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1} />
             </mesh>
          ))}
        </group>
      )}

      {type === 'factory' && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[3.2, 0.6, 2.4]} />
            <meshStandardMaterial color="#1e293b" />
            <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(3.2, 0.6, 2.4)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          {/* Stepped roofs */}
          <mesh position={[-0.8, 0.7, 0]}>
            <boxGeometry args={[1.2, 0.2, 2.0]} />
            <meshStandardMaterial color="#0f172a" />
            <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(1.2, 0.2, 2.0)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          <mesh position={[0.8, 0.7, 0]}>
            <boxGeometry args={[1.2, 0.2, 2.0]} />
            <meshStandardMaterial color="#0f172a" />
            <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(1.2, 0.2, 2.0)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          {/* Detailed Smokestacks */}
          {[-0.6, 0.6].map(x => (
            <group position={[x, 1.2, -0.4]} key={x}>
              <mesh>
                <cylinderGeometry args={[0.3, 0.4, 1.0, 12]} />
                <meshStandardMaterial color="#0f172a" />
                <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(0.3, 0.4, 1.0, 12)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
              </mesh>
              {/* Smoke glowing tip */}
              <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.25, 0.3, 0.1, 12]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {type === 'refinery' && (
        <group position={[0, 0, 0]}>
          <mesh position={[-0.5, 0.3, 0]}>
            <boxGeometry args={[2.0, 0.6, 2.4]} />
            <meshStandardMaterial color="#1e293b" />
            <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(2.0, 0.6, 2.4)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          {/* Tank Farm (Multiple Sizes) */}
          <mesh position={[1.2, 0.9, -0.5]}>
            <cylinderGeometry args={[0.7, 0.7, 1.8, 16]} />
            <meshStandardMaterial color="#0f172a" />
            <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(0.7, 0.7, 1.8, 16)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          <mesh position={[1.2, 0.6, 0.9]}>
            <cylinderGeometry args={[0.5, 0.5, 1.2, 16]} />
            <meshStandardMaterial color="#0f172a" />
            <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          <mesh position={[0.2, 0.5, 1.2]}>
            <cylinderGeometry args={[0.3, 0.3, 1.0, 16]} />
            <meshStandardMaterial color="#0f172a" />
            <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(0.3, 0.3, 1.0, 16)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          {/* Connecting Pipes */}
          <mesh position={[1.2, 0.8, 0.2]}>
            <cylinderGeometry args={[0.05, 0.05, 1.4, 8]} />
            <meshStandardMaterial color="#06b6d4" />
          </mesh>
          <mesh position={[0.7, 0.6, 1.05]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.05, 0.05, 1.0, 8]} />
            <meshStandardMaterial color="#06b6d4" />
          </mesh>
          {/* Tall Flare Stack */}
          <mesh position={[-0.2, 1.2, -0.2]}>
            <cylinderGeometry args={[0.08, 0.15, 2.0, 8]} />
            <meshStandardMaterial color="#334155" />
            <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(0.08, 0.15, 2.0, 8)]} /><lineBasicMaterial color="#06b6d4" /></lineSegments>
          </mesh>
          <mesh position={[-0.2, 2.3, -0.2]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
          </mesh>
        </group>
      )}

      <Html position={[0, 2.8, 0]} center distanceFactor={15}>
        <div className="bg-[#0f172a]/90 text-[#e2e8f0] border border-[#06b6d4] px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-sm backdrop-blur-md">
          {name}
          <div className="text-[8px] text-[#94a3b8]">{kw} kW</div>
        </div>
      </Html>
    </group>
  )
}

export const Network3D: React.FC = () => {
  const { network } = useGridStore()
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()
  const { theme } = useUIStore()
  const isDark = theme === 'dark'
  
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  // Node refs for lines to track dynamically
  const substationRef = useRef<THREE.Group>(null)
  const b1Ref = useRef<THREE.Group>(null)
  const b2Ref = useRef<THREE.Group>(null)
  const b3Ref = useRef<THREE.Group>(null)
  const b4Ref = useRef<THREE.Group>(null)
  const solarRef = useRef<THREE.Group>(null)
  const hqRef = useRef<THREE.Group>(null)
  const batRef = useRef<THREE.Group>(null)
  const factoryRef = useRef<THREE.Group>(null)
  const refineryRef = useRef<THREE.Group>(null)

  const b1 = network.buses.find((b) => b.id === 'B1') || network.buses[0]
  const b2 = network.buses.find((b) => b.id === 'B2') || network.buses[1]
  const b3 = network.buses.find((b) => b.id === 'B3') || network.buses[2]
  const b4 = network.buses.find((b) => b.id === 'B4') || network.buses[3]

  const f02 = network.feeders.find((f) => f.id === 'F-02')
  const solar01 = network.solarUnits.find((s) => s.id === 'SOLAR-01') || network.solarUnits[0]
  const bat01 = network.batteries.find((b) => b.id === 'BAT-01') || network.batteries[0]
  const load01 = network.loads.find((l) => l.id === 'LOAD-01') || network.loads[0]
  const load02 = network.loads.find((l) => l.id === 'LOAD-02') || network.loads[2]
  const load03 = network.loads.find((l) => l.id === 'LOAD-03') || network.loads[1]

  const isB3Critical = b3?.status === 'critical'
  const isF02Critical = f02?.status === 'critical'

  return (
    <div className="relative w-full aspect-[4/3] max-h-[640px] min-h-[420px] bg-slate-100 dark:bg-[#0B1220] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 pointer-events-none shadow-xs">
        <span className="font-semibold text-sky-600 dark:text-sky-400">3D Isometric View:</span> Drag to orbit • Scroll to zoom
      </div>

      <Canvas
        camera={{ position: [0, 14, 18], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={isDark ? 0.7 : 0.9} />
        <directionalLight position={[10, 20, 15]} intensity={isDark ? 1.0 : 1.3} />
        <pointLight position={[0, 5, 0]} intensity={0.5} color="#0284c7" />

        <OrbitControls
          enableRotate={orbitEnabled}
          enableZoom={orbitEnabled}
          enablePan={orbitEnabled}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={8}
          maxDistance={30}
        />

        {/* Ground Terrain Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[45, 45]} />
          <meshStandardMaterial color={isDark ? '#0c1322' : '#f1f5f9'} roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Grid lines */}
        <gridHelper
          args={[40, 40, isDark ? '#1e293b' : '#cbd5e1', isDark ? '#131e33' : '#e2e8f0']}
          position={[0, 0, 0]}
        />

        {/* Substation */}
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group ref={substationRef} position={[0, 0, -10]}>
            <mesh
              position={[0, 0.6, 0]}
              onClick={() =>
                setSelectedComponent({
                  type: 'transformer',
                  id: network.substation.id,
                  data: network.substation,
                })
              }
            >
              <boxGeometry args={[3, 1.5, 3]} />
              <meshStandardMaterial color="#1e293b" />
              <lineSegments>
                 <edgesGeometry args={[new THREE.BoxGeometry(3, 1.5, 3)]} />
                 <lineBasicMaterial color="#06b6d4" />
              </lineSegments>
              {/* Substation Top Details */}
              <mesh position={[-0.8, 1.0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.6, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0.8, 1.0, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.6, 8]} />
                <meshStandardMaterial color="#334155" />
              </mesh>

              <Html position={[0, 2.0, 0]} center distanceFactor={15}>
                <div className="bg-[#0f172a]/90 text-[#e2e8f0] border border-[#06b6d4] px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-sm backdrop-blur-md">
                  Substation (33/11 kV)
                </div>
              </Html>
            </mesh>
          </group>
        </DragControls>

        {/* Transmission line from Substation to B1 */}
        <Feeder3DLine startRef={substationRef} endRef={b1Ref} color="#0284c7" flowDirection="forward" />

        {/* Bus 1 */}
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[0, 0, -5]}>
            <Bus3DNode
              nodeRef={b1Ref}
              name="B1"
              voltage={b1.voltage}
              isSelected={selectedComponent?.id === 'B1'}
              onClick={() => setSelectedComponent({ type: 'bus', id: b1.id, data: b1 })}
            />
          </group>
        </DragControls>

        {/* Feeder Line from B1 to B2 */}
        <Feeder3DLine startRef={b1Ref} endRef={b2Ref} color="#0284c7" flowDirection="forward" />

        {/* Bus 2 */}
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[0, 0, 0]}>
            <Bus3DNode
              nodeRef={b2Ref}
              name="B2"
              voltage={b2.voltage}
              isSelected={selectedComponent?.id === 'B2'}
              onClick={() => setSelectedComponent({ type: 'bus', id: b2.id, data: b2 })}
            />
          </group>
        </DragControls>

        {/* Branch: Solar Farm */}
        <Feeder3DLine startRef={b2Ref} endRef={solarRef} color="#10b981" flowDirection={solar01.generationKw > 0 ? "reverse" : "none"} />
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[-7, 0, 0]}>
            <SolarArray3D
              nodeRef={solarRef}
              onClick={() => setSelectedComponent({ type: 'solar', id: solar01.id, data: solar01 })}
            />
          </group>
        </DragControls>

        {/* Branch: Load 1 (HQ) */}
        <Feeder3DLine startRef={b2Ref} endRef={hqRef} color="#0284c7" flowDirection="forward" />
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[7, 0, 0]}>
            <Building3D
              nodeRef={hqRef}
              name="Central HQ"
              type="hq"
              kw={load01.powerKw}
              onClick={() => setSelectedComponent({ type: 'load', id: load01.id, data: load01 })}
            />
          </group>
        </DragControls>

        {/* Feeder F-02 from B2 to B3 */}
        <Feeder3DLine
          startRef={b2Ref}
          endRef={b3Ref}
          color={isF02Critical ? '#dc2626' : '#0284c7'}
          isCritical={isF02Critical}
          flowDirection="forward"
        />

        {/* Bus 3 */}
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[0, 0, 6]}>
            <Bus3DNode
              nodeRef={b3Ref}
              name="B3"
              voltage={b3.voltage}
              isCritical={isB3Critical}
              isSelected={selectedComponent?.id === 'B3'}
              onClick={() => setSelectedComponent({ type: 'bus', id: b3.id, data: b3 })}
            />
          </group>
        </DragControls>

        {/* Branch: Battery */}
        <Feeder3DLine startRef={b3Ref} endRef={batRef} color="#10b981" flowDirection="reverse" />
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[-7, 0, 6]}>
            <Battery3D
              nodeRef={batRef}
              onClick={() => setSelectedComponent({ type: 'battery', id: bat01.id, data: bat01 })}
            />
          </group>
        </DragControls>

        {/* Branch: Load 2 (Factory) */}
        <Feeder3DLine startRef={b3Ref} endRef={factoryRef} color="#0284c7" flowDirection="forward" />
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[7, 0, 6]}>
            <Building3D
              nodeRef={factoryRef}
              name="Northgate Factory"
              type="factory"
              kw={load02.powerKw}
              onClick={() => setSelectedComponent({ type: 'load', id: load02.id, data: load02 })}
            />
          </group>
        </DragControls>

        {/* Feeder F-04 from B3 to B4 */}
        <Feeder3DLine startRef={b3Ref} endRef={b4Ref} color="#0284c7" flowDirection="forward" />

        {/* Bus 4 */}
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[0, 0, 12]}>
            <Bus3DNode
              nodeRef={b4Ref}
              name="B4"
              voltage={b4.voltage}
              isSelected={selectedComponent?.id === 'B4'}
              onClick={() => setSelectedComponent({ type: 'bus', id: b4.id, data: b4 })}
            />
          </group>
        </DragControls>

        {/* Branch: Load 3 (Refinery) */}
        <Feeder3DLine startRef={b4Ref} endRef={refineryRef} color="#0284c7" flowDirection="forward" />
        <DragControls axisLock="y" onDragStart={() => setOrbitEnabled(false)} onDragEnd={() => setOrbitEnabled(true)}>
          <group position={[7, 0, 12]}>
            <Building3D
              nodeRef={refineryRef}
              name="Westport Refinery"
              type="refinery"
              kw={load03.powerKw}
              onClick={() => setSelectedComponent({ type: 'load', id: load03.id, data: load03 })}
            />
          </group>
        </DragControls>
      </Canvas>
    </div>
  )
}
