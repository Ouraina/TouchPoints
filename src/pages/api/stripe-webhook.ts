import Stripe from 'stripe'
import { supabase } from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const buf = await req.text()
  const sig = req.headers.get('stripe-signature')
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig!, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log('Received webhook event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing completed checkout session:', session.id)

  if (!session.customer || !session.subscription) {
    console.error('Missing customer or subscription in session')
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
  
  // Update user subscription status
  await updateUserSubscription(subscription)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Processing new subscription:', subscription.id)
  await updateUserSubscription(subscription)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id)
  await updateUserSubscription(subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id)
  
  // Find user by Stripe customer ID
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single()

  if (error || !user) {
    console.error('User not found for subscription:', subscription.id)
    return
  }

  // Update user subscription status to cancelled
  await supabase
    .from('users')
    .update({
      subscription_status: 'cancelled',
      subscription_plan: null,
      subscription_end_date: new Date().toISOString()
    })
    .eq('id', user.id)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing successful payment for invoice:', invoice.id)
  
  if ((invoice as any).subscription) {
    const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string)
    await updateUserSubscription(subscription)
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing failed payment for invoice:', invoice.id)
  
  // Find user and update status
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single()

  if (error || !user) {
    console.error('User not found for failed payment:', invoice.id)
    return
  }

  // Update user subscription status to past_due
  await supabase
    .from('users')
    .update({
      subscription_status: 'past_due'
    })
    .eq('id', user.id)
}

async function updateUserSubscription(subscription: Stripe.Subscription) {
  console.log('Updating user subscription:', subscription.id)

  // Find user by Stripe customer ID
  const { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single()

  if (error || !user) {
    console.error('User not found for subscription:', subscription.id)
    return
  }

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) {
    console.error('No price ID found in subscription:', subscription.id)
    return
  }

  // Determine plan name from price ID
  let planName = 'unknown'
  if (priceId.includes('solo')) planName = 'solo'
  else if (priceId.includes('family')) planName = 'family'
  else if (priceId.includes('pro')) planName = 'pro'

  // Update user subscription details
  const updateData: any = {
    subscription_status: subscription.status,
    subscription_plan: planName,
    subscription_id: subscription.id,
    subscription_end_date: new Date((subscription as any).current_period_end * 1000).toISOString()
  }

  // Add trial end date if subscription is in trial
  if (subscription.status === 'trialing' && subscription.trial_end) {
    updateData.trial_end_date = new Date(subscription.trial_end * 1000).toISOString()
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)

  if (updateError) {
    console.error('Error updating user subscription:', updateError)
  } else {
    console.log('Successfully updated user subscription for user:', user.id)
  }
} 