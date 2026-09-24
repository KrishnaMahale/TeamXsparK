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
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A1124] disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-500 text-white font-medium focus:ring-blue-500 active:bg-blue-700',
    secondary:
      'bg-[#16223F] hover:bg-[#1E2D52] text-slate-200 border border-[#273859] focus:ring-slate-400 active:bg-[#111A30]',
    success:
      'bg-emerald-600 hover:bg-emerald-500 text-white font-medium focus:ring-emerald-500 active:bg-emerald-700',
    danger:
      'bg-red-600 hover:bg-red-500 text-white font-medium focus:ring-red-500 active:bg-red-700',
    ghost:
      'bg-transparent hover:bg-[#16223F] text-slate-300 hover:text-white',
    outline:
      'bg-transparent border border-blue-500/60 text-blue-400 hover:bg-blue-600/10 focus:ring-blue-500',
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
