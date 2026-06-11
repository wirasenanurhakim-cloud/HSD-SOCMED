import { useState, useEffect, useCallback } from 'react'
import { Calendar, Download, TrendingUp, TrendingDown, BarChart3, RefreshCw, ExternalLink } from 'lucide-react'
import {
  BarChart, Bar, PieChart as RePie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Button, Input, Select, Modal, Card, Badge, Loader, ErrorMessage, DateRangePicker } from '../components'
import { calcScore } from '../lib/constants'
import { pb } from '../lib/pb'
import * as XLSX from 'xlsx'

const PLATFORM_LOGO = {
  TIKTOK: '/tiktok.png',
  INSTAGRAM: '/ig.png',
}

function PlatformLogo({ platform, size = 20 }) {
  const [failed, setFailed] = useState(false)
  const src = PLATFORM_LOGO[platform]
  if (!src || failed) {
    return <Badge variant="default" size="sm">{platform}</Badge>
  }
  return (
    <img
      src={src}
      alt={platform}
      style={{ width: size, height: size, borderRadius: 4 }}
      onError={() => setFailed(true)}
    />
  )
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function ScoreBadge({ row, avgER }) {
  const { score, tier } = calcScore(row, avgER)
  const variant = tier === 'HIGH' ? 'success' : tier === 'MEDIUM' ? 'warning' : 'danger'
  return <Badge variant={variant} size="sm">{score} ({tier})</Badge>
}

function ContentRow({ item, index, isTop, onDetail, avgER }) {
  return (
    <div className="p-4 rounded-xl border" style={{
      borderColor: 'var(--border-color)',
      borderLeft: `3px solid ${isTop ? 'var(--success-bg)' : 'var(--danger-bg)'}`,
      background: 'var(--bg-secondary)',
    }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{
          background: isTop ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: isTop ? 'var(--success-text)' : 'var(--danger-text)'
        }}>
          #{index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title?.length > 30 ? item.title.slice(0, 30) + '...' : item.title}</p>
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>{item.brand} • <PlatformLogo platform={item.platform} size={14} /></p>
        </div>
        <ScoreBadge row={item} avgER={avgER} />
        <div className="flex items-center gap-1">
          {item.post_url && (
            <a
              href={item.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              title="Buka link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={() => onDetail?.(item)}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            title="Lihat detail"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Views: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatNumber(item.views)}</span></span>
        <span>Reach: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatNumber(item.reach)}</span></span>
        <span>ER: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
          {item.views > 0 ? (((item.likes || 0) + (item.comments || 0) + (item.shares || 0) + (item.saves || 0)) / item.views * 100).toFixed(2) : '0.00'}%
        </span></span>
      </div>
    </div>
  )
}

async function fetchMonthlyReport(monthStr) {
  const startDate = `${monthStr}-01`
  const [y, m] = monthStr.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`

  // Fetch publishes and assets with timeout
  let publishes = []
  let assetsRes = []
  
  try {
    const [pubRes, assetRes] = await Promise.all([
      pb.collection('publish_instances').getFullList({
        filter: `publish_date >= '${startDate}' && publish_date <= '${endDate}'`,
        requestKey: null,
      }).catch(err => { console.error('[Report] Publish fetch error:', err); return [] }),
      pb.collection('content_assets').getFullList({ expand: 'brand', requestKey: null }).catch(err => { console.error('[Report] Assets fetch error:', err); return [] }),
    ])
    publishes = pubRes
    assetsRes = assetRes
  } catch (err) {
    console.error('[Report] Initial fetch error:', err)
    throw new Error('Failed to connect to PocketBase. Please check your connection.')
  }

  const assetMap = Object.fromEntries(assetsRes.map(a => [a.id, { title: a.title, goal: a.goal, genre: a.genre, brand_name: a.expand?.brand?.name || '-' }]))
  const rows = []
  let prevAvgER = null

  // BATCH FETCH - Get all metrics at once (fix N+1 query)
  const publishIds = publishes.map(p => p.id)
  let allMetricsData = []
  
  if (publishIds.length > 0) {
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
        console.error('[Report] Failed to fetch metrics chunk:', err)
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

  for (const pub of publishes) {
    const m = latestMetrics[pub.id]
    if (m) {
      const asset = assetMap[pub.asset]
      rows.push({
        id: pub.id,
        title: asset?.title || '-',
        brand: asset?.brand_name || '-',
        platform: pub.platform,
        goal: asset?.goal || '',
        genre: asset?.genre || '',
        post_url: pub.post_url,
        publish_date: pub.publish_date,
        views: m.views || 0,
        likes: m.likes || 0,
        comments: m.comments || 0,
        shares: m.shares || 0,
        reach: m.reach || 0,
        saves: m.saves || 0,
        retention: m.retention || 0,
      })
    }
  }

  const totalEngagement = rows.reduce((s, r) => s + (r.likes || 0) + (r.comments || 0) + (r.shares || 0) + (r.saves || 0), 0)
  const totalViews = rows.reduce((s, r) => s + (r.views || 0), 0)
  const avgER = totalViews > 0 ? (totalEngagement / totalViews * 100) : 0

  const sorted = [...rows].sort((a, b) => b.views - a.views)
  const top3 = sorted.slice(0, 3)
  const low3 = sorted.slice(-3).reverse()

  const prevMonth = new Date(y, m - 1, 1)
  const prevStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  try {
    const prevData = await fetchMonthlyReport(prevStr)
    prevAvgER = prevData.avgER
  } catch {}

  return { total: rows.length, data: rows, top3, low3, avgER, prevAvgER }
}

export default function Report() {
  const [month, setMonth] = useState(currentMonth())
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [availableMonths, setAvailableMonths] = useState([])
  const [topRefreshing, setTopRefreshing] = useState(false)
  const [bottomRefreshing, setBottomRefreshing] = useState(false)
  const [topUpdated, setTopUpdated] = useState(false)
  const [bottomUpdated, setBottomUpdated] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  useEffect(() => {
    pb.collection('publish_instances').getFullList({
      fields: 'publish_date',
      sort: 'publish_date',
      requestKey: null,
    }).then(data => {
      const months = [...new Set(data.map(d => d.publish_date?.slice(0, 7)).filter(Boolean))]
      const now = new Date()
      const allMonths = []
      months.forEach(m => {
        const [y, mNum] = m.split('-').map(Number)
        allMonths.push({ month: m, label: new Date(y, mNum - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) })
      })
      const curLabel = new Date(now.getFullYear(), now.getMonth()).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      if (!allMonths.find(m => m.month === currentMonth())) {
        allMonths.push({ month: currentMonth(), label: curLabel })
      }
      setAvailableMonths(allMonths.sort((a, b) => b.month.localeCompare(a.month)))
    }).catch(() => {})
  }, [])

  const fetchReport = useCallback(async () => {
    if (!month && !dateRange.startDate) return
    setLoading(true)
    setError(null)
    
    // Timeout after 45 seconds
    const timeoutId = setTimeout(() => {
      setError('Connection timeout. Please check PocketBase server.')
      setLoading(false)
    }, 45000)
    
    try {
      const data = await fetchMonthlyReport(month)
      clearTimeout(timeoutId)
      setReport(data)
      if (data && !data.data?.length) {
        setError(null) // No data is not an error, just empty
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('[Report] Fetch error:', err)
      setError(err.message || 'Failed to load report. Please check connection.')
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [month, dateRange])

  useEffect(() => { fetchReport() }, [fetchReport])

  const handleDateChange = (range) => {
    if (range.startDate && range.endDate) {
      const monthFromRange = range.startDate.slice(0, 7)
      const monthEnd = range.endDate.slice(0, 7)
      if (monthFromRange === monthEnd) {
        setMonth(monthFromRange)
        setDateRange({ startDate: null, endDate: null })
      } else {
        setDateRange(range)
        setMonth('')
      }
    }
  }

  const refreshTop = async () => {
    setTopRefreshing(true)
    try {
      const data = await fetchMonthlyReport(month)
      setReport(prev => prev ? { ...prev, top3: data.top3, data: data.data } : data)
      setTopUpdated(true)
      setTimeout(() => setTopUpdated(false), 3000)
    } catch {}
    setTopRefreshing(false)
  }

  const refreshBottom = async () => {
    setBottomRefreshing(true)
    try {
      const data = await fetchMonthlyReport(month)
      setReport(prev => prev ? { ...prev, low3: data.low3, data: data.data } : data)
      setBottomUpdated(true)
      setTimeout(() => setBottomUpdated(false), 3000)
    } catch {}
    setBottomRefreshing(false)
  }

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    try {
      if (!report?.data?.length) {
        setError('Tidak ada data untuk di-export')
        return
      }

      const exportData = report.data.map(row => ({
        'Title': row.title,
        'Brand': row.brand,
        'Platform': row.platform,
        'Goal': row.goal,
        'Genre': row.genre,
        'Views': row.views,
        'Likes': row.likes,
        'Comments': row.comments,
        'Shares': row.shares,
        'Reach': row.reach,
        'Saves': row.saves,
        'Engagement Rate': row.views > 0
          ? (((row.likes || 0) + (row.comments || 0) + (row.shares || 0) + (row.saves || 0)) / row.views * 100).toFixed(2) + '%'
          : '0.00%',
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Report')

      const monthLabel = month || new Date().toISOString().slice(0, 7)
      XLSX.writeFile(wb, `report-${monthLabel}.xlsx`)
    } catch (err) {
      setError(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const totalViews = report?.data?.reduce((a, b) => a + (b.views || 0), 0) || 0
  const totalReach = report?.data?.reduce((a, b) => a + (b.reach || 0), 0) || 0
  const avgRetention = report?.data?.length
    ? (report.data.reduce((a, b) => a + (b.retention || 0), 0) / report.data.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Monthly Report</h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchReport} loading={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={handleExport} loading={exporting}>
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <DateRangePicker
            value={dateRange.startDate ? dateRange : { month }}
            onChange={handleDateChange}
            availableMonths={availableMonths}
          />
        </div>
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center h-64">
          <Loader size="lg" />
        </Card>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card><p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Total Content</p><p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{report.total}</p></Card>
            <Card><p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Total Views</p><p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{formatNumber(totalViews)}</p></Card>
            <Card><p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Total Reach</p><p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{formatNumber(totalReach)}</p></Card>
            <Card>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Avg ER</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold" style={{ color: '#8b5cf6' }}>{(report.avgER ?? 0).toFixed(2)}%</p>
                {report.prevAvgER != null && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${report.avgER >= report.prevAvgER ? 'text-green-500' : 'text-red-500'}`}>
                    {report.avgER >= report.prevAvgER ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(report.avgER - report.prevAvgER).toFixed(2)}%
                  </span>
                )}
              </div>
            </Card>
            <Card><p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Avg Retention</p><p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{avgRetention.toFixed(1)}%</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" style={{ color: '#22c55e' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Top 3 Content</h3>
                </div>
                <div className="flex items-center gap-2">
                  {topUpdated && <span className="text-xs" style={{ color: '#22c55e' }}>Updated just now</span>}
                  <button
                    onClick={refreshTop}
                    disabled={topRefreshing}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <RefreshCw className={`w-4 h-4 ${topRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              {(report.top3 || []).length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No data</p>
              ) : (
                <div className="space-y-3">{(report.top3 || []).map((item, i) => <ContentRow key={i} item={item} index={i} isTop onDetail={setDetailItem} avgER={report.avgER} />)}</div>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Bottom 3 Content</h3>
                </div>
                <div className="flex items-center gap-2">
                  {bottomUpdated && <span className="text-xs" style={{ color: '#22c55e' }}>Updated just now</span>}
                  <button
                    onClick={refreshBottom}
                    disabled={bottomRefreshing}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <RefreshCw className={`w-4 h-4 ${bottomRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              {(report.low3 || []).length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No data</p>
              ) : (
                <div className="space-y-3">{(report.low3 || []).map((item, i) => <ContentRow key={i} item={item} index={i} isTop={false} onDetail={setDetailItem} avgER={report.avgER} />)}</div>
              )}
            </Card>
          </div>

          {report.data?.length > 0 && (() => {
            const grouped = {}
            report.data.forEach(item => {
              if (!grouped[item.platform]) grouped[item.platform] = { platform: item.platform, views: 0, count: 0 }
              grouped[item.platform].views += item.views || 0
              grouped[item.platform].count++
            })
            const pieData = Object.values(grouped)
            return (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5" style={{ color: '#f59e0b' }} />
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Platform Distribution</h3>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePie>
                      <Pie data={pieData} dataKey="views" nameKey="platform" cx="50%" cy="50%" outerRadius="65%" innerRadius="40%" paddingAngle={3}
                        label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: 'var(--text-muted)' }}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} formatter={(v) => [formatNumber(v), 'Views']} />
                    </RePie>
                  </ResponsiveContainer>
                </div>
              </Card>
            )
          })()}
        </>
      ) : (
        <Card className="flex items-center justify-center h-64">
          <div className="text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a month to view report</p>
          </div>
        </Card>
      )}

      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title={detailItem?.title?.length > 30 ? detailItem.title.slice(0, 30) + '...' : detailItem?.title || 'Content Detail'}
        size="lg"
      >
        {detailItem && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <PlatformLogo platform={detailItem.platform} size={32} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{detailItem.brand}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{detailItem.platform} • {detailItem.goal}</p>
              </div>
              <div className="ml-auto flex items-center gap-2"><ScoreBadge row={detailItem} avgER={report?.avgER} />
                {detailItem.post_url && (
                  <a
                    href={detailItem.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-colors"
                    style={{ color: 'var(--accent)', background: 'var(--hover-bg)' }}
                    title="Buka di browser"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Views', value: formatNumber(detailItem.views) },
                { label: 'Reach', value: formatNumber(detailItem.reach) },
                { label: 'Likes', value: formatNumber(detailItem.likes) },
                { label: 'Comments', value: formatNumber(detailItem.comments) },
                { label: 'Shares', value: formatNumber(detailItem.shares) },
                { label: 'Saves', value: formatNumber(detailItem.saves) },
                { label: 'Engagement Rate', value: detailItem.views > 0
                  ? (((detailItem.likes || 0) + (detailItem.comments || 0) + (detailItem.shares || 0) + (detailItem.saves || 0)) / detailItem.views * 100).toFixed(2) + '%'
                  : '0.00%'
                },
                { label: 'Genre', value: detailItem.genre || '-' },
              ].map(stat => (
                <div key={stat.label} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <p className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
