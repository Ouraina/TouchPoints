import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  const baseStyle = {
    backgroundColor: 'var(--surface)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border)',
    padding: '1.5rem',
    transition: 'all 0.2s ease'
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    const card = e.currentTarget;
    card.style.transform = 'translateY(-2px)';
    card.style.boxShadow = 'var(--shadow-lg)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    const card = e.currentTarget;
    card.style.transform = 'translateY(0)';
    card.style.boxShadow = 'var(--shadow-md)';
  };
  
  return (
    <div 
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}