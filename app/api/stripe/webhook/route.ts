import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    
    const userId = session.metadata?.user_id
    const amount = parseFloat(session.metadata?.amount || '0')

    if (!userId || !amount) {
      console.error('Missing metadata in checkout session')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Get current balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, student_name')
        .eq('id', userId)
        .single()

      if (!profile) {
        throw new Error('Profile not found')
      }

      // Update balance
      const newBalance = Number(profile.balance) + amount
      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId)

      // Create transaction record
      await supabase.from('transactions').insert({
        student_id: userId,
        type: 'deposit',
        amount: amount,
        description: `Deposit of £${amount.toFixed(2)}`,
        stripe_payment_id: session.payment_intent as string,
      })

      console.log(`Successfully added £${amount} to user ${userId}`)
    } catch (error: any) {
      console.error('Error processing payment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

