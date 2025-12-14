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
    const { email, password, parentName, studentName, costPerHour, timezone } = body

    // Create user with admin client
    const adminClient = createAdminClient()
    
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'student',
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Update the profile with additional info
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({
        parent_name: parentName || '',
        student_name: studentName || '',
        cost_per_hour: costPerHour,
        timezone: timezone || 'Europe/London',
        password_changed: false,
        dark_mode: false, // Default to light mode for new accounts
      })
      .eq('id', newUser.user.id)

    if (updateError) {
      // If profile update fails, try to delete the user
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

