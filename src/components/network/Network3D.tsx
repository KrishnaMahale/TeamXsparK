import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGridStore } from '../../store/gridStore'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'

// 3D Bus Node Component
const Bus3DNode: React.FC<{
  position: [number, number, number]
  name: string
  voltage: number
  isCritical?: boolean
  onClick: () => void
  isSelected: boolean
}> = ({ position, name, voltage, isCritical, onClick, isSelected }) => {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current && isCritical) {
      const scale = 1 + 0.15 * Math.sin(state.clock.getElapsedTime() * 4)
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <cylinderGeometry args={[0.7, 0.7, 0.4, 32]} />
        <meshStandardMaterial
          color={isCritical ? '#ef4444' : isSelected ? '#38bdf8' : '#10b981'}
          emissive={isCritical ? '#f43f5e' : isSelected ? '#0284c7' : '#059669'}
          emissiveIntensity={isCritical ? 0.8 : 0.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Floating HUD Label */}
      <Html position={[0, 1.2, 0]} center distanceFactor={15}>
        <div
          onClick={onClick}
          className={`cursor-pointer px-2 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider whitespace-nowrap shadow-lg backdrop-blur-md border ${
            isCritical
              ? 'bg-rose-950/90 text-rose-300 border-rose-500 animate-pulse ring-2 ring-rose-500/50'
              : isSelected
              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 ring-2 ring-cyan-500/50'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}
        >
          {name}: {voltage.toFixed(3)} pu
        </div>
      </Html>
    </group>
  )
}

// 3D Feeder Power Line
const Feeder3DLine: React.FC<{
  start: [number, number, number]
  end: [number, number, number]
  color?: string
  isCritical?: boolean
}> = ({ start, end, color = '#00d2ff', isCritical = false }) => {
  const startVec = new THREE.Vector3(...start)
  const endVec = new THREE.Vector3(...end)
  const distance = startVec.distanceTo(endVec)
  const position = startVec.clone().add(endVec).multiplyScalar(0.5)

  const orientation = new THREE.Matrix4()
  orientation.lookAt(startVec, endVec, new THREE.Vector3(0, 1, 0))
  const rotation = new THREE.Euler().setFromRotationMatrix(orientation)

  return (
    <mesh position={[position.x, position.y, position.z]} rotation={rotation}>
      <cylinderGeometry args={[0.08, 0.08, distance, 8]} />
      <meshStandardMaterial
        color={isCritical ? '#ef4444' : color}
        emissive={isCritical ? '#f43f5e' : color}
        emissiveIntensity={isCritical ? 0.9 : 0.6}
      />
    </mesh>
  )
}

// Stylized Solar Panel Array
const SolarArray3D: React.FC<{ position: [number, number, number]; onClick: () => void }> = ({
  position,
  onClick,
}) => {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <mesh rotation={[-Math.PI / 6, 0, 0]} position={[0, 0.4, 0]}>
        <boxGeometry args={[2.5, 0.1, 1.8]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Stand */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.3, 0.4, 0.3]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <Html position={[0, 1.2, 0]} center distanceFactor={15}>
        <div className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-md">
          Solar Farm (150 kW)
        </div>
      </Html>
    </group>
  )
}

// Stylized Battery Storage
const Battery3D: React.FC<{ position: [number, number, number]; onClick: () => void }> = ({
  position,
  onClick,
}) => {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.8, 1, 1.2]} />
        <meshStandardMaterial color="#0369a1" roughness={0.3} metalness={0.6} />
      </mesh>
      <Html position={[0, 1.3, 0]} center distanceFactor={15}>
        <div className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-md">
          BESS (40 kW | SOC 62%)
        </div>
      </Html>
    </group>
  )
}

// Stylized Load Building
const Building3D: React.FC<{
  position: [number, number, number]
  name: string
  kw: number
  onClick: () => void
}> = ({ position, name, kw, onClick }) => {
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
      </mesh>
      <Html position={[0, 1.8, 0]} center distanceFactor={15}>
        <div className="bg-slate-900/90 text-slate-200 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
          {name} ({kw} kW)
        </div>
      </Html>
    </group>
  )
}

export const Network3D: React.FC = () => {
  const { network } = useGridStore()
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()

  const b1 = network.buses.find((b) => b.id === 'B1') || network.buses[0]
  const b2 = network.buses.find((b) => b.id === 'B2') || network.buses[1]
  const b3 = network.buses.find((b) => b.id === 'B3') || network.buses[2]
  const b4 = network.buses.find((b) => b.id === 'B4') || network.buses[3]

  const f02 = network.feeders.find((f) => f.id === 'F-02')
  const solar01 = network.solarUnits.find((s) => s.id === 'SOLAR-01') || network.solarUnits[0]
  const bat01 = network.batteries.find((b) => b.id === 'BAT-01') || network.batteries[0]
  const load01 = network.loads.find((l) => l.id === 'LOAD-01') || network.loads[0]
  const load02 = network.loads.find((l) => l.id === 'LOAD-02') || network.loads[1]
  const load03 = network.loads.find((l) => l.id === 'LOAD-03') || network.loads[2]

  const isB3Critical = b3?.status === 'critical'
  const isF02Critical = f02?.status === 'critical'

  return (
    <div className="relative w-full aspect-[4/3] max-h-[640px] min-h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 pointer-events-none">
        <span className="font-semibold text-cyan-400">3D Digital Twin:</span> Drag to orbit • Scroll to zoom
      </div>

      <Canvas
        camera={{ position: [0, 14, 18], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 15]} intensity={1.2} />
        <pointLight position={[0, 5, 0]} intensity={1.5} color="#00d2ff" />

        <OrbitControls
          enableRotate={true}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={8}
          maxDistance={30}
        />

        {/* Ground Terrain Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[35, 35]} />
          <meshStandardMaterial color="#080e1c" roughness={0.9} metalness={0.1} />
        </mesh>

        {/* Grid lines texture */}
        <gridHelper args={[30, 30, '#1e293b', '#0f172a']} position={[0, 0, 0]} />

        {/* Substation at [0, 0, -7] */}
        <mesh
          position={[0, 0.6, -7]}
          onClick={() =>
            setSelectedComponent({
              type: 'transformer',
              id: network.substation.id,
              data: network.substation,
            })
          }
        >
          <boxGeometry args={[2.5, 1.2, 2.5]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.4} metalness={0.6} />
          <Html position={[0, 1.5, 0]} center distanceFactor={15}>
            <div className="bg-blue-950/90 text-blue-300 border border-blue-500/50 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-md">
              Substation (33/11 kV)
            </div>
          </Html>
        </mesh>

        {/* Transmission Tower line from Substation to B1 */}
        <Feeder3DLine start={[0, 0.6, -7]} end={[0, 0.2, -3.5]} color="#06b6d4" />

        {/* Bus 1 at [0, 0.2, -3.5] */}
        <Bus3DNode
          position={[0, 0.2, -3.5]}
          name="B1"
          voltage={b1.voltage}
          isSelected={selectedComponent?.id === 'B1'}
          onClick={() => setSelectedComponent({ type: 'bus', id: b1.id, data: b1 })}
        />

        {/* Feeder Line from B1 to B2 */}
        <Feeder3DLine start={[0, 0.2, -3.5]} end={[0, 0.2, 0]} color="#06b6d4" />

        {/* Bus 2 at [0, 0.2, 0] */}
        <Bus3DNode
          position={[0, 0.2, 0]}
          name="B2"
          voltage={b2.voltage}
          isSelected={selectedComponent?.id === 'B2'}
          onClick={() => setSelectedComponent({ type: 'bus', id: b2.id, data: b2 })}
        />

        {/* Branch: Solar Farm at [-5, 0, 0] */}
        <Feeder3DLine start={[0, 0.2, 0]} end={[-5, 0.2, 0]} color="#10b981" />
        <SolarArray3D
          position={[-5, 0, 0]}
          onClick={() => setSelectedComponent({ type: 'solar', id: solar01.id, data: solar01 })}
        />

        {/* Branch: Load 1 at [5, 0, 0] */}
        <Feeder3DLine start={[0, 0.2, 0]} end={[5, 0.2, 0]} color="#06b6d4" />
        <Building3D
          position={[5, 0, 0]}
          name="Commercial B2"
          kw={load01.powerKw}
          onClick={() => setSelectedComponent({ type: 'load', id: load01.id, data: load01 })}
        />

        {/* Feeder F-02 from B2 [0, 0.2, 0] to B3 [0, 0.2, 4] */}
        <Feeder3DLine
          start={[0, 0.2, 0]}
          end={[0, 0.2, 4]}
          color={isF02Critical ? '#ef4444' : '#06b6d4'}
          isCritical={isF02Critical}
        />

        {/* Bus 3 at [0, 0.2, 4] */}
        <Bus3DNode
          position={[0, 0.2, 4]}
          name="B3"
          voltage={b3.voltage}
          isCritical={isB3Critical}
          isSelected={selectedComponent?.id === 'B3'}
          onClick={() => setSelectedComponent({ type: 'bus', id: b3.id, data: b3 })}
        />

        {/* Branch: Battery at [-5, 0, 4] */}
        <Feeder3DLine start={[0, 0.2, 4]} end={[-5, 0.2, 4]} color="#0284c7" />
        <Battery3D
          position={[-5, 0, 4]}
          onClick={() => setSelectedComponent({ type: 'battery', id: bat01.id, data: bat01 })}
        />

        {/* Branch: Load 2 at [5, 0, 4] */}
        <Feeder3DLine start={[0, 0.2, 4]} end={[5, 0.2, 4]} color="#06b6d4" />
        <Building3D
          position={[5, 0, 4]}
          name="Residential B3"
          kw={load02.powerKw}
          onClick={() => setSelectedComponent({ type: 'load', id: load02.id, data: load02 })}
        />

        {/* Feeder F-04 from B3 [0, 0.2, 4] to B4 [0, 0.2, 8] */}
        <Feeder3DLine start={[0, 0.2, 4]} end={[0, 0.2, 8]} color="#06b6d4" />

        {/* Bus 4 at [0, 0.2, 8] */}
        <Bus3DNode
          position={[0, 0.2, 8]}
          name="B4"
          voltage={b4.voltage}
          isSelected={selectedComponent?.id === 'B4'}
          onClick={() => setSelectedComponent({ type: 'bus', id: b4.id, data: b4 })}
        />

        {/* Branch: Load 3 at [5, 0, 8] */}
        <Feeder3DLine start={[0, 0.2, 8]} end={[5, 0.2, 8]} color="#06b6d4" />
        <Building3D
          position={[5, 0, 8]}
          name="Industrial B4"
          kw={load03.powerKw}
          onClick={() => setSelectedComponent({ type: 'load', id: load03.id, data: load03 })}
        />
      </Canvas>
    </div>
  )
}
