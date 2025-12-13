import { format, parseISO, addWeeks, isAfter, isBefore, addHours } from 'date-fns'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'

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
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
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

