import { useState, useEffect, useRef } from 'react'
import { useGridStore } from '../store/gridStore'

export const useTimeSimulation = () => {
  const { currentTime, setTime, isLoading } = useGridStore()
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [speed, setSpeed] = useState<1 | 2 | 4>(1)
  const timerRef = useRef<number | null>(null)

  // Converts "13:15" to fractional hours e.g. 13.25
  const timeToHours = (t: string): number => {
    const [h, m] = t.split(':').map(Number)
    return (h || 0) + (m || 0) / 60
  }

  // Converts fractional hours 13.25 to "13:15"
  const hoursToTime = (h: number): string => {
    const totalMinutes = Math.round(h * 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const currentHours = timeToHours(currentTime)

  const handleSliderChange = (newHours: number) => {
    const clamped = Math.min(24, Math.max(6, newHours))
    const formatted = hoursToTime(clamped)
    setTime(formatted)
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const toggleSpeed = () => {
    setSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))
  }

  const stepForward = () => {
    const nextHour = Math.min(24, Math.floor(currentHours) + 1)
    setTime(hoursToTime(nextHour))
  }

  const stepBackward = () => {
    const prevHour = Math.max(6, Math.ceil(currentHours) - 1)
    setTime(hoursToTime(prevHour))
  }

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.round(1800 / speed)
      timerRef.current = window.setInterval(() => {
        const nextHour = currentHours + 1.0 // advance 1 hour every tick
        if (nextHour > 24) {
          setTime('06:00')
        } else {
          setTime(hoursToTime(nextHour))
        }
      }, intervalMs)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, currentHours, speed, setTime])

  return {
    currentTime,
    currentHours,
    isPlaying,
    isLoading,
    speed,
    setSpeed,
    toggleSpeed,
    handleSliderChange,
    togglePlay,
    stepForward,
    stepBackward,
    setTime,
  }
}

