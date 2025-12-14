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
  MoreHorizontal,
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
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, showInBottomNav: true },
  { href: '/admin/students', label: 'Students', icon: Users, showInBottomNav: true },
  { href: '/admin/calendar', label: 'Calendar', icon: Calendar, showInBottomNav: true },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard, showInBottomNav: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, showInBottomNav: false },
]

const studentLinks = [
  { href: '/student/dashboard', label: 'Home', icon: LayoutDashboard, showInBottomNav: true },
  { href: '/student/lessons', label: 'Lessons', icon: Clock, showInBottomNav: true },
  { href: '/student/calendar', label: 'Calendar', icon: Calendar, showInBottomNav: true },
  { href: '/student/balance', label: 'Balance', icon: Wallet, showInBottomNav: true },
  { href: '/student/history', label: 'History', icon: History, showInBottomNav: false },
  { href: '/student/settings', label: 'Settings', icon: Settings, showInBottomNav: false },
]

export function Sidebar({ role }: SidebarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Hide bottom nav when keyboard is open (input focused)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        setIsKeyboardOpen(true)
      }
    }

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeEl = document.activeElement
        if (activeEl?.tagName !== 'INPUT' && activeEl?.tagName !== 'TEXTAREA' && activeEl?.tagName !== 'SELECT') {
          setIsKeyboardOpen(false)
        }
      }, 100)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  const links = role === 'admin' ? adminLinks : studentLinks
  const bottomNavLinks = links.filter((l) => l.showInBottomNav)
  const moreLinks = links.filter((l) => !l.showInBottomNav)

  const handleLogout = async () => {
    setIsMoreOpen(false)
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <>
      {/* ========== DESKTOP SIDEBAR ========== */}
      <aside
        className={cn(
          'hidden lg:flex',
          'fixed z-50 h-[calc(100vh-1.5rem)] w-[240px]',
          'top-3 left-3',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
          'border border-gray-200/50 dark:border-gray-700/50',
          'shadow-xl shadow-gray-900/5 dark:shadow-black/20',
          'rounded-2xl'
        )}
      >
        <div className="flex flex-col h-full p-4 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-8">
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
      </aside>

      {/* ========== MOBILE BOTTOM NAVIGATION ========== */}
      {/* Hidden when keyboard is open to prevent layout issues */}
      <nav
        className={cn(
          'lg:hidden fixed left-0 right-0 bottom-0 z-50',
          'bg-white dark:bg-gray-900',
          'border-t border-gray-200/50 dark:border-gray-700/50',
          'transition-transform duration-200',
          isKeyboardOpen ? 'translate-y-full' : ''
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around px-2 h-16">
          {bottomNavLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon

            return (
              <Link key={link.href} href={link.href} className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    'flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors',
                    isActive
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  <Icon className={cn('w-6 h-6', isActive && 'stroke-[2.5px]')} />
                  <span className={cn('text-[10px] mt-1 font-medium', isActive && 'font-semibold')}>
                    {link.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className="flex-1"
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-colors',
                isMoreOpen
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-medium">More</span>
            </motion.div>
          </button>
        </div>
      </nav>

      {/* ========== MOBILE "MORE" BOTTOM SHEET ========== */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMoreOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className={cn(
                'lg:hidden fixed bottom-0 left-0 right-0 z-[70]',
                'bg-white dark:bg-gray-900',
                'rounded-t-3xl',
                'pb-[env(safe-area-inset-bottom)]',
                'shadow-2xl'
              )}
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  More Options
                </h3>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Links */}
              <div className="px-4 pb-4 space-y-1">
                {moreLinks.map((link) => {
                  const isActive = pathname === link.href
                  const Icon = link.icon

                  return (
                    <Link key={link.href} href={link.href}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          'flex items-center gap-4 px-4 py-4 rounded-2xl transition-all',
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        <div
                          className={cn(
                            'p-2.5 rounded-xl',
                            isActive
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium">{link.label}</span>
                      </motion.div>
                    </Link>
                  )
                })}

                {/* Logout */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-coral-600 dark:text-coral-400 hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-all"
                >
                  <div className="p-2.5 rounded-xl bg-coral-100 dark:bg-coral-500/10">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Logout</span>
                </motion.button>
              </div>

              {/* Extra padding for safe area */}
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
