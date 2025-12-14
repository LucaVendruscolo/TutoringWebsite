'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  Settings,
  LogOut,
  GraduationCap,
  Clock,
  Wallet,
  History,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface SidebarProps {
  role: 'admin' | 'student'
}

const adminLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/calendar', label: 'Calendar', icon: Calendar },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const studentLinks = [
  { href: '/student/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/student/lessons', label: 'Lessons', icon: Clock },
  { href: '/student/calendar', label: 'Calendar', icon: Calendar },
  { href: '/student/balance', label: 'Balance', icon: Wallet },
  { href: '/student/history', label: 'History', icon: History },
  { href: '/student/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const links = role === 'admin' ? adminLinks : studentLinks

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full p-4 w-full">
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-2 mb-8">
        <Link href={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Luca&apos;s Tutoring
            </span>
          </div>
        </Link>
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link key={link.href} href={link.href}>
              <motion.div
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="font-medium text-sm">{link.label}</span>
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200"
      >
        <LogOut className="w-[18px] h-[18px]" />
        <span className="font-medium text-sm">Logout</span>
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 px-4 flex items-center justify-between safe-top">
        <Link href={role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Luca&apos;s Tutoring
            </span>
          </div>
        </Link>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={cn(
                'lg:hidden fixed z-50 h-full w-[280px]',
                'top-0 left-0',
                'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
                'border-r border-gray-200/50 dark:border-gray-700/50',
                'shadow-xl shadow-gray-900/10 dark:shadow-black/30',
                'safe-top safe-bottom'
              )}
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block fixed z-50 h-[calc(100vh-1.5rem)] w-[240px]',
          'top-3 left-3',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
          'border border-gray-200/50 dark:border-gray-700/50',
          'shadow-xl shadow-gray-900/5 dark:shadow-black/20',
          'rounded-2xl'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
