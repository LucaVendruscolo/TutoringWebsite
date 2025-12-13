import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recalculateAndPersistStudentBalance } from '@/lib/balance/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedStudentId: string | undefined = body?.studentId

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = callerProfile?.role === 'admin'
    const studentId = isAdmin && requestedStudentId ? requestedStudentId : user.id

    const admin = createAdminClient()
    const balance = await recalculateAndPersistStudentBalance(admin, studentId, new Date())

    return NextResponse.json({ studentId, balance })
  } catch (error: any) {
    console.error('Balance recalculation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to recalculate balance' }, { status: 500 })
  }
}


