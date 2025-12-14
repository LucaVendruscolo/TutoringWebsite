'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleEscape)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  const sizes = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/25 backdrop-blur-sm"
          />
          
          {/* Modal - Bottom sheet on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            style={{ willChange: 'transform, opacity' }}
            className={cn(
              'relative w-full bg-white dark:bg-gray-900 shadow-soft-xl',
              // Mobile: full width, rounded top corners, bottom sheet style
              'rounded-t-2xl sm:rounded-2xl',
              'max-h-[90vh] sm:max-h-[85vh] overflow-y-auto',
              'p-5 pb-8 sm:p-6',
              'border-t border-gray-100 sm:border dark:border-gray-800',
              // Safe area padding for iOS
              'pb-safe',
              // Desktop: margin
              'sm:m-4',
              sizes[size]
            )}
          >
            {/* Mobile drag handle indicator */}
            <div className="sm:hidden flex justify-center mb-3 -mt-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </button>

            {/* Header */}
            {(title || description) && (
              <div className="mb-5 pr-10">
                {title && (
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
