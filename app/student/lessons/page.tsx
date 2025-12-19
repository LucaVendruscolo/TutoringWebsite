'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  Calendar,
  X,
  Trash2,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  formatDate,
  formatTimeInTimezone,
  canCancelLesson,
  isLessonPast,
} from '@/lib/utils'
import type { Lesson, Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function StudentLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
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
        }

        toast.success(`Cancelled ${futureLessons.length} lessons`)
      } else {
        // Cancel single lesson
        await supabase
          .from('lessons')
          .update({ status: 'cancelled' })
          .eq('id', selectedLesson.id)
        toast.success('Lesson cancelled')
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

  const openCancelModal = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setIsCancelModalOpen(true)
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">My Lessons</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
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
                        ? 'bg-gray-50 dark:bg-gray-800/50'
                        : 'dark:bg-gray-800'
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
                                ? 'text-gray-400 dark:text-gray-500 line-through'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            Tutoring Session
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(lesson.start_time, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">
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
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {lesson.duration_minutes} min • {formatCurrency(lesson.cost)}
                        </span>

                        {lesson.status !== 'cancelled' && canCancel && (
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
              Are you sure you want to cancel this lesson? Cancelled lessons won't be counted against your balance.
            </Alert>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {formatDate(selectedLesson.start_time, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatTimeInTimezone(
                  selectedLesson.start_time,
                  profile?.timezone || 'Europe/London'
                )}{' '}
                • {selectedLesson.duration_minutes} minutes
              </p>
              <p className="text-sm text-mint-600 mt-2">
                Lesson cost: {formatCurrency(selectedLesson.cost)}
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
    </DashboardLayout>
  )
}
