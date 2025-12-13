'use client'

import { useState } from 'react'
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
  Menu,
  X,
  GraduationCap,
  Clock,
  Wallet,
  History,
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
]

const studentLinks = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/lessons', label: 'My Lessons', icon: Clock },
  { href: '/student/calendar', label: 'Calendar', icon: Calendar },
  { href: '/student/balance', label: 'Balance', icon: Wallet },
  { href: '/student/history', label: 'History', icon: History },
  { href: '/student/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ role }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const links = role === 'admin' ? adminLinks : studentLinks

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2.5 rounded-full bg-white dark:bg-gray-900 shadow-soft md:hidden"
      >
        <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          // Mobile: drawer (not full width). Desktop: fixed-width sidebar.
          'fixed top-0 left-0 z-50 h-full w-[85vw] max-w-[320px] md:w-[260px]',
          'bg-white/95 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-100 dark:border-gray-800 shadow-soft-lg',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
          'md:translate-x-0 md:relative md:flex-shrink-0 md:pointer-events-auto'
        )}
      >
        <div className="flex flex-col h-full p-5">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8 px-2">
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
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
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
                    onClick={() => setIsOpen(false)}
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
      </aside>
    </>
  )
}
