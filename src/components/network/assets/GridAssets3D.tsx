import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Factory Asset (Detailed)
export const FactoryAsset: React.FC = () => {
  return (
    <group>
      {/* Main Building */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 1, 2]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      {/* Roof detailing */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[3.2, 0.2, 2.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.8} />
      </mesh>
      {/* Smokestack 1 */}
      <mesh position={[-1, 1.6, -0.5]}>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      {/* Smokestack 2 */}
      <mesh position={[-0.4, 1.6, -0.5]}>
        <cylinderGeometry args={[0.15, 0.2, 1.2, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.6} />
      </mesh>
      {/* Loading Dock */}
      <mesh position={[0, 0.2, 1.2]}>
        <boxGeometry args={[1.5, 0.4, 0.6]} />
        <meshStandardMaterial color="#64748b" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Residential Asset (Detailed)
export const ResidentialAsset: React.FC = () => {
  return (
    <group>
      {/* House Body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
      </mesh>
      {/* Roof (Pyramid) */}
      <mesh position={[0, 1.0, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1, 0.6, 4]} />
        <meshStandardMaterial color="#0369a1" roughness={0.8} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 0.61]}>
        <boxGeometry args={[0.3, 0.6, 0.05]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
    </group>
  )
}

// Commercial Office Asset
export const CommercialAsset: React.FC = () => {
  return (
    <group>
      {/* Tower */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.5, 3, 1.5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Glass Windows Embellishment */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.52, 2.9, 1.52]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

// Solar Utility Scale
export const SolarUtilityAsset: React.FC = () => {
  return (
    <group>
      {/* Ground Mounts */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}
      {/* Panel Array */}
      <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 6, 0, 0]}>
        <boxGeometry args={[2.5, 0.1, 1.5]} />
        <meshStandardMaterial color="#0B1220" roughness={0.2} metalness={0.7} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2.5, 0.1, 1.5)]} />
          <lineBasicMaterial color="#0ea5e9" />
        </lineSegments>
      </mesh>
    </group>
  )
}

// Solar Rooftop
export const SolarRooftopAsset: React.FC = () => {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 6, 0, 0]}>
        <boxGeometry args={[1, 0.05, 0.8]} />
        <meshStandardMaterial color="#0B1220" roughness={0.2} metalness={0.7} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1, 0.05, 0.8)]} />
          <lineBasicMaterial color="#0ea5e9" />
        </lineSegments>
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  )
}
