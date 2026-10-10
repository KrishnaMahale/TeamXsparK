import React from 'react'

/**
 * SolarRooftopVillaSvg
 * A high-fidelity isometric vector illustration icon of the modern 2-story contemporary villa
 * with floor-to-ceiling glass windows, tiled terrace patio, conical pine trees, and rooftop photovoltaic solar arrays
 * precisely matching the user's reference image.
 */
export const SolarRooftopVillaSvg: React.FC<{
  className?: string
  size?: number | string
  x?: number | string
  y?: number | string
}> = ({ className = 'w-6 h-6', size, x, y }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    x={x}
    y={y}
    width={size}
    height={size}
    style={size ? { width: size, height: size } : undefined}
  >
    {/* Stylized Golden Sun with Radiating Rays */}
    <circle cx="13" cy="13" r="5" fill="#FBBF24" />
    <g stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round">
      <line x1="13" y1="4.5" x2="13" y2="6.8" />
      <line x1="13" y1="19.2" x2="13" y2="21.5" />
      <line x1="4.5" y1="13" x2="6.8" y2="13" />
      <line x1="19.2" y1="13" x2="21.5" y2="13" />
      <line x1="7" y1="7" x2="8.6" y2="8.6" />
      <line x1="17.4" y1="17.4" x2="19" y2="19" />
      <line x1="7" y1="19" x2="8.6" y2="17.4" />
      <line x1="17.4" y1="8.6" x2="19" y2="7" />
    </g>

    {/* Isometric Manicured Green Lawn Base */}
    <path
      d="M 6 42 L 34 58 L 60 42 L 32 26 Z"
      fill="#84CC16"
    />
    <path
      d="M 6 42 L 34 58 L 34 61 L 6 45 Z"
      fill="#65A30D"
    />
    <path
      d="M 34 58 L 60 42 L 60 45 L 34 61 Z"
      fill="#4D7C0F"
    />

    {/* Tiled Patio Terrace (Front Right) */}
    <path
      d="M 28 42 L 44 51 L 56 44 L 40 35 Z"
      fill="#E2E8F0"
    />
    {/* Patio tile grid lines */}
    <line x1="32" y1="44.2" x2="44" y2="37.2" stroke="#CBD5E1" strokeWidth="0.5" />
    <line x1="36" y1="46.5" x2="48" y2="39.5" stroke="#CBD5E1" strokeWidth="0.5" />
    <line x1="40" y1="48.8" x2="52" y2="41.8" stroke="#CBD5E1" strokeWidth="0.5" />
    <line x1="33" y1="39" x2="49" y2="48" stroke="#CBD5E1" strokeWidth="0.5" />
    <line x1="37" y1="37" x2="53" y2="46" stroke="#CBD5E1" strokeWidth="0.5" />

    {/* Modern Conical Pine / Cypress Trees */}
    {/* Left Tree */}
    <path d="M 12 39 L 9 35 L 10.5 35 L 8 30 L 10 30 L 7 24 L 11 24 L 11 20 L 13 24 L 17 24 L 14 30 L 16 30 L 13.5 35 L 15 35 Z" fill="#22C55E" />
    <rect x="11.5" y="38" width="1" height="3" fill="#78350F" />
    {/* Right Tree */}
    <path d="M 52 33 L 50 30 L 51 30 L 49 26 L 50.5 26 L 48 21 L 51 21 L 51 18 L 53 21 L 56 21 L 53.5 26 L 55 26 L 53 30 L 54 30 Z" fill="#16A34A" />

    {/* Ground Floor Villa Main Body (White Concrete) */}
    <path
      d="M 18 36 L 34 45 L 34 32 L 18 23 Z"
      fill="#F8FAFC"
    />
    <path
      d="M 34 45 L 48 37 L 48 24 L 34 32 Z"
      fill="#E2E8F0"
    />

    {/* Ground Floor Panoramic Windows & Sliding Doors (Turquoise Blue) */}
    {/* Left Face Window 1 */}
    <path d="M 20 34.5 L 25 37.3 L 25 28.5 L 20 25.7 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.6" />
    {/* Left Face Window 2 */}
    <path d="M 27 38.4 L 32 41.2 L 32 32.4 L 27 29.6 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.6" />
    {/* Right Face Sliding Patio Doors */}
    <path d="M 36 43 L 41 40.2 L 41 30.5 L 36 33.3 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.6" />
    <path d="M 42 39.6 L 46 37.3 L 46 27.5 L 42 29.8 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.6" />

    {/* Lower Roof Canopy / Cantilever Overhang */}
    <path
      d="M 15 25 L 35 36.5 L 49 28.5 L 29 17 Z"
      fill="#FFFFFF"
      stroke="#CBD5E1"
      strokeWidth="0.5"
    />

    {/* Row of 3 Tilted Solar Panels on Lower Roof Overhang */}
    <g transform="translate(19, 21.5)">
      <path d="M 0 3 L 4 5.3 L 7 3.5 L 3 1.2 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      <path d="M 4.5 5.5 L 8.5 7.8 L 11.5 6 L 7.5 3.7 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      <path d="M 9 8 L 13 10.3 L 16 8.5 L 12 6.2 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
    </g>

    {/* Second Floor Cube (Setback White Villa) */}
    <path
      d="M 26 24 L 38 31 L 38 19 L 26 12 Z"
      fill="#F8FAFC"
    />
    <path
      d="M 38 31 L 47 25.8 L 47 13.8 L 38 19 Z"
      fill="#E2E8F0"
    />
    {/* Upper Floor Large Panoramic Windows */}
    <path d="M 28 22.5 L 33 25.4 L 33 17.5 L 28 14.6 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.5" />
    <path d="M 34 26 L 37 27.7 L 37 19.8 L 34 18.1 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.5" />
    <path d="M 40 28.8 L 45 25.9 L 45 16.9 L 40 19.8 Z" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="0.5" />

    {/* Outdoor AC Compressor Unit on Upper Terrace */}
    <rect x="36" y="27.5" width="2.5" height="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="0.3" />

    {/* Top Slanted Monopitch Roof (Overhanging White Fascia) */}
    <path
      d="M 23 13.5 L 40 23.5 L 51 17 L 34 7 Z"
      fill="#FFFFFF"
      stroke="#CBD5E1"
      strokeWidth="0.5"
    />

    {/* 6 Large Rooftop Solar PV Panels (2x3 Array on Top Roof) */}
    <g transform="translate(25.5, 9.5)">
      {/* Panel 1 */}
      <path d="M 2 2.5 L 6.5 5.1 L 10 3.1 L 5.5 0.5 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      {/* Panel 2 */}
      <path d="M 7 5.4 L 11.5 8 L 15 6 L 10.5 3.4 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      {/* Panel 3 */}
      <path d="M 12 8.3 L 16.5 10.9 L 20 8.9 L 15.5 6.3 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      {/* Panel 4 (Second row) */}
      <path d="M 5 0.2 L 9.5 2.8 L 13 0.8 L 8.5 -1.8 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      {/* Panel 5 */}
      <path d="M 10 3.1 L 14.5 5.7 L 18 3.7 L 13.5 1.1 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      {/* Panel 6 */}
      <path d="M 15 6 L 19.5 8.6 L 23 6.6 L 18.5 4 Z" fill="#1E3A8A" stroke="#E2E8F0" strokeWidth="0.4" />
      {/* Grid cell lines */}
      <line x1="4.2" y1="3.8" x2="7.7" y2="1.8" stroke="#93C5FD" strokeWidth="0.3" />
      <line x1="9.2" y1="6.7" x2="12.7" y2="4.7" stroke="#93C5FD" strokeWidth="0.3" />
      <line x1="14.2" y1="9.6" x2="17.7" y2="7.6" stroke="#93C5FD" strokeWidth="0.3" />
    </g>

    {/* Topiary Potted Plants on Patio */}
    <circle cx="43" cy="46" r="1.5" fill="#84CC16" />
    <rect x="42.3" y="46.8" width="1.4" height="1.4" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.3" />
    <circle cx="48" cy="42" r="1.5" fill="#84CC16" />
    <rect x="47.3" y="42.8" width="1.4" height="1.4" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.3" />
  </svg>
)

export default SolarRooftopVillaSvg
