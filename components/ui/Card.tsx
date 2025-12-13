'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'glass' | 'solid'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  className,
  variant = 'default',
  hover = false,
  padding = 'md',
  children,
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-white border border-gray-100',
    glass: 'bg-white/80 backdrop-blur-xl border border-gray-100/50',
    solid: 'bg-white border border-gray-200',
  }

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <motion.div
      className={cn(
        'rounded-2xl shadow-soft',
        variants[variant],
        paddings[padding],
        hover && 'cursor-pointer',
        className
      )}
      style={{ willChange: 'transform, opacity' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { y: -2, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' } : undefined}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
      }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function CardHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mb-5', className)}>
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <p className={cn('text-sm text-gray-500 mt-1', className)}>
      {children}
    </p>
  )
}

export function CardContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('mt-6 pt-5 border-t border-gray-100', className)}>
      {children}
    </div>
  )
}
