interface MetricCardProps {
  label: string
  value: number
  unit: string
  icon: React.ReactNode
  color: string
}

export function MetricCard({ label, value, unit, icon, color }: MetricCardProps) {
  const display = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10

  return (
    <div className="flex flex-col items-center p-3 rounded-xl border border-border/40 bg-card/30">
      <div className={`mb-1 ${color}`}>{icon}</div>
      <div className={`text-xl font-black ${color}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {display}
      </div>
      <div className="text-xs text-muted-foreground">{unit}</div>
      <div className="text-xs text-muted-foreground/70 mt-0.5">{label}</div>
    </div>
  )
}
