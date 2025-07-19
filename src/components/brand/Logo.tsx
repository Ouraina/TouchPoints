import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon - Two overlapping circles representing connection */}
      <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle
            cx="15"
            cy="20"
            r="12"
            fill="var(--primary)"
            opacity="0.9"
          />
          {/* Overlapping circle */}
          <circle
            cx="25"
            cy="20"
            r="12"
            fill="var(--secondary)"
            opacity="0.9"
          />
          {/* Intersection highlight */}
          <circle
            cx="20"
            cy="20"
            r="6"
            fill="white"
            opacity="0.3"
          />
          {/* Central connection point */}
          <circle
            cx="20"
            cy="20"
            r="2"
            fill="white"
          />
        </svg>
      </div>

      {/* Text Logo */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-bold text-[var(--text-primary)] leading-none ${textSizeClasses[size]}`}>
            TouchPoints
          </h1>
          {size === 'lg' || size === 'xl' ? (
            <p className="text-[var(--text-secondary)] text-sm font-medium leading-none mt-1">
              Coordinating Care, Preserving Memories
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

// Simplified icon-only version for smaller spaces
export const LogoIcon: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="15"
          cy="20"
          r="12"
          fill="var(--primary)"
          opacity="0.9"
        />
        <circle
          cx="25"
          cy="20"
          r="12"
          fill="var(--secondary)"
          opacity="0.9"
        />
        <circle
          cx="20"
          cy="20"
          r="6"
          fill="white"
          opacity="0.3"
        />
        <circle
          cx="20"
          cy="20"
          r="2"
          fill="white"
        />
      </svg>
    </div>
  );
};