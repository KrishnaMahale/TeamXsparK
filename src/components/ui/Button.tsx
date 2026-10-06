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
    'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A0C878] disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  }

  const variantStyles = {
    primary:
      'bg-[#A0C878] hover:bg-[#8EB864] active:bg-[#7FA557] text-[#26352A] shadow-xs focus:ring-offset-[#FFFDF6] dark:focus:ring-offset-[#151F17]',
    secondary:
      'bg-[#FAF6E9] dark:bg-[#1E2B20] hover:bg-[#DDEB9D] dark:hover:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED] border border-[#DDD9C9] dark:border-[#2C3C2E] shadow-xs focus:ring-offset-[#FFFDF6] dark:focus:ring-offset-[#151F17]',
    success:
      'bg-[#A0C878] hover:bg-[#8EB864] active:bg-[#7FA557] text-[#26352A] shadow-xs focus:ring-offset-[#FFFDF6] dark:focus:ring-offset-[#151F17]',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white shadow-xs focus:ring-red-500 focus:ring-offset-[#FFFDF6] dark:focus:ring-offset-[#151F17]',
    ghost:
      'bg-transparent hover:bg-[#DDEB9D]/50 dark:hover:bg-[#2D3E2F] text-[#26352A] dark:text-[#F2F5ED]',
    outline:
      'bg-transparent border border-[#A0C878] text-[#26352A] dark:text-[#A0C878] hover:bg-[#DDEB9D]/30 dark:hover:bg-[#2D3E2F]/40',
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
