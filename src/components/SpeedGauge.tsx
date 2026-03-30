interface SpeedGaugeProps {
  value: number
  maxValue: number
  size?: number
  label?: string
}

export function SpeedGauge({ value, maxValue, size = 200, label = 'Mbps' }: SpeedGaugeProps) {
  const radius = (size / 2) * 0.72
  const cx = size / 2
  const cy = size / 2 + size * 0.05
  const startAngle = -210
  const endAngle = 30
  const totalArc = endAngle - startAngle

  const clampedValue = Math.min(value, maxValue)
  const fraction = maxValue > 0 ? clampedValue / maxValue : 0
  const currentAngle = startAngle + totalArc * fraction

  function polarToCartesian(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  function describeArc(start: number, end: number) {
    const s = polarToCartesian(start)
    const e = polarToCartesian(end)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const displayValue = value >= 1000
    ? `${(value / 1000).toFixed(1)}G`
    : value >= 100
    ? Math.round(value).toString()
    : (Math.round(value * 10) / 10).toString()

  // Tick marks
  const tickCount = 10
  const innerRadius = radius - size * 0.04
  const outerRadius = radius + size * 0.04
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const angle = startAngle + (totalArc / tickCount) * i
    const inner = polarToCartesianR(angle, innerRadius)
    const outer = polarToCartesianR(angle, outerRadius)
    const isFilled = (i / tickCount) <= fraction
    return { inner, outer, isFilled }
  })

  function polarToCartesianR(angle: number, r: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  // Glow dot at current position
  const dotPos = fraction > 0 ? polarToCartesian(currentAngle) : null

  return (
    <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(197 100% 55%)" />
          <stop offset="50%" stopColor="hsl(220 90% 60%)" />
          <stop offset="100%" stopColor="hsl(265 89% 66%)" />
        </linearGradient>
        <filter id="gaugeShadow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
        </filter>
        <filter id="dotGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* Tick marks */}
      {ticks.map((tick, i) => (
        <line
          key={i}
          x1={tick.inner.x}
          y1={tick.inner.y}
          x2={tick.outer.x}
          y2={tick.outer.y}
          stroke={tick.isFilled ? 'hsl(197 100% 55%)' : 'hsl(220 16% 20%)'}
          strokeWidth={i % 5 === 0 ? 2 : 1}
          strokeLinecap="round"
          opacity={tick.isFilled ? 0.8 : 0.4}
        />
      ))}

      {/* Track (background arc) */}
      <path
        d={describeArc(startAngle, endAngle)}
        fill="none"
        stroke="hsl(220 16% 14%)"
        strokeWidth={size * 0.045}
        strokeLinecap="round"
      />

      {/* Glow behind fill */}
      {fraction > 0 && (
        <path
          d={describeArc(startAngle, currentAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={size * 0.06}
          strokeLinecap="round"
          filter="url(#gaugeShadow)"
          opacity={0.4}
        />
      )}

      {/* Fill arc */}
      {fraction > 0 && (
        <path
          d={describeArc(startAngle, currentAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={size * 0.045}
          strokeLinecap="round"
        />
      )}

      {/* Glowing dot at tip */}
      {dotPos && (
        <>
          <circle cx={dotPos.x} cy={dotPos.y} r={size * 0.03} fill="hsl(197 100% 60%)" filter="url(#dotGlow)" opacity={0.6} />
          <circle cx={dotPos.x} cy={dotPos.y} r={size * 0.015} fill="white" />
        </>
      )}

      {/* Value text */}
      <text
        x={cx}
        y={cy - size * 0.04}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="hsl(210 40% 96%)"
        fontSize={size * 0.2}
        fontWeight="800"
        fontFamily="Space Grotesk, sans-serif"
      >
        {displayValue}
      </text>

      {/* Label text */}
      <text
        x={cx}
        y={cy + size * 0.12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="hsl(215 20% 50%)"
        fontSize={size * 0.065}
        fontFamily="Inter, sans-serif"
        fontWeight="500"
      >
        {label}
      </text>
    </svg>
  )
}
