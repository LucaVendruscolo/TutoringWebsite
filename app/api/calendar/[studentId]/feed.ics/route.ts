import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { format, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

// Create admin client for public calendar access (no auth required, but uses unique student ID)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Generate iCal formatted date (YYYYMMDDTHHmmssZ)
function toICalDate(dateStr: string): string {
  const date = parseISO(dateStr)
  return formatInTimeZone(date, 'UTC', "yyyyMMdd'T'HHmmss'Z'")
}

// Escape special characters in iCal text
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params

    if (!studentId) {
      return new NextResponse('Student ID required', { status: 400 })
    }

    // Fetch student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, student_name, parent_name, timezone')
      .eq('id', studentId)
      .eq('role', 'student')
      .single()

    if (profileError || !profile) {
      return new NextResponse('Student not found', { status: 404 })
    }

    // Fetch lessons for this student (upcoming and recent past - last 30 days to 1 year ahead)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const oneYearAhead = new Date()
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1)

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('student_id', studentId)
      .gte('start_time', thirtyDaysAgo.toISOString())
      .lte('start_time', oneYearAhead.toISOString())
      .order('start_time', { ascending: true })

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError)
      return new NextResponse('Error fetching lessons', { status: 500 })
    }

    // Build iCal content
    const calendarName = `Tutoring - ${profile.student_name || profile.parent_name || 'Lessons'}`
    const now = new Date().toISOString()
    
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Luca Tutoring//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICalText(calendarName)}`,
      'X-WR-TIMEZONE:Europe/London',
    ]

    // Add each lesson as a VEVENT
    for (const lesson of lessons || []) {
      // Skip cancelled lessons
      if (lesson.status === 'cancelled') continue

      // Extract child name from title if available
      const childName = lesson.title?.match(/Tutoring Session with (.+)/)?.[1] || profile.student_name
      
      const eventSummary = `Tutoring: ${childName}`
      const eventDescription = lesson.notes 
        ? `${lesson.duration_minutes} minute session\\n\\nNotes: ${lesson.notes}`
        : `${lesson.duration_minutes} minute session`

      // Create unique ID for this event
      const uid = `lesson-${lesson.id}@lucatutoring.com`
      
      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toICalDate(now)}`,
        `DTSTART:${toICalDate(lesson.start_time)}`,
        `DTEND:${toICalDate(lesson.end_time)}`,
        `SUMMARY:${escapeICalText(eventSummary)}`,
        `DESCRIPTION:${escapeICalText(eventDescription)}`,
        `STATUS:${lesson.status === 'completed' ? 'CONFIRMED' : 'CONFIRMED'}`,
        'END:VEVENT'
      )
    }

    icalContent.push('END:VCALENDAR')

    // Return as .ics file
    return new NextResponse(icalContent.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="tutoring-calendar.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Calendar feed error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

