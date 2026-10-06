import { ComponentStatus } from '../types/network'
import { ViolationSeverity } from '../types/violation'

export const getStatusColor = (status: ComponentStatus | ViolationSeverity | 'infeasible' | 'optimal' | 'safe') => {
  switch (status) {
    case 'critical':
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        glow: 'shadow-[0_0_12px_rgba(220,38,38,0.3)]',
        badge: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800',
        hex: '#DC2626',
      }
    case 'warning':
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-[0_0_12px_rgba(217,119,6,0.3)]',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        hex: '#D97706',
      }
    case 'infeasible':
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        glow: 'shadow-[0_0_12px_rgba(220,38,38,0.3)]',
        badge: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800',
        hex: '#DC2626',
      }
    case 'normal':
    case 'optimal':
    case 'safe':
    case 'resolved':
    default:
      return {
        text: 'text-[#26352A] dark:text-[#A0C878]',
        bg: 'bg-[#DDEB9D]/30',
        border: 'border-[#A0C878]/40',
        glow: 'shadow-[0_0_12px_rgba(160,200,120,0.25)]',
        badge: 'bg-[#DDEB9D]/60 text-[#26352A] dark:bg-[#2D3E2F] dark:text-[#DDEB9D] border-[#C9C7B5] dark:border-[#3B4E3E]',
        hex: '#A0C878',
      }
  }
}
