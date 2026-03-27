import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from '@tanstack/react-router'
import {
  Activity, ArrowDown, Timer, Bookmark, BookmarkX,
  User, LogOut, TrendingUp, Trash2, ExternalLink,
  BarChart3, ChevronRight, Zap, Clock, Crown, Loader2
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { supabase } from '../lib/supabase'
import { getSpeedRating } from '../lib/speedTest'
import { openCustomerPortal } from '../lib/stripe'
import toast from 'react-hot-toast'

function ManageSubscriptionButton({ customerId }: { customerId: string }) {
  const [loading, setLoading] = useState(false)
  const handleManage = async () => {
    setLoading(true)
    try {
      const url = await openCustomerPortal(customerId)
      window.open(url, '_blank')
    } catch {
      toast.error('Could not open billing portal')
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      onClick={handleManage}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground border border-border/50 hover:text-foreground hover:border-border transition-colors disabled:opacity-60"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      Manage Subscription
    </button>
  )
}

interface SpeedRecord {
  id: string
  download_mbps: number
  upload_mbps: number
  ping_ms: number
  jitter_ms: number
  isp_name?: string
  isp_location?: string
  ip_city?: string
  ip_country?: string
  created_at: string
}

interface SavedProvider {
  id: string
  isp_name: string
  isp_type?: string
  isp_url?: string
  created_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function SpeedTrend({ records }: { records: SpeedRecord[] }) {
  if (records.length < 2) return null
  const sorted = [...records].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const max = Math.max(...sorted.map(r => r.download_mbps))
  const width = 260
  const height = 60
  const pts = sorted.map((r, i) => {
    const x = (i / (sorted.length - 1)) * width
    const y = height - (r.download_mbps / max) * (height - 8) - 4
    return `${x},${y}`
  })

  return (
    <div className="mt-3">
      <p className="text-xs text-muted-foreground mb-2">Download trend (last {sorted.length} tests)</p>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="speedGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(197 100% 50%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(185 100% 50%)" />
          </linearGradient>
        </defs>
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="url(#speedGrad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {sorted.map((r, i) => {
          const x = (i / (sorted.length - 1)) * width
          const y = height - (r.download_mbps / max) * (height - 8) - 4
          return <circle key={i} cx={x} cy={y} r="3" fill="hsl(197 100% 50%)" />
        })}
      </svg>
    </div>
  )
}

export function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const { subscription, planId, isPremium, hasSingleReport, canAccessPremium, reportsRemaining } = useSubscription()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: '/' })
    }
  }, [isLoading, isAuthenticated, navigate])

  // Fetch speed history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['speed-history', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_speed_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as SpeedRecord[]
    },
  })

  // Fetch saved providers
  const { data: saved = [], isLoading: savedLoading } = useQuery({
    queryKey: ['saved-providers', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_providers')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as SavedProvider[]
    },
  })

  // Delete speed record
  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_speed_history')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id) // RLS safety
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speed-history', user?.id] })
      toast.success('Test result removed')
    },
  })

  // Unsave provider
  const unsaveProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_providers')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-providers', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['saved-provider-names', user?.id] })
      toast.success('Provider removed from saved')
    },
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/' })
    toast.success('Signed out')
  }

  // Stats from history
  const avgDownload = history.length ? Math.round(history.reduce((a, r) => a + r.download_mbps, 0) / history.length) : null
  const bestDownload = history.length ? Math.round(Math.max(...history.map(r => r.download_mbps))) : null
  const avgPing = history.length ? Math.round(history.reduce((a, r) => a + r.ping_ms, 0) / history.length) : null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'My Dashboard'

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {displayName}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Activity className="w-4 h-4" />
              Run New Test
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border/50 hover:border-border transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* Stats overview */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {[
            { label: 'Tests Run', value: history.length.toString(), icon: <BarChart3 className="w-4 h-4 text-primary" />, sub: 'all time' },
            { label: 'Avg Download', value: avgDownload ? `${avgDownload} Mbps` : '—', icon: <ArrowDown className="w-4 h-4 text-primary" />, sub: 'across all tests' },
            { label: 'Best Speed', value: bestDownload ? `${bestDownload} Mbps` : '—', icon: <Zap className="w-4 h-4 text-yellow-400" />, sub: 'your record' },
            { label: 'Avg Ping', value: avgPing ? `${avgPing} ms` : '—', icon: <Timer className="w-4 h-4 text-accent" />, sub: 'average latency' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl border border-border/50 bg-card/30">
              <div className="flex items-center gap-2 mb-2">
                {stat.icon}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Subscription card */}
        <motion.div
          className="mb-8 p-5 rounded-2xl border bg-card/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{
            borderColor: isPremium ? 'hsl(197 100% 50% / 0.4)' : 'hsl(var(--border) / 0.5)',
            background: isPremium ? 'hsl(197 100% 50% / 0.05)' : undefined,
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: isPremium ? 'hsl(197 100% 50% / 0.15)' : 'hsl(var(--secondary))' }}
            >
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {planId === 'unlimited' ? 'Unlimited Monthly' : planId === 'single' ? 'Single Report' : 'Free Plan'}
                </span>
                {canAccessPremium && (
                  <span className="text-xs font-semibold text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isPremium
                  ? `Unlimited premium reports · ${subscription?.cancel_at_period_end ? 'Cancels at period end' : 'Renews monthly'}`
                  : hasSingleReport
                  ? `${reportsRemaining} report${reportsRemaining !== 1 ? 's' : ''} remaining`
                  : 'Upgrade to unlock premium diagnostic reports'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canAccessPremium && subscription?.stripe_customer_id ? (
              <ManageSubscriptionButton customerId={subscription.stripe_customer_id} />
            ) : null}
            <Link
              to="/premium"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
              style={
                canAccessPremium
                  ? { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border) / 0.5)' }
                  : { background: 'var(--gradient-primary)', color: 'hsl(var(--primary-foreground))' }
              }
            >
              <Zap className="w-4 h-4" />
              {canAccessPremium ? 'View Plans' : 'Upgrade'}
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Speed History */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <Clock className="w-4 h-4 text-primary" />
                Speed History
              </h2>
              <span className="text-xs text-muted-foreground">{history.length} tests</span>
            </div>

            {history.length >= 2 && (
              <div className="p-4 rounded-xl border border-border/50 bg-card/30 mb-4">
                <SpeedTrend records={history.slice(0, 20)} />
              </div>
            )}

            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl border border-border/30 bg-card/20 animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 rounded-xl border border-border/40 bg-card/20 text-center">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No tests yet</p>
                <p className="text-xs text-muted-foreground mb-4">Run your first speed test to start tracking history.</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-primary-foreground"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Run Speed Test
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {history.map((record, i) => {
                    const rating = getSpeedRating(record.download_mbps)
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: i * 0.03 }}
                        className="group flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/20 hover:border-border/70 hover:bg-card/40 transition-all"
                      >
                        <div className="flex-shrink-0 text-center min-w-[64px]">
                          <div
                            className="text-lg font-black"
                            style={{
                              fontFamily: 'Space Grotesk, sans-serif',
                              background: 'var(--gradient-primary)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {record.download_mbps >= 100
                              ? Math.round(record.download_mbps)
                              : Math.round(record.download_mbps * 10) / 10}
                          </div>
                          <div className="text-xs text-muted-foreground">Mbps ↓</div>
                        </div>

                        <div className="w-px h-10 bg-border/40 flex-shrink-0" />

                        <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
                          <div className="text-xs">
                            <span className="text-muted-foreground">↑ </span>
                            <span className="text-accent font-medium">{Math.round(record.upload_mbps)} Mbps</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">ping </span>
                            <span className="text-yellow-400 font-medium">{Math.round(record.ping_ms)} ms</span>
                          </div>
                          {record.isp_name && (
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{record.isp_name}</div>
                          )}
                          <div className={`text-xs font-medium ${rating.color}`}>{rating.label}</div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {formatDate(record.created_at)}
                          </span>
                          <button
                            onClick={() => deleteRecord.mutate(record.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Saved Providers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                <Bookmark className="w-4 h-4 text-primary" />
                Saved Providers
              </h2>
              <span className="text-xs text-muted-foreground">{saved.length} saved</span>
            </div>

            {savedLoading ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="h-16 rounded-xl border border-border/30 bg-card/20 animate-pulse" />
                ))}
              </div>
            ) : saved.length === 0 ? (
              <div className="p-6 rounded-xl border border-border/40 bg-card/20 text-center">
                <Bookmark className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">No saved providers</p>
                <p className="text-xs text-muted-foreground mb-4">Bookmark ISPs from the Compare page.</p>
                <Link
                  to="/compare"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Browse providers <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {saved.map((provider, i) => (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.04 }}
                      className="group p-3.5 rounded-xl border border-border/40 bg-card/20 hover:border-border/70 hover:bg-card/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground">{provider.isp_name}</div>
                          {provider.isp_type && (
                            <div className="text-xs text-muted-foreground mt-0.5">{provider.isp_type}</div>
                          )}
                          <div className="text-xs text-muted-foreground/60 mt-1">
                            Saved {formatDate(provider.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {provider.isp_url && (
                            <a
                              href={provider.isp_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Visit provider"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => unsaveProvider.mutate(provider.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remove"
                          >
                            <BookmarkX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {saved.length > 0 && (
              <Link
                to="/compare"
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Browse More Providers
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
