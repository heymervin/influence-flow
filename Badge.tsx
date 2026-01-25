import React from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'neutral' | 'danger';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  const styles: Record<BadgeVariant, string> = {
    default: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    neutral: 'bg-gray-100 text-gray-700',
    danger: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
