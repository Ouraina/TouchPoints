import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantStyles = {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'white',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)'
    },
    secondary: {
      backgroundColor: 'var(--surface)',
      color: 'var(--primary)',
      border: '2px solid var(--primary)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)'
    },
    success: {
      backgroundColor: 'var(--success)',
      color: 'white',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)'
    },
    danger: {
      backgroundColor: 'var(--error)',
      color: 'white',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)'
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      border: '2px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'none'
    }
  }
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    const button = e.currentTarget;
    if (variant === 'primary') {
      button.style.backgroundColor = 'var(--primary-hover)';
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = 'var(--shadow-md)';
    } else if (variant === 'secondary') {
      button.style.backgroundColor = 'var(--primary)';
      button.style.color = 'white';
      button.style.transform = 'translateY(-1px)';
    } else if (variant === 'success') {
      button.style.backgroundColor = '#6BC519';
      button.style.transform = 'translateY(-1px)';
    } else if (variant === 'outline') {
      button.style.backgroundColor = 'var(--primary)';
      button.style.color = 'white';
      button.style.borderColor = 'var(--primary)';
      button.style.transform = 'translateY(-1px)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    
    const button = e.currentTarget;
    const originalStyle = variantStyles[variant];
    Object.assign(button.style, originalStyle);
    button.style.transform = 'translateY(0)';
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${className}`}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </button>
  )
}