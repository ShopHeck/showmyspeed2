// functions/stripe-webhook/index.ts
// Replaces the Blink version — uses Supabase service role key to update subscriptions

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// Service role key bypasses RLS — only use server-side
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICE_TO_PLAN: Record<string, { planId: string; planName: string; reportsLimit: number }> = {
  [process.env.STRIPE_PRICE_SINGLE ?? '']:    { planId: 'single',    planName: 'Single Report',     reportsLimit: 1  },
  [process.env.STRIPE_PRICE_UNLIMITED ?? '']: { planId: 'unlimited', planName: 'Unlimited Monthly', reportsLimit: 999 },
}

export const handler = async (event: { body: string | null; headers: Record<string, string> }) => {
  const sig = event.headers['stripe-signature']
  if (!sig || !event.body) {
    return { statusCode: 400, body: 'Missing signature or body' }
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}` }
  }

  try {
    switch (stripeEvent.type) {

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as 'single' | 'unlimited' | undefined
        if (!userId || !plan) break

        const planInfo = PRICE_TO_PLAN[session.metadata?.priceId ?? ''] ?? {
          planId: plan,
          planName: plan === 'single' ? 'Single Report' : 'Unlimited Monthly',
          reportsLimit: plan === 'single' ? 1 : 999,
        }

        const subData: Record<string, unknown> = {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          plan_id: planInfo.planId,
          plan_name: planInfo.planName,
          status: 'active',
          reports_limit: planInfo.reportsLimit,
          reports_used: 0,
          updated_at: new Date().toISOString(),
        }

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          subData.stripe_subscription_id = sub.id
          subData.stripe_price_id = sub.items.data[0]?.price.id
          subData.current_period_start = new Date(sub.current_period_start * 1000).toISOString()
          subData.current_period_end = new Date(sub.current_period_end * 1000).toISOString()
          subData.cancel_at_period_end = sub.cancel_at_period_end
        }

        await supabase
          .from('user_subscriptions')
          .upsert(subData, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        const isActive = sub.status === 'active' || sub.status === 'trialing'
        const planInfo = PRICE_TO_PLAN[sub.items.data[0]?.price.id ?? '']

        await supabase
          .from('user_subscriptions')
          .update({
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0]?.price.id,
            plan_id: isActive && planInfo ? planInfo.planId : 'free',
            plan_name: isActive && planInfo ? planInfo.planName : 'Free',
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', sub.customer as string)
        break
      }

    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return { statusCode: 500, body: 'Handler error' }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
