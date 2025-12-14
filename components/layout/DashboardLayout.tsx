'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: 'admin' | 'student'
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordWarning, setShowPasswordWarning] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setProfile(profile)
          if (!profile.password_changed && role === 'student') {
            setShowPasswordWarning(true)
          }
        }
      }
      setLoading(false)
    }

    fetchProfile()
  }, [supabase, role])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex bg-[#fafafa] dark:bg-gray-950 overflow-hidden">
      <Sidebar role={role} />
      
      {/* Main content area */}
      {/* Mobile: fixed bottom nav requires calc for main content height */}
      {/* Desktop: add left margin to account for the sidebar's offset from edge */}
      <main className="flex-1 min-w-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain lg:ml-3">
        <div className="p-4 pb-24 lg:p-8 lg:pb-8 min-h-full">
          {/* Password warning - positioned at bottom to avoid toast overlap */}
          <AnimatePresence>
            {showPasswordWarning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-24 lg:bottom-5 right-5 z-40 max-w-sm"
              >
                <Alert
                  variant="warning"
                  title="Password Not Changed"
                  onClose={() => setShowPasswordWarning(false)}
                >
                  You're still using a temporary password. Please change it in Settings for security.
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

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
