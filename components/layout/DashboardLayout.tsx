'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'admin' | 'student'
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      await supabase.auth.getUser()
      setLoading(false)
    }
    checkAuth()
  }, [supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-gray-950">
      <Sidebar role={role} />
      
      {/* Main content area */}
      {/* Mobile: full width with top padding for header, Desktop: add left margin for sidebar */}
      <main className="pt-20 lg:pt-0 lg:ml-[264px]">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page content */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            className="max-w-6xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
