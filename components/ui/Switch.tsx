'use client'

import { cn } from '@/lib/utils'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors duration-300 ease-in-out',
        checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600',
        'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'dark:focus:ring-offset-gray-900',
        className
      )}
      {...props}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
        style={{
          transform: checked ? 'translateX(1.25rem)' : 'translateX(0.25rem)',
        }}
      />
    </button>
  )
}


