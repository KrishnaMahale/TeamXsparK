import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#047857] disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer'

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
    md: 'text-sm px-4 py-2 gap-2 rounded-xl',
    lg: 'text-base px-5 py-2.5 gap-2.5 rounded-xl',
  }

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#047857] to-[#10B981] hover:from-[#065F46] hover:to-[#059669] text-white shadow-[0_4px_16px_rgba(4,120,87,0.30)] border border-[#86EFAC]/40 hover:-translate-y-0.5 active:translate-y-0',
    secondary:
      'bg-white/90 dark:bg-[#122C1F]/90 hover:bg-white dark:hover:bg-[#183B28] text-[#064E3B] dark:text-[#A7F3D0] border border-[#BBF7D0]/80 dark:border-[#86EFAC]/30 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0',
    success:
      'bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white shadow-sm border border-[#86EFAC]/40 hover:-translate-y-0.5 active:translate-y-0',
    danger:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-xs focus:ring-red-500 hover:-translate-y-0.5 active:translate-y-0',
    ghost:
      'bg-transparent hover:bg-[#ECFDF3] dark:hover:bg-[#132F21] text-[#10251A] dark:text-white',
    outline:
      'bg-transparent border border-[#047857] dark:border-[#86EFAC] text-[#047857] dark:text-[#86EFAC] hover:bg-[#ECFDF3] dark:hover:bg-[#132F21]/60',
  }

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
}

export default Button
