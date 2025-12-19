import { format, parseISO, addWeeks, isAfter, isBefore, addHours } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export function formatDate(date: string | Date, formatStr: string = 'PPP'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

export function formatDateInTimezone(
  date: string | Date,
  timezone: string,
  formatStr: string = 'PPP'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, timezone, formatStr)
}

export function formatTimeInTimezone(
  date: string | Date,
  timezone: string
): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, timezone, 'h:mm a')
}

export function toTimezone(date: string | Date, timezone: string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(d, timezone)
}

/**
 * Convert a date/time string from a specific timezone to UTC for storage.
 * Use this when booking lessons - the user selects a time in their viewTimezone,
 * and we need to convert it to UTC for storage in the database.
 * 
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:mm format  
 * @param timezone - The timezone the user selected the time in (e.g. 'Europe/Rome')
 * @returns Date object in UTC
 */
export function createDateInTimezone(dateStr: string, timeStr: string, timezone: string): Date {
  // Create a date string that represents the time in the specified timezone
  // Then convert it to UTC
  const localDateTimeStr = `${dateStr}T${timeStr}:00`
  return fromZonedTime(localDateTimeStr, timezone)
}

/**
 * Get the date and time components from a UTC date, displayed in a specific timezone.
 * Use this when editing lessons - we need to show the stored UTC time in the user's timezone.
 * 
 * @param utcDate - The UTC date from the database
 * @param timezone - The timezone to display in
 * @returns Object with date (YYYY-MM-DD) and time (HH:mm) strings
 */
export function getDateTimeInTimezone(utcDate: string | Date, timezone: string): { date: string; time: string } {
  const d = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate
  return {
    date: formatInTimeZone(d, timezone, 'yyyy-MM-dd'),
    time: formatInTimeZone(d, timezone, 'HH:mm'),
  }
}

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export function generateRecurringId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function calculateLessonCost(
  durationMinutes: number,
  costPerHour: number
): number {
  return (durationMinutes / 60) * costPerHour
}

export function canCancelLesson(lessonEndTime: string): boolean {
  const endTime = parseISO(lessonEndTime)
  const cancelDeadline = addHours(endTime, 24)
  return isBefore(new Date(), cancelDeadline)
}

export function canRescheduleLesson(lessonStartTime: string): boolean {
  const startTime = parseISO(lessonStartTime)
  return isAfter(startTime, new Date())
}

export function isLessonPast(lessonStartTime: string): boolean {
  const startTime = parseISO(lessonStartTime)
  return isBefore(startTime, new Date())
}

export function generateRecurringLessons(
  startDate: Date,
  endDate: Date,
  durationMinutes: number
): { startTime: Date; endTime: Date }[] {
  const lessons: { startTime: Date; endTime: Date }[] = []
  let currentDate = new Date(startDate)
  
  // Generate weekly lessons for 1 year (52 weeks)
  for (let i = 0; i < 52; i++) {
    const lessonStart = new Date(currentDate)
    const lessonEnd = new Date(currentDate)
    lessonEnd.setMinutes(lessonEnd.getMinutes() + durationMinutes)
    
    lessons.push({
      startTime: lessonStart,
      endTime: lessonEnd,
    })
    
    currentDate = addWeeks(currentDate, 1)
  }
  
  return lessons
}

export const TIMEZONES = [
  { value: 'Europe/London', label: 'UK (GMT/BST)' },
  { value: 'Europe/Rome', label: 'Italy (CET)' },
  { value: 'Europe/Paris', label: 'France (CET)' },
  { value: 'Europe/Berlin', label: 'Germany (CET)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'America/Chicago', label: 'Chicago (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
]

export const LESSON_DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
]

// Generate time slots from 6:00 to 22:00 in 15-minute intervals
export const TIME_SLOTS = (() => {
  const slots = []
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute of [0, 15, 30, 45]) {
      if (hour === 22 && minute > 0) break // Stop at 22:00
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      slots.push({ value: `${h}:${m}`, label: `${h}:${m}` })
    }
  }
  return slots
})()

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

