import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from '@tanstack/react-router'
import {
  ExternalLink, TrendingUp, ArrowDown, ArrowUp, Timer,
  ChevronUp, ChevronDown, ChevronsUpDown, Activity, Star,
  Zap, Gamepad2, Video, Building2, Home, Wifi, Bookmark, BookmarkCheck,
  CheckSquare, Square, BarChart3, X
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ISP_DATA, TYPE_COLORS, valueScore, type ISP } from '../lib/ispData'

const BEST_FOR_ICONS: Record<string, React.ReactNode> = {
  Gaming:        <Gamepad2 className="w-3 h-3" />,
  Streaming:     <Video className="w-3 h-3" />,
  WFH:           <Building2 className="w-3 h-3" />,
  Families:      <Home className="w-3 h-3" />,
  Rural:         <Wifi className="w-3 h-3" />,
  Remote:        <Wifi className="w-3 h-3" />,
  Budget:        <Zap className="w-3 h-3" />,
  Renters:       <Home className="w-3 h-3" />,
  Browsing:      <Activity className="w-3 h-3" />,
  Downloading:   <ArrowDown className="w-3 h-3" />,
  'Power Users': <Zap className="w-3 h-3" />,
}

type SortKey = 'download' | 'upload' | 'ping' | 'price' | 'rating'
type SortDir = 'asc' | 'desc'
type FilterType = 'All' | ISP['type']

const MAX_DOWNLOAD = Math.max(...ISP_DATA.map(d => d.download))
const MAX_UPLOAD   = Math.max(...ISP_DATA.map(d => d.upload))

function SpeedBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-border'}`} />
        ))}
      </div>
      <span className="text-xs font-semibold text-foreground">{rating}</span>
    </div>
  )
}

function SortIcon({ col, active, dir }: { col: SortKey; active: SortKey; dir: SortDir }) {
  if (col !== active) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40 ml-1 flex-shrink-0" />
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-primary ml-1 flex-shrink-0" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary ml-1 flex-shrink-0" />
}

export function ComparePage() {
  const [sortKey, setSortKey] = useState<SortKey>('download')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState<FilterType>('All')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Fetch saved provider names for this user
  const { data: savedNames = [] } = useQuery({
    queryKey: ['saved-provider-names', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_providers')
        .select('isp_name')
        .eq('user_id', user!.id)
      if (error) throw error
      return (data ?? []).map((r: { isp_name: string }) => r.isp_name)
    },
  })

  const saveProvider = useMutation({
    mutationFn: async (isp: ISP) => {
      if (!user) throw new Error('Not authenticated')
      if (savedNames.includes(isp.name)) {
        // Unsave
        const { error } = await supabase
          .from('saved_providers')
          .delete()
          .eq('user_id', user.id)
          .eq('isp_name', isp.name)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_providers')
          .insert({
            user_id: user.id,
            isp_name: isp.name,
            isp_type: isp.type,
            isp_url: isp.url,
          })
        if (error) throw error
      }
    },
    onSuccess: (_, isp) => {
      queryClient.invalidateQueries({ queryKey: ['saved-provider-names', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['saved-providers', user?.id] })
      toast.success(savedNames.includes(isp.name) ? 'Removed from saved' : `${isp.name} saved!`)
    },
    onError: () => toast.error('Sign in to save providers'),
  })

  const toggleCompare = (name: string) => {
    setSelectedForCompare(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name].slice(0, 4)
    )
  }

  const types: FilterType[] = ['All', 'Fiber', 'Cable', '5G Fixed', 'Satellite']

  const handleSort = (col: SortKey) => {
    if (col === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    const filtered = filter === 'All' ? ISP_DATA : ISP_DATA.filter(d => d.type === filter)
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'ping' || sortKey === 'price') return (a[sortKey] - b[sortKey]) * dir * -1
      return (a[sortKey] - b[sortKey]) * dir
    })
  }, [sortKey, sortDir, filter])

  const fiberISPs = ISP_DATA.filter(d => d.type === 'Fiber')
  const summaryStats = [
    { label: 'Fastest Download', value: `${(Math.max(...ISP_DATA.map(d => d.download)) / 1000).toFixed(0)}G Mbps`, sub: ISP_DATA.reduce((a, b) => a.download > b.download ? a : b).name, icon: <ArrowDown className="w-4 h-4 text-primary" /> },
    { label: 'Lowest Ping', value: `${Math.min(...ISP_DATA.map(d => d.ping))} ms`, sub: ISP_DATA.reduce((a, b) => a.ping < b.ping ? a : b).name, icon: <Timer className="w-4 h-4 text-yellow-400" /> },
    { label: 'Avg Fiber Upload', value: `${Math.round(fiberISPs.reduce((a, b) => a + b.upload, 0) / fiberISPs.length)} Mbps`, sub: `across ${fiberISPs.length} fiber plans`, icon: <ArrowUp className="w-4 h-4 text-accent" /> },
    { label: 'Best Value', value: `$${Math.min(...ISP_DATA.map(d => d.price))}/mo`, sub: ISP_DATA.reduce((a, b) => a.price < b.price ? a : b).name, icon: <Zap className="w-4 h-4 text-emerald-400" /> },
  ]

  return (
    <div className="min-h-screen bg-background pt-24 pb-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-4">
            <TrendingUp className="w-3.5 h-3.5" />
            US Internet Provider Guide 2025
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-3 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Compare Internet Providers
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Side-by-side data on speeds, pricing, reliability, and value. Updated monthly with real-world averages.
          </p>
        </motion.div>

        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {summaryStats.map(stat => (
            <div key={stat.label} className="p-4 rounded-xl border border-border/50 bg-card/30 text-center">
              <div className="flex items-center justify-center mb-1.5">{stat.icon}</div>
              <div className="text-xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              <div className="text-xs text-muted-foreground/50 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </motion.div>

        <motion.div className="flex items-center gap-2 mb-3 flex-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <span className="text-xs text-muted-foreground mr-1">Filter by type:</span>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}>
              {t === 'All' ? `All (${ISP_DATA.length})` : (
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[t]?.dot ?? 'bg-muted'}`} />
                  {t} ({ISP_DATA.filter(d => d.type === t).length})
                </span>
              )}
            </button>
          ))}
          <div className="ml-auto text-xs text-muted-foreground">{sorted.length} provider{sorted.length !== 1 ? 's' : ''} shown</div>
        </motion.div>

        <motion.p className="text-xs text-muted-foreground/70 mb-5 flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
          <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
          Select up to 4 providers to compare side by side
        </motion.p>

        {/* Desktop table */}
        <motion.div className="hidden lg:block rounded-xl border border-border/50 bg-card/20 overflow-hidden mb-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/60">
                  <th className="px-3 py-3.5 w-10" />
                  <th className="text-left px-5 py-3.5 text-muted-foreground font-medium text-xs uppercase tracking-wider w-48">Provider</th>
                  <th className="text-left px-3 py-3.5 text-muted-foreground font-medium text-xs uppercase tracking-wider w-24">Type</th>
                  {([
                    { key: 'download' as SortKey, label: 'Download', icon: <ArrowDown className="w-3 h-3" /> },
                    { key: 'upload'   as SortKey, label: 'Upload',   icon: <ArrowUp   className="w-3 h-3" /> },
                    { key: 'ping'     as SortKey, label: 'Ping',     icon: <Timer      className="w-3 h-3" /> },
                    { key: 'price'    as SortKey, label: 'Price/mo', icon: null },
                    { key: 'rating'   as SortKey, label: 'Rating',   icon: <Star className="w-3 h-3" /> },
                  ] as const).map(col => (
                    <th key={col.key} className="px-3 py-3.5 text-muted-foreground font-medium text-xs uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => handleSort(col.key)}>
                      <div className="flex items-center justify-end gap-1">
                        {col.icon}{col.label}
                        <SortIcon col={col.key} active={sortKey} dir={sortDir} />
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3.5 text-left text-muted-foreground font-medium text-xs uppercase tracking-wider">Data Cap</th>
                  <th className="px-5 py-3.5 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">Value</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {sorted.map((isp, i) => {
                    const isExpanded = expanded === isp.name
                    const isChecked  = selectedForCompare.includes(isp.name)
                    const isDisabled = !isChecked && selectedForCompare.length >= 4
                    const isSaved    = savedNames.includes(isp.name)
                    return (
                      <>
                        <motion.tr
                          key={isp.name}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => setExpanded(isExpanded ? null : isp.name)}
                          className={`border-b border-border/20 cursor-pointer transition-colors hover:bg-secondary/20 ${isp.highlight ? 'bg-primary/5' : ''} ${isExpanded ? 'bg-secondary/30' : ''}`}
                        >
                          <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                            <button onClick={() => !isDisabled && toggleCompare(isp.name)} disabled={isDisabled} className={`w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0 ${isChecked ? 'bg-primary border-primary text-primary-foreground' : isDisabled ? 'border-border/30 text-border/30 cursor-not-allowed opacity-40' : 'border-border/60 text-muted-foreground hover:border-primary/60 hover:text-primary'}`}>
                              {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                {isp.name}
                                {isp.highlight && <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">★</span>}
                              </div>
                              {isp.badge && <div className="text-xs text-muted-foreground mt-0.5">{isp.badge}</div>}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${TYPE_COLORS[isp.type]?.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${TYPE_COLORS[isp.type]?.dot}`} />
                              {isp.type}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-right mb-1">
                              <span className="font-bold text-primary">{isp.download >= 1000 ? `${(isp.download / 1000).toFixed(isp.download % 1000 === 0 ? 0 : 1)}G` : isp.download}</span>
                              <span className="text-xs text-muted-foreground ml-1">Mbps</span>
                            </div>
                            <SpeedBar value={isp.download} max={MAX_DOWNLOAD} color="bg-primary" />
                          </td>
                          <td className="px-3 py-4">
                            <div className="text-right mb-1">
                              <span className="font-bold text-accent">{isp.upload}</span>
                              <span className="text-xs text-muted-foreground ml-1">Mbps</span>
                            </div>
                            <SpeedBar value={isp.upload} max={MAX_UPLOAD} color="bg-accent" />
                          </td>
                          <td className="px-3 py-4 text-right">
                            <span className={`font-bold ${isp.ping <= 15 ? 'text-green-400' : isp.ping <= 30 ? 'text-yellow-400' : 'text-orange-400'}`}>{isp.ping}</span>
                            <span className="text-xs text-muted-foreground ml-1">ms</span>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <span className="font-bold text-foreground">${isp.price}</span>
                            <span className="text-xs text-muted-foreground">/mo</span>
                          </td>
                          <td className="px-3 py-4"><div className="flex justify-end"><StarRating rating={isp.rating} /></div></td>
                          <td className="px-3 py-4">
                            <span className={`text-xs font-medium ${isp.dataCap === 'Unlimited' ? 'text-green-400' : 'text-muted-foreground'}`}>{isp.dataCap}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-base font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                              {valueScore(isp).toFixed(1)}
                            </span>
                            <div className="text-xs text-muted-foreground">/ 10</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => isAuthenticated ? saveProvider.mutate(isp) : toast.error('Sign in to save providers')}
                                className={`p-1.5 rounded-lg transition-colors ${isSaved ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                                title={isSaved ? 'Unsave' : 'Save'}
                              >
                                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                              </button>
                              <a href={isp.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${isp.highlight ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/40'}`}>
                                View Deal <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr key={`${isp.name}-detail`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <td colSpan={11} className="px-5 pb-5 pt-1 bg-secondary/20 border-b border-border/20">
                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <div className="text-xs font-semibold text-green-400 mb-2 uppercase tracking-wider">Pros</div>
                                    <ul className="space-y-1.5">
                                      {isp.pros.map(p => <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="text-green-400 mt-0.5">+</span> {p}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">Cons</div>
                                    <ul className="space-y-1.5">
                                      {isp.cons.map(c => <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground"><span className="text-red-400 mt-0.5">−</span> {c}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Best For</div>
                                    <div className="flex flex-wrap gap-2">
                                      {isp.bestFor.map(tag => (
                                        <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-border/50 bg-secondary/50 text-muted-foreground">
                                          {BEST_FOR_ICONS[tag]}{tag}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="mt-3 text-xs text-muted-foreground">
                                      Contract: <span className={isp.contractRequired ? 'text-red-400' : 'text-green-400'}>{isp.contractRequired ? 'Yes' : 'No'}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">Coverage: <span className="text-foreground">{isp.availability}</span></div>
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/20 bg-secondary/20 text-xs text-muted-foreground">
            Click any row to expand. Columns are sortable.
          </div>
        </motion.div>

        {/* Mobile cards */}
        <div className="lg:hidden space-y-3 mb-8">
          {sorted.map((isp, i) => {
            const isSaved = savedNames.includes(isp.name)
            return (
              <motion.div key={isp.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={`rounded-xl border bg-card/30 overflow-hidden ${isp.highlight ? 'border-primary/40' : 'border-border/50'}`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-foreground">{isp.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[isp.type]?.pill}`}>{isp.type}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black">${isp.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div><div className="text-xs text-muted-foreground">Download</div><div className="font-bold text-primary text-sm">{isp.download >= 1000 ? `${isp.download/1000}G` : isp.download} Mbps</div></div>
                    <div><div className="text-xs text-muted-foreground">Upload</div><div className="font-bold text-accent text-sm">{isp.upload} Mbps</div></div>
                    <div><div className="text-xs text-muted-foreground">Ping</div><div className={`font-bold text-sm ${isp.ping <= 15 ? 'text-green-400' : isp.ping <= 30 ? 'text-yellow-400' : 'text-orange-400'}`}>{isp.ping} ms</div></div>
                  </div>
                  <div className="flex gap-2">
                    <a href={isp.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                      View Deal <ExternalLink className="w-3 h-3" />
                    </a>
                    <button onClick={() => isAuthenticated ? saveProvider.mutate(isp) : toast.error('Sign in to save')} className={`p-2 rounded-lg border border-border/50 ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-6 max-w-xl mx-auto">
            Speeds and prices reflect best advertised plans as of early 2025. Some outbound links are affiliate partnerships.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90" style={{ background: 'var(--gradient-primary)' }}>
            <Activity className="w-4 h-4" />
            Test My Current Speed
          </Link>
        </div>
      </div>

      {/* Sticky compare bar */}
      {selectedForCompare.length >= 1 && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-md p-3 sm:p-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {selectedForCompare.map(name => (
                <div key={name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-medium">
                  {name}
                  <button onClick={() => toggleCompare(name)}><X className="w-3 h-3" /></button>
                </div>
              ))}
              <span className="text-xs text-muted-foreground">{selectedForCompare.length}/4 selected</span>
            </div>
            <button onClick={() => setSelectedForCompare([])} className="text-xs text-muted-foreground hover:text-foreground border border-border/50 px-3 py-1.5 rounded-lg">Clear</button>
            <button
              disabled={selectedForCompare.length < 2}
              onClick={() => navigate({ to: '/compare/select', search: { isps: selectedForCompare.join(',') } })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground disabled:opacity-40"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <BarChart3 className="w-4 h-4" />
              Compare Side by Side{selectedForCompare.length >= 2 ? ` (${selectedForCompare.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
