'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'primary' | 'accent' | 'success' | 'warning'
  className?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'primary',
  className,
}: StatCardProps) {
  const variants = {
    primary: {
      bg: 'bg-white dark:bg-gray-900',
      icon: 'bg-primary-500 text-white',
      accent: 'text-gray-900 dark:text-gray-100',
    },
    accent: {
      bg: 'bg-white dark:bg-gray-900',
      icon: 'bg-accent-500 text-white',
      accent: 'text-gray-900 dark:text-gray-100',
    },
    success: {
      bg: 'bg-white dark:bg-gray-900',
      icon: 'bg-mint-500 text-white',
      accent: 'text-mint-600',
    },
    warning: {
      bg: 'bg-white dark:bg-gray-900',
      icon: 'bg-amber-500 text-white',
      accent: 'text-amber-600',
    },
  }

  const config = variants[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      style={{ willChange: 'transform' }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 shadow-soft border border-gray-100 dark:border-gray-800',
        config.bg,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={cn('text-2xl font-semibold mt-1 tracking-tight', config.accent)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded-md',
                  trend.isPositive 
                    ? 'text-mint-700 bg-mint-50 dark:bg-mint-500/10 dark:text-mint-200' 
                    : 'text-coral-700 bg-coral-50 dark:bg-coral-500/10 dark:text-coral-200'
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'p-2.5 rounded-xl',
              config.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}
