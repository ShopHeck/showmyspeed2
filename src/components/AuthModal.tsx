import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Lock, User, Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
}

export function AuthModal({ open, onClose, defaultTab = 'signin' }: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reset = () => {
    setError(null)
    setSuccess(null)
    setEmail('')
    setPassword('')
    setDisplayName('')
  }

  const switchTab = (t: 'signin' | 'signup') => {
    setTab(t)
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (tab === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || undefined },
          },
        })
        if (signUpError) throw signUpError
        setSuccess('Account created! Check your email to confirm.')
        setTimeout(() => { onClose(); reset() }, 2000)
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        onClose()
        reset()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : ''
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password')) {
        setError('Incorrect email or password.')
      } else if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('An account with this email already exists.')
      } else if (msg.includes('weak') || msg.includes('too short')) {
        setError('Password must be at least 6 characters.')
      } else if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many attempts. Please wait a moment.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch {
      setError('Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md glass-card shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient top line */}
              <div className="absolute top-0 inset-x-0 h-px" style={{ background: 'var(--gradient-primary)' }} />
              <div
                className="absolute top-0 inset-x-0 h-24 opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(197 100% 50% / 0.5) 0%, transparent 70%)' }}
              />

              <div className="relative p-6 sm:p-8">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center glow-primary">
                    <Zap className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-display font-bold text-base">
                    <span className="text-foreground">show</span>
                    <span className="gradient-text">myspeed</span>
                  </span>
                </div>

                <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 mb-6">
                  {(['signin', 'signup'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => switchTab(t)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        tab === t
                          ? 'bg-white/[0.08] text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t === 'signin' ? 'Sign In' : 'Create Account'}
                    </button>
                  ))}
                </div>

                <div className="mb-1">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    {tab === 'signin' ? 'Welcome back' : 'Join ShowMySpeed'}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {tab === 'signin'
                      ? 'Sign in to view your speed history and saved providers.'
                      : 'Save test results, track history, and bookmark ISP plans.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="mt-5 w-full btn-ghost flex items-center justify-center gap-3 py-2.5 disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-white/[0.06]" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {tab === 'signup' && (
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Display name (optional)"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
                      />
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={tab === 'signup' ? 6 : undefined}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.p
                        key="error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}
                    {success && (
                      <motion.p
                        key="success"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2"
                      >
                        {success}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      tab === 'signin' ? 'Sign In' : 'Create Account'
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-muted-foreground mt-4">
                  {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => switchTab(tab === 'signin' ? 'signup' : 'signin')}
                    className="text-primary hover:underline font-medium"
                  >
                    {tab === 'signin' ? 'Sign up free' : 'Sign in'}
                  </button>
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
