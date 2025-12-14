'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Trash2,
  Edit2,
  AlertTriangle,
  RefreshCw,
  X,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Calendar } from '@/components/ui/Calendar'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import {
  formatCurrency,
  formatDate,
  formatTimeInTimezone,
  calculateLessonCost,
  generateRecurringId,
  TIMEZONES,
  LESSON_DURATIONS,
  TIME_SLOTS,
  cn,
} from '@/lib/utils'
import type { Lesson, Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import { format, parseISO, addMinutes, addWeeks } from 'date-fns'

export default function AdminCalendarPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewTimezone, setViewTimezone] = useState('Europe/London')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [doubleBookingWarning, setDoubleBookingWarning] = useState<string | null>(null)
  const supabase = createClient()

  const syncBalance = async (studentId: string) => {
    try {
      await fetch('/api/balance/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      })
    } catch {
      // best-effort (UI uses derived balance elsewhere)
    }
  }

  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    duration: 60,
    cost: '',
    isRecurring: false,
    notes: '',
  })
  const [costTouched, setCostTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = async () => {
    // Fetch lessons with student data
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*, student:profiles(*)')
      .order('start_time', { ascending: true })

    if (lessonsData) {
      setLessons(lessonsData)
    }

    // Fetch only active students for booking
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .neq('is_active', false)
      .order('student_name')

    if (studentsData) {
      setStudents(studentsData)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-calculate cost when student/duration changes, unless user manually overrides.
  useEffect(() => {
    if (!formData.studentId) return
    if (costTouched) return
    const student = students.find((s) => s.id === formData.studentId)
    if (!student) return
    const computed = calculateLessonCost(formData.duration, student.cost_per_hour)
    setFormData((prev) => ({ ...prev, cost: computed.toFixed(2) }))
  }, [formData.studentId, formData.duration, students, costTouched])

  const checkDoubleBooking = (startTime: Date, endTime: Date, excludeId?: string) => {
    const conflictingLesson = lessons.find((lesson) => {
      if (excludeId && lesson.id === excludeId) return false
      if (lesson.status === 'cancelled') return false

      const lessonStart = parseISO(lesson.start_time)
      const lessonEnd = parseISO(lesson.end_time)

      return (
        (startTime >= lessonStart && startTime < lessonEnd) ||
        (endTime > lessonStart && endTime <= lessonEnd) ||
        (startTime <= lessonStart && endTime >= lessonEnd)
      )
    })

    return conflictingLesson
  }

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setDoubleBookingWarning(null)

    try {
      const student = students.find((s) => s.id === formData.studentId)
      if (!student) throw new Error('Student not found')

      const startTime = new Date(`${formData.date}T${formData.time}:00`)
      const endTime = addMinutes(startTime, formData.duration)
      const parsedCost = parseFloat(formData.cost)
      const cost = Number.isFinite(parsedCost)
        ? parsedCost
        : calculateLessonCost(formData.duration, student.cost_per_hour)

      // Check for double booking
      const conflictingLesson = checkDoubleBooking(startTime, endTime)
      if (conflictingLesson) {
        setDoubleBookingWarning(
          `Warning: This overlaps with ${conflictingLesson.student?.student_name}'s lesson at ${formatTimeInTimezone(conflictingLesson.start_time, 'Europe/London')}`
        )
        setIsSubmitting(false)
        return
      }

      if (formData.isRecurring) {
        // Create 52 weekly lessons (1 year)
        const recurringId = generateRecurringId()
        const lessonsToCreate = []

        for (let i = 0; i < 52; i++) {
          const lessonStart = addWeeks(startTime, i)
          const lessonEnd = addWeeks(endTime, i)

          lessonsToCreate.push({
            student_id: formData.studentId,
            title: `Tutoring Session with ${student.student_name}`,
            start_time: lessonStart.toISOString(),
            end_time: lessonEnd.toISOString(),
            duration_minutes: formData.duration,
            is_recurring: true,
            recurring_group_id: recurringId,
            cost,
            notes: formData.notes || null,
          })
        }

        const { error } = await supabase.from('lessons').insert(lessonsToCreate)
        if (error) throw error

        toast.success('Recurring lessons created for 1 year!')
        await syncBalance(formData.studentId)
      } else {
        const { error } = await supabase.from('lessons').insert({
          student_id: formData.studentId,
          title: `Tutoring Session with ${student.student_name}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: formData.duration,
          is_recurring: false,
          cost,
          notes: formData.notes || null,
        })

        if (error) throw error
        toast.success('Lesson created!')
        await syncBalance(formData.studentId)
      }

      setIsAddModalOpen(false)
      setFormData({
        studentId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        duration: 60,
        cost: '',
        isRecurring: false,
        notes: '',
      })
      setCostTouched(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create lesson')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLesson = async (lesson: Lesson, deleteAll: boolean = false) => {
    const confirmMsg = deleteAll
      ? 'Delete ALL recurring lessons in this series? This cannot be undone.'
      : 'Delete this lesson? This cannot be undone.'

    if (!confirm(confirmMsg)) return

    try {
      if (deleteAll && lesson.recurring_group_id) {
        const { error } = await supabase
          .from('lessons')
          .delete()
          .eq('recurring_group_id', lesson.recurring_group_id)

        if (error) throw error
        toast.success('All recurring lessons deleted!')
        await syncBalance(lesson.student_id)
      } else {
        const { error } = await supabase
          .from('lessons')
          .delete()
          .eq('id', lesson.id)

        if (error) throw error
        toast.success('Lesson deleted!')
        await syncBalance(lesson.student_id)
      }

      setIsViewModalOpen(false)
      setSelectedLesson(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete lesson')
    }
  }

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLesson) return
    setIsSubmitting(true)

    try {
      const previousStudentId = selectedLesson.student_id
      const student = students.find((s) => s.id === formData.studentId)
      if (!student) throw new Error('Student not found')

      const startTime = new Date(`${formData.date}T${formData.time}:00`)
      const endTime = addMinutes(startTime, formData.duration)
      const parsedCost = parseFloat(formData.cost)
      const cost = Number.isFinite(parsedCost)
        ? parsedCost
        : calculateLessonCost(formData.duration, student.cost_per_hour)

      // Check for double booking
      const conflictingLesson = checkDoubleBooking(startTime, endTime, selectedLesson.id)
      if (conflictingLesson) {
        setDoubleBookingWarning(
          `Warning: This overlaps with ${conflictingLesson.student?.student_name}'s lesson at ${formatTimeInTimezone(conflictingLesson.start_time, 'Europe/London')}`
        )
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase
        .from('lessons')
        .update({
          student_id: formData.studentId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: formData.duration,
          cost,
          notes: formData.notes || null,
        })
        .eq('id', selectedLesson.id)

      if (error) throw error

      toast.success('Lesson updated!')
      setIsEditModalOpen(false)
      if (previousStudentId && previousStudentId !== formData.studentId) {
        await syncBalance(previousStudentId)
      }
      await syncBalance(formData.studentId)
      setSelectedLesson(null)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update lesson')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openViewModal = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setIsViewModalOpen(true)
  }

  const openEditModal = (lesson: Lesson) => {
    setSelectedLesson(lesson)
    setFormData({
      studentId: lesson.student_id,
      date: format(parseISO(lesson.start_time), 'yyyy-MM-dd'),
      time: format(parseISO(lesson.start_time), 'HH:mm'),
      duration: lesson.duration_minutes,
      cost: Number(lesson.cost).toFixed(2),
      isRecurring: false,
      notes: lesson.notes || '',
    })
    setCostTouched(true) // keep the lesson's existing cost unless user changes it
    setIsViewModalOpen(false)
    setIsEditModalOpen(true)
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Calendar</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and manage all your lessons
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={viewTimezone}
              onChange={(e) => setViewTimezone(e.target.value)}
              options={TIMEZONES}
            />
            <Button
              onClick={() => {
                setFormData({
                  studentId: '',
                  date: format(selectedDate, 'yyyy-MM-dd'),
                  time: '09:00',
                  duration: 60,
                  cost: '',
                  isRecurring: false,
                  notes: '',
                })
                setDoubleBookingWarning(null)
                setCostTouched(false)
                setIsAddModalOpen(true)
              }}
              leftIcon={<Plus className="w-5 h-5" />}
            >
              Book Lesson
            </Button>
          </div>
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
              Lessons on {formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.filter((l) =>
              format(parseISO(l.start_time), 'yyyy-MM-dd') ===
              format(selectedDate, 'yyyy-MM-dd')
            ).length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No lessons scheduled for this day
              </p>
            ) : (
              <div className="space-y-3">
                {lessons
                  .filter(
                    (l) =>
                      format(parseISO(l.start_time), 'yyyy-MM-dd') ===
                      format(selectedDate, 'yyyy-MM-dd')
                  )
                  .sort(
                    (a, b) =>
                      new Date(a.start_time).getTime() -
                      new Date(b.start_time).getTime()
                  )
                  .map((lesson) => (
                    <motion.div
                      key={lesson.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-xl border',
                        lesson.status === 'cancelled'
                          ? 'bg-gray-50 border-gray-200 dark:bg-gray-900/50 dark:border-gray-800'
                          : 'bg-gradient-to-r from-primary-50 to-accent-50 border-primary-100 dark:from-primary-500/10 dark:to-accent-500/10 dark:border-gray-800'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            lesson.status === 'cancelled'
                              ? 'bg-gray-200 dark:bg-gray-800'
                              : 'bg-white dark:bg-gray-900 shadow-sm'
                          }`}
                        >
                          <Clock
                            className={`w-5 h-5 ${
                              lesson.status === 'cancelled'
                                ? 'text-gray-400'
                                : 'text-primary-600'
                            }`}
                          />
                        </div>
                        <div>
                          <p
                            className={`font-medium ${
                              lesson.status === 'cancelled'
                                ? 'text-gray-400 line-through'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            {lesson.student?.student_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTimeInTimezone(lesson.start_time, viewTimezone)} -{' '}
                            {formatTimeInTimezone(lesson.end_time, viewTimezone)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {lesson.is_recurring && (
                          <Badge variant="accent">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Recurring
                          </Badge>
                        )}
                        <Badge
                          variant={
                            lesson.status === 'cancelled'
                              ? 'danger'
                              : lesson.status === 'completed'
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {lesson.status}
                        </Badge>
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          {formatCurrency(lesson.cost)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openViewModal(lesson)}
                        >
                          View
                        </Button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Lesson Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setDoubleBookingWarning(null)
        }}
        title="Book New Lesson"
        description="Schedule a tutoring session"
        size="lg"
      >
        <form onSubmit={handleAddLesson} className="space-y-6">
          {doubleBookingWarning && (
            <Alert variant="warning" title="Double Booking Detected">
              {doubleBookingWarning}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDoubleBookingWarning(null)}
                >
                  I understand, proceed anyway
                </Button>
              </div>
            </Alert>
          )}

          <Select
            label="Student"
            value={formData.studentId}
            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            options={students.map((s) => ({
              value: s.id,
              label: `${s.student_name} (${formatCurrency(s.cost_per_hour)}/hr)`,
            }))}
            placeholder="Select a student"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Time (UK Time)"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              options={TIME_SLOTS}
            />
          </div>

          <Select
            label="Duration"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            options={LESSON_DURATIONS}
          />

          <Input
            label="Cost (£)"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => {
              setCostTouched(true)
              setFormData({ ...formData, cost: e.target.value })
            }}
            placeholder="Auto-calculated"
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-700">
              Recurring weekly (creates 52 lessons for 1 year)
            </label>
          </div>

          <Input
            label="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any notes about this lesson..."
          />

          {formData.studentId && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-mint-50 to-accent-50 border border-mint-200">
              <p className="text-sm text-gray-600">
                Cost per lesson:{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(Number(formData.cost) || 0)}
                </span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsAddModalOpen(false)
                setDoubleBookingWarning(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Book Lesson
            </Button>
          </div>
        </form>
      </Modal>

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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedLesson.student?.student_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedLesson.student?.parent_name}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(selectedLesson.start_time, 'EEE, MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">
                    {formatTimeInTimezone(selectedLesson.start_time, 'Europe/London')} -{' '}
                    {formatTimeInTimezone(selectedLesson.end_time, 'Europe/London')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium text-gray-900">
                    {selectedLesson.duration_minutes} minutes
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cost</p>
                  <p className="font-medium text-gray-900">
                    {formatCurrency(selectedLesson.cost)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant={
                    selectedLesson.status === 'cancelled'
                      ? 'danger'
                      : selectedLesson.status === 'completed'
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {selectedLesson.status}
                </Badge>
                {selectedLesson.is_recurring && (
                  <Badge variant="accent">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
              </div>

              {selectedLesson.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedLesson.notes}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => openEditModal(selectedLesson)} leftIcon={<Edit2 className="w-4 h-4" />}>
                Edit Lesson
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="danger"
                  onClick={() => handleDeleteLesson(selectedLesson, false)}
                  leftIcon={<Trash2 className="w-4 h-4" />}
                >
                  Delete This
                </Button>
                {selectedLesson.is_recurring && (
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteLesson(selectedLesson, true)}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Delete All
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Lesson Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedLesson(null)
          setDoubleBookingWarning(null)
        }}
        title="Edit Lesson"
        size="lg"
      >
        <form onSubmit={handleUpdateLesson} className="space-y-6">
          {doubleBookingWarning && (
            <Alert variant="warning" title="Double Booking Detected">
              {doubleBookingWarning}
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDoubleBookingWarning(null)}
                >
                  I understand, proceed anyway
                </Button>
              </div>
            </Alert>
          )}

          <Select
            label="Student"
            value={formData.studentId}
            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            options={students.map((s) => ({
              value: s.id,
              label: `${s.student_name} (${formatCurrency(s.cost_per_hour)}/hr)`,
            }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <Select
              label="Time (UK Time)"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              options={TIME_SLOTS}
            />
          </div>

          <Select
            label="Duration"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            options={LESSON_DURATIONS}
          />

          <Input
            label="Cost (£)"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => {
              setCostTouched(true)
              setFormData({ ...formData, cost: e.target.value })
            }}
            placeholder="Auto-calculated"
          />

          <Input
            label="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditModalOpen(false)
                setDoubleBookingWarning(null)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Update Lesson
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}

