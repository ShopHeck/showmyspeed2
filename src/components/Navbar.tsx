import { useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion'
import { Zap, BarChart3, LayoutDashboard, User, Menu, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { AuthModal } from './AuthModal'

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [navOpacity, setNavOpacity] = useState(1)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    // Fade out between 0-150px of scroll
    const opacity = Math.max(0, 1 - latest / 150)
    setNavOpacity(opacity)
  })

  const links = [
    { to: '/' as const, label: 'Speed Test', icon: <Zap className="w-4 h-4" /> },
    { to: '/compare' as const, label: 'Compare', icon: <BarChart3 className="w-4 h-4" /> },
    ...(isAuthenticated
      ? [{ to: '/dashboard' as const, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }]
      : []),
  ]

  return (
    <>
      <motion.nav
        className="fixed top-0 inset-x-0 z-40 transition-[pointer-events]"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ opacity: navOpacity, pointerEvents: navOpacity < 0.1 ? 'none' : 'auto' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors glow-primary">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-display font-bold text-base tracking-tight">
                <span className="text-foreground">show</span>
                <span className="gradient-text">myspeed</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => {
                const isActive = currentPath === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 rounded-lg bg-white/[0.06] border border-white/[0.08]"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Auth / User button */}
            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="hidden sm:flex items-center gap-2 btn-ghost"
                >
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              ) : (
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-2 btn-ghost"
                >
                  <User className="w-4 h-4" />
                  Account
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-xl"
            >
              <div className="px-4 py-3 space-y-1">
                {links.map((link) => {
                  const isActive = currentPath === link.to
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-foreground bg-white/[0.06]'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  )
                })}
                {!isAuthenticated && (
                  <button
                    onClick={() => { setAuthOpen(true); setMobileOpen(false) }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground w-full text-left"
                  >
                    <User className="w-4 h-4" />
                    Sign In
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
