import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Users, Eye, MessageSquare,
  Loader2, RefreshCw, BarChart3, Calendar, Plus, Palette, ChevronDown
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Card, Table, Badge, Loader, ErrorMessage, Button, DateRangePicker, Modal, Input, Select } from '../components'
import { calcScore } from '../lib/constants'
import { pb } from '../lib/pb'

// Color palettes for charts
const COLOR_PALETTES = {
  default: { name: 'Default', colors: ['#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'] },
  warm: { name: 'Warm', colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#fbbf24', '#fcd34d'] },
  cool: { name: 'Cool', colors: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'] },
  monochrome: { name: 'Mono', colors: ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'] },
}

function formatNumber(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toString()
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function getDashboardTitle(startDate, endDate) {
  if (!startDate || !endDate) return 'Dashboard'
  const s = new Date(startDate + 'T00:00:00')
  const e = new Date(endDate + 'T00:00:00')
  const sMonth = s.getMonth()
  const eMonth = e.getMonth()
  const sYear = s.getFullYear()
  const eYear = e.getFullYear()

  if (sYear === eYear && sMonth === eMonth) {
    return `Dashboard ${MONTH_NAMES[sMonth]} ${sYear}`
  }
  if (sYear === eYear) {
    return `Dashboard ${MONTH_NAMES[sMonth].slice(0, 3)} - ${MONTH_NAMES[eMonth].slice(0, 3)} ${sYear}`
  }
  return `Dashboard ${MONTH_NAMES[sMonth].slice(0, 3)} ${sYear} - ${MONTH_NAMES[eMonth].slice(0, 3)} ${eYear}`
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ background: `${color}20` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </Card>
  )
}

function UploadTrendChart({ data }) {
  if (!data?.length) return <Card className="h-80 flex items-center justify-center"><div className="text-center"><BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No upload trend data yet</p></div></Card>

  return (
    <Card className="h-80">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Upload Trend</h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            formatter={(value) => [formatNumber(value), 'Uploads']}
          />
          <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorUpload)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

function PlatformComparisonChart({ data }) {
  if (!data?.length) return <Card className="h-80 flex items-center justify-center"><div className="text-center"><BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} /><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No platform data yet</p></div></Card>

  return (
    <Card className="h-80">
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Views by Platform</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
          <XAxis type="category" dataKey="platform" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
          <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
            formatter={(value) => [formatNumber(value)]}
          />
          <Legend />
          <Bar dataKey="total_views" name="Views" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarWidth={60} />
          <Bar dataKey="count" name="Uploads" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarWidth={60} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

function TopContentTable({ data, avgER, filter, onFilterChange, sort, onSortChange, paletteColors }) {
  const sortOptions = [
    { value: 'views', label: 'Views' },
    { value: 'likes', label: 'Likes' },
    { value: 'er', label: 'ER%' },
    { value: 'score', label: 'Score' },
  ]
  
  const columns = [
    { key: 'rank', label: '#', width: '50px', render: (_, __, idx) => <span className="font-bold" style={{ color: idx < 3 ? paletteColors[0] : 'var(--text-muted)' }}>#{idx + 1}</span> },
    { key: 'title', label: 'Title', width: '250px', render: (v) => v?.length > 30 ? v.slice(0, 30) + '...' : v },
    { key: 'brand', label: 'Brand', width: '100px' },
    { key: 'platform', label: 'Platform', width: '100px', render: (v) => <Badge variant={v === 'TIKTOK' ? 'info' : 'success'} size="sm">{v}</Badge> },
    { key: 'views', label: 'Views', width: '100px', render: (v) => formatNumber(v) },
    { key: 'likes', label: 'Likes', width: '80px', render: (v) => formatNumber(v) },
    { key: 'engagement', label: 'ER %', width: '80px', render: (_, row) => {
        const eng = row.views > 0 ? ((row.likes + row.comments + row.shares + row.saves) / row.views * 100).toFixed(2) : '0.00'
        return <span className="font-mono">{eng}%</span>
      }
    },
    { key: 'score', label: 'Score', width: '80px', render: (_, row) => {
        const { score, tier } = calcScore(row, avgER)
        const variant = tier === 'HIGH' ? 'success' : tier === 'MEDIUM' ? 'warning' : 'danger'
        return <Badge variant={variant} size="sm">{score}</Badge>
      }
    },
  ]

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Badge variant={filter === 'all' ? 'primary' : 'secondary'} size="sm" className="cursor-pointer" onClick={() => onFilterChange('all')}>All</Badge>
          <Badge variant={filter === 'tiktok' ? 'primary' : 'secondary'} size="sm" className="cursor-pointer" onClick={() => onFilterChange('tiktok')}><img src="/tiktok.png" alt="TikTok" className="w-3 h-3 inline mr-1" />TikTok</Badge>
          <Badge variant={filter === 'instagram' ? 'primary' : 'secondary'} size="sm" className="cursor-pointer" onClick={() => onFilterChange('instagram')}><img src="/ig.png" alt="IG" className="w-3 h-3 inline mr-1" />Instagram</Badge>
        </div>
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className="px-2 py-1 rounded-lg text-xs outline-none"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        >
          {sortOptions.map(o => <option key={o.value} value={o.value}>Sort: {o.label} ▼</option>)}
        </select>
      </div>
      <Table columns={columns} data={data} keyField="publish_id" emptyMessage="No content yet" />
    </Card>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [topContent, setTopContent] = useState([])
  const [uploadTrend, setUploadTrend] = useState([])
  const [platformData, setPlatformData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null })
  const [snapshots, setSnapshots] = useState([])
  const [snapshotMetric, setSnapshotMetric] = useState('followers')
  const [showSnapshotModal, setShowSnapshotModal] = useState(false)
  const [snapshotForm, setSnapshotForm] = useState({ month: '', brandId: '', impressions: '', followers: '', profile_views: '', post_views: '', likes: '', comments: '', shares: '' })
    const [totalMetrics, setTotalMetrics] = useState([])
  const [snapshotBrandId, setSnapshotBrandId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [colorPalette, setColorPalette] = useState('default')
  const [topContentFilter, setTopContentFilter] = useState('all') // 'all', 'tiktok', 'instagram'
  const [topContentSort, setTopContentSort] = useState('views') // 'views', 'likes', 'er', 'score'
  const [showColorPicker, setShowColorPicker] = useState(false)

  const openEditModal = useCallback(async (data) => {
    setIsEditing(!!data)
    setSnapshotForm({
      month: data?.month || '',
      brandId: data?.brand_id ? String(data.brand_id) : '',
      impressions: String(data?.impressions ?? ''),
      followers: String(data?.followers ?? ''),
      profile_views: String(data?.profile_views ?? ''),
      post_views: String(data?.post_views ?? ''),
      likes: String(data?.likes ?? ''),
      comments: String(data?.comments ?? ''),
      shares: String(data?.shares ?? ''),
    })
    setShowSnapshotModal(true)
  }, [])

  const initDashboard = useCallback(async () => {
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    try {
      const [firstRes, lastRes, brandData] = await Promise.all([
        pb.collection('publish_instances').getList(1, 1, { sort: 'publish_date', fields: 'publish_date', requestKey: null }).catch(() => null),
        pb.collection('publish_instances').getList(1, 1, { sort: '-publish_date', fields: 'publish_date', requestKey: null }).catch(() => null),
        pb.collection('brands').getFullList({ requestKey: null }).catch(() => []),
      ])

      setBrands(brandData || [])

      let months = []
      try {
        const allItems = await pb.collection('publish_instances').getFullList({ fields: 'publish_date', requestKey: null })
        months = [...new Set(allItems.map(p => p.publish_date?.slice(0, 7)))].filter(Boolean).sort()
      } catch {}
      setAvailableMonths(months.map(m => ({ month: m })))

      const first = firstRes?.items?.[0]?.publish_date
      const last = lastRes?.items?.[0]?.publish_date
      if (first && last) {
        const earliest = first.split('T')[0]
        const latest = last.split('T')[0]
        const s = new Date(earliest)
        const e = new Date(latest)
        const isSameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()
        const start = isSameMonth ? new Date(s.getFullYear(), s.getMonth(), 1) : s
        const end = isSameMonth ? new Date(s.getFullYear(), s.getMonth() + 1, 0) : e
        setDateRange({ startDate: fmt(start), endDate: fmt(end) })
      } else {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 27)
        setDateRange({ startDate: fmt(start), endDate: fmt(end) })
      }
    } catch (err) {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 27)
      setDateRange({ startDate: fmt(start), endDate: fmt(end) })
    }
  }, [])

  useEffect(() => { initDashboard() }, [initDashboard])

  useEffect(() => {
    if (!showSnapshotModal) return
    if (!snapshotForm.month || !snapshotForm.brandId) return
    const timer = setTimeout(async () => {
      try {
        const existing = await pb.collection('account_snapshots').getFullList({
          filter: `month = '${snapshotForm.month}' && brand = '${snapshotForm.brandId}'`,
          limit: 1,
          requestKey: null,
        })
        if (existing?.length > 0) {
          const snap = existing[0]
          setSnapshotForm({
            month: snap.month,
            brandId: String(snap.brand),
            impressions: String(snap.impressions ?? ''),
            followers: String(snap.followers ?? ''),
            profile_views: String(snap.profile_views ?? ''),
            post_views: String(snap.post_views ?? ''),
            likes: String(snap.likes ?? ''),
            comments: String(snap.comments ?? ''),
            shares: String(snap.shares ?? ''),
          })
          setIsEditing(true)
        }
      } catch {
        // collection might not exist yet
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [snapshotForm.month, snapshotForm.brandId, showSnapshotModal])

  const fetchData = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) return
    setLoading(true)
    setError(null)
    try {
      const startDate = dateRange.startDate
      const endDate = dateRange.endDate

      let filterParts = [`publish_date >= '${startDate}'`, `publish_date <= '${endDate}'`]

      const assetIds = []
      if (selectedBrand) {
        const brandAssets = await pb.collection('content_assets').getFullList({
          filter: `brand = '${selectedBrand}'`,
          fields: 'id',
          requestKey: null,
        })
        if (brandAssets.length === 0) {
          setSummary({ totalUpload: 0, totalViews: 0, totalReach: 0, avgER: 0, prevAvgER: null })
          setTopContent([])
          setUploadTrend([])
          setPlatformData([])
          setTotalMetrics([])
          setSnapshots([])
          setLoading(false)
          return
        }
        assetIds.push(...brandAssets.map(a => a.id))
        const assetFilter = assetIds.map(id => `asset = '${id}'`).join(' || ')
        filterParts.push(`(${assetFilter})`)
      }

      const filterStr = filterParts.join(' && ')

      const [publishesRes, assetsRes, brandsRes] = await Promise.all([
        pb.collection('publish_instances').getFullList({
          filter: filterStr,
          sort: '-publish_date',
          requestKey: null,
        }),
        pb.collection('content_assets').getFullList({ expand: 'brand', requestKey: null }),
        pb.collection('brands').getFullList({ requestKey: null }),
      ])

      setBrands(brandsRes)

      const assetMap = Object.fromEntries(assetsRes.map(a => [
        a.id,
        { title: a.title, goal: a.goal, genre: a.genre, brand_name: a.expand?.brand?.name || '-', brand_id: a.brand }
      ]))
      const publishIds = publishesRes.map(p => p.id)
      const totalUpload = publishIds.length

      let metrics = []
      if (publishIds.length > 0) {
        const chunkSize = 200
        for (let i = 0; i < publishIds.length; i += chunkSize) {
          const chunk = publishIds.slice(i, i + chunkSize)
          const idFilter = chunk.map(id => `publish = '${id}'`).join(' || ')
          const chunkMetrics = await pb.collection('metric_history').getFullList({
            filter: idFilter,
            sort: '-capture_date',
            requestKey: null,
          })
          metrics.push(...chunkMetrics)
        }
      }

      const latestMetrics = {}
      for (const m of metrics) {
        if (!latestMetrics[m.publish]) {
          latestMetrics[m.publish] = m
        }
      }

      const latestMetricsArr = Object.values(latestMetrics)

      let totalViews = 0, totalReach = 0, totalER = 0, countER = 0
      for (const m of latestMetricsArr) {
        totalViews += m.views || 0
        totalReach += m.reach || 0
        if (m.views > 0) {
          totalER += ((m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)) / m.views * 100
          countER++
        }
      }
      const avgER = countER > 0 ? Math.round(totalER / countER * 100) / 100 : 0

      let prevAvgER = null
      if (dateRange.startDate && dateRange.endDate) {
        const diffDays = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
        const prevStart = new Date(new Date(startDate).getTime() - diffDays * 86400000).toISOString().split('T')[0]
        const prevEnd = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0]

        let prevFilterParts = [
          `publish_date >= '${prevStart}'`,
          `publish_date <= '${prevEnd}'`,
        ]
        if (assetIds.length > 0) {
          const assetFilter = assetIds.map(id => `asset = '${id}'`).join(' || ')
          prevFilterParts.push(`(${assetFilter})`)
        }
        const prevFilterStr = prevFilterParts.join(' && ')

        const prevPublishes = await pb.collection('publish_instances').getFullList({
          filter: prevFilterStr,
          fields: 'id',
          requestKey: null,
        })
        if (prevPublishes.length > 0) {
          const prevIds = prevPublishes.map(p => p.id)
          const prevMetrics = []
          for (let i = 0; i < prevIds.length; i += 200) {
            const chunk = prevIds.slice(i, i + 200)
            const idFilter = chunk.map(id => `publish = '${id}'`).join(' || ')
            const chunkMetrics = await pb.collection('metric_history').getFullList({
              filter: idFilter,
              sort: '-capture_date',
              requestKey: null,
            })
            prevMetrics.push(...chunkMetrics)
          }
          const prevLatest = {}
          for (const m of prevMetrics) {
            if (!prevLatest[m.publish]) prevLatest[m.publish] = m
          }
          let prevTotalER = 0, prevCountER = 0
          for (const m of Object.values(prevLatest)) {
            if (m.views > 0) {
              prevTotalER += ((m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0)) / m.views * 100
              prevCountER++
            }
          }
          prevAvgER = prevCountER > 0 ? Math.round(prevTotalER / prevCountER * 100) / 100 : null
        }
      }

      setSummary({ totalUpload, totalViews, totalReach, avgER, prevAvgER })

      const topContentData = publishesRes.map(p => {
        const m = latestMetrics[p.id]
        const asset = assetMap[p.asset]
        return {
          publish_id: p.id,
          title: asset?.title || 'Untitled',
          brand: asset?.brand_name || '-',
          platform: p.platform || '',
          goal: asset?.goal || '',
          genre: asset?.genre || '',
          views: m?.views || 0,
          likes: m?.likes || 0,
          comments: m?.comments || 0,
          shares: m?.shares || 0,
          reach: m?.reach || 0,
          retention: m?.retention || 0,
          saves: m?.saves || 0,
        }
      }).sort((a, b) => b.views - a.views)
      setTopContent(topContentData)

      const monthGroups = {}
      for (const p of publishesRes) {
        const month = p.publish_date?.slice(0, 7)
        if (month) {
          monthGroups[month] = (monthGroups[month] || 0) + 1
        }
      }
      const uploadTrendData = Object.entries(monthGroups)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
      setUploadTrend(uploadTrendData)

      const platformGroups = {}
      for (const p of publishesRes) {
        const m = latestMetrics[p.id]
        const platform = p.platform || 'Unknown'
        if (!platformGroups[platform]) {
          platformGroups[platform] = { total_views: 0, count: 0 }
        }
        platformGroups[platform].total_views += m?.views || 0
        platformGroups[platform].count += 1
      }
      const platformDataRes = Object.entries(platformGroups)
        .map(([platform, data]) => ({ platform, ...data }))
      setPlatformData(platformDataRes)

      // Total metrics aggregated by month
      const totalByMonth = {}
      for (const p of publishesRes) {
        const m = latestMetrics[p.id]
        const month = p.publish_date?.slice(0, 7)
        if (month && m) {
          if (!totalByMonth[month]) {
            totalByMonth[month] = { month, views: 0, likes: 0, comments: 0 }
          }
          totalByMonth[month].views += m.views || 0
          totalByMonth[month].likes += m.likes || 0
          totalByMonth[month].comments += m.comments || 0
        }
      }
      setTotalMetrics(Object.values(totalByMonth).sort((a, b) => a.month.localeCompare(b.month)))

      // Account snapshots
      try {
        const snapFilter = []
        if (snapshotBrandId) snapFilter.push(`brand = '${snapshotBrandId}'`)
        const snaps = await pb.collection('account_snapshots').getFullList({
          filter: snapFilter.length > 0 ? snapFilter.join(' && ') : undefined,
          sort: 'month',
          requestKey: null,
        })
        setSnapshots(snaps.map(s => ({
          ...s,
          month: s.month,
          brand_id: s.brand,
        })) || [])
      } catch {
        setSnapshots([])
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [dateRange, selectedBrand, snapshotBrandId])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const onFocus = () => fetchData()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [fetchData])

  const dashboardTitle = getDashboardTitle(dateRange.startDate, dateRange.endDate)

  // Filter and sort top content
  const topContentFiltered = topContent
    .filter(item => {
      if (topContentFilter === 'tiktok') return item.platform === 'TIKTOK'
      if (topContentFilter === 'instagram') return item.platform === 'INSTAGRAM'
      return true
    })
    .slice(0, 5) // Top 5 only
    .sort((a, b) => {
      if (topContentSort === 'views') return b.views - a.views
      if (topContentSort === 'likes') return b.likes - a.likes
      if (topContentSort === 'er') {
        const erA = a.views > 0 ? ((a.likes + a.comments + a.shares + a.saves) / a.views * 100) : 0
        const erB = b.views > 0 ? ((b.likes + b.comments + b.shares + b.saves) / b.views * 100) : 0
        return erB - erA
      }
      if (topContentSort === 'score') {
        const { score: scoreA } = calcScore(a, summary?.avgER)
        const { score: scoreB } = calcScore(b, summary?.avgER)
        return scoreB - scoreA
      }
      return 0
    })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="h-24 animate-pulse" style={{ background: 'var(--bg-skeleton)' }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-80 animate-pulse" style={{ background: 'var(--bg-skeleton)' }} />
          <Card className="h-80 animate-pulse" style={{ background: 'var(--bg-skeleton)' }} />
        </div>
        <Card className="animate-pulse h-96" style={{ background: 'var(--bg-skeleton)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{dashboardTitle}</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            availableMonths={availableMonths}
          />
          <Button variant="ghost" size="sm" onClick={fetchData} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedBrand(null)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
          style={{
            background: !selectedBrand ? '#d4a843' : 'transparent',
            color: !selectedBrand ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${!selectedBrand ? '#d4a843' : 'var(--border-color)'}`,
          }}
        >All Brands</button>
        {brands.map(b => (
          <button
            key={b.id}
            onClick={() => setSelectedBrand(b.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: selectedBrand === b.id ? '#d4a843' : 'transparent',
              color: selectedBrand === b.id ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${selectedBrand === b.id ? '#d4a843' : 'var(--border-color)'}`,
            }}
          >{b.name}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Views" value={formatNumber(summary?.totalViews || 0)} color="var(--accent)" />
        <StatCard icon={Users} label="Total Reach" value={formatNumber(summary?.totalReach || 0)} color="#22c55e" />
        <StatCard icon={TrendingUp} label="Total Uploads" value={formatNumber(summary?.totalUpload || 0)} color="#f59e0b" />
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Avg Engagement Rate</p>
              <p className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{(summary?.avgER || 0).toFixed(2)}</p>
              {summary?.prevAvgER != null && (
                <div className={`flex items-center gap-1 mt-1 ${summary.avgER >= summary.prevAvgER ? 'text-green-500' : 'text-red-500'}`}>
                  {summary.avgER >= summary.prevAvgER ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="text-xs font-medium">{Math.abs(summary.avgER - summary.prevAvgER).toFixed(2)}%</span>
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#8b5cf620' }}>
              <MessageSquare className="w-6 h-6" style={{ color: '#8b5cf6' }} />
            </div>
          </div>
        </div>
        <StatCard icon={Users} label="Followers" value={snapshots.length > 0 ? formatNumber(snapshots[snapshots.length - 1]?.followers || 0) : '-'} color="#ec4899" />
      </div>

      {topContent.length > 0 && (() => {
        const tiers = { HIGH: 0, MEDIUM: 0, LOW: 0 }
        topContent.forEach(row => { const { tier } = calcScore(row, summary?.avgER); if (tiers[tier] !== undefined) tiers[tier]++ })
        return (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'HIGH Performance', count: tiers.HIGH, color: '#22c55e', bg: 'var(--success-bg)', text: 'var(--success-text)' },
              { label: 'MEDIUM Performance', count: tiers.MEDIUM, color: '#f59e0b', bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
              { label: 'LOW Performance', count: tiers.LOW, color: '#ef4444', bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
            ].map(t => (
              <Card key={t.label} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: t.bg, color: t.text }}>
                  {t.count}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{t.label}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t.count} content</p>
                </div>
              </Card>
            ))}
          </div>
        )
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadTrendChart data={uploadTrend} />
        <PlatformComparisonChart data={platformData} />
      </div>

      {/* Account Monitoring Section */}
      <Card>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Account Monitoring</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              title="Color Palette"
            >
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">{COLOR_PALETTES[colorPalette]?.name || 'Palette'}</span>
            </button>
            {showColorPicker && (
              <div className="absolute z-10 mt-2 right-0 top-full" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', minWidth: '150px' }}>
                {Object.entries(COLOR_PALETTES).map(([key, palette]) => (
                  <button
                    key={key}
                    onClick={() => { setColorPalette(key); setShowColorPicker(false) }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
                    style={{ background: colorPalette === key ? 'var(--hover-bg)' : 'transparent', color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = colorPalette === key ? 'var(--hover-bg)' : 'transparent'}
                  >
                    <div className="flex gap-0.5">
                      {palette.colors.slice(0, 4).map((c, i) => (
                        <div key={i} className="w-3 h-3 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                    {palette.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Account Line Chart per Brand */}
        {brands.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={snapshotBrandId || ''}
                onChange={e => setSnapshotBrandId(e.target.value ? Number(e.target.value) : null)}
                className="px-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">Semua Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                value={snapshotMetric}
                onChange={e => setSnapshotMetric(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="followers">Followers</option>
                <option value="impressions">Impressions</option>
                <option value="post_views">Post Views</option>
                <option value="profile_views">Profile Views</option>
                <option value="likes">Likes</option>
                <option value="comments">Comments</option>
                <option value="shares">Shares</option>
              </select>
              <button
                onClick={() => openEditModal(null)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--accent)' }}
                title="Input data bulanan"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {snapshots.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={snapshots} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    formatter={(value) => [formatNumber(value), snapshotMetric.replace(/_/g, ' ')]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={snapshotMetric} 
                    stroke={COLOR_PALETTES[colorPalette]?.colors?.[0] || 'var(--accent)'} 
                    strokeWidth={2}
                    dot={{ fill: COLOR_PALETTES[colorPalette]?.colors?.[0] || 'var(--accent)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    cursor="pointer"
                    onClick={(data) => openEditModal(data?.payload)}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
                <TrendingUp className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">Klik + untuk input data bulanan</p>
              </div>
            )}
          </div>
        )}
        
        {/* Total Bar Chart */}
        {totalMetrics.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Total Semua Brand</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={totalMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="views" name="Views" fill={COLOR_PALETTES[colorPalette]?.colors?.[0] || '#3b82f6'} radius={[4, 4, 0, 0]} maxBarWidth={40} />
                <Bar dataKey="likes" name="Likes" fill={COLOR_PALETTES[colorPalette]?.colors?.[1] || '#22c55e'} radius={[4, 4, 0, 0]} maxBarWidth={40} />
                <Bar dataKey="comments" name="Comments" fill={COLOR_PALETTES[colorPalette]?.colors?.[2] || '#8b5cf6'} radius={[4, 4, 0, 0]} maxBarWidth={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <TopContentTable 
        data={topContentFiltered} 
        avgER={summary?.avgER}
        filter={topContentFilter}
        onFilterChange={setTopContentFilter}
        sort={topContentSort}
        onSortChange={setTopContentSort}
        paletteColors={COLOR_PALETTES[colorPalette]?.colors || []}
      />

      {/* Modal Input Bulanan */}
      <Modal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        title={isEditing ? "Edit Data Bulanan" : "Input Data Bulanan"}
        size="md"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowSnapshotModal(false)}>Batal</Button>
            <Button variant="primary" onClick={async () => {
              try {
                const data = {
                  month: snapshotForm.month,
                  brand: snapshotForm.brandId || null,
                  impressions: Number(snapshotForm.impressions) || 0,
                  followers: Number(snapshotForm.followers) || 0,
                  profile_views: Number(snapshotForm.profile_views) || 0,
                  post_views: Number(snapshotForm.post_views) || 0,
                  likes: Number(snapshotForm.likes) || 0,
                  comments: Number(snapshotForm.comments) || 0,
                  shares: Number(snapshotForm.shares) || 0,
                }
                if (isEditing) {
                  const existing = await pb.collection('account_snapshots').getFullList({
                    filter: `month = '${snapshotForm.month}' && brand = '${snapshotForm.brandId}'`,
                    limit: 1,
                    requestKey: null,
                  })
                  if (existing.length > 0) {
                    await pb.collection('account_snapshots').update(existing[0].id, data)
                  }
                } else {
                  await pb.collection('account_snapshots').create(data)
                }
              } catch {
                // collection might not exist
              }
              setShowSnapshotModal(false)
              try {
                const snapFilter = []
                if (snapshotBrandId) snapFilter.push(`brand = '${snapshotBrandId}'`)
                const snaps = await pb.collection('account_snapshots').getFullList({
                  filter: snapFilter.length > 0 ? snapFilter.join(' && ') : undefined,
                  sort: 'month',
                  requestKey: null,
                })
                setSnapshots(snaps.map(s => ({
                  ...s,
                  month: s.month,
                  brand_id: s.brand,
                })) || [])
              } catch {
                setSnapshots([])
              }
            }}>Simpan</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Brand"
            value={snapshotForm.brandId}
            onChange={e => setSnapshotForm(prev => ({ ...prev, brandId: e.target.value }))}
            options={[{ value: '', label: 'Pilih Brand' }, ...brands.map(b => ({ value: b.id, label: b.name }))]}
          />
          <Input
            label="Bulan"
            type="month"
            value={snapshotForm.month}
            onChange={e => setSnapshotForm(prev => ({ ...prev, month: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'followers', label: 'Followers' },
              { key: 'impressions', label: 'Impressions' },
              { key: 'post_views', label: 'Post Views' },
              { key: 'profile_views', label: 'Profile Views' },
              { key: 'likes', label: 'Likes' },
              { key: 'comments', label: 'Comments' },
              { key: 'shares', label: 'Shares' },
            ].map(field => (
              <Input
                key={field.key}
                label={field.label}
                type="number"
                value={snapshotForm[field.key]}
                onChange={e => setSnapshotForm(prev => ({ ...prev, [field.key]: e.target.value }))}
              />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
