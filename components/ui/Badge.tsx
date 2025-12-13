'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

export function Badge({
  variant = 'primary',
  size = 'sm',
  children,
  className,
}: BadgeProps) {
  const variants = {
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-mint-50 text-mint-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-coral-50 text-coral-600',
    neutral: 'bg-gray-100 text-gray-600',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}
