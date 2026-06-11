import { useState, useEffect } from 'react'
import { BarChart2, PieChart, TrendingUp, Layers, RefreshCw, Clock } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart as RePie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart
} from 'recharts'
import { Card, Badge, Loader, ErrorMessage, Button } from '../components'
import { pb } from '../lib/pb'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {subtitle && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      </div>
      <div className="h-52">{children}</div>
    </Card>
  )
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="border rounded-xl p-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
      <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: '#9b9b9b', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color, fontSize: '20px', fontWeight: 700 }}>{value}</p>
    </div>
  )
}

async function calcAnalytics(brandFilter) {
  const [allAssets, allPublishes] = await Promise.all([
    pb.collection('content_assets').getFullList({ expand: 'brand', requestKey: null }),
    pb.collection('publish_instances').getFullList({ requestKey: null }),
  ])

  const assetMap = Object.fromEntries(allAssets.map(a => [a.id, { title: a.title, goal: a.goal, genre: a.genre, brand: a.brand }]))

  let publishes = allPublishes
  if (brandFilter) {
    const brandAssetIds = allAssets.filter(a => a.brand === brandFilter).map(a => a.id)
    const brandAssetSet = new Set(brandAssetIds)
    if (brandAssetIds.length === 0) {
      return { metrics: [], byPlatform: [], byGenre: [], byGoal: [], growth: [], totalViews: 0, totalReach: 0, avgRetention: 0, uploads: 0 }
    }
    publishes = allPublishes.filter(p => brandAssetSet.has(p.asset))
  }

  // BATCH FETCH - Get all metrics at once (fix N+1 query)
  const publishIds = publishes.map(p => p.id)
  let allMetricsData = []
  
  if (publishIds.length > 0) {
    // Fetch in chunks of 200 to avoid filter size limits
    for (let i = 0; i < publishIds.length; i += 200) {
      const chunk = publishIds.slice(i, i + 200)
      const idFilter = chunk.map(id => `publish = '${id}'`).join(' || ')
      try {
        const chunkMetrics = await pb.collection('metric_history').getFullList({
          filter: idFilter,
          sort: '-capture_date',
          requestKey: null,
        })
        allMetricsData.push(...chunkMetrics)
      } catch (err) {
        console.error('[Analytics] Failed to fetch metrics chunk:', err)
      }
    }
  }

  // Get latest metric per publish
  const latestMetrics = {}
  for (const m of allMetricsData) {
    if (!latestMetrics[m.publish]) {
      latestMetrics[m.publish] = m
    }
  }

  const metrics = {}
  for (const pub of publishes) {
    const latest = latestMetrics[pub.id]
    if (latest) {
      const asset = assetMap[pub.asset]
      metrics[pub.id] = {
        views: latest.views || 0,
        likes: latest.likes || 0,
        comments: latest.comments || 0,
        shares: latest.shares || 0,
        reach: latest.reach || 0,
        saves: latest.saves || 0,
        retention: latest.retention || 0,
        platform: pub.platform,
        goal: asset?.goal || 'UNKNOWN',
        genre: asset?.genre || 'UNKNOWN',
        month: pub.publish_date?.slice(0, 7) || '',
        capture_date: latest.capture_date,
      }
    }
  }

  const metricsArr = Object.values(metrics)

  const byPlatformMap = {}
  const byGenreMap = {}
  const byGoalMap = {}
  const growthMap = {}

  metricsArr.forEach(m => {
    byPlatformMap[m.platform] = byPlatformMap[m.platform] || { platform: m.platform, total_views: 0, uploads: 0 }
    byPlatformMap[m.platform].total_views += m.views
    byPlatformMap[m.platform].uploads++

    byGenreMap[m.genre] = byGenreMap[m.genre] || { genre: m.genre, total_views: 0 }
    byGenreMap[m.genre].total_views += m.views

    byGoalMap[m.goal] = byGoalMap[m.goal] || { goal: m.goal, total_views: 0 }
    byGoalMap[m.goal].total_views += m.views

    const month = m.month
    if (month) {
      growthMap[month] = growthMap[month] || { month, total_views: 0, total_reach: 0, retention_sum: 0, count: 0 }
      growthMap[month].total_views += m.views
      growthMap[month].total_reach += m.reach
      growthMap[month].retention_sum += m.retention
      growthMap[month].count++
    }
  })

  const byPlatform = Object.values(byPlatformMap).sort((a, b) => b.total_views - a.total_views)
  const byGenre = Object.values(byGenreMap).sort((a, b) => b.total_views - a.total_views)
  const byGoal = Object.values(byGoalMap).sort((a, b) => b.total_views - a.total_views)
  const growth = Object.values(growthMap).sort((a, b) => a.month.localeCompare(b.month)).map(g => ({
    ...g,
    avg_retention: g.count > 0 ? Math.round((g.retention_sum / g.count) * 10) / 10 : 0,
  }))

  return { byPlatform, byGenre, byGoal, growth }
}

export default function Analytics() {
  const [byPlatform, setByPlatform] = useState([])
  const [byGenre, setByGenre] = useState([])
  const [byGoal, setByGoal] = useState([])
  const [growth, setGrowth] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState(null)

  useEffect(() => {
    pb.collection('brands').getFullList({ requestKey: null }).then(res => setBrands(res || [])).catch(() => setBrands([]))
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await calcAnalytics(selectedBrand)
      setByPlatform(data.byPlatform)
      setByGenre(data.byGenre)
      setByGoal(data.byGoal)
      setGrowth(data.growth)
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [selectedBrand])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-16 animate-pulse" style={{ background: 'var(--bg-skeleton)' }} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-64 animate-pulse" style={{ background: 'var(--bg-skeleton)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
        <Button variant="ghost" size="sm" onClick={fetchData} loading={loading}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Total Views" value={formatNumber((byPlatform || []).reduce((a, b) => a + (b.total_views || 0), 0))} color="var(--accent)" />
        <SummaryCard label="Platforms" value={(byPlatform || []).length} color="#22c55e" />
        <SummaryCard label="Genres" value={(byGenre || []).length} color="#f59e0b" />
        <SummaryCard label="Growth Months" value={(growth || []).length} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="By Platform" icon={Layers}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byPlatform} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="platform" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 }} formatter={(v) => [formatNumber(v)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total_views" name="Views" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarWidth={36} />
              <Bar dataKey="uploads" name="Uploads" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarWidth={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Goal" icon={BarChart2}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byGoal} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <YAxis dataKey="goal" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} width={80} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 }} formatter={(v) => [formatNumber(v)]} />
              <Bar dataKey="total_views" name="Views" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Genre" icon={PieChart}>
          <div className="flex items-center h-full gap-3">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePie>
                  <Pie data={byGenre} dataKey="total_views" nameKey="genre" cx="50%" cy="50%" outerRadius="65%" innerRadius="35%" paddingAngle={2}
                    label={({ genre, percent }) => `${genre} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: 'var(--text-muted)' }}>
                    {byGenre.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 }} formatter={(v) => [formatNumber(v), 'Views']} />
                </RePie>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 min-w-[100px]">
              {byGenre.map((d, i) => (
                <div key={d.genre} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-primary)' }}>{d.genre}</span>
                  <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>{formatNumber(d.total_views)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Growth Trend" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growth} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 }} formatter={(v) => [formatNumber(v)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="total_views" name="Views" stroke="var(--accent)" strokeWidth={2} fill="url(#gViews)" />
              <Area type="monotone" dataKey="total_reach" name="Reach" stroke="#22c55e" strokeWidth={2} fill="url(#gReach)" />
              <Line type="monotone" dataKey="avg_retention" name="Avg Retention" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
