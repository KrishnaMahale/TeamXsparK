/**
 * Formats voltage in per-unit (pu)
 */
export const formatVoltage = (pu: number): string => {
  return `${pu.toFixed(3)} pu`
}

/**
 * Formats power in kW or MW
 */
export const formatPower = (kw: number): string => {
  if (Math.abs(kw) >= 1000) {
    return `${(kw / 1000).toFixed(2)} MW`
  }
  return `${Math.round(kw)} kW`
}

/**
 * Formats percentage
 */
export const formatPercent = (val: number): string => {
  return `${Math.round(val)}%`
}

/**
 * Formats temperature
 */
export const formatTemp = (celsius: number): string => {
  return `${Math.round(celsius)} °C`
}

/**
 * Formats frequency in Hz
 */
export const formatFrequency = (hz: number): string => {
  return `${hz.toFixed(2)} Hz`
}
