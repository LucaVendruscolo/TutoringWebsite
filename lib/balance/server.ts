import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateDerivedBalance } from '@/lib/balance'

export async function recalculateAndPersistStudentBalance(
  supabaseAdmin: SupabaseClient,
  studentId: string,
  now: Date = new Date()
): Promise<number> {
  const [{ data: creditTxs, error: creditErr }, { data: lessons, error: lessonErr }] =
    await Promise.all([
      supabaseAdmin
        .from('transactions')
        .select('type, amount')
        .eq('student_id', studentId)
        .in('type', ['deposit', 'refund']),
      supabaseAdmin
        .from('lessons')
        .select('status, end_time, cost')
        .eq('student_id', studentId)
        .lt('end_time', now.toISOString())
        .neq('status', 'cancelled'),
    ])

  if (creditErr) throw creditErr
  if (lessonErr) throw lessonErr

  const balance = calculateDerivedBalance({
    credits: (creditTxs as any) || [],
    lessons: (lessons as any) || [],
    now,
  })

  const { error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ balance })
    .eq('id', studentId)

  if (updateErr) throw updateErr

  return balance
}


