import { ComponentStatus } from '../types/network'
import { ViolationSeverity } from '../types/violation'

export const getStatusColor = (status: ComponentStatus | ViolationSeverity | 'infeasible' | 'optimal' | 'safe') => {
  switch (status) {
    case 'critical':
      return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        hex: '#ef4444',
      }
    case 'warning':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        hex: '#f59e0b',
      }
    case 'infeasible':
      return {
        text: 'text-red-400',
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]',
        badge: 'bg-red-500/25 text-red-300 border-red-500/50',
        hex: '#dc2626',
      }
    case 'normal':
    case 'optimal':
    case 'safe':
    case 'resolved':
    default:
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        hex: '#10b981',
      }
  }
}
