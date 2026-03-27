interface SpeedGaugeProps {
  value: number
  maxValue: number
  size?: number
  label?: string
}

export function SpeedGauge({ value, maxValue, size = 200, label = 'Mbps' }: SpeedGaugeProps) {
  const radius = (size / 2) * 0.75
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

  return (
    <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
      {/* Track */}
      <path
        d={describeArc(startAngle, endAngle)}
        fill="none"
        stroke="hsl(var(--border) / 0.4)"
        strokeWidth={size * 0.055}
        strokeLinecap="round"
      />
      {/* Fill */}
      {fraction > 0 && (
        <path
          d={describeArc(startAngle, currentAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={size * 0.055}
          strokeLinecap="round"
        />
      )}
      {/* Gradient definition */}
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(197 100% 50%)" />
          <stop offset="100%" stopColor="hsl(265 89% 66%)" />
        </linearGradient>
      </defs>
      {/* Value text */}
      <text
        x={cx}
        y={cy - size * 0.02}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="hsl(var(--foreground))"
        fontSize={size * 0.18}
        fontWeight="800"
        fontFamily="Space Grotesk, sans-serif"
      >
        {displayValue}
      </text>
      {/* Label text */}
      <text
        x={cx}
        y={cy + size * 0.14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={size * 0.07}
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  )
}
