'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
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

  const links = role === 'admin' ? adminLinks : studentLinks

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  return (
    <aside
      className={cn(
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
  )
}
