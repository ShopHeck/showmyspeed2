import { useMemo } from 'react'
import { motion } from 'framer-motion'

interface DataFlowAnimationProps {
  phase: 'idle' | 'ping' | 'download' | 'upload' | 'done'
  intensity?: number // 0-1, based on current speed
}

interface Particle {
  id: number
  x: number
  size: number
  duration: number
  delay: number
  driftX: number
  opacity: number
  color: string
}

function generateParticles(count: number, phase: string): Particle[] {
  const isDownload = phase === 'download'
  const isUpload = phase === 'upload'
  const isPing = phase === 'ping'

  const colors = isPing
    ? ['hsl(45 100% 60%)', 'hsl(35 100% 55%)', 'hsl(25 100% 50%)']
    : isDownload
    ? ['hsl(197 100% 55%)', 'hsl(210 100% 60%)', 'hsl(265 89% 66%)', 'hsl(185 100% 50%)']
    : ['hsl(185 100% 50%)', 'hsl(160 100% 50%)', 'hsl(197 100% 55%)', 'hsl(140 80% 55%)']

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 5 + (isPing ? 2.5 : isDownload ? 3.5 : 3),
    duration: Math.random() * 2 + (isPing ? 1.5 : 2),
    delay: Math.random() * 3,
    driftX: (Math.random() - 0.5) * 150,
    opacity: Math.random() * 0.4 + 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
}

function generateStreamLines(count: number, phase: string) {
  const isDownload = phase === 'download'
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x1: Math.random() * 100,
    x2: Math.random() * 100,
    duration: Math.random() * 1.5 + 1,
    delay: Math.random() * 3,
    color: isDownload ? 'hsl(197 100% 55%)' : 'hsl(185 100% 50%)',
    width: Math.random() * 1.5 + 0.5,
  }))
}

export function DataFlowAnimation({ phase, intensity = 0.5 }: DataFlowAnimationProps) {
  const isActive = phase === 'download' || phase === 'upload' || phase === 'ping'
  const isDownload = phase === 'download'

  const particleCount = Math.floor(30 + intensity * 30)
  const streamCount = Math.floor(8 + intensity * 8)

  const particles = useMemo(
    () => (isActive ? generateParticles(particleCount, phase) : []),
    [isActive, phase, particleCount]
  )

  const streams = useMemo(
    () => (isActive ? generateStreamLines(streamCount, phase) : []),
    [isActive, phase, streamCount]
  )

  if (!isActive) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ambient glow behind gauge */}
      <motion.div
        className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] max-w-[800px] max-h-[800px] rounded-full"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: [0.08, 0.2, 0.08],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: isDownload
            ? 'radial-gradient(circle, hsl(197 100% 50% / 0.15) 0%, transparent 70%)'
            : phase === 'ping'
            ? 'radial-gradient(circle, hsl(45 100% 50% / 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, hsl(185 100% 50% / 0.15) 0%, transparent 70%)',
        }}
      />

      {/* Orbital ring */}
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-[min(500px,70vw)] h-[min(500px,70vw)]">
        <div className="orbital-glow w-full h-full rounded-full" style={{ animationDuration: `${6 - intensity * 3}s` }}>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
            style={{
              background: isDownload ? 'hsl(197 100% 60%)' : 'hsl(185 100% 60%)',
              boxShadow: `0 0 16px ${isDownload ? 'hsl(197 100% 60%)' : 'hsl(185 100% 60%)'}`,
            }}
          />
        </div>
      </div>

      {/* Flowing particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className={isDownload || phase === 'ping' ? 'data-particle-down' : 'data-particle-up'}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: isDownload || phase === 'ping' ? '-5%' : '105%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            opacity: p.opacity,
            '--duration': `${p.duration}s`,
            '--delay': `${p.delay}s`,
            '--drift-x': `${p.driftX}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Stream lines (SVG) */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {streams.map((s) => (
          <line
            key={s.id}
            className="stream-line"
            x1={`${s.x1}%`}
            y1={isDownload ? '0%' : '100%'}
            x2={`${s.x2}%`}
            y2={isDownload ? '100%' : '0%'}
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            style={{
              '--duration': `${s.duration}s`,
              '--delay': `${s.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>

      {/* Pulse rings from center */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
          style={{
            width: 'min(400px, 50vw)',
            height: 'min(400px, 50vw)',
            borderColor: isDownload ? 'hsl(197 100% 50% / 0.1)' : 'hsl(185 100% 50% / 0.1)',
          }}
          animate={{
            scale: [1, 3],
            opacity: [0.3, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Small floating data bits */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const radius = 200 + Math.random() * 100
        return (
          <motion.div
            key={`bit-${i}`}
            className="absolute font-mono text-[10px] font-bold"
            style={{
              left: `calc(50% + ${Math.cos(angle) * radius}px)`,
              top: `calc(40% + ${Math.sin(angle) * radius}px)`,
              color: isDownload ? 'hsl(197 100% 60%)' : 'hsl(185 100% 60%)',
            }}
            animate={{
              opacity: [0, 0.5, 0],
              y: isDownload ? [0, 20] : [0, -20],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          >
            {['01', '10', '11', '00'][i % 4]}
          </motion.div>
        )
      })}
    </div>
  )
}
