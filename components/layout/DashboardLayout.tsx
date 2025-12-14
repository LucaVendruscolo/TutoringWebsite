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
    <div className="min-h-screen flex bg-[#fafafa] dark:bg-gray-950">
      <Sidebar role={role} />
      
      {/* Main content area */}
      {/* Mobile: no top padding needed (no hamburger), add bottom padding for bottom nav */}
      {/* Desktop: add left margin to account for the sidebar's offset from edge */}
      <main className="flex-1 min-w-0 p-4 pb-24 md:p-8 md:pb-8 md:ml-3">
        {/* Password warning - positioned at bottom to avoid toast overlap */}
        <AnimatePresence>
          {showPasswordWarning && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 md:bottom-5 right-5 z-40 max-w-sm"
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
      </main>
    </div>
  )
}
