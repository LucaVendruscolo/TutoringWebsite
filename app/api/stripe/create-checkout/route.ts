import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

function getBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) {
    try {
      // Ensure it includes a scheme (https://...) and normalize to origin
      return new URL(fromEnv).origin
    } catch {
      console.warn(
        `Invalid NEXT_PUBLIC_APP_URL (${fromEnv}). Falling back to request origin (${request.nextUrl.origin}).`
      )
    }
  }

  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const baseUrl = getBaseUrl(request)
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { amount } = body

    // Validate amount (minimum £5)
    if (!amount || amount < 5) {
      return NextResponse.json(
        { error: 'Minimum deposit is £5' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Tutoring Credit',
              description: `Add £${amount.toFixed(2)} to your tutoring balance`,
            },
            unit_amount: Math.round(amount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/student/balance?success=true`,
      cancel_url: `${baseUrl}/student/balance?cancelled=true`,
      customer_email: profile?.email,
      metadata: {
        user_id: user.id,
        amount: amount.toString(),
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

