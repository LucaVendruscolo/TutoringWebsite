'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  className,
}: AlertProps) {
  const variants = {
    info: {
      bg: 'bg-accent-50 border-accent-200 dark:bg-accent-500/10 dark:border-accent-500/30',
      icon: <Info className="w-5 h-5 text-accent-500" />,
      title: 'text-accent-800 dark:text-accent-200',
      text: 'text-accent-700 dark:text-accent-200/90',
    },
    success: {
      bg: 'bg-mint-50 border-mint-200 dark:bg-mint-500/10 dark:border-mint-500/30',
      icon: <CheckCircle className="w-5 h-5 text-mint-500" />,
      title: 'text-mint-800 dark:text-mint-200',
      text: 'text-mint-700 dark:text-mint-200/90',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      title: 'text-amber-800 dark:text-amber-200',
      text: 'text-amber-700 dark:text-amber-200/90',
    },
    error: {
      bg: 'bg-coral-50 border-coral-200 dark:bg-coral-500/10 dark:border-coral-500/30',
      icon: <XCircle className="w-5 h-5 text-coral-500" />,
      title: 'text-coral-800 dark:text-coral-200',
      text: 'text-coral-700 dark:text-coral-200/90',
    },
  }

  const config = variants[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border',
        config.bg,
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1">
        {title && (
          <h4 className={cn('font-medium', config.title)}>{title}</h4>
        )}
        <div className={cn('text-sm', title && 'mt-1', config.text)}>
          {children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}

