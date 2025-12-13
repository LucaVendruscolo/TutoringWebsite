import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// This endpoint should be called periodically (e.g., every hour) to:
// 1. Mark past lessons as completed
// 2. Charge students for completed lessons
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

    for (const lesson of pendingLessons || []) {
      try {
        // Mark lesson as completed
        await supabase
          .from('lessons')
          .update({ status: 'completed' })
          .eq('id', lesson.id)

        // Charge the student (deduct from balance)
        const currentBalance = Number(lesson.student?.balance || 0)
        const newBalance = currentBalance - Number(lesson.cost)

        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', lesson.student_id)

        // Create transaction record
        await supabase.from('transactions').insert({
          student_id: lesson.student_id,
          type: 'lesson_charge',
          amount: -Number(lesson.cost),
          description: `Lesson charge - ${new Date(lesson.start_time).toLocaleDateString('en-GB')}`,
          lesson_id: lesson.id,
        })

        processed++
      } catch (err) {
        console.error(`Error processing lesson ${lesson.id}:`, err)
        errors++
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

