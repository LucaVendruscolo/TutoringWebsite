'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lesson } from '@/lib/types'

interface CalendarProps {
  lessons?: Lesson[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onLessonClick?: (lesson: Lesson) => void
  showLessons?: boolean
  className?: string
}

export function Calendar({
  lessons = [],
  selectedDate,
  onDateSelect,
  onLessonClick,
  showLessons = true,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = useMemo(() => {
    const daysArray = []
    let day = calendarStart
    while (day <= calendarEnd) {
      daysArray.push(day)
      day = addDays(day, 1)
    }
    return daysArray
  }, [calendarStart, calendarEnd])

  const getLessonsForDay = (date: Date) => {
    return lessons.filter((lesson) =>
      isSameDay(parseISO(lesson.start_time), date)
    )
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-2xl p-3 sm:p-5 shadow-soft border border-gray-100 dark:border-gray-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dayLessons = getLessonsForDay(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isDayToday = isToday(day)

          return (
            <motion.div
              key={idx}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.1 }}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'min-h-[64px] sm:min-h-[80px] p-1.5 sm:p-2 rounded-xl cursor-pointer transition-all duration-200',
                isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-950/40' : 'bg-transparent',
                isSelected && 'ring-2 ring-primary-500 bg-white dark:bg-gray-900',
                isDayToday && !isSelected && 'ring-1 ring-gray-300 dark:ring-gray-700 bg-white dark:bg-gray-900',
                'hover:bg-gray-100/80 dark:hover:bg-gray-800/60'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-700',
                  isDayToday && 'text-primary-500'
                )}
              >
                {format(day, 'd')}
              </div>

              {/* Lesson indicators */}
              {showLessons && dayLessons.length > 0 && (
                <div className="space-y-1">
                  {dayLessons.slice(0, 2).map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onLessonClick?.(lesson)
                      }}
                      className={cn(
                        'text-[11px] sm:text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-colors',
                        lesson.status === 'cancelled'
                          ? 'bg-gray-100 text-gray-400 line-through dark:bg-gray-800 dark:text-gray-500'
                          : lesson.status === 'completed'
                          ? 'bg-mint-50 text-mint-600 dark:bg-mint-500/10 dark:text-mint-200'
                          : 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-200'
                      )}
                    >
                      {lesson.student?.student_name || format(parseISO(lesson.start_time), 'HH:mm')}
                    </div>
                  ))}
                  {dayLessons.length > 2 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 px-1">
                      +{dayLessons.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// Week view calendar for detailed lesson viewing
export function WeekCalendar({
  lessons = [],
  startDate,
  onLessonClick,
  timezone = 'Europe/London',
}: {
  lessons: Lesson[]
  startDate: Date
  onLessonClick?: (lesson: Lesson) => void
  timezone?: string
}) {
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 })
  const hours = Array.from({ length: 14 }, (_, i) => i + 8) // 8am to 9pm

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getLessonsForDayAndHour = (date: Date, hour: number) => {
    return lessons.filter((lesson) => {
      const lessonDate = parseISO(lesson.start_time)
      return (
        isSameDay(lessonDate, date) &&
        lessonDate.getHours() === hour
      )
    })
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-soft border border-gray-100 dark:border-gray-800 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="w-16" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'text-center py-2 rounded-lg',
                isToday(day) && 'bg-primary-50 dark:bg-primary-500/10'
              )}
            >
              <div className="text-xs text-gray-400 font-medium">
                {format(day, 'EEE')}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isToday(day) ? 'text-primary-500' : 'text-gray-900 dark:text-gray-100'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="border-t border-gray-100 dark:border-gray-800">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-1 border-b border-gray-50 dark:border-gray-800">
              <div className="w-16 py-4 text-xs text-gray-400 dark:text-gray-500 text-right pr-2">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              {days.map((day) => {
                const dayLessons = getLessonsForDayAndHour(day, hour)
                return (
                  <div
                    key={day.toISOString()}
                    className="py-1 min-h-[60px] border-l border-gray-50 dark:border-gray-800"
                  >
                    {dayLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        onClick={() => onLessonClick?.(lesson)}
                        className={cn(
                          'mx-1 p-2 rounded-lg cursor-pointer text-xs transition-colors hover:opacity-80',
                          lesson.status === 'cancelled'
                            ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300'
                            : lesson.status === 'completed'
                            ? 'bg-mint-50 text-mint-700 dark:bg-mint-500/10 dark:text-mint-200'
                            : 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-200'
                        )}
                        style={{
                          height: `${(lesson.duration_minutes / 60) * 60}px`,
                        }}
                      >
                        <div className="font-medium truncate">
                          {lesson.student?.student_name || 'Student'}
                        </div>
                        <div className="text-gray-400 dark:text-gray-500 text-[10px]">
                          {lesson.duration_minutes} min
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
