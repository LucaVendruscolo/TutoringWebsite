'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Calendar } from '@/components/ui/Calendar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
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
import { parseISO, format } from 'date-fns'
import { Clock, X, Edit2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function StudentCalendarPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
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

    fetchData()
  }, [supabase])

  const selectedDateLessons = lessons.filter(
    (l) =>
      format(parseISO(l.start_time), 'yyyy-MM-dd') ===
      format(selectedDate, 'yyyy-MM-dd')
  )

  const openViewModal = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setIsViewModalOpen(true)
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
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            View your scheduled lessons
          </p>
        </div>

        {/* Calendar */}
        <Calendar
          lessons={lessons}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onLessonClick={openViewModal}
          showLessons={true}
        />

        {/* Selected Date Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>
              {formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateLessons.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No lessons on this day
              </p>
            ) : (
              <div className="space-y-3">
                {selectedDateLessons.map((lesson) => {
                  const isPast = isLessonPast(lesson.start_time)
                  
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => openViewModal(lesson)}
                      className={`p-3 sm:p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                        lesson.status === 'cancelled'
                          ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800'
                          : isPast
                          ? 'bg-mint-50 border-mint-100 dark:bg-mint-500/10 dark:border-mint-500/20'
                          : 'bg-gradient-to-r from-primary-50 to-accent-50 border-primary-100 dark:from-primary-500/10 dark:to-accent-500/10 dark:border-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                            lesson.status === 'cancelled'
                              ? 'bg-gray-200 dark:bg-gray-800'
                              : isPast
                              ? 'bg-mint-200 dark:bg-mint-500/20'
                              : 'bg-white dark:bg-gray-900 shadow-sm'
                          }`}
                        >
                          {lesson.status === 'cancelled' ? (
                            <X className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <Clock
                              className={`w-5 h-5 ${
                                isPast ? 'text-mint-600 dark:text-mint-200' : 'text-primary-600 dark:text-primary-200'
                              }`}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p
                                className={`font-medium text-sm sm:text-base ${
                                  lesson.status === 'cancelled'
                                    ? 'text-gray-400 line-through'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}
                              >
                                Tutoring Session
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge
                              size="sm"
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
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Lesson Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedLesson(null)
        }}
        title="Lesson Details"
        size="md"
      >
        {selectedLesson && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-500/10 dark:to-accent-500/10">
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {formatDate(selectedLesson.start_time, 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-gray-600 dark:text-gray-300">
                  {formatTimeInTimezone(
                    selectedLesson.start_time,
                    profile?.timezone || 'Europe/London'
                  )}{' '}
                  -{' '}
                  {formatTimeInTimezone(
                    selectedLesson.end_time,
                    profile?.timezone || 'Europe/London'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedLesson.duration_minutes} minutes
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cost</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(selectedLesson.cost)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant={
                    selectedLesson.status === 'cancelled'
                      ? 'danger'
                      : isLessonPast(selectedLesson.start_time)
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {selectedLesson.status === 'cancelled'
                    ? 'Cancelled'
                    : isLessonPast(selectedLesson.start_time)
                    ? 'Completed'
                    : 'Scheduled'}
                </Badge>
              </div>
            </div>

            {selectedLesson.status !== 'cancelled' && (
              <div className="space-y-3">
                {canRescheduleLesson(selectedLesson.start_time) && (
                  <Link href="/student/lessons">
                    <Button className="w-full" variant="outline">
                      <Edit2 className="w-4 h-4 mr-2" />
                      Manage in My Lessons
                    </Button>
                  </Link>
                )}
                {canCancelLesson(selectedLesson.end_time) && (
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                    You can cancel this lesson up to 24 hours after it ends
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

