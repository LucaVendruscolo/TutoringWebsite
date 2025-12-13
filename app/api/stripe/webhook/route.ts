import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'
import { recalculateAndPersistStudentBalance } from '@/lib/balance/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

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
    const paymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : null

    if (!userId || !amount || !paymentIntentId) {
      console.error('Missing required data in checkout session', {
        hasUserId: Boolean(userId),
        amount,
        hasPaymentIntentId: Boolean(paymentIntentId),
        eventId: event.id,
      })
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Idempotency: if we've already recorded this payment intent, do nothing.
      const { data: existingTx, error: existingTxError } = await supabase
        .from('transactions')
        .select('id')
        .eq('stripe_payment_id', paymentIntentId)
        .limit(1)

      if (existingTxError) {
        console.error('Error checking existing transaction:', existingTxError)
      }

      if (existingTx && existingTx.length > 0) {
        console.log('Duplicate webhook ignored', { paymentIntentId, eventId: event.id })
        return NextResponse.json({ received: true })
      }

      // Create transaction record
      await supabase.from('transactions').insert({
        student_id: userId,
        type: 'deposit',
        amount: amount,
        description: `Deposit of £${amount.toFixed(2)}`,
        stripe_payment_id: paymentIntentId,
      })

      const newBalance = await recalculateAndPersistStudentBalance(supabase as any, userId, new Date())
      console.log(`Successfully processed deposit (£${amount}) for user ${userId}. New derived balance: £${newBalance}`)
    } catch (error: any) {
      console.error('Error processing payment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}

