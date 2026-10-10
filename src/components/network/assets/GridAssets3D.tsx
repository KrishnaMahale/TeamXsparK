import React from 'react'
import * as THREE from 'three'

// =======================================================================
// 1. SUBSTATION TRANSFORMER ASSET (High-Voltage Utility Substation)
// =======================================================================
export const SubstationTransformerAsset: React.FC = () => {
  return (
    <group>
      {/* 1. Heavy Reinforced Concrete Foundation Slab */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[3.5, 0.16, 3.2]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.85} metalness={0.1} />
      </mesh>
      {/* Surrounding Crushed Gravel Containment Curb */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[3.9, 0.04, 3.6]} />
        <meshStandardMaterial color="#64748b" roughness={0.95} />
      </mesh>

      {/* 2. Main Transformer Steel Tank (Utility Gray RAL 7038) */}
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[2.3, 1.45, 1.85]} />
        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.65} />
      </mesh>
      {/* Reinforced Tank Top Flange / Bolted Lid */}
      <mesh position={[0, 1.65, 0]}>
        <boxGeometry args={[2.4, 0.06, 1.95]} />
        <meshStandardMaterial color="#334155" roughness={0.45} metalness={0.7} />
      </mesh>

      {/* 3. Cooling Radiator Fin Banks (Left & Right Flanks) */}
      {/* Left Radiator Bank */}
      <group position={[-1.3, 0.9, 0]}>
        <mesh>
          <boxGeometry args={[0.25, 1.25, 1.65]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.75} />
        </mesh>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((z, i) => (
          <mesh key={`rad-l-${i}`} position={[0, 0, z]}>
            <boxGeometry args={[0.32, 1.2, 0.05]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Right Radiator Bank */}
      <group position={[1.3, 0.9, 0]}>
        <mesh>
          <boxGeometry args={[0.25, 1.25, 1.65]} />
          <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.75} />
        </mesh>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((z, i) => (
          <mesh key={`rad-r-${i}`} position={[0, 0, z]}>
            <boxGeometry args={[0.32, 1.2, 0.05]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* 4. Overhead Oil Conservator Drum (Horizontal Steel Cylinder) */}
      <group position={[0, 2.05, -0.3]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 1.95, 20]} />
          <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.7} />
        </mesh>
        {/* Conservator Mounting Brackets */}
        <mesh position={[-0.65, -0.25, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <mesh position={[0.65, -0.25, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.08]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        {/* Oil Level Sight Glass */}
        <mesh position={[0, 0, 0.35]}>
          <boxGeometry args={[0.6, 0.06, 0.02]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} />
        </mesh>
      </group>

      {/* 5. High-Voltage Primary Bushings (Rich Terracotta Ceramic Glaze) */}
      {[-0.65, 0, 0.65].map((x, i) => (
        <group key={`hv-bushing-${i}`} position={[x, 1.68, 0.45]}>
          {/* Stepped Ceramic Insulator Skirts */}
          <mesh position={[0, 0.28, 0]}>
            <cylinderGeometry args={[0.08, 0.15, 0.55, 14]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.25} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 14]} />
            <meshStandardMaterial color="#9a3412" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.06, 14]} />
            <meshStandardMaterial color="#9a3412" roughness={0.25} />
          </mesh>
          {/* Polished Copper/Silver Terminal Stud */}
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.18, 10]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#eab308" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* 6. Low-Voltage Secondary Bushings (Rear) */}
      {[-0.65, -0.22, 0.22, 0.65].map((x, i) => (
        <group key={`lv-bushing-${i}`} position={[x, 1.68, -0.72]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.06, 0.11, 0.35, 12]} />
            <meshStandardMaterial color="#b45309" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.38, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.12, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
      ))}

      {/* 7. Local Control Marshalling Cabinet (Front Face) */}
      <mesh position={[0.55, 0.82, 0.98]}>
        <boxGeometry args={[0.65, 0.85, 0.18]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} metalness={0.3} />
      </mesh>
      {/* High-Voltage Danger Safety Sign Plate */}
      <mesh position={[-0.45, 0.9, 0.94]}>
        <boxGeometry args={[0.32, 0.32, 0.02]} />
        <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </group>
  )
}

// =======================================================================
// 2. BATTERY ENERGY STORAGE ASSET (Modular Utility-Scale BESS Enclosure)
// =======================================================================
export const BatteryStorageAsset: React.FC = () => {
  return (
    <group>
      {/* Concrete Foundation Plinth */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[2.3, 0.12, 1.55]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>

      {/* Pristine Industrial Powder-Coated Cabinet (Megapack Clean White) */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[2.0, 1.35, 1.3]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.2} />
      </mesh>

      {/* Dark Basalt Structural Steel Perimeter Base Frame */}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[2.04, 0.08, 1.34]} />
        <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.7} />
      </mesh>

      {/* Corner Heavy Steel Structural Castings */}
      {[-1.0, 1.0].map((x, ix) =>
        [-0.65, 0.65].map((z, iz) => (
          <mesh key={`post-${ix}-${iz}`} position={[x, 0.8, z]}>
            <boxGeometry args={[0.07, 1.36, 0.07]} />
            <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.7} />
          </mesh>
        ))
      )}

      {/* Dual Front Service Access Doors */}
      <mesh position={[-0.48, 0.8, 0.66]}>
        <boxGeometry args={[0.88, 1.15, 0.02]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.15} />
      </mesh>
      <mesh position={[0.48, 0.8, 0.66]}>
        <boxGeometry args={[0.88, 1.15, 0.02]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.15} />
      </mesh>

      {/* Emerald Green Clean-Energy Status Bar (Glowing LED Strip) */}
      <mesh position={[0, 1.25, 0.67]}>
        <boxGeometry args={[1.75, 0.08, 0.02]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.95}
          roughness={0.2}
        />
      </mesh>

      {/* HVAC Climate Control Air Intake Louver Grille (Dark Metal Slats) */}
      <mesh position={[0, 1.48, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.85]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.45, 0.67]}>
        <boxGeometry args={[1.5, 0.18, 0.02]} />
        <meshStandardMaterial color="#1e293b" roughness={0.85} />
      </mesh>

      {/* High-Voltage DC Hazard Triangle Sign */}
      <mesh position={[0.75, 0.95, 0.67]}>
        <boxGeometry args={[0.15, 0.15, 0.02]} />
        <meshStandardMaterial color="#eab308" emissive="#ca8a04" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

// =======================================================================
// 3. SOLAR UTILITY SCALE ASSET (Ground-Mounted Photovoltaic Farm Array)
// =======================================================================
export const SolarUtilityAsset: React.FC = () => {
  return (
    <group>
      {/* Concrete Pier Ground Footings */}
      {[-0.95, 0, 0.95].map((x, i) => (
        <mesh key={`pier-${i}`} position={[x, 0.06, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.12, 10]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.85} />
        </mesh>
      ))}

      {/* Hot-Dip Galvanized Steel A-Frame Mounting Posts */}
      {[-0.95, 0, 0.95].map((x, i) => (
        <group key={`leg-${i}`}>
          {/* Front Stanchion */}
          <mesh position={[x, 0.3, 0.38]}>
            <cylinderGeometry args={[0.04, 0.04, 0.48, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.9} />
          </mesh>
          {/* Rear Stanchion for Optimal Sun Angle */}
          <mesh position={[x, 0.55, -0.38]}>
            <cylinderGeometry args={[0.04, 0.04, 0.96, 8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Horizontal Steel Torque Tube */}
      <mesh position={[0, 0.48, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 2.7, 10]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* PV Panel Array Tilted Towards Sun (~26 Degrees) */}
      <group position={[0, 0.7, 0]} rotation={[-Math.PI / 6.8, 0, 0]}>
        {/* Aluminum Sub-Frame Racking */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.8, 0.04, 1.65]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.95} />
        </mesh>

        {/* 4 Multi-Crystalline Silicon PV Modules (Deep Iridescent Cobalt Blue) */}
        {[-1.0, -0.33, 0.33, 1.0].map((x, idx) => (
          <group key={`panel-${idx}`} position={[x, 0.03, 0]}>
            <mesh>
              <boxGeometry args={[0.62, 0.02, 1.55]} />
              <meshStandardMaterial
                color="#0f2b5c"
                roughness={0.12}
                metalness={0.7}
              />
            </mesh>
            {/* Silicon Wafer Division Micro-Busbars */}
            <mesh position={[0, 0.012, 0]}>
              <boxGeometry args={[0.6, 0.005, 0.015]} />
              <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0.012, -0.38]}>
              <boxGeometry args={[0.6, 0.005, 0.015]} />
              <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.25} />
            </mesh>
            <mesh position={[0, 0.012, 0.38]}>
              <boxGeometry args={[0.6, 0.005, 0.015]} />
              <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.25} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Weatherproof String Inverter Box (Rear) */}
      <mesh position={[0, 0.48, -0.48]}>
        <boxGeometry args={[0.42, 0.38, 0.16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.25} />
      </mesh>
      {/* Emergency DC Shut-Off Switch */}
      <mesh position={[0.14, 0.48, -0.57]}>
        <boxGeometry args={[0.07, 0.07, 0.04]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
    </group>
  )
}

// =======================================================================
// =======================================================================
// 4. SOLARROOFTOP ASSET (Residential Home with Integrated Rooftop Solar PV System)
// =======================================================================
export const SolarrooftopAsset: React.FC = () => {
  return (
    <group>
      {/* 1. Manicured Green Lawn Garden Plot (Isometric Landscaping from reference image) */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[2.7, 0.08, 2.7]} />
        <meshStandardMaterial color="#84cc16" roughness={0.85} />
      </mesh>
      {/* Dark Earth Edge Base */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[2.72, 0.03, 2.72]} />
        <meshStandardMaterial color="#65a30d" roughness={0.95} />
      </mesh>

      {/* 2. Light Stone Paved Terrace Patio (Front & Right) */}
      <mesh position={[0.42, 0.082, 0.42]}>
        <boxGeometry args={[1.65, 0.015, 1.65]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.5} />
      </mesh>
      {/* Patio Grout Line Details */}
      {[-0.35, 0, 0.35].map((offset, i) => (
        <group key={`patio-lines-${i}`}>
          <mesh position={[0.42, 0.09, 0.42 + offset]}>
            <boxGeometry args={[1.63, 0.005, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
          <mesh position={[0.42 + offset, 0.09, 0.42]}>
            <boxGeometry args={[0.02, 0.005, 1.63]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      ))}

      {/* Modern Sun Lounge / Recliner Chair on Patio (from reference) */}
      <group position={[1.0, 0.14, 0.75]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.55]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.06, -0.18]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.22, 0.04, 0.25]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>
      </group>

      {/* Potted Spherical Topiary Plants in White Planters (Flanking Patio) */}
      {[
        [0.15, 0.12, 1.05],
        [0.85, 0.12, 0.05],
      ].map(([px, py, pz], idx) => (
        <group key={`topiary-${idx}`} position={[px, py, pz]}>
          {/* White Square Planter */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.16, 0.14, 0.16]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          {/* Trunk */}
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} />
            <meshStandardMaterial color="#78350f" />
          </mesh>
          {/* Spherical Trimmed Bush */}
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.13, 12, 12]} />
            <meshStandardMaterial color="#84cc16" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Conical Cypress / Pine Trees (from reference) */}
      {/* Left Tree */}
      <group position={[-1.0, 0.08, -0.6]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 0.5, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.28, 0.65, 8]} />
          <meshStandardMaterial color="#22c55e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.22, 0.55, 8]} />
          <meshStandardMaterial color="#4ade80" roughness={0.8} />
        </mesh>
      </group>
      {/* Right Rear Tree */}
      <group position={[0.95, 0.08, -0.95]}>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.04, 0.06, 0.5, 8]} />
          <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.26, 0.65, 8]} />
          <meshStandardMaterial color="#16a34a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.20, 0.55, 8]} />
          <meshStandardMaterial color="#22c55e" roughness={0.8} />
        </mesh>
      </group>
      {/* Round Bush on Lawn */}
      <mesh position={[-1.0, 0.16, 0.8]}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial color="#65a30d" roughness={0.85} />
      </mesh>

      {/* 3. GROUND FLOOR VILLA MAIN BODY (Crisp Contemporary White Concrete) */}
      <mesh position={[-0.12, 0.54, -0.12]}>
        <boxGeometry args={[1.68, 0.92, 1.68]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Floor-to-Ceiling Panoramic Glass Windows & Patio Sliding Doors */}
      {/* Left Front Panoramic Window 1 */}
      <mesh position={[-0.6, 0.52, 0.73]}>
        <boxGeometry args={[0.38, 0.72, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>
      {/* Left Front Panoramic Window 2 */}
      <mesh position={[-0.15, 0.52, 0.73]}>
        <boxGeometry args={[0.38, 0.72, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>
      {/* Right Front Sliding Glass Doors Opening onto Patio */}
      <mesh position={[0.35, 0.52, 0.73]}>
        <boxGeometry args={[0.42, 0.76, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>
      {/* Side Glass Panels */}
      <mesh position={[0.73, 0.52, 0.32]}>
        <boxGeometry args={[0.02, 0.76, 0.45]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>
      <mesh position={[0.73, 0.52, -0.25]}>
        <boxGeometry args={[0.02, 0.72, 0.42]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>

      {/* White Window Frames & Mullions */}
      <mesh position={[-0.6, 0.52, 0.74]}>
        <boxGeometry args={[0.015, 0.72, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.15, 0.52, 0.74]}>
        <boxGeometry args={[0.015, 0.72, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.35, 0.52, 0.74]}>
        <boxGeometry args={[0.015, 0.76, 0.01]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* 4. LOWER TERRACE CANOPY OVERHANG & 3 TILTED SOLAR PANELS */}
      {/* White Cantilevered Slab Overhang */}
      <mesh position={[-0.12, 1.02, -0.12]}>
        <boxGeometry args={[1.92, 0.07, 1.92]} />
        <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.1} />
      </mesh>

      {/* Row of 3 Tilted Solar Panels on Lower Roof Overhang (from reference) */}
      <group position={[-0.55, 1.15, 0.62]} rotation={[-0.38, 0, 0]}>
        {/* Support Racks */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.95, 0.02, 0.38]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* 3 Individual Solar Modules */}
        {[-0.32, 0, 0.32].map((x, idx) => (
          <group key={`lower-pv-${idx}`} position={[x, 0.02, 0]}>
            <mesh>
              <boxGeometry args={[0.29, 0.02, 0.36]} />
              <meshStandardMaterial color="#0f2b5c" roughness={0.12} metalness={0.85} />
            </mesh>
            <mesh position={[0, 0.012, 0]}>
              <boxGeometry args={[0.30, 0.005, 0.37]} />
              <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.014, 0]}>
              <boxGeometry args={[0.28, 0.002, 0.015]} />
              <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. SECOND STORY CONTEMPORARY CUBE VILLA (Setback Upper Floor) */}
      <mesh position={[-0.2, 1.48, -0.2]}>
        <boxGeometry args={[1.28, 0.85, 1.28]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.05} />
      </mesh>

      {/* Upper Floor Large Panoramic Windows */}
      <mesh position={[-0.38, 1.48, 0.45]}>
        <boxGeometry args={[0.42, 0.65, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>
      <mesh position={[0.12, 1.48, 0.45]}>
        <boxGeometry args={[0.38, 0.65, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>
      <mesh position={[0.45, 1.48, -0.05]}>
        <boxGeometry args={[0.02, 0.65, 0.55]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.08} metalness={0.85} />
      </mesh>

      {/* Outdoor Air Conditioning Compressor Unit on Upper Terrace (from reference) */}
      <group position={[0.38, 1.15, 0.45]}>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[0.18, 0.16, 0.12]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.35} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.08, 0.062]}>
          <boxGeometry args={[0.12, 0.10, 0.005]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
      </group>

      {/* 6. TOP SLANTED MONOPITCH ROOF WITH 6 LARGE PHOTOVOLTAIC PANELS (2x3 ARRAY) */}
      <group position={[-0.2, 2.02, -0.16]} rotation={[-Math.PI / 8.5, 0, 0]}>
        {/* Crisp White Overhanging Monopitch Roof Fascia */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.58, 0.08, 1.48]} />
          <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.1} />
        </mesh>

        {/* Heavy Aluminum Mounting Rails */}
        {[-0.55, 0, 0.55].map((x, i) => (
          <mesh key={`top-rail-${i}`} position={[x, 0.045, 0]}>
            <boxGeometry args={[0.03, 0.02, 1.35]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.15} />
          </mesh>
        ))}

        {/* 6 Large Photovoltaic Modules (2 rows of 3 panels exactly as in reference image) */}
        {[-0.45, 0, 0.45].map((x, xi) =>
          [-0.32, 0.32].map((z, zi) => (
            <group key={`top-pv-${xi}-${zi}`} position={[x, 0.065, z]}>
              {/* PV Silicon Cell Panel */}
              <mesh>
                <boxGeometry args={[0.42, 0.02, 0.58]} />
                <meshStandardMaterial
                  color="#0f2b5c"
                  roughness={0.12}
                  metalness={0.85}
                />
              </mesh>
              {/* Aluminum Frame */}
              <mesh position={[0, 0.006, 0]}>
                <boxGeometry args={[0.43, 0.012, 0.59]} />
                <meshStandardMaterial color="#f8fafc" metalness={0.95} roughness={0.15} />
              </mesh>
              {/* Silver Silicon Wafer Micro-Busbar Grid Lines */}
              <mesh position={[0, 0.012, 0]}>
                <boxGeometry args={[0.40, 0.002, 0.018]} />
                <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.35} />
              </mesh>
              <mesh position={[0, 0.012, -0.14]}>
                <boxGeometry args={[0.40, 0.002, 0.018]} />
                <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.35} />
              </mesh>
              <mesh position={[0, 0.012, 0.14]}>
                <boxGeometry args={[0.40, 0.002, 0.018]} />
                <meshStandardMaterial color="#93c5fd" emissive="#38bdf8" emissiveIntensity={0.35} />
              </mesh>
            </group>
          ))
        )}
      </group>

      {/* 7. External Bi-directional Smart Energy Meter on Villa Side Wall */}
      <group position={[0.73, 0.38, -0.1]}>
        <mesh>
          <boxGeometry args={[0.04, 0.16, 0.12]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
        {/* Digital LCD Display Screen */}
        <mesh position={[0.022, 0.02, 0]}>
          <boxGeometry args={[0.005, 0.06, 0.08]} />
          <meshStandardMaterial color="#0284c7" emissive="#38bdf8" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  )
}

// Retain alias for backward compatibility
export const SolarRooftopAsset: React.FC = SolarrooftopAsset

// =======================================================================
// 5. FACTORY ASSET (Heavy Manufacturing / Industrial Load)
// =======================================================================
export const FactoryAsset: React.FC = () => {
  return (
    <group>
      {/* Heavy Industrial Concrete Apron */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[3.7, 0.16, 2.9]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
      </mesh>

      {/* Main Industrial Production Hall (Two-Tone Architectural Metal Panels) */}
      <mesh position={[-0.2, 0.85, 0]}>
        <boxGeometry args={[2.9, 1.35, 2.3]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Lower Dark Plinth */}
      <mesh position={[-0.2, 0.3, 0]}>
        <boxGeometry args={[2.94, 0.35, 2.34]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Pitched Industrial Warehouse Roof */}
      <mesh position={[-0.2, 1.64, 0]}>
        <boxGeometry args={[3.0, 0.24, 2.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* Translucent Daylight Factory Skylights */}
      {[-0.65, 0.25].map((x, i) => (
        <mesh key={`skylight-${i}`} position={[x, 1.78, 0]}>
          <boxGeometry args={[0.5, 0.05, 1.7]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.15} metalness={0.85} transparent opacity={0.65} />
        </mesh>
      ))}

      {/* Industrial Twin Smokestacks with Alternating Aviation Warning Bands */}
      {[-1.25, -0.65].map((x, i) => (
        <group key={`chimney-${i}`} position={[x, 1.75, -0.65]}>
          {/* Base Chimney */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.14, 0.18, 0.75, 14]} />
            <meshStandardMaterial color="#64748b" roughness={0.7} />
          </mesh>
          {/* Hazard Red Band 1 */}
          <mesh position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.13, 0.14, 0.25, 14]} />
            <meshStandardMaterial color="#ef4444" roughness={0.45} />
          </mesh>
          {/* White Band */}
          <mesh position={[0, 1.05, 0]}>
            <cylinderGeometry args={[0.12, 0.13, 0.25, 14]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.45} />
          </mesh>
          {/* Hazard Red Band 2 */}
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.11, 0.12, 0.25, 14]} />
            <meshStandardMaterial color="#ef4444" roughness={0.45} />
          </mesh>
          {/* Steel Cap Rim */}
          <mesh position={[0, 1.45, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.06, 14]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Roll-up Freight Logistics Loading Dock */}
      <group position={[1.3, 0.52, 0.2]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.65, 0.85, 1.25]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
        {/* Safety Amber Ribbed Shutter Door */}
        <mesh position={[0.34, 0, 0]}>
          <boxGeometry args={[0.03, 0.7, 0.9]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.45} metalness={0.5} />
        </mesh>
        {/* Concrete Driveway Ramp */}
        <mesh position={[0.48, -0.32, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.42, 0.1, 0.95]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.9} />
        </mesh>
      </group>

      {/* Rooftop Industrial HVAC Ventilation Chiller */}
      <mesh position={[-0.4, 1.88, 0.65]}>
        <boxGeometry args={[0.45, 0.28, 0.45]} />
        <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.65} />
      </mesh>
    </group>
  )
}

// =======================================================================
// 6. COMMERCIAL ASSET (Modern Commercial Office Glass Tower)
// =======================================================================
export const CommercialAsset: React.FC = () => {
  return (
    <group>
      {/* Ground Floor Plaza & Dark Granite Columns */}
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.85, 0.76, 1.85]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.6} />
      </mesh>
      {/* Warm Illuminated Glass Reception Entry */}
      <mesh position={[0, 0.35, 0.94]}>
        <boxGeometry args={[0.85, 0.55, 0.05]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} transparent opacity={0.65} />
      </mesh>

      {/* Modern High-Rise Tinted Curtain Wall Glass (Sapphire Blue) */}
      <mesh position={[0, 2.05, 0]}>
        <boxGeometry args={[1.65, 2.65, 1.65]} />
        <meshStandardMaterial
          color="#0284c7"
          roughness={0.1}
          metalness={0.88}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Floor Dividing Horizontal Spandrel Mullions */}
      {[1.15, 1.75, 2.35, 2.95].map((y, i) => (
        <mesh key={`spandrel-${i}`} position={[0, y, 0]}>
          <boxGeometry args={[1.68, 0.06, 1.68]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}

      {/* Vertical Corner Aluminum Mullions */}
      {[-0.83, 0.83].map((x, ix) =>
        [-0.83, 0.83].map((z, iz) => (
          <mesh key={`mullion-${ix}-${iz}`} position={[x, 2.05, z]}>
            <boxGeometry args={[0.06, 2.7, 0.06]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
          </mesh>
        ))
      )}

      {/* Rooftop Mechanical Penthouse (HVAC Chillers & Elevator Headroom) */}
      <mesh position={[0, 3.52, 0]}>
        <boxGeometry args={[0.95, 0.32, 0.95]} />
        <meshStandardMaterial color="#475569" roughness={0.6} metalness={0.65} />
      </mesh>
      {/* HVAC Cooling Fan Exhaust */}
      <mesh position={[0.22, 3.72, 0.22]}>
        <cylinderGeometry args={[0.16, 0.16, 0.12, 14]} />
        <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Communications Antenna Spire */}
      <mesh position={[-0.22, 3.85, -0.22]}>
        <cylinderGeometry args={[0.015, 0.03, 0.45, 8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
      </mesh>
    </group>
  )
}

// =======================================================================
// 7. RESIDENTIAL ASSET (Suburban Family Home / Residential Load)
// =======================================================================
export const ResidentialAsset: React.FC = () => {
  return (
    <group>
      {/* Manicured Green Lawn Garden Pad */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[1.85, 0.08, 1.85]} />
        <meshStandardMaterial color="#15803d" roughness={0.9} />
      </mesh>

      {/* Stone Paved Front Walkway */}
      <mesh position={[0, 0.085, 0.68]}>
        <boxGeometry args={[0.42, 0.02, 0.52]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.95} />
      </mesh>

      {/* Warm Cream / Stucco Clapboard House Body */}
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[1.35, 0.85, 1.35]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.85} />
      </mesh>

      {/* Classic Terracotta Spanish Clay Tile Roof */}
      <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.2, 0.75, 4]} />
        <meshStandardMaterial color="#c2410c" roughness={0.7} />
      </mesh>

      {/* Masonry Red Brick Chimney */}
      <group position={[0.42, 1.15, -0.32]}>
        <mesh>
          <boxGeometry args={[0.22, 0.65, 0.22]} />
          <meshStandardMaterial color="#9a3412" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.26, 0.06, 0.26]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.9} />
        </mesh>
      </group>

      {/* Warm Oak Front Door */}
      <mesh position={[0, 0.38, 0.69]}>
        <boxGeometry args={[0.28, 0.54, 0.03]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      {/* Brass Door Knob */}
      <mesh position={[0.09, 0.38, 0.71]}>
        <sphereGeometry args={[0.022, 8, 8]} />
        <meshStandardMaterial color="#eab308" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* Framed Front Windows with Sky Reflection */}
      <mesh position={[-0.4, 0.52, 0.69]}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0.4, 0.52, 0.69]}>
        <boxGeometry args={[0.3, 0.3, 0.02]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.8} />
      </mesh>
    </group>
  )
}
