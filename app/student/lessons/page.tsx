'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Calendar,
  X,
  RefreshCw,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  formatDate,
  formatTimeInTimezone,
  canCancelLesson,
  canRescheduleLesson,
  isLessonPast,
} from '@/lib/utils'
import type { Lesson, Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import { parseISO, format, addMinutes } from 'date-fns'
import Link from 'next/link'

export default function StudentLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
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

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', user.id)
      .order('start_time', { ascending: true })

    if (lessonsData) {
      setLessons(lessonsData)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredLessons = lessons.filter((lesson) => {
    if (filter === 'upcoming') {
      return !isLessonPast(lesson.start_time) && lesson.status !== 'cancelled'
    }
    if (filter === 'past') {
      return isLessonPast(lesson.start_time) || lesson.status === 'cancelled'
    }
    return true
  })

  const handleCancelLesson = async (deleteAll: boolean = false) => {
    if (!selectedLesson) return
    setIsSubmitting(true)

    try {
      if (deleteAll && selectedLesson.recurring_group_id) {
        // Cancel all future lessons in the recurring group
        const now = new Date()
        const { data: recurringLessons } = await supabase
          .from('lessons')
          .select('id, start_time, cost')
          .eq('recurring_group_id', selectedLesson.recurring_group_id)
          .eq('status', 'scheduled')

        const futureLessons = recurringLessons?.filter(
          (l) => new Date(l.start_time) > now
        ) || []

        for (const lesson of futureLessons) {
          await supabase
            .from('lessons')
            .update({ status: 'cancelled' })
            .eq('id', lesson.id)

          // Refund the cost
          if (profile) {
            const newBalance = Number(profile.balance) + Number(lesson.cost)
            await supabase
              .from('profiles')
              .update({ balance: newBalance })
              .eq('id', profile.id)

            await supabase.from('transactions').insert({
              student_id: profile.id,
              type: 'refund',
              amount: lesson.cost,
              description: `Refund for cancelled lesson`,
              lesson_id: lesson.id,
            })
          }
        }

        toast.success(`Cancelled ${futureLessons.length} lessons`)
      } else {
        // Cancel single lesson
        await supabase
          .from('lessons')
          .update({ status: 'cancelled' })
          .eq('id', selectedLesson.id)

        // Refund the cost
        if (profile) {
          const newBalance = Number(profile.balance) + Number(selectedLesson.cost)
          await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', profile.id)

          await supabase.from('transactions').insert({
            student_id: profile.id,
            type: 'refund',
            amount: selectedLesson.cost,
            description: `Refund for cancelled lesson`,
            lesson_id: selectedLesson.id,
          })
        }

        toast.success('Lesson cancelled and refunded')
      }

      setIsCancelModalOpen(false)
      setSelectedLesson(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel lesson')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRescheduleLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLesson) return
    setIsSubmitting(true)

    try {
      const newStartTime = new Date(`${rescheduleData.date}T${rescheduleData.time}:00`)
      const newEndTime = addMinutes(newStartTime, selectedLesson.duration_minutes)

      await supabase
        .from('lessons')
        .update({
          start_time: newStartTime.toISOString(),
          end_time: newEndTime.toISOString(),
        })
        .eq('id', selectedLesson.id)

      toast.success('Lesson rescheduled!')
      setIsRescheduleModalOpen(false)
      setSelectedLesson(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule lesson')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openCancelModal = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setIsCancelModalOpen(true)
  }

  const openRescheduleModal = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setRescheduleData({
      date: format(parseISO(lesson.start_time), 'yyyy-MM-dd'),
      time: format(parseISO(lesson.start_time), 'HH:mm'),
    })
    setIsRescheduleModalOpen(true)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">My Lessons</h1>
            <p className="text-gray-500 mt-1">
              View and manage your tutoring sessions
            </p>
          </div>
          <div className="flex gap-2">
            {(['upcoming', 'past', 'all'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Lessons List */}
        <div className="space-y-4">
          {filteredLessons.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No lessons found</p>
              </CardContent>
            </Card>
          ) : (
            filteredLessons.map((lesson, idx) => {
              const isPast = isLessonPast(lesson.start_time)
              const canCancel = canCancelLesson(lesson.end_time)
              const canReschedule = canRescheduleLesson(lesson.start_time)

              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className={`${
                      lesson.status === 'cancelled'
                        ? 'opacity-60'
                        : isPast
                        ? 'bg-gray-50'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            lesson.status === 'cancelled'
                              ? 'bg-gray-200'
                              : isPast
                              ? 'bg-mint-100'
                              : 'bg-gradient-to-br from-primary-100 to-accent-100'
                          }`}
                        >
                          {lesson.status === 'cancelled' ? (
                            <X className="w-6 h-6 text-gray-400" />
                          ) : isPast ? (
                            <CheckCircle className="w-6 h-6 text-mint-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-primary-600" />
                          )}
                        </div>
                        <div>
                          <p
                            className={`font-medium ${
                              lesson.status === 'cancelled'
                                ? 'text-gray-400 line-through'
                                : 'text-gray-900'
                            }`}
                          >
                            Tutoring Session
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(lesson.start_time, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-400">
                            {formatTimeInTimezone(
                              lesson.start_time,
                              profile?.timezone || 'Europe/London'
                            )}{' '}
                            -{' '}
                            {formatTimeInTimezone(
                              lesson.end_time,
                              profile?.timezone || 'Europe/London'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <Badge
                          variant={
                            lesson.status === 'cancelled'
                              ? 'danger'
                              : isPast
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {lesson.status === 'cancelled'
                            ? 'Cancelled'
                            : isPast
                            ? 'Completed'
                            : 'Scheduled'}
                        </Badge>
                        {lesson.is_recurring && (
                          <Badge variant="accent">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Weekly
                          </Badge>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {lesson.duration_minutes} min • {formatCurrency(lesson.cost)}
                        </span>

                        {lesson.status !== 'cancelled' && (
                          <div className="flex gap-2">
                            {canReschedule && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRescheduleModal(lesson)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCancelModal(lesson)}
                                className="text-coral-600 hover:bg-coral-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Lesson"
        size="md"
      >
        {selectedLesson && (
          <div className="space-y-6">
            <Alert variant="warning">
              Are you sure you want to cancel this lesson? The cost will be refunded to your balance.
            </Alert>

            <div className="p-4 rounded-xl bg-gray-50">
              <p className="font-medium text-gray-900">
                {formatDate(selectedLesson.start_time, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-500">
                {formatTimeInTimezone(
                  selectedLesson.start_time,
                  profile?.timezone || 'Europe/London'
                )}{' '}
                • {selectedLesson.duration_minutes} minutes
              </p>
              <p className="text-sm text-mint-600 mt-2">
                Refund: {formatCurrency(selectedLesson.cost)}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="danger"
                onClick={() => handleCancelLesson(false)}
                isLoading={isSubmitting}
              >
                Cancel Lesson
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Keep Lesson
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Reschedule Lesson"
        size="md"
      >
        <form onSubmit={handleRescheduleLesson} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="New Date"
              type="date"
              value={rescheduleData.date}
              onChange={(e) =>
                setRescheduleData({ ...rescheduleData, date: e.target.value })
              }
              required
            />
            <Input
              label="New Time"
              type="time"
              value={rescheduleData.time}
              onChange={(e) =>
                setRescheduleData({ ...rescheduleData, time: e.target.value })
              }
              required
            />
          </div>

          <Alert variant="info">
            Note: Your tutor will be notified of this change. Please ensure the new time works for both of you.
          </Alert>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setIsRescheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={isSubmitting}>
              Reschedule
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

