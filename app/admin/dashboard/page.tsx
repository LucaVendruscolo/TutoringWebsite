'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Calendar,
  PoundSterling,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatTimeInTimezone } from '@/lib/utils'
import { calculateDerivedBalance } from '@/lib/balance'
import type { Lesson, Profile, DashboardStats } from '@/lib/types'
import Link from 'next/link'
import { parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, format as formatDateFn } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [earningsData, setEarningsData] = useState<Array<{ week: string; earnings: number }>>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      const now = new Date()
      const thirtyDaysAgo = subDays(now, 30)
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

      // Fetch all students (for balance calculation)
      const { data: allStudents } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')

      // Count only active students
      const activeStudents = allStudents?.filter((s) => s.is_active !== false) || []

      // Fetch all lessons
      const { data: allLessons } = await supabase
        .from('lessons')
        .select('*, student:profiles(*)')

      // Fetch upcoming lessons
      const { data: upcomingLessons } = await supabase
        .from('lessons')
        .select('*, student:profiles(*)')
        .gte('start_time', now.toISOString())
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })
        .limit(5)

      // Fetch credits (deposits + refunds) and ended lessons for derived balances
      const { data: creditTxs } = await supabase
        .from('transactions')
        .select('student_id, type, amount')
        .in('type', ['deposit', 'refund'])
        .limit(5000)

      const { data: endedLessons } = await supabase
        .from('lessons')
        .select('student_id, end_time, status, cost')
        .lt('end_time', now.toISOString())
        .neq('status', 'cancelled')

      // Calculate stats
      const lessonsThisWeek = allLessons?.filter((l) => {
        const start = parseISO(l.start_time)
        return start >= weekStart && start <= weekEnd && l.status !== 'cancelled'
      }).length || 0

      const earningsLastMonth = allLessons
        ?.filter((l) => {
          const start = parseISO(l.start_time)
          return start >= thirtyDaysAgo && start <= now && l.status === 'completed'
        })
        .reduce((sum, l) => sum + Number(l.cost), 0) || 0

      const creditsByStudent: Record<string, { type: any; amount: any }[]> = {}
      for (const tx of creditTxs || []) {
        if (tx.type !== 'deposit' && tx.type !== 'refund') continue
        const sid = tx.student_id
        if (!creditsByStudent[sid]) creditsByStudent[sid] = []
        creditsByStudent[sid].push({ type: tx.type, amount: tx.amount })
      }
      const lessonsByStudent: Record<string, { status: any; end_time: any; cost: any }[]> = {}
      for (const l of endedLessons || []) {
        const sid = l.student_id
        if (!lessonsByStudent[sid]) lessonsByStudent[sid] = []
        lessonsByStudent[sid].push({ status: l.status, end_time: l.end_time, cost: l.cost })
      }

      const totalBalance =
        allStudents?.reduce((sum, s) => {
          const bal = calculateDerivedBalance({
            credits: creditsByStudent[s.id] || [],
            lessons: lessonsByStudent[s.id] || [],
            now,
          })
          return sum + bal
        }, 0) || 0

      setStats({
        totalStudents: activeStudents.length,
        totalLessons: allLessons?.length || 0,
        lessonsThisWeek,
        lessonsThisMonth: 0, // Not used anymore
        earningsThisMonth: earningsLastMonth,
        totalBalance,
        upcomingLessons: upcomingLessons || [],
      })

      // Calculate weekly earnings for the last 12 weeks
      const weeklyData: Array<{ week: string; earnings: number }> = []
      for (let i = 11; i >= 0; i--) {
        const weekEnd = subWeeks(now, i)
        const weekStart = startOfWeek(weekEnd, { weekStartsOn: 1 })
        const weekEndDate = endOfWeek(weekEnd, { weekStartsOn: 1 })

        const weekEarnings = allLessons
          ?.filter((l) => {
            const start = parseISO(l.start_time)
            return start >= weekStart && start <= weekEndDate && l.status === 'completed'
          })
          .reduce((sum, l) => sum + Number(l.cost), 0) || 0

        weeklyData.push({
          week: formatDateFn(weekStart, 'MMM d'),
          earnings: weekEarnings,
        })
      }

      setEarningsData(weeklyData)
      setLoading(false)
    }

    fetchStats()
  }, [supabase])

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back! Here's an overview of your tutoring business.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Students"
            value={stats?.totalStudents || 0}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Lessons This Week"
            value={stats?.lessonsThisWeek || 0}
            icon={<Calendar className="w-6 h-6" />}
            variant="accent"
          />
          <StatCard
            title="Earnings (Last 30 Days)"
            value={formatCurrency(stats?.earningsThisMonth || 0)}
            icon={<PoundSterling className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            title="Net Parent Balances"
            value={formatCurrency(stats?.totalBalance || 0)}
            subtitle={stats?.totalBalance && stats.totalBalance < 0 ? 'Parents owe you' : stats?.totalBalance && stats.totalBalance > 0 ? 'Credit balance' : 'Balanced'}
            icon={<TrendingUp className="w-6 h-6" />}
            variant={stats?.totalBalance && stats.totalBalance < 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Earnings (Last 12 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#888" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `£${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'var(--toast-bg)',
                      color: 'var(--toast-color)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Earnings']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="#0071e3" 
                    strokeWidth={2}
                    dot={{ fill: '#0071e3', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Lessons */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Lessons</CardTitle>
            <Link
              href="/admin/calendar"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center gap-1"
            >
              View Calendar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.upcomingLessons.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No upcoming lessons scheduled
              </p>
            ) : (
              <div className="space-y-4">
                {stats?.upcomingLessons.map((lesson, idx) => (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 dark:from-gray-900/60 dark:to-gray-950/60 dark:border-gray-800"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {lesson.student?.student_name || 'Student'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(lesson.start_time, 'EEE, MMM d')} at{' '}
                        {formatTimeInTimezone(lesson.start_time, 'Europe/London')}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <Badge variant={lesson.is_recurring ? 'accent' : 'neutral'}>
                        {lesson.is_recurring ? 'Recurring' : 'One-off'}
                      </Badge>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {lesson.duration_minutes} min
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/students">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary-100">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Add Student</h3>
                  <p className="text-sm text-gray-500">Create a new student account</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/calendar">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-100">
                  <Calendar className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Book Lesson</h3>
                  <p className="text-sm text-gray-500">Schedule a new lesson</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/admin/payments">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-mint-100">
                  <PoundSterling className="w-6 h-6 text-mint-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">View Payments</h3>
                  <p className="text-sm text-gray-500">Check payment history</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}

