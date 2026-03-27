import { supabase } from './supabase'

export const STRIPE_PRICES = {
  single: 'price_1TDs4EGu6ZTrX6WqkfpIZbZi',      // $2.99 one-time — replace with your price ID
  unlimited: 'price_1TDs4KGu6ZTrX6WqTvWWUify',    // $7.99/month — replace with your price ID
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  return {}
}

export async function createCheckoutSession({
  plan,
  userId,
  userEmail,
}: {
  plan: 'single' | 'unlimited'
  userId: string
  userEmail?: string
}): Promise<string> {
  const origin = window.location.origin
  const authHeader = await getAuthHeader()

  const res = await fetch(`${import.meta.env.VITE_NETLIFY_FUNCTIONS_URL ?? '/.netlify/functions'}/create-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      priceId: STRIPE_PRICES[plan],
      userId,
      userEmail,
      plan,
      successUrl: `${origin}/dashboard?upgraded=1`,
      cancelUrl: `${origin}/premium`,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Failed to create checkout')
  }

  const data = await res.json() as { url: string }
  return data.url
}

export async function openCustomerPortal(customerId: string): Promise<string> {
  const authHeader = await getAuthHeader()

  const res = await fetch(`${import.meta.env.VITE_NETLIFY_FUNCTIONS_URL ?? '/.netlify/functions'}/customer-portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify({
      customerId,
      returnUrl: `${window.location.origin}/dashboard`,
    }),
  })

  if (!res.ok) throw new Error('Failed to open portal')
  const data = await res.json() as { url: string }
  return data.url
}
