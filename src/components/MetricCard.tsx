import { motion } from 'framer-motion'

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
    <motion.div
      className="glass-card-hover flex flex-col items-center p-4 group"
      whileHover={{ y: -2 }}
    >
      <div className={`mb-1.5 ${color} opacity-70 group-hover:opacity-100 transition-opacity`}>
        {icon}
      </div>
      <div
        className={`text-2xl font-display font-black ${color}`}
      >
        {display}
      </div>
      <div className="text-[11px] text-muted-foreground font-medium">{unit}</div>
      <div className="text-[11px] text-muted-foreground/60 mt-0.5">{label}</div>
    </motion.div>
  )
}
