import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { format, subDays, addYears } from 'date-fns'

// Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatICalDate(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'")
}

export async function GET() {
  try {
    // Get date range (30 days ago to 1 year ahead)
    const startDate = subDays(new Date(), 30)
    const endDate = addYears(new Date(), 1)

    // Fetch all lessons for all students
    const { data: lessons, error } = await supabaseAdmin
      .from('lessons')
      .select(`
        *,
        student:profiles!lessons_student_id_fkey (
          parent_name,
          student_name
        )
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching lessons:', error)
      return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 })
    }

    // Generate iCal content
    const now = new Date()
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tutoring Website//Admin Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:All Tutoring Sessions',
      'X-WR-TIMEZONE:UTC',
    ]

    for (const lesson of lessons || []) {
      const startTime = new Date(lesson.start_time)
      const endTime = new Date(lesson.end_time)
      
      // Get student name from lesson title or profile
      let studentName = 'Student'
      if (lesson.student?.student_name) {
        // Check if lesson title has a specific child name
        const titleMatch = lesson.title?.match(/for (.+)$/)
        if (titleMatch) {
          studentName = titleMatch[1]
        } else {
          studentName = lesson.student.student_name.split(',')[0].trim()
        }
      }
      
      const status = lesson.status === 'cancelled' ? ' [CANCELLED]' : ''
      const summary = `${studentName}${status}`
      
      const description = [
        `Student: ${lesson.student?.student_name || 'Unknown'}`,
        `Parent: ${lesson.student?.parent_name || 'Unknown'}`,
        `Duration: ${lesson.duration_minutes} minutes`,
        `Cost: £${lesson.cost?.toFixed(2) || '0.00'}`,
        lesson.notes ? `Notes: ${lesson.notes}` : '',
      ].filter(Boolean).join('\\n')

      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${lesson.id}@tutoring-admin`,
        `DTSTAMP:${formatICalDate(now)}`,
        `DTSTART:${formatICalDate(startTime)}`,
        `DTEND:${formatICalDate(endTime)}`,
        `SUMMARY:${escapeICalText(summary)}`,
        `DESCRIPTION:${escapeICalText(description)}`,
        lesson.status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
        'END:VEVENT'
      )
    }

    icalContent.push('END:VCALENDAR')

    // Return as iCal file
    return new NextResponse(icalContent.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="tutoring-all-lessons.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('Calendar feed error:', error)
    return NextResponse.json({ error: 'Failed to generate calendar' }, { status: 500 })
  }
}

