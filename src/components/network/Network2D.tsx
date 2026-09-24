import React from 'react'
import {
  Sun,
  BatteryCharging,
  Factory,
  Home,
  Building,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { useGridStore } from '../../store/gridStore'
import { useSelectedComponent } from '../../hooks/useSelectedComponent'

export const Network2D: React.FC = () => {
  const { network } = useGridStore()
  const { selectedComponent, setSelectedComponent } = useSelectedComponent()

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
  const bat01 = network.batteries.find((b) => b.id === 'BAT-01') || network.batteries[0]
  const load01 = network.loads.find((l) => l.id === 'LOAD-01') || network.loads[0]
  const load02 = network.loads.find((l) => l.id === 'LOAD-02') || network.loads[1]
  const load03 = network.loads.find((l) => l.id === 'LOAD-03') || network.loads[2]

  const isB3Critical = b3?.status === 'critical'
  const isF02Critical = f02?.status === 'critical'

  const isSelected = (type: string, id: string) =>
    selectedComponent?.type === type && selectedComponent?.id === id

  const getNodeColor = (status?: string, isSel?: boolean) => {
    if (isSel) return '#2563EB' // Solid Electric Blue
    if (status === 'critical') return '#EF4444' // Solid Red
    if (status === 'warning') return '#F59E0B' // Solid Amber
    return '#10B981' // Solid Green
  }

  const getFeederStroke = (status?: string, isSel?: boolean) => {
    if (isSel) return '#2563EB'
    if (status === 'critical') return '#EF4444'
    if (status === 'warning') return '#F59E0B'
    return '#3B82F6'
  }

  return (
    <div className="relative w-full aspect-[4/3] max-h-[600px] min-h-[400px] flex items-center justify-center overflow-hidden bg-[#0A1124] rounded-xl border border-[#1E293B] p-2 sm:p-4">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#3B82F6_1px,transparent_1px)] bg-[size:24px_24px]" />

      <svg
        viewBox="0 0 920 620"
        className="w-full h-full object-contain select-none"
      >
        <defs>
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
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#3B82F6" />
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
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#EF4444" />
          </marker>
          <marker
            id="arrow-reverse"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#F59E0B" />
          </marker>
        </defs>

        {/* ===================================================
            FEEDER LINES & BRANCHES
            =================================================== */}

        {/* 1. Grid Connection to Substation */}
        <line
          x1="460"
          y1="35"
          x2="460"
          y2="85"
          stroke="#3B82F6"
          strokeWidth="3"
        />

        {/* 2. Substation to Bus B1 (Feeder F-01) */}
        <g
          className="cursor-pointer group"
          onClick={() => {
            if (f01) setSelectedComponent({ type: 'feeder', id: 'F-01', data: f01 })
          }}
        >
          <line
            x1="460"
            y1="135"
            x2="460"
            y2="195"
            stroke={getFeederStroke(f01?.status, isSelected('feeder', 'F-01'))}
            strokeWidth={isSelected('feeder', 'F-01') ? '5' : '3.5'}
            markerEnd="url(#arrow-normal)"
          />
          <rect
            x="480"
            y="150"
            width="65"
            height="22"
            rx="4"
            fill="#111C35"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <text x="512" y="165" fill="#94A3B8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            F-01 {f01?.loadingPercent || 68}%
          </text>
        </g>

        {/* 3. Bus B1 to Bus B2 (Feeder F-LINE-12) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f12) setSelectedComponent({ type: 'feeder', id: 'F-LINE-12', data: f12 })
          }}
        >
          <path
            d="M 440 215 L 290 280"
            stroke={getFeederStroke(f12?.status, isSelected('feeder', 'F-LINE-12'))}
            strokeWidth={isSelected('feeder', 'F-LINE-12') ? '5' : '3'}
            markerEnd="url(#arrow-normal)"
          />
        </g>

        {/* 4. Bus B2 to Bus B3 (Feeder F-02 - Critical Congestion Line) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f02) setSelectedComponent({ type: 'feeder', id: 'F-02', data: f02 })
          }}
        >
          <line
            x1="315"
            y1="295"
            x2="615"
            y2="295"
            stroke={getFeederStroke(f02?.status, isSelected('feeder', 'F-02'))}
            strokeWidth={isF02Critical ? '4.5' : '3.5'}
            strokeDasharray={isF02Critical ? '6,3' : undefined}
            markerEnd={isF02Critical ? 'url(#arrow-critical)' : 'url(#arrow-normal)'}
          />
          {/* Label badge */}
          <rect
            x="430"
            y="280"
            width="80"
            height="26"
            rx="4"
            fill="#111C35"
            stroke={isF02Critical ? '#EF4444' : '#1E293B'}
            strokeWidth="1.5"
          />
          <text
            x="470"
            y="297"
            fill={isF02Critical ? '#EF4444' : '#F8FAFC'}
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            F-02: {f02?.loadingPercent || 108}%
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
            stroke={f03?.isSwitchClosed ? '#10B981' : '#64748B'}
            strokeWidth="2.5"
            strokeDasharray={f03?.isSwitchClosed ? undefined : '5,5'}
            fill="none"
          />
          {/* Switch marker */}
          <circle cx="560" cy="240" r="10" fill="#111C35" stroke={f03?.isSwitchClosed ? '#10B981' : '#64748B'} strokeWidth="1.5" />
          <text x="560" y="244" fill={f03?.isSwitchClosed ? '#10B981' : '#94A3B8'} fontSize="9" fontWeight="bold" textAnchor="middle">
            {f03?.isSwitchClosed ? 'ON' : 'OFF'}
          </text>
          <text x="560" y="260" fill="#94A3B8" fontSize="10" textAnchor="middle">
            F-03 Tie-Switch
          </text>
        </g>

        {/* 6. Bus B3 to Bus B4 (Feeder F-04) */}
        <g
          className="cursor-pointer"
          onClick={() => {
            if (f04) setSelectedComponent({ type: 'feeder', id: 'F-04', data: f04 })
          }}
        >
          <line
            x1="640"
            y1="315"
            x2="640"
            y2="455"
            stroke={getFeederStroke(f04?.status, isSelected('feeder', 'F-04'))}
            strokeWidth={isSelected('feeder', 'F-04') ? '5' : '3'}
            markerEnd="url(#arrow-normal)"
          />
          <rect
            x="655"
            y="380"
            width="65"
            height="22"
            rx="4"
            fill="#111C35"
            stroke="#1E293B"
            strokeWidth="1"
          />
          <text x="687" y="395" fill="#94A3B8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            F-04 {f04?.loadingPercent || 82}%
          </text>
        </g>

        {/* 7. Branch: B2 to Solar Unit (SOLAR-01) */}
        <line x1="285" y1="295" x2="160" y2="295" stroke="#F59E0B" strokeWidth="2.5" markerEnd="url(#arrow-reverse)" />

        {/* 8. Branch: B2 to Commercial Load (LOAD-01) */}
        <line x1="290" y1="315" x2="290" y2="425" stroke="#3B82F6" strokeWidth="2.5" markerEnd="url(#arrow-normal)" />

        {/* 9. Branch: B3 to Battery Unit (BAT-01) */}
        <line x1="660" y1="295" x2="775" y2="295" stroke="#10B981" strokeWidth="2.5" />

        {/* 10. Branch: B3 to Residential Load (LOAD-02) */}
        <line x1="620" y1="310" x2="520" y2="425" stroke="#3B82F6" strokeWidth="2.5" markerEnd="url(#arrow-normal)" />

        {/* 11. Branch: B4 to Industrial Load (LOAD-03) */}
        <line x1="660" y1="475" x2="775" y2="475" stroke="#3B82F6" strokeWidth="2.5" markerEnd="url(#arrow-normal)" />

        {/* ===================================================
            EQUIPMENT ASSETS & NODES
            =================================================== */}

        {/* GRID INJECTION ICON */}
        <g className="cursor-pointer" onClick={() => setSelectedComponent({ type: 'transformer', id: 'GRID', data: network.substation })}>
          <rect x="420" y="8" width="80" height="26" rx="4" fill="#16223F" stroke="#2563EB" strokeWidth="1.5" />
          <text x="460" y="25" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
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
          <rect
            x="410"
            y="85"
            width="100"
            height="48"
            rx="6"
            fill="#111C35"
            stroke={isSelected('transformer', 'TX-MAIN') ? '#2563EB' : '#1E293B'}
            strokeWidth={isSelected('transformer', 'TX-MAIN') ? '2.5' : '1.5'}
          />
          <text x="460" y="105" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle">
            SUBSTATION
          </text>
          <text x="460" y="122" fill="#94A3B8" fontSize="10" textAnchor="middle">
            33 / 11 kV (68%)
          </text>
        </g>

        {/* BUS 1 (B1) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'bus', id: 'B1', data: b1 })}
        >
          <circle
            cx="460"
            cy="205"
            r="18"
            fill="#111C35"
            stroke={getNodeColor(b1?.status, isSelected('bus', 'B1'))}
            strokeWidth="3.5"
          />
          <text x="460" y="210" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
            B1
          </text>
          <text x="460" y="235" fill="#94A3B8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            {b1?.voltage.toFixed(3) || '1.020'} pu
          </text>
        </g>

        {/* BUS 2 (B2) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'bus', id: 'B2', data: b2 })}
        >
          <circle
            cx="290"
            cy="295"
            r="18"
            fill="#111C35"
            stroke={getNodeColor(b2?.status, isSelected('bus', 'B2'))}
            strokeWidth="3.5"
          />
          <text x="290" y="300" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
            B2
          </text>
          <text x="290" y="325" fill="#94A3B8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            {b2?.voltage.toFixed(3) || '1.010'} pu
          </text>
        </g>

        {/* BUS 3 (B3) - CRITICAL OVER-VOLTAGE HOTSPOT */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'bus', id: 'B3', data: b3 })}
        >
          <circle
            cx="640"
            cy="295"
            r="20"
            fill="#111C35"
            stroke={getNodeColor(b3?.status, isSelected('bus', 'B3'))}
            strokeWidth={isB3Critical ? '4' : '3.5'}
          />
          <text x="640" y="300" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle">
            B3
          </text>
          <text
            x="640"
            y="328"
            fill={isB3Critical ? '#EF4444' : '#94A3B8'}
            fontSize="12"
            fontWeight={isB3Critical ? 'bold' : 'normal'}
            textAnchor="middle"
            fontFamily="monospace"
          >
            {b3?.voltage.toFixed(3) || '1.074'} pu
          </text>
          {isB3Critical && (
            <g transform="translate(655, 268)">
              <rect x="-4" y="-2" width="90" height="20" rx="3" fill="#EF4444" />
              <text x="41" y="12" fill="#FFFFFF" fontSize="9" fontWeight="bold" textAnchor="middle">
                OVER-VOLTAGE
              </text>
            </g>
          )}
        </g>

        {/* BUS 4 (B4) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'bus', id: 'B4', data: b4 })}
        >
          <circle
            cx="640"
            cy="475"
            r="18"
            fill="#111C35"
            stroke={getNodeColor(b4?.status, isSelected('bus', 'B4'))}
            strokeWidth="3.5"
          />
          <text x="640" y="480" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
            B4
          </text>
          <text x="640" y="505" fill="#94A3B8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            {b4?.voltage.toFixed(3) || '0.992'} pu
          </text>
        </g>

        {/* SOLAR FARM ALPHA (ATTACHED TO B2) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'solar', id: 'SOLAR-01', data: solar01 })}
        >
          <rect
            x="70"
            y="268"
            width="90"
            height="54"
            rx="6"
            fill="#111C35"
            stroke={isSelected('solar', 'SOLAR-01') ? '#2563EB' : '#F59E0B'}
            strokeWidth="1.5"
          />
          <text x="115" y="288" fill="#F59E0B" fontSize="11" fontWeight="bold" textAnchor="middle">
            SOLAR PV
          </text>
          <text x="115" y="306" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {solar01?.generationKw || 240} kW
          </text>
        </g>

        {/* BATTERY STORAGE (ATTACHED TO B3) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'battery', id: 'BAT-01', data: bat01 })}
        >
          <rect
            x="775"
            y="268"
            width="95"
            height="54"
            rx="6"
            fill="#111C35"
            stroke={isSelected('battery', 'BAT-01') ? '#2563EB' : '#10B981'}
            strokeWidth="1.5"
          />
          <text x="822" y="288" fill="#10B981" fontSize="11" fontWeight="bold" textAnchor="middle">
            BESS 100kWh
          </text>
          <text x="822" y="306" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            SOC {bat01?.socPercent || 62}%
          </text>
        </g>

        {/* LOAD 1: COMMERCIAL (B2) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'load', id: 'LOAD-01', data: load01 })}
        >
          <rect
            x="240"
            y="425"
            width="100"
            height="46"
            rx="6"
            fill="#111C35"
            stroke={isSelected('load', 'LOAD-01') ? '#2563EB' : '#1E293B'}
            strokeWidth="1.5"
          />
          <text x="290" y="443" fill="#94A3B8" fontSize="10" textAnchor="middle">
            Commercial Load
          </text>
          <text x="290" y="460" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {load01?.powerKw || 90} kW
          </text>
        </g>

        {/* LOAD 2: RESIDENTIAL (B3) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'load', id: 'LOAD-02', data: load02 })}
        >
          <rect
            x="465"
            y="425"
            width="100"
            height="46"
            rx="6"
            fill="#111C35"
            stroke={isSelected('load', 'LOAD-02') ? '#2563EB' : '#1E293B'}
            strokeWidth="1.5"
          />
          <text x="515" y="443" fill="#94A3B8" fontSize="10" textAnchor="middle">
            Residential Load
          </text>
          <text x="515" y="460" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {load02?.powerKw || 60} kW
          </text>
        </g>

        {/* LOAD 3: INDUSTRIAL (B4) */}
        <g
          className="cursor-pointer"
          onClick={() => setSelectedComponent({ type: 'load', id: 'LOAD-03', data: load03 })}
        >
          <rect
            x="775"
            y="450"
            width="105"
            height="46"
            rx="6"
            fill="#111C35"
            stroke={isSelected('load', 'LOAD-03') ? '#2563EB' : '#1E293B'}
            strokeWidth="1.5"
          />
          <text x="827" y="468" fill="#94A3B8" fontSize="10" textAnchor="middle">
            Industrial Park
          </text>
          <text x="827" y="485" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            {load03?.powerKw || 120} kW
          </text>
        </g>

        {/* Schematic Legend Watermark */}
        <g transform="translate(20, 565)">
          <rect x="0" y="0" width="310" height="34" rx="4" fill="#0E172C" stroke="#1E293B" strokeWidth="1" />
          <circle cx="20" cy="17" r="5" fill="#10B981" />
          <text x="32" y="21" fill="#94A3B8" fontSize="10">Normal</text>

          <circle cx="85" cy="17" r="5" fill="#F59E0B" />
          <text x="97" y="21" fill="#94A3B8" fontSize="10">Warning</text>

          <circle cx="155" cy="17" r="5" fill="#EF4444" />
          <text x="167" y="21" fill="#94A3B8" fontSize="10">Violation</text>

          <circle cx="230" cy="17" r="5" fill="#2563EB" />
          <text x="242" y="21" fill="#94A3B8" fontSize="10">Selected</text>
        </g>
      </svg>
    </div>
  )
}
