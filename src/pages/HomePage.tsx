import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowDown, ArrowUp, Timer, Wifi, Globe, Shield, Zap } from 'lucide-react'
import { SpeedGauge } from '../components/SpeedGauge'
import { MetricCard } from '../components/MetricCard'
import {
  measurePing,
  measureDownload,
  measureUpload,
  getIpInfo,
  getSpeedRating,
  type SpeedTestResult,
  type IpInfo,
} from '../lib/speedTest'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type TestPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done'

const ISP_NATIONAL_AVG = { download: 242, upload: 34, ping: 22 }

export function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [phase, setPhase] = useState<TestPhase>('idle')
  const [gaugeValue, setGaugeValue] = useState(0)
  const [result, setResult] = useState<SpeedTestResult | null>(null)
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTest = useCallback(async () => {
    setError(null)
    setResult(null)
    setGaugeValue(0)

    try {
      const ipPromise = getIpInfo()

      setPhase('ping')
      const { ping, jitter } = await measurePing()

      setPhase('download')
      const downloadMbps = await measureDownload((mbps) => setGaugeValue(mbps))

      setPhase('upload')
      setGaugeValue(0)
      const uploadMbps = await measureUpload((mbps) => setGaugeValue(mbps))

      const info = await ipPromise
      setIpInfo(info)

      const finalResult: SpeedTestResult = {
        downloadMbps,
        uploadMbps,
        pingMs: ping,
        jitterMs: jitter,
      }
      setResult(finalResult)
      setGaugeValue(downloadMbps)
      setPhase('done')

      // Save to public speed_results table (anonymous)
      try {
        await supabase.from('speed_results').insert({
          download_mbps: finalResult.downloadMbps,
          upload_mbps: finalResult.uploadMbps,
          ping_ms: finalResult.pingMs,
          jitter_ms: finalResult.jitterMs,
          isp_name: info.isp,
          isp_location: `${info.city}, ${info.region}`,
          ip_country: info.country,
          ip_region: info.region,
          ip_city: info.city,
        })
      } catch {
        // Non-blocking
      }

      // Save to user's personal history if authenticated
      if (user) {
        try {
          await supabase.from('user_speed_history').insert({
            user_id: user.id,
            download_mbps: finalResult.downloadMbps,
            upload_mbps: finalResult.uploadMbps,
            ping_ms: finalResult.pingMs,
            jitter_ms: finalResult.jitterMs,
            isp_name: info.isp,
            isp_location: `${info.city}, ${info.region}`,
            ip_city: info.city,
            ip_country: info.country,
          })
        } catch {
          // Non-blocking
        }
      }

      setTimeout(() => {
        navigate({
          to: '/results',
          search: {
            download: downloadMbps,
            upload: uploadMbps,
            ping,
            jitter,
            isp: info.isp,
            city: info.city,
            country: info.country,
          },
        })
      }, 1800)
    } catch {
      setError('Test failed. Please check your connection and try again.')
      setPhase('idle')
    }
  }, [navigate, user])

  const phaseLabel: Record<TestPhase, string> = {
    idle: '',
    ping: 'Measuring latency...',
    download: 'Testing download speed...',
    upload: 'Testing upload speed...',
    done: 'Test complete!',
  }

  const gaugeMax = phase === 'upload' ? 200 : 1000

  return (
    <div className="min-h-screen bg-background">
      <div
        className="absolute inset-x-0 top-0 h-[600px] pointer-events-none"
        style={{ background: 'var(--gradient-hero)' }}
      />

      <div className="relative pt-28 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Free Internet Speed Test
          </div>
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            How fast is your
            <span
              className="block"
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              internet?
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Test your download, upload, and ping in seconds. Then see how you compare to others — and find faster plans near you.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative p-8 sm:p-12 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm w-full max-w-lg text-center">
            <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: 'radial-gradient(circle at 50% 40%, hsl(197 100% 50% / 0.15) 0%, transparent 60%)' }}
              />
            </div>

            <div className="flex justify-center mb-4">
              <SpeedGauge
                value={phase === 'idle' || phase === 'ping' ? 0 : gaugeValue}
                maxValue={gaugeMax}
                size={240}
                label={phase === 'upload' ? 'Upload Mbps' : 'Download Mbps'}
              />
            </div>

            <AnimatePresence mode="wait">
              {phase !== 'idle' && (
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mb-4"
                >
                  <p className="text-sm text-primary font-medium">{phaseLabel[phase]}</p>
                  {phase === 'ping' && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {[0, 1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full bg-primary animate-pulse"
                          style={{ height: `${(i + 1) * 6}px`, animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {phase === 'idle' && (
              <motion.button
                onClick={runTest}
                className="relative group px-10 py-4 rounded-xl text-base font-bold text-primary-foreground overflow-hidden transition-all active:scale-95"
                style={{ background: 'var(--gradient-primary)' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Start Speed Test
                </span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            )}

            {error && <p className="text-destructive text-sm mt-3">{error}</p>}

            {ipInfo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>{ipInfo.isp}</span>
                {ipInfo.city && <span className="text-muted-foreground/50">·</span>}
                {ipInfo.city && <span>{ipInfo.city}, {ipInfo.country}</span>}
              </motion.div>
            )}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 w-full max-w-lg"
              >
                <MetricCard label="Download" value={result.downloadMbps} unit="Mbps" icon={<ArrowDown className="w-4 h-4" />} color="text-primary" />
                <MetricCard label="Upload" value={result.uploadMbps} unit="Mbps" icon={<ArrowUp className="w-4 h-4" />} color="text-accent" />
                <MetricCard label="Ping" value={result.pingMs} unit="ms" icon={<Timer className="w-4 h-4" />} color="text-yellow-400" />
                <MetricCard label="Jitter" value={result.jitterMs} unit="ms" icon={<Activity className="w-4 h-4" />} color="text-purple-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 p-4 rounded-xl border border-border/50 bg-card/30 w-full max-w-lg text-sm"
            >
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
                vs. National Average
              </p>
              <div className="flex items-center justify-around gap-4">
                {[
                  { label: 'Download', yours: result.downloadMbps, avg: ISP_NATIONAL_AVG.download, unit: 'Mbps' },
                  { label: 'Upload', yours: result.uploadMbps, avg: ISP_NATIONAL_AVG.upload, unit: 'Mbps' },
                  { label: 'Ping', yours: result.pingMs, avg: ISP_NATIONAL_AVG.ping, unit: 'ms', lowerIsBetter: true },
                ].map(stat => {
                  const better = stat.lowerIsBetter ? stat.yours < stat.avg : stat.yours > stat.avg
                  return (
                    <div key={stat.label} className="text-center">
                      <div className={`text-base font-bold ${better ? 'text-green-400' : 'text-orange-400'}`}>
                        {better ? '+' : ''}
                        {stat.lowerIsBetter
                          ? Math.round(stat.avg - stat.yours)
                          : Math.round(stat.yours - stat.avg)}{' '}
                        <span className="text-xs font-normal">{stat.unit}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { icon: <Zap className="w-5 h-5 text-primary" />, title: 'Real-Time Test', desc: 'Accurate browser-based measurement using Cloudflare edge servers.' },
            { icon: <Globe className="w-5 h-5 text-accent" />, title: 'ISP Comparison', desc: 'See how your plan stacks up and discover faster options in your area.' },
            { icon: <Shield className="w-5 h-5 text-purple-400" />, title: 'Privacy First', desc: 'No personal data stored. Results are anonymous and aggregated.' },
          ].map(f => (
            <div key={f.title} className="p-5 rounded-xl border border-border/50 bg-card/30">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold mb-5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            What do these numbers mean?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { range: '< 25 Mbps', label: 'Slow', color: 'text-red-400', desc: 'Basic browsing OK. Streaming in HD or video calls will struggle.' },
              { range: '25–100 Mbps', label: 'Average', color: 'text-yellow-400', desc: 'Good for a single user. Multiple devices may slow things down.' },
              { range: '100–500 Mbps', label: 'Good', color: 'text-primary', desc: 'Handles multiple 4K streams, gaming, and large file transfers.' },
              { range: '500+ Mbps', label: 'Excellent', color: 'text-emerald-400', desc: 'Gigabit territory. Everything runs instantly, always.' },
            ].map(row => (
              <div key={row.range} className="flex items-start gap-3 p-4 rounded-lg border border-border/30 bg-card/20">
                <div>
                  <div className={`text-sm font-bold ${row.color}`}>{row.range}</div>
                  <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                </div>
                <div className="h-8 w-px bg-border/50 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{row.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
