import { useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowDown, ArrowUp, Timer, Wifi, Globe, Shield, Zap } from 'lucide-react'
import { SpeedGauge } from '../components/SpeedGauge'
import { MetricCard } from '../components/MetricCard'
import { DataFlowAnimation } from '../components/DataFlowAnimation'
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

  const phaseIcon: Record<TestPhase, string> = {
    idle: '',
    ping: 'Ping',
    download: 'Download',
    upload: 'Upload',
    done: 'Complete',
  }

  const gaugeMax = phase === 'upload' ? 200 : 1000
  const isRunning = phase !== 'idle' && phase !== 'done'
  const intensity = gaugeMax > 0 ? Math.min(gaugeValue / gaugeMax, 1) : 0

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-x-0 top-0 h-[800px]"
          style={{ background: 'var(--gradient-hero)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(265 89% 66%) 0%, transparent 70%)' }}
        />
      </div>

      {/* Full-screen data flow animation hero */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <DataFlowAnimation phase={phase} intensity={intensity} />
      </div>

      <div className="relative z-10 pt-24 pb-20 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Hero section */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Free Internet Speed Test
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
            How fast is your
            <span className="block gradient-text mt-1">
              internet?
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Test your download, upload, and ping in seconds.
            <span className="hidden sm:inline"> Then see how you compare to others.</span>
          </p>
        </motion.div>

        {/* Speed test card */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div
            className={`relative w-full max-w-xl transition-all duration-700 ${
              isRunning ? 'scale-[1.02]' : ''
            }`}
          >
            {/* Main test card */}
            <div className={`glass-card p-8 sm:p-12 text-center transition-all duration-500 ${
              isRunning ? 'glow-primary-strong' : phase === 'done' ? 'glow-primary' : ''
            }`}>
              {/* Phase indicator pills */}
              {isRunning && (
                <motion.div
                  className="flex items-center justify-center gap-2 mb-6"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {['ping', 'download', 'upload'].map((p) => (
                    <div
                      key={p}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                        phase === p
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : (['ping', 'download', 'upload'].indexOf(phase) > ['ping', 'download', 'upload'].indexOf(p))
                          ? 'bg-white/[0.04] text-muted-foreground/50 border border-transparent'
                          : 'bg-white/[0.02] text-muted-foreground/30 border border-transparent'
                      }`}
                    >
                      {phase === p && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Gauge */}
              <div className="relative flex justify-center mb-4 z-10">
                <SpeedGauge
                  value={phase === 'idle' || phase === 'ping' ? 0 : gaugeValue}
                  maxValue={gaugeMax}
                  size={260}
                  label={phase === 'upload' ? 'Upload Mbps' : 'Download Mbps'}
                />
              </div>

              {/* Phase label */}
              <AnimatePresence mode="wait">
                {phase !== 'idle' && (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-6 relative z-10"
                  >
                    <p className="text-sm font-medium text-primary">{phaseLabel[phase]}</p>
                    {phase === 'ping' && (
                      <div className="flex items-center justify-center gap-1.5 mt-3">
                        {[0, 1, 2, 3, 4].map(i => (
                          <motion.div
                            key={i}
                            className="w-1 rounded-full bg-primary"
                            animate={{ height: [4, 16, 4] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.1,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Start button */}
              {phase === 'idle' && (
                <motion.button
                  onClick={runTest}
                  className="btn-primary px-12 py-4 text-base font-bold group relative z-10"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 group-hover:animate-pulse" />
                    Start Speed Test
                  </span>
                </motion.button>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive text-sm mt-4 relative z-10"
                >
                  {error}
                </motion.p>
              )}

              {/* ISP info */}
              {ipInfo && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground relative z-10"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  <span>{ipInfo.isp}</span>
                  {ipInfo.city && (
                    <>
                      <span className="text-muted-foreground/30">|</span>
                      <span>{ipInfo.city}, {ipInfo.country}</span>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Result metrics */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 w-full max-w-xl"
              >
                <MetricCard label="Download" value={result.downloadMbps} unit="Mbps" icon={<ArrowDown className="w-4 h-4" />} color="text-primary" />
                <MetricCard label="Upload" value={result.uploadMbps} unit="Mbps" icon={<ArrowUp className="w-4 h-4" />} color="text-accent" />
                <MetricCard label="Ping" value={result.pingMs} unit="ms" icon={<Timer className="w-4 h-4" />} color="text-yellow-400" />
                <MetricCard label="Jitter" value={result.jitterMs} unit="ms" icon={<Activity className="w-4 h-4" />} color="text-purple-400" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* National avg comparison */}
          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 w-full max-w-xl"
            >
              <div className="glass-card p-5">
                <p className="text-muted-foreground mb-3 text-xs font-medium uppercase tracking-wider">
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
                        <div className={`text-lg font-display font-bold ${better ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {better ? '+' : ''}
                          {stat.lowerIsBetter
                            ? Math.round(stat.avg - stat.yours)
                            : Math.round(stat.yours - stat.avg)}{' '}
                          <span className="text-xs font-normal opacity-70">{stat.unit}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            {
              icon: <Zap className="w-5 h-5 text-primary" />,
              title: 'Real-Time Test',
              desc: 'Accurate browser-based measurement using Cloudflare edge servers.',
              gradient: 'from-primary/10 to-transparent',
            },
            {
              icon: <Globe className="w-5 h-5 text-accent" />,
              title: 'ISP Comparison',
              desc: 'See how your plan stacks up and discover faster options in your area.',
              gradient: 'from-accent/10 to-transparent',
            },
            {
              icon: <Shield className="w-5 h-5 text-purple-400" />,
              title: 'Privacy First',
              desc: 'No personal data stored. Results are anonymous and aggregated.',
              gradient: 'from-purple-400/10 to-transparent',
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="glass-card-hover p-6 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} border border-white/[0.06] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Speed ratings */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-display font-bold mb-6">
            What do these numbers mean?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { range: '< 25 Mbps', label: 'Slow', color: 'text-red-400', barColor: 'bg-red-400', barWidth: '15%', desc: 'Basic browsing OK. Streaming in HD or video calls will struggle.' },
              { range: '25–100 Mbps', label: 'Average', color: 'text-yellow-400', barColor: 'bg-yellow-400', barWidth: '40%', desc: 'Good for a single user. Multiple devices may slow things down.' },
              { range: '100–500 Mbps', label: 'Good', color: 'text-primary', barColor: 'bg-primary', barWidth: '70%', desc: 'Handles multiple 4K streams, gaming, and large file transfers.' },
              { range: '500+ Mbps', label: 'Excellent', color: 'text-emerald-400', barColor: 'bg-emerald-400', barWidth: '100%', desc: 'Gigabit territory. Everything runs instantly, always.' },
            ].map(row => (
              <div key={row.range} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className={`text-sm font-bold font-display ${row.color}`}>{row.range}</span>
                    <span className="text-xs text-muted-foreground ml-2">{row.label}</span>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] mb-3 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${row.barColor}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: row.barWidth }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    viewport={{ once: true }}
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{row.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
