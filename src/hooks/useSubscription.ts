import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface UserSubscription {
  id: string
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_price_id: string
  plan_id: 'free' | 'single' | 'unlimited'
  plan_name: string
  status: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  reports_used: number
  reports_limit: number
  created_at: string
  updated_at: string
}

export function useSubscription() {
  const { user, isAuthenticated } = useAuth()

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    enabled: !!user?.id && isAuthenticated,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) throw error
      return data as UserSubscription | null
    },
  })

  const planId = subscription?.plan_id ?? 'free'
  const isPremium = planId === 'unlimited' && subscription?.status === 'active'
  const hasSingleReport = planId === 'single' && subscription?.status === 'active'
  const canAccessPremium = isPremium || hasSingleReport
  const reportsUsed = subscription?.reports_used ?? 0
  const reportsLimit = subscription?.reports_limit ?? 0
  const reportsRemaining = Math.max(0, reportsLimit - reportsUsed)

  return {
    subscription,
    isLoading,
    planId,
    isPremium,
    hasSingleReport,
    canAccessPremium,
    reportsUsed,
    reportsLimit,
    reportsRemaining,
  }
}
