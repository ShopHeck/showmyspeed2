export interface SpeedTestResult {
  downloadMbps: number
  uploadMbps: number
  pingMs: number
  jitterMs: number
}

export interface IpInfo {
  isp: string
  city: string
  region: string
  country: string
  ip: string
}

export async function measurePing(): Promise<{ ping: number; jitter: number }> {
  const samples: number[] = []
  for (let i = 0; i < 5; i++) {
    const start = performance.now()
    await fetch('https://speed.cloudflare.com/__down?bytes=0', { cache: 'no-store' })
    samples.push(performance.now() - start)
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length
  const jitter = Math.sqrt(samples.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / samples.length)
  return { ping: Math.round(avg), jitter: Math.round(jitter) }
}

export async function measureDownload(onProgress: (mbps: number) => void): Promise<number> {
  const sizes = [10_000_000, 25_000_000, 100_000_000]
  const results: number[] = []

  for (const bytes of sizes) {
    const start = performance.now()
    const res = await fetch(`https://speed.cloudflare.com/__down?bytes=${bytes}`, { cache: 'no-store' })
    await res.arrayBuffer()
    const elapsed = (performance.now() - start) / 1000
    const mbps = (bytes * 8) / (elapsed * 1_000_000)
    results.push(mbps)
    onProgress(mbps)
  }

  return Math.round(results[results.length - 1])
}

export async function measureUpload(onProgress: (mbps: number) => void): Promise<number> {
  const sizes = [1_000_000, 5_000_000, 10_000_000]
  const results: number[] = []

  for (const bytes of sizes) {
    const body = new Uint8Array(bytes)
    const start = performance.now()
    await fetch('https://speed.cloudflare.com/__up', {
      method: 'POST',
      body,
      cache: 'no-store',
    })
    const elapsed = (performance.now() - start) / 1000
    const mbps = (bytes * 8) / (elapsed * 1_000_000)
    results.push(mbps)
    onProgress(mbps)
  }

  return Math.round(results[results.length - 1])
}

export async function getIpInfo(): Promise<IpInfo> {
  try {
    const res = await fetch('https://ipapi.co/json/')
    const data = await res.json()
    return {
      isp: data.org ?? 'Unknown ISP',
      city: data.city ?? '',
      region: data.region ?? '',
      country: data.country_name ?? '',
      ip: data.ip ?? '',
    }
  } catch {
    return { isp: 'Unknown ISP', city: '', region: '', country: '', ip: '' }
  }
}

export function getSpeedRating(mbps: number): { label: string; color: string } {
  if (mbps >= 500) return { label: 'Excellent', color: 'text-emerald-400' }
  if (mbps >= 100) return { label: 'Good', color: 'text-primary' }
  if (mbps >= 25)  return { label: 'Average', color: 'text-yellow-400' }
  return { label: 'Slow', color: 'text-red-400' }
}
