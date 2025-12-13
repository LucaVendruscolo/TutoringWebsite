import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalculateAndPersistStudentBalance } from '@/lib/balance/server'

// This endpoint should be called periodically (e.g., every hour) to:
// 1. Mark past lessons as completed
// (Balance is derived from deposits/refunds minus the cost of ended lessons.)
// You can set this up with Vercel Cron, GitHub Actions, or any scheduler

export async function GET(request: NextRequest) {
  // Optional: Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In production, you might want to enforce this
    // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now = new Date()

  try {
    // Find scheduled lessons that have ended
    const { data: pendingLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*, student:profiles(*)')
      .eq('status', 'scheduled')
      .lt('end_time', now.toISOString())

    if (fetchError) throw fetchError

    let processed = 0
    let errors = 0
    const touchedStudents = new Set<string>()

    for (const lesson of pendingLessons || []) {
      try {
        // Mark lesson as completed
        await supabase
          .from('lessons')
          .update({ status: 'completed' })
          .eq('id', lesson.id)

        touchedStudents.add(lesson.student_id)
        processed++
      } catch (err) {
        console.error(`Error processing lesson ${lesson.id}:`, err)
        errors++
      }
    }

    // Sync derived balances for any students who had lessons transitioned
    for (const studentId of touchedStudents) {
      try {
        await recalculateAndPersistStudentBalance(supabase as any, studentId, now)
      } catch (err) {
        console.error(`Error recalculating balance for student ${studentId}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} lessons, ${errors} errors`,
      timestamp: now.toISOString(),
    })
  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Also support POST for webhook triggers
export async function POST(request: NextRequest) {
  return GET(request)
}

