export interface ISP {
  name: string
  type: 'Fiber' | 'Cable' | '5G Fixed' | 'Satellite'
  download: number
  upload: number
  ping: number
  price: number
  rating: number
  dataCap: string
  url: string
  highlight?: boolean
  badge?: string
  pros: string[]
  cons: string[]
  bestFor: string[]
  contractRequired: boolean
  availability: string
}

export const TYPE_COLORS: Record<ISP['type'], { dot: string; pill: string }> = {
  Fiber:      { dot: 'bg-primary',    pill: 'border-primary/30 text-primary bg-primary/10' },
  Cable:      { dot: 'bg-accent',     pill: 'border-accent/30 text-accent bg-accent/10' },
  '5G Fixed': { dot: 'bg-purple-400', pill: 'border-purple-400/30 text-purple-400 bg-purple-400/10' },
  Satellite:  { dot: 'bg-yellow-400', pill: 'border-yellow-400/30 text-yellow-400 bg-yellow-400/10' },
}

export function valueScore(isp: ISP): number {
  const speedScore = Math.min((isp.download / 1000) * 4, 4)
  const pingScore  = Math.max(0, (100 - isp.ping) / 100) * 2
  const priceScore = Math.max(0, (120 - isp.price) / 120) * 2
  const ratingScore = (isp.rating / 5) * 2
  return Math.min(10, speedScore + pingScore + priceScore + ratingScore)
}

export const ISP_DATA: ISP[] = [
  {
    name: 'Google Fiber',
    type: 'Fiber',
    download: 1000,
    upload: 1000,
    ping: 8,
    price: 70,
    rating: 4.8,
    dataCap: 'Unlimited',
    url: 'https://fiber.google.com',
    highlight: true,
    badge: 'Editor\'s Pick',
    pros: ['Symmetrical 1 Gbps', 'No data caps', 'No contracts', 'Excellent customer service'],
    cons: ['Limited availability', 'No bundle options'],
    bestFor: ['Power Users', 'Streaming', 'Gaming', 'WFH'],
    contractRequired: false,
    availability: '~2% of US',
  },
  {
    name: 'Xfinity',
    type: 'Cable',
    download: 1200,
    upload: 35,
    ping: 18,
    price: 55,
    rating: 3.6,
    dataCap: '1.2 TB/mo',
    url: 'https://www.xfinity.com',
    pros: ['Widely available', 'Fast download speeds', 'Frequent promo pricing'],
    cons: ['Data caps', 'Upload speeds low', 'Price increases after promo'],
    bestFor: ['Browsing', 'Streaming', 'Families'],
    contractRequired: false,
    availability: '~35% of US',
  },
  {
    name: 'AT&T Fiber',
    type: 'Fiber',
    download: 2000,
    upload: 2000,
    ping: 9,
    price: 80,
    rating: 4.5,
    dataCap: 'Unlimited',
    url: 'https://www.att.com/internet/fiber/',
    pros: ['Symmetrical speeds up to 2 Gbps', 'No data caps', 'Reliable network'],
    cons: ['Limited to fiber footprint', 'Equipment fees possible'],
    bestFor: ['Power Users', 'WFH', 'Gaming', 'Families'],
    contractRequired: false,
    availability: '~15% of US',
  },
  {
    name: 'Verizon Fios',
    type: 'Fiber',
    download: 940,
    upload: 880,
    ping: 10,
    price: 75,
    rating: 4.6,
    dataCap: 'Unlimited',
    url: 'https://www.verizon.com/home/fios-internet/',
    highlight: true,
    pros: ['Near-symmetrical speeds', 'No contracts', 'Consistent performance'],
    cons: ['Northeast US only', 'Limited plan tiers'],
    bestFor: ['Gaming', 'Streaming', 'WFH', 'Families'],
    contractRequired: false,
    availability: 'Northeast US',
  },
  {
    name: 'Spectrum',
    type: 'Cable',
    download: 500,
    upload: 20,
    ping: 22,
    price: 50,
    rating: 3.4,
    dataCap: 'Unlimited',
    url: 'https://www.spectrum.com',
    pros: ['No data caps', 'No contracts', 'Wide availability'],
    cons: ['Slow upload speeds', 'Customer service issues', 'Price increases at 12 months'],
    bestFor: ['Browsing', 'Streaming', 'Renters'],
    contractRequired: false,
    availability: '~30% of US',
  },
  {
    name: 'T-Mobile Home Internet',
    type: '5G Fixed',
    download: 245,
    upload: 31,
    ping: 35,
    price: 50,
    rating: 3.9,
    dataCap: 'Unlimited',
    url: 'https://www.t-mobile.com/isp',
    pros: ['No contracts', 'No data caps', 'Easy setup', 'Wide coverage'],
    cons: ['Speeds vary by tower load', 'Higher latency', 'Not ideal for gaming'],
    bestFor: ['Rural', 'Budget', 'Renters', 'Remote'],
    contractRequired: false,
    availability: '~50% of US',
  },
  {
    name: 'Starlink',
    type: 'Satellite',
    download: 150,
    upload: 20,
    ping: 45,
    price: 120,
    rating: 4.1,
    dataCap: 'Unlimited',
    url: 'https://www.starlink.com',
    badge: 'Best for Rural',
    pros: ['Available nearly anywhere', 'No landlord permission needed', 'Improving speeds'],
    cons: ['High equipment cost ($599)', 'Weather-dependent', 'High latency vs. fiber'],
    bestFor: ['Rural', 'Remote', 'Downloading'],
    contractRequired: false,
    availability: 'Most of US',
  },
  {
    name: 'Cox',
    type: 'Cable',
    download: 1000,
    upload: 35,
    ping: 20,
    price: 60,
    rating: 3.5,
    dataCap: '1.25 TB/mo',
    url: 'https://www.cox.com/internet/',
    pros: ['Fast download speeds', 'Wide availability in served markets'],
    cons: ['Data caps on most plans', 'Slow upload', 'Price hikes common'],
    bestFor: ['Browsing', 'Streaming', 'Families'],
    contractRequired: false,
    availability: '~18% of US',
  },
  {
    name: 'Optimum',
    type: 'Fiber',
    download: 1000,
    upload: 1000,
    ping: 11,
    price: 65,
    rating: 3.8,
    dataCap: 'Unlimited',
    url: 'https://www.optimum.com',
    pros: ['Symmetrical fiber speeds', 'No data caps', 'Competitive pricing'],
    cons: ['Limited to select markets', 'Inconsistent customer service'],
    bestFor: ['WFH', 'Power Users', 'Gaming'],
    contractRequired: false,
    availability: 'Northeast/Southwest US',
  },
  {
    name: 'Verizon 5G Home',
    type: '5G Fixed',
    download: 300,
    upload: 50,
    ping: 30,
    price: 60,
    rating: 4.0,
    dataCap: 'Unlimited',
    url: 'https://www.verizon.com/home/5g-home-internet/',
    pros: ['No contracts', 'Quick setup', 'Fast where available'],
    cons: ['Limited coverage', 'Indoor signal varies', 'Speeds inconsistent'],
    bestFor: ['Budget', 'Renters', 'Streaming'],
    contractRequired: false,
    availability: 'Select urban markets',
  },
]
