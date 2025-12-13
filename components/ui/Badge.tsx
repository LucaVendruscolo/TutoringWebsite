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
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-200',
    accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/10 dark:text-accent-200',
    success: 'bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-200',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200',
    danger: 'bg-coral-50 text-coral-600 dark:bg-coral-500/10 dark:text-coral-200',
    neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-200',
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
