import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify admin user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { userId, newEmail } = body

    if (!userId || !newEmail) {
      return NextResponse.json({ error: 'User ID and new email are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Update user email with admin client
    const adminClient = createAdminClient()
    
    const { data: updatedUser, error: updateAuthError } = await adminClient.auth.admin.updateUserById(
      userId,
      { email: newEmail, email_confirm: true }
    )

    if (updateAuthError) {
      return NextResponse.json({ error: updateAuthError.message }, { status: 400 })
    }

    // Also update the email in the profiles table
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId)

    if (updateProfileError) {
      return NextResponse.json({ error: updateProfileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, email: newEmail })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

