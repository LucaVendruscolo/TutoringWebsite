'use client'

import { useEffect, useState } from 'react'
import {
  Calendar,
  Clock,
  Wallet,
  TrendingUp,
  XCircle,
  Palmtree,
  Mail,
  Phone,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Profile, StudentDashboardStats } from '@/lib/types'
import Link from 'next/link'
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, subDays, format } from 'date-fns'
import toast from 'react-hot-toast'

export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<StudentDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCancelAllModalOpen, setIsCancelAllModalOpen] = useState(false)
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false)
  const [holidayDates, setHolidayDates] = useState({ start: '', end: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
    }

    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)

    // Fetch next upcoming lesson (just 1)
    const { data: nextLesson } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', user.id)
      .gte('start_time', now.toISOString())
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true })
      .limit(1)
      .single()

    // Fetch all upcoming lessons for cancel all feature
    const { data: allUpcomingLessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', user.id)
      .gte('start_time', now.toISOString())
      .eq('status', 'scheduled')
      .order('start_time', { ascending: true })

    // Fetch completed lessons in the last 30 days
    const { data: completedLessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', user.id)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .lte('start_time', now.toISOString())
      .eq('status', 'completed')

    setStats({
      upcomingLessons: allUpcomingLessons || [],
      nextLesson: nextLesson || null,
      balance: profileData?.balance || 0,
      lessonsCompletedLastMonth: completedLessons?.length || 0,
      totalSpent: 0,
    })

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [supabase])

  const handleCancelAllUpcoming = async () => {
    if (!profile) return
    setIsSubmitting(true)

    try {
      const now = new Date()
      
      // Fetch all upcoming scheduled lessons
      const { data: upcomingLessons } = await supabase
        .from('lessons')
        .select('id, cost')
        .eq('student_id', profile.id)
        .eq('status', 'scheduled')
        .gte('start_time', now.toISOString())

      if (!upcomingLessons || upcomingLessons.length === 0) {
        toast.error('No upcoming lessons to cancel')
        setIsSubmitting(false)
        return
      }

      let totalRefund = 0

      // Cancel each lesson and refund
      for (const lesson of upcomingLessons) {
        await supabase
          .from('lessons')
          .update({ status: 'cancelled' })
          .eq('id', lesson.id)

        totalRefund += Number(lesson.cost)

        await supabase.from('transactions').insert({
          student_id: profile.id,
          type: 'refund',
          amount: lesson.cost,
          description: 'Refund for cancelled lesson',
          lesson_id: lesson.id,
        })
      }

      // Update balance
      const newBalance = Number(profile.balance) + totalRefund
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', profile.id)

      toast.success(`Cancelled ${upcomingLessons.length} lessons. Refunded ${formatCurrency(totalRefund)}`)
      setIsCancelAllModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel lessons')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetHoliday = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    
    if (!holidayDates.start || !holidayDates.end) {
      toast.error('Please select both start and end dates')
      return
    }

    const startDate = new Date(holidayDates.start)
    const endDate = new Date(holidayDates.end)
    endDate.setHours(23, 59, 59, 999) // End of the day

    if (startDate > endDate) {
      toast.error('End date must be after start date')
      return
    }

    setIsSubmitting(true)

    try {
      // Fetch all scheduled lessons in the holiday period
      const { data: holidayLessons } = await supabase
        .from('lessons')
        .select('id, start_time, cost')
        .eq('student_id', profile.id)
        .eq('status', 'scheduled')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())

      if (!holidayLessons || holidayLessons.length === 0) {
        toast.error('No lessons found in the selected period')
        setIsSubmitting(false)
        return
      }

      let totalRefund = 0

      // Cancel each lesson and refund
      for (const lesson of holidayLessons) {
        await supabase
          .from('lessons')
          .update({ status: 'cancelled' })
          .eq('id', lesson.id)

        totalRefund += Number(lesson.cost)

        await supabase.from('transactions').insert({
          student_id: profile.id,
          type: 'refund',
          amount: lesson.cost,
          description: 'Refund for holiday cancellation',
          lesson_id: lesson.id,
        })
      }

      // Update balance
      const newBalance = Number(profile.balance) + totalRefund
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', profile.id)

      toast.success(`Cancelled ${holidayLessons.length} lessons during holiday. Refunded ${formatCurrency(totalRefund)}`)
      setIsHolidayModalOpen(false)
      setHolidayDates({ start: '', end: '' })
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel holiday lessons')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.student_name || 'Student'}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here's an overview of your tutoring sessions
          </p>
        </div>

        {/* Low balance warning */}
        {stats && stats.balance < 0 && (
          <Alert variant="warning" title="Low Balance">
            Your balance is {formatCurrency(stats.balance)}. Please add funds to continue with your lessons.
            <Link href="/student/balance" className="ml-2 underline font-medium">
              Add funds →
            </Link>
          </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Current Balance"
            value={formatCurrency(stats?.balance || 0)}
            icon={<Wallet className="w-6 h-6" />}
            variant={stats && stats.balance < 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Next Lesson"
            value={
              stats?.nextLesson 
                ? format(parseISO(stats.nextLesson.start_time), 'MMM d, h:mm a')
                : 'None scheduled'
            }
            icon={<Calendar className="w-6 h-6" />}
            variant="accent"
          />
          <StatCard
            title="Completed (Last 30 Days)"
            value={stats?.lessonsCompletedLastMonth || 0}
            icon={<Clock className="w-6 h-6" />}
            variant="primary"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/student/calendar">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary-100">
                  <Calendar className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">View Calendar</h3>
                  <p className="text-sm text-gray-500">See all your lessons</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/student/balance">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-mint-100">
                  <Wallet className="w-6 h-6 text-mint-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Add Funds</h3>
                  <p className="text-sm text-gray-500">Top up your balance</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/student/history">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent-100">
                  <TrendingUp className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Payment History</h3>
                  <p className="text-sm text-gray-500">View transactions</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Lesson Management */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lesson Management</h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => setIsHolidayModalOpen(true)}
              leftIcon={<Palmtree className="w-4 h-4" />}
            >
              Set Holiday
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCancelAllModalOpen(true)}
              leftIcon={<XCircle className="w-4 h-4" />}
              className="text-coral-600 border-coral-200 hover:bg-coral-50"
            >
              Cancel All Upcoming Lessons
            </Button>
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Luca</h3>
          <div className="space-y-3">
            <a 
              href="mailto:lucavendruscolo3@gmail.com"
              className="flex items-center gap-3 text-gray-600 hover:text-primary-500 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm">lucavendruscolo3@gmail.com</p>
              </div>
            </a>
            <a 
              href="tel:+447305880977"
              className="flex items-center gap-3 text-gray-600 hover:text-primary-500 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-mint-50 flex items-center justify-center">
                <Phone className="w-5 h-5 text-mint-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Phone</p>
                <p className="text-sm">+44 07305 880977</p>
              </div>
            </a>
          </div>
        </Card>
      </div>

      {/* Cancel All Modal */}
      <Modal
        isOpen={isCancelAllModalOpen}
        onClose={() => setIsCancelAllModalOpen(false)}
        title="Cancel All Upcoming Lessons"
        size="md"
      >
        <div className="space-y-6">
          <Alert variant="warning">
            This will cancel ALL your upcoming lessons. This action cannot be undone.
          </Alert>

          <p className="text-gray-600">
            You have <strong>{stats?.upcomingLessons.length || 0}</strong> upcoming lessons that will be cancelled.
          </p>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setIsCancelAllModalOpen(false)}
            >
              Keep Lessons
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleCancelAllUpcoming}
              isLoading={isSubmitting}
            >
              Cancel All
            </Button>
          </div>
        </div>
      </Modal>

      {/* Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Set Holiday Period"
        size="md"
      >
        <form onSubmit={handleSetHoliday} className="space-y-6">
          <p className="text-gray-600">
            Select the dates you'll be on holiday. All lessons during this period will be cancelled.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={holidayDates.start}
              onChange={(e) => setHolidayDates({ ...holidayDates, start: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={holidayDates.end}
              onChange={(e) => setHolidayDates({ ...holidayDates, end: e.target.value })}
              required
            />
          </div>

          <Alert variant="info">
            Lessons on both the start and end dates will be cancelled.
          </Alert>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setIsHolidayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={isSubmitting}
            >
              Set Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
