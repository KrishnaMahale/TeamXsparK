import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidths[maxWidth]} bg-white/95 dark:bg-[#122C1F]/95 backdrop-blur-2xl border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 rounded-2xl shadow-[0_20px_60px_rgba(4,78,59,0.25)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200`}
      >
        <div className="px-6 py-4.5 border-b border-[#BBF7D0]/60 dark:border-[#86EFAC]/20 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-extrabold text-[#10251A] dark:text-white uppercase tracking-wide">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-[#425B4C] dark:text-[#A7F3D0] mt-0.5 font-medium">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#425B4C] hover:text-[#064E3B] dark:text-[#A7F3D0] dark:hover:text-white hover:bg-[#ECFDF3] dark:hover:bg-[#163826] rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export default Modal
