import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Search, Camera as CameraIcon, History, Plus, ExternalLink, Music as MusicIcon, Image as ImageIcon, RefreshCw, Zap, Trash2, Loader as LoaderIcon, Pencil, Lock, X, Loader2, TrendingUp, TrendingDown, BarChart3, Upload } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts'
import { Button, Input, Select, Modal, Card, Badge, Loader, ErrorMessage } from '../components'
import { useToast } from '../hooks/useToast'
import { calcScore, THUMBNAIL_PROXY_URL } from '../lib/constants'
import { pb } from '../lib/pb'

const PLATFORM_LOGO = {
  TIKTOK: '/tiktok.png',
  INSTAGRAM: '/ig.png',
}

function PlatformLogo({ platform, size = 20 }) {
  const [failed, setFailed] = useState(false)
  const src = PLATFORM_LOGO[platform]
  if (!src || failed) {
    const variant = platform === 'TIKTOK' ? 'tiktok' : 'instagram'
    return <Badge variant={variant} size="sm">{platform}</Badge>
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

function formatNumber(n) {
  if (n == null) return '-'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatDate(d) {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return d }
}

function formatDateShort(d) {
  if (!d) return '-'
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  } catch { return d }
}

const emptySnapshot = {
  capture_date: new Date().toISOString().slice(0, 10),
  capture_time: new Date().toTimeString().slice(0, 5),
  views: '', likes: '', comments: '', shares: '', reach: '', saves: '',
  followers: '', watch_time: '', retention: '',
}

function ThumbnailImage({ src, alt, style, fallbackIcon: FallbackIcon, fallbackText, altUrls }) {
  const [imgError, setImgError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [altUrlIndex, setAltUrlIndex] = useState(0)

  useEffect(() => {
    setImgError(false)
    setCurrentSrc(src)
    setAltUrlIndex(0)
  }, [src])

  const handleError = () => {
    // Try alternate URLs if available (for TikTok CDN fallbacks)
    if (altUrls && altUrlIndex < altUrls.length - 1) {
      const nextIndex = altUrlIndex + 1
      setAltUrlIndex(nextIndex)
      setCurrentSrc(altUrls[nextIndex])
      return
    }
    setImgError(true)
  }

  if (imgError || !currentSrc) {
    return (
      <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
        <div className="text-center">
          {FallbackIcon && <FallbackIcon className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fallbackText || 'Preview unavailable'}</p>
          {altUrls && altUrlIndex < altUrls.length - 1 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>Trying {altUrlIndex + 2} of {altUrls.length} URLs...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt || 'Thumbnail'}
      style={style}
      onError={handleError}
      onLoad={() => {}}
    />
  )
}

function EmbedPreview({ content }) {
  const [oembed, setOembed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  // Helper function to extract TikTok video ID
  const extractTikTokVideoId = (url) => {
    const match = url.match(/video\/(\d+)/)
    return match ? match[1] : null
  }

  // Helper function to extract Instagram post ID from URL
  const extractInstagramPostId = (url) => {
    // Match various Instagram URL patterns
    const match = url.match(/(?:p|reel|tv)\/([^/?]+)/)
    return match ? match[1] : null
  }

  useEffect(() => {
    if (!content) return
    const url = content.post_url || ''
    const platform = (content.platform || '').toUpperCase()
    if (!url) return

    // Reset states
    setOembed(null)
    setFetchError(false)

    // Use cached thumbnail if available (from database)
    const cachedThumbnail = content.thumbnail_url

    if ((platform === 'TIKTOK' || url.includes('tiktok.com')) && url.match(/video\/(\d+)/)) {
      setLoading(true)
      
      // If we have cached thumbnail, use it immediately
      if (cachedThumbnail) {
        setOembed({ thumbnail_url: cachedThumbnail, title: content.title, author_name: content.brand_name })
        setLoading(false)
        return
      }

      // Use TikTok oEmbed API (same as Electron version)
      fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
        .then(r => r.json())
        .then(d => {
          if (d.thumbnail_url) {
            setOembed({
              thumbnail_url: d.thumbnail_url,
              title: d.title || content.title,
              author_name: d.author_name || content.brand_name,
              isOembed: true
            })
          } else {
            setFetchError(true)
          }
          setLoading(false)
        })
        .catch(() => {
          setFetchError(true)
          setLoading(false)
        })
      return
    }
    
    // Instagram thumbnail - use backend proxy for og:image extraction
    if (platform === 'INSTAGRAM' || url.includes('instagram.com')) {
      setLoading(true)
      
      // If we have cached thumbnail, use it immediately
      if (cachedThumbnail) {
        setOembed({ thumbnail_url: cachedThumbnail, title: content.title, author_name: content.brand_name })
        setLoading(false)
        return
      }

      // Call backend proxy to extract og:image (bypasses CORS)
      fetch('/api/thumbnail?url=' + encodeURIComponent(url))
        .then(r => r.json())
        .then(d => {
          if (d.thumbnail_url) {
            setOembed({
              thumbnail_url: d.thumbnail_url,
              title: d.title || content.title,
              author_name: content.brand_name,
            })
          } else {
            setFetchError(true)
          }
          setLoading(false)
        })
        .catch(() => { setFetchError(true); setLoading(false) })
      return
    }
  }, [content])

  if (!content) return null

  const url = content.post_url || ''
  const platform = (content.platform || '').toUpperCase()

  if (!url) {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
          <CameraIcon className="w-10 h-10" style={{ color: 'var(--text-dim)' }} />
        </div>
        <div className="p-4 text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No URL linked</p>
        </div>
      </div>
    )
  }

  if (platform === 'TIKTOK' || url.includes('tiktok.com')) {
    if (loading) {
      return (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
            <LoaderIcon size={20} className="animate-spin" />
          </div>
          <div className="p-4 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading preview...</p>
          </div>
        </div>
      )
    }

    if (oembed?.thumbnail_url) {
      return (
        <div className="rounded-xl overflow-hidden shadow-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: 300 }}>
          <ThumbnailImage
            src={oembed.thumbnail_url}
            alt={oembed.title || 'TikTok'}
            style={{ width: '100%', aspectRatio: '9/16', objectFit: 'cover', display: 'block', borderRadius: '8px 8px 0 0' }}
            fallbackIcon={MusicIcon}
            fallbackText="TikTok thumbnail unavailable"
            altUrls={oembed.altUrls}
          />
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {oembed.title?.length > 30 ? oembed.title.slice(0, 30) + '...' : oembed.title || 'No title'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <MusicIcon className="w-3 h-3 inline mr-1" />@{oembed.author_name || 'unknown'}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Open post <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: 300 }}>
        <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="text-center">
            <MusicIcon className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {fetchError ? 'Preview unavailable' : 'TikTok video'}
            </p>
          </div>
        </div>
        <div className="p-4 text-center">
          <a href={url} target="_blank" rel="noreferrer" className="text-xs underline block" style={{ color: 'var(--accent)' }}>
            Open in TikTok &rarr;
          </a>
        </div>
      </div>
    )
  }

  if (platform === 'INSTAGRAM' || url.includes('instagram.com')) {
    // Show thumbnail if available from cached data, otherwise gradient with logo
    if (loading) {
      return (
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: 300 }}>
          <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
            <LoaderIcon size={20} className="animate-spin" />
          </div>
          <div className="p-4 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading preview...</p>
          </div>
        </div>
      )
    }
    
    if (oembed?.thumbnail_url) {
      return (
        <div className="rounded-xl overflow-hidden shadow-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: 300 }}>
          <ThumbnailImage
            src={oembed.thumbnail_url}
            alt={oembed.title || 'Instagram'}
            style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block', borderRadius: '8px 8px 0 0' }}
            fallbackIcon={ImageIcon}
            fallbackText="Instagram thumbnail unavailable"
            altUrls={oembed.altUrls}
          />
          <div className="p-3 space-y-2">
            <p className="text-xs font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
              {oembed.title?.length > 30 ? oembed.title.slice(0, 30) + '...' : oembed.title || 'Instagram Post'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <ImageIcon className="w-3 h-3 inline mr-1" />@{oembed.author_name || 'instagram'}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)', color: 'white' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Open post <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: 300 }}>
        <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
          <div className="text-center">
            <img src="/ig.png" alt="Instagram" className="w-12 h-12 mx-auto mb-2 opacity-80" onError={(e) => { e.target.style.display = 'none' }} />
            <ImageIcon className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Instagram Post</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {content.title && (
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-primary)' }}>
              {content.title.length > 30 ? content.title.slice(0, 30) + '...' : content.title}
            </p>
          )}
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors w-full justify-center"
            style={{ background: 'var(--accent)', color: 'white' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Open in Instagram <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', width: 300 }}>
      <div className="flex items-center justify-center h-48" style={{ background: 'var(--bg-tertiary)' }}>
        <ExternalLink className="w-10 h-10" style={{ color: 'var(--text-dim)' }} />
      </div>
      <div className="p-4 text-center space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>External URL</p>
        <a href={url} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--accent)', color: 'white' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Open link <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

function GrowthMiniChart({ data }) {
  if (!data || data.length < 2) return null
  const chartData = [...data].reverse().map(m => ({
    date: formatDateShort(m.capture_date),
    Views: m.views || 0,
    Likes: m.likes || 0,
    Reach: m.reach || 0,
  }))

  return (
    <div className="h-52 mb-4">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Growth Trend</p>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={{ stroke: 'var(--border-color)' }} />
          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Views" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Likes" stroke="#ec4899" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Reach" stroke="#22c55e" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Metrics() {
  const CACHE_KEY='sa_metrics_cache'
  function loadMetricsCache(){try{const raw=localStorage.getItem(CACHE_KEY);if(!raw)return null;return JSON.parse(raw)}catch{}return null}
  function saveMetricsCache(d){try{localStorage.setItem(CACHE_KEY,JSON.stringify({...d,ts:Date.now()}))}catch{}}
  const cached=loadMetricsCache()
  const [searchQuery, setSearchQuery] = useState('')
  const [allContents, setAllContents] = useState(cached?.allContents||[])
  const allContentsRef = useRef(allContents)
  useEffect(() => { allContentsRef.current = allContents }, [allContents])
  // loading=true only on first visit with no data; refreshing=true for background updates
  const [loadingAll, setLoadingAll] = useState(!cached?.allContents)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const searchRef = useRef(null)
  const { showToast } = useToast()

  const [selected, setSelected] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [snapshot, setSnapshot] = useState(emptySnapshot)
  const [saving, setSaving] = useState(false)
  const [hourlyData, setHourly] = useState([])
  const [scrapingAll, setScrapingAll] = useState(false)
  const [scrapingSingle, setScrapingSingle] = useState(false)
  const [showScrapeConfirm, setShowScrapeConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [contentFilter, setContentFilter] = useState('all')
  const [contentSort, setContentSort] = useState('newest')
  const [showImportCsv, setShowImportCsv] = useState(false)
  const [importCsvText, setImportCsvText] = useState('')
  const [importingCsv, setImportingCsv] = useState(false)
  const [importCsvResult, setImportCsvResult] = useState(null)

  const fetchAll = useCallback(async (opts = {}) => {
    const doFetch = async (isRetry = false) => {
      const silent = opts.silent
      if (!silent) setLoadingAll(true)
      else setRefreshing(true)
      setError(null)
      try {
        // Only fetch top 20 publishes with minimal fields
        const pubRes = await pb.collection('publish_instances').getList(1, 20, {
          sort: '-publish_date',
          fields: 'id,asset,platform,post_url,publish_date,thumbnail_url',
          requestKey: null,
        })
        const publishes = pubRes.items

        // Get unique asset and brand IDs from the 20 publishes
        const assetIds = [...new Set(publishes.map(p => p.asset).filter(Boolean))]

        // Fetch only needed assets and brands
        const [assets, brands] = await Promise.all([
          assetIds.length > 0
            ? pb.collection('content_assets').getFullList({
                filter: assetIds.map(id => `id = '${id}'`).join(' || '),
                fields: 'id,title,goal,genre,brand',
                requestKey: null,
              }).catch(() => [])
            : Promise.resolve([]),
          pb.collection('brands').getFullList({
            fields: 'id,name,color',
            requestKey: null,
          }).catch(() => []),
        ])
        const publishIds = publishes.map(p => p.id).filter(Boolean)

        // Fetch latest metric snapshot for each publish
        const allMetrics = publishIds.length > 0
          ? await pb.collection('metric_history').getFullList({
              filter: publishIds.map(id => `publish = '${id}'`).join(' || '),
              sort: '-capture_date',
              fields: 'id,publish,views,likes,comments,shares,saves',
              requestKey: null,
            }).catch(() => [])
          : []
        const metricMap = {}
        for (const m of allMetrics) {
          if (!metricMap[m.publish]) metricMap[m.publish] = m
        }

        const brandMap = Object.fromEntries(brands.map(b => [b.id, { name: b.name, color: b.color || '#6b7280' }]))
        const assetMap = Object.fromEntries(assets.map(a => [a.id, a]))
        const sorted = publishes.map(p => {
          const asset = assetMap[p.asset]
          const brand = asset?.brand ? brandMap[asset.brand] : null
          const latestMetric = metricMap[p.id]
          return {
            publish_id: p.id,
            id: p.id,
            title: asset?.title || '-',
            brand_name: brand?.name || '-',
            brand_color: brand?.color || '#6b7280',
            platform: p.platform,
            publish_date: p.publish_date,
            post_url: p.post_url,
            thumbnail_url: p.thumbnail_url || null,
            goal: asset?.goal || '',
            genre: asset?.genre || '',
            asset_id: p.asset || '',
            views: latestMetric?.views || 0,
            likes: latestMetric?.likes || 0,
            comments: latestMetric?.comments || 0,
            shares: latestMetric?.shares || 0,
            saves: latestMetric?.saves || 0,
          }
        })
        setAllContents(sorted)
        saveMetricsCache({allContents:sorted})
      } catch (err) {
        if (isRetry || silent) {
          // Retry or silent: graceful
          if (allContentsRef.current.length > 0) {
            console.warn('[Metrics] Refresh gagal, data terakhir tetap ditampilkan:', err.message)
          } else {
            setError('Koneksi server sementara gagal, menampilkan data terakhir.')
          }
        } else {
          // First attempt: retry sekali
          await new Promise(r => setTimeout(r, 1500))
          return doFetch(true)
        }
      } finally {
        setLoadingAll(false)
        setRefreshing(false)
      }
    }
    return doFetch()
  }, [])

  // On mount: show cached data instantly, refresh in background
  useEffect(() => { fetchAll({ silent: !!(cached?.allContents) }) }, [fetchAll])

  const filteredContents = (() => {
    let list = allContents
    if (searchQuery.trim()) {
      list = list.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    if (contentFilter === 'has_metrics') {
      list = list.filter(c => c.views > 0)
    } else if (contentFilter === 'missing') {
      list = list.filter(c => !c.views || c.views <= 0)
    }
    if (contentSort === 'er_desc') {
      list = [...list].sort((a, b) => {
        const sa = a.views > 0 ? ((a.likes||0)+(a.comments||0)+(a.shares||0)+(a.saves||0))/a.views*100 : 0
        const sb = b.views > 0 ? ((b.likes||0)+(b.comments||0)+(b.shares||0)+(b.saves||0))/b.views*100 : 0
        return sb - sa
      })
    } else if (contentSort === 'views_desc') {
      list = [...list].sort((a, b) => (b.views||0) - (a.views||0))
    }
    return list
  })()

  const selectContent = async (row) => {
    setSelected(row)
    setSearchQuery('')
    setShowForm(false)
    setSnapshot(emptySnapshot)
    loadMetrics(row.publish_id)
    setHourly([])
  }

  const loadMetrics = async (publishId) => {
    setLoadingMetrics(true)
    setError(null)
    try {
      const data = await pb.collection('metric_history').getFullList({
        filter: `publish = '${publishId}'`,
        sort: '-capture_date',
        fields: 'id,publish,views,likes,comments,shares,reach,saves,retention,capture_date',
        requestKey: null,
      })
      setMetrics(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load metrics')
    } finally {
      setLoadingMetrics(false)
    }
  }

  const handleSnapshotChange = (field) => (e) => {
    setSnapshot(prev => ({ ...prev, [field]: e.target.value }))
  }

  const submitSnapshot = async (e) => {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      await pb.collection('metric_history').create({
        publish: selected.publish_id,
        capture_date: snapshot.capture_date + 'T' + (snapshot.capture_time || '00:00') + ':00',
        views: Number(snapshot.views) || 0,
        likes: Number(snapshot.likes) || 0,
        comments: Number(snapshot.comments) || 0,
        shares: Number(snapshot.shares) || 0,
        reach: Number(snapshot.reach) || 0,
        saves: Number(snapshot.saves) || 0,
        followers: snapshot.followers ? Number(snapshot.followers) : null,
        watch_time: snapshot.watch_time ? Number(snapshot.watch_time) : null,
        retention: snapshot.retention ? Number(snapshot.retention) : null,
      })
      setSnapshot(emptySnapshot)
      setShowForm(false)
      showToast('Snapshot berhasil direkam', 'success')
      await loadMetrics(selected.publish_id)
    } catch (err) {
      setError(err.message || 'Failed to save snapshot')
    } finally {
      setSaving(false)
    }
  }

  const processOcrFile = async (file) => {
    if (!file) return
    setOcrLoading(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      try {
        let apiKey = null
        try {
          const setting = await pb.collection('settings').getFirstListItem('key = "gemini_api_key"', { requestKey: null })
          apiKey = setting?.value
        } catch {}
        if (apiKey) {
          showToast('OCR Gemini tidak tersedia di versi web', 'warning')
        } else {
          showToast('OCR tidak tersedia di versi web', 'warning')
        }
      } catch (err) {
        showToast('OCR gagal: ' + err.message, 'error')
      } finally {
        setOcrLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const [dragging, setDragging] = useState(false)
  const dropRef = useRef(null)

  // Password protection state
  const [passwordModal, setPasswordModal] = useState({ show: false, type: null, id: null, title: '' })
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Edit title state
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')

  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    const onPaste = (e) => {
      const item = e.clipboardData?.items?.[0]
      if (item && item.type.startsWith('image/')) {
        e.preventDefault()
        processOcrFile(item.getAsFile())
      }
    }
    el.addEventListener('paste', onPaste)
    return () => el.removeEventListener('paste', onPaste)
  }, [])

  const handleScrapeAll = async () => {
    setShowScrapeConfirm(false)
    setScrapingAll(true)
    showToast('⏳ Scraping tidak tersedia di versi web', 'warning')
    setScrapingAll(false)
  }

  const handleScrapeSingle = async () => {
    if (!selected || !selected.publish_id) return
    setScrapingSingle(true)
    showToast('Auto update tidak tersedia di versi web', 'warning')
    setScrapingSingle(false)
  }

  const handleDeleteSnapshot = async (id) => {
    // Open password modal instead of direct delete
    openPasswordModal('delete_snapshot', id)
  }

  const confirmDeleteSnapshot = async (id) => {
    setError(null)
    try {
      await pb.collection('metric_history').delete(id)
      setDeleteConfirm(null)
      showToast('Snapshot dihapus', 'success')
      await loadMetrics(selected.publish_id)
    } catch (err) {
      showToast('Gagal menghapus snapshot', 'danger')
    }
  }

  const clearSelected = () => {
    setSelected(null)
    setMetrics([])
    setShowForm(false)
    setEditingTitle(false)
  }

  const handleImportCsv = async () => {
    setImportCsvResult(null)
    if (!importCsvText.trim()) {
      showToast('Paste data CSV terlebih dahulu', 'danger')
      return
    }
    setImportingCsv(true)
    try {
      const lines = importCsvText.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const requiredIdx = { publish: headers.indexOf('publish_id') }
      if (requiredIdx.publish === -1) {
        showToast('Kolom publish_id wajib ada', 'danger')
        setImportingCsv(false)
        return
      }
      const viewIdx = headers.indexOf('views')
      const likesIdx = headers.indexOf('likes')
      const commentsIdx = headers.indexOf('comments')
      const sharesIdx = headers.indexOf('shares')
      const reachIdx = headers.indexOf('reach')
      const savesIdx = headers.indexOf('saves')
      const dateIdx = headers.indexOf('capture_date')
      let success = 0, failed = 0
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (cols.length < 2) continue
        try {
          const data = {
            publish: cols[requiredIdx.publish],
            views: viewIdx >= 0 ? Number(cols[viewIdx]) || 0 : 0,
            likes: likesIdx >= 0 ? Number(cols[likesIdx]) || 0 : 0,
            comments: commentsIdx >= 0 ? Number(cols[commentsIdx]) || 0 : 0,
            shares: sharesIdx >= 0 ? Number(cols[sharesIdx]) || 0 : 0,
            reach: reachIdx >= 0 ? Number(cols[reachIdx]) || 0 : 0,
            saves: savesIdx >= 0 ? Number(cols[savesIdx]) || 0 : 0,
          }
          if (dateIdx >= 0 && cols[dateIdx]) {
            data.capture_date = cols[dateIdx]
          }
          await pb.collection('metric_history').create(data)
          success++
        } catch {
          failed++
        }
      }
      setImportCsvResult({ success, failed })
      showToast(`Import selesai: ${success} berhasil, ${failed} gagal`, failed > 0 ? 'warning' : 'success')
      if (selected) loadMetrics(selected.publish_id)
    } catch (err) {
      showToast('Gagal import CSV: ' + err.message, 'danger')
    } finally {
      setImportingCsv(false)
    }
  }

  const handleEditTitle = () => {
    if (!selected) return
    setEditTitleValue(selected.title || '')
    setEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    if (!selected || !editTitleValue.trim()) return
    try {
      await pb.collection('content_assets').update(selected.asset_id, { title: editTitleValue.trim() })
      setSelected(prev => ({ ...prev, title: editTitleValue.trim() }))
      setEditingTitle(false)
      showToast('Title berhasil diupdate', 'success')
    } catch (err) {
      showToast('Gagal update title: ' + err.message, 'error')
    }
  }

  const handlePasswordConfirm = () => {
    if (passwordInput !== 'admin12345') {
      setPasswordError('Password salah')
      return
    }
    setPasswordError('')
    setPasswordInput('')
    
    if (passwordModal.type === 'delete_snapshot') {
      confirmDeleteSnapshot(passwordModal.id)
    }
    setPasswordModal({ show: false, type: null, id: null, title: '' })
  }

  const openPasswordModal = (type, id, title = '') => {
    setPasswordModal({ show: true, type, id, title })
    setPasswordInput('')
    setPasswordError('')
  }

  const latestDate = metrics.length > 0 ? metrics[0].capture_date : null

  const historyColumns = [
    { key: 'capture_date', label: 'Date', render: (v, row, idx) => (
      <span className="flex items-center gap-1.5">
        {formatDate(v)}
        {idx === 0 && <Badge variant="success" size="sm">Latest</Badge>}
      </span>
    )},
    { key: 'views', label: 'Views', render: (v, row, idx) => (
      <span className="font-mono flex items-center gap-1">
        {formatNumber(v)}
        {idx > 0 && idx < metrics.length && (() => {
          const prev = metrics[idx - 1]?.views || 0
          const delta = (prev || 0) - (v || 0)
          if (delta === 0) return null
          return (
            <span className={`text-[10px] ${delta > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {delta > 0 ? '+' : ''}{formatNumber(delta)} {delta > 0 ? '\u2191' : '\u2193'}
            </span>
          )
        })()}
      </span>
    ), className: 'text-right' },
    { key: 'likes', label: 'Likes', render: (v) => <span className="font-mono">{formatNumber(v)}</span>, className: 'text-right' },
    { key: 'comments', label: 'Cmnts', render: (v) => <span className="font-mono">{formatNumber(v)}</span>, className: 'text-right' },
    { key: 'shares', label: 'Shares', render: (v) => <span className="font-mono">{formatNumber(v)}</span>, className: 'text-right' },
    { key: 'reach', label: 'Reach', render: (v) => <span className="font-mono">{formatNumber(v)}</span>, className: 'text-right' },
    { key: 'saves', label: 'Saves', render: (v) => <span className="font-mono">{formatNumber(v)}</span>, className: 'text-right' },
    { key: 'watch_time', label: 'Watch', render: (v) => <span className="font-mono">{v != null ? formatNumber(v) : '-'}</span>, className: 'text-right' },
    { key: 'retention', label: 'Ret%', render: (v) => <span className="font-mono">{v != null ? `${Number(v).toFixed(1)}%` : '-'}</span>, className: 'text-right' },
    { key: 'score', label: 'Score', render: (_, row) => {
        try { const { score, tier } = calcScore(row || {}); const map = { HIGH: 'success', MEDIUM: 'warning', LOW: 'danger' }; return <Badge variant={map[tier] || 'danger'} size="sm">{score ?? '—'}</Badge>; } catch(e) { return <Badge variant="danger" size="sm">—</Badge>; }
      }, className: 'text-center' },
    { key: 'tier', label: 'Tier', render: (_, row) => {
        try { const { tier } = calcScore(row || {}); const map = { HIGH: 'success', MEDIUM: 'warning', LOW: 'danger' }; return <Badge variant={map[tier] || 'danger'} size="sm">{tier || '—'}</Badge>; } catch(e) { return <Badge variant="danger" size="sm">—</Badge>; }
      }, className: 'text-center' },
    { key: 'actions', label: '', render: (_, row) => {
        if (!row) return null
        return deleteConfirm === row.id ? (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => handleDeleteSnapshot(row.id)}
            className="px-2 py-1 text-xs text-white rounded transition-colors"
            style={{ background: 'var(--danger)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--danger)'}>Hapus</button>
          <button onClick={() => setDeleteConfirm(null)}
            className="px-2 py-1 text-xs transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>Batal</button>
        </div>
      ) : (
        <button onClick={() => openPasswordModal('delete_snapshot', row.id)}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          title="Hapus snapshot">
          <Trash2 className="w-4 h-4" />
        </button>
      )
      }
, className: 'text-right' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Metrics</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImportCsv(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button disabled={true}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
            title="Hanya tersedia di desktop app">
            <RefreshCw className="w-4 h-4" />
            Update All
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <div ref={searchRef}>
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search content by title..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (selected) clearSelected() }}
              className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); if (selected) clearSelected() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </Card>

        {!selected && (
          <div className="flex items-center justify-between mt-4 gap-2">
            <div className="flex gap-1">
              {[
                { key: 'all', label: 'All' },
                { key: 'has_metrics', label: 'Has Metrics' },
                { key: 'missing', label: 'Missing' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setContentFilter(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: contentFilter === tab.key ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: contentFilter === tab.key ? '#fff' : 'var(--text-secondary)'
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {[
                { key: 'newest', label: 'Newest' },
                { key: 'er_desc', label: 'ER High' },
                { key: 'views_desc', label: 'Views High' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setContentSort(opt.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: contentSort === opt.key ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: contentSort === opt.key ? '#fff' : 'var(--text-secondary)'
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!selected && loadingAll && (
          <Card className="flex items-center justify-center h-32 mt-4"><LoaderIcon size={20} className="animate-spin" /></Card>
        )}

        {!selected && !loadingAll && filteredContents.length > 0 && (
          <Card className="mt-4 p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b text-xs font-medium flex items-center justify-between" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              <span>Recent Content</span>
              <span className="font-mono">{filteredContents.length} items</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {filteredContents.map(row => (
                <button
                  key={row.publish_id || row.id}
                  onClick={() => selectContent(row)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{row?.title?.length > 30 ? row.title.slice(0, 30) + '...' : (row?.title || 'Untitled')}</p>
                    <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <span>{row?.brand_name || '—'}</span>
                      <PlatformLogo platform={row?.platform} size={16} />
                      <span>{row?.publish_date ? formatDate(row.publish_date) : ''}</span>
                    </p>
                  </div>
                  {(() => { try { if (!row.views || row.views <= 0) return <Badge variant="default" size="sm">—</Badge>; const { tier, score } = calcScore(row); const title = `ER = ((likes+comments+shares+saves) / views) × 100 = (${row.likes||0}+${row.comments||0}+${row.shares||0}+${row.saves||0}) / ${row.views} × 100 = ${score}`; return <Badge variant={tier === 'HIGH' ? 'success' : tier === 'MEDIUM' ? 'warning' : 'danger'} size="sm" title={title}>ER {score}</Badge>; } catch(e) { return <Badge variant="default" size="sm">—</Badge>; } })()}
                </button>
              ))}
            </div>
          </Card>
        )}

        {!selected && !loadingAll && filteredContents.length === 0 && (
          <Card className="flex items-center justify-center h-48 mt-4">
            <div className="text-center">
              <Search className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
              <p className="text-base" style={{ color: 'var(--text-muted)' }}>No content found</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{searchQuery ? 'Try a different search term' : 'Add some content first'}</p>
            </div>
          </Card>
        )}
      </div>

      {selected && (
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            <button
              onClick={clearSelected}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2 py-1 -mt-2 w-fit"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to List
            </button>
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex-1">
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle()
                          if (e.key === 'Escape') setEditingTitle(false)
                        }}
                      />
                      <button
                        onClick={handleSaveTitle}
                        className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                        style={{ background: 'var(--accent)' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTitle(false)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.title?.length > 30 ? selected.title.slice(0, 30) + '...' : selected.title}</h3>
                      <button
                        onClick={handleEditTitle}
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                        title="Edit title"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>{selected.brand_name}</span>
                    <PlatformLogo platform={selected.platform} size={16} />
                    <Badge variant="primary" size="sm">{selected.goal}</Badge>
                    <Badge variant="warning" size="sm">{selected.genre}</Badge>
                  </div>
                </div>
                <button onClick={clearSelected}
                  className="p-1.5 rounded-lg transition-colors text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  Change
                </button>
              </div>
              <div className="px-4 py-3 flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Published: {formatDate(selected.publish_date)}</span>
                {selected.post_url && (
                  <a href={selected.post_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline" style={{ color: 'var(--accent)' }}>
                    <ExternalLink className="w-3 h-3" /> Open URL
                  </a>
                )}
              </div>
            </Card>

            {metrics.length > 0 && (
              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <BarChart3 className="w-4 h-4" /> Latest Snapshot
                  </h4>
                </div>
                <div className="p-4">
                  {(() => {
                    const latest = metrics[0]
                    const prev = metrics[1]
                    const er = latest.views > 0 ? ((latest.likes||0)+(latest.comments||0)+(latest.shares||0)+(latest.saves||0))/latest.views*100 : 0
                    const prevEr = prev?.views > 0 ? ((prev.likes||0)+(prev.comments||0)+(prev.shares||0)+(prev.saves||0))/prev.views*100 : null
                    const erDiff = prevEr != null ? (er - prevEr).toFixed(1) : null
                    return (
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>ER Score</p>
                          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{er.toFixed(1)}</p>
                          {erDiff != null && (
                            <span className={`text-[10px] font-medium flex items-center justify-center gap-0.5 ${erDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {erDiff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {erDiff >= 0 ? '+' : ''}{erDiff}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Views</p>
                          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(latest.views||0)}</p>
                          {prev != null && (
                            <span className={`text-[10px] font-medium ${(latest.views||0) >= (prev.views||0) ? 'text-green-500' : 'text-red-500'}`}>
                              {(latest.views||0) >= (prev.views||0) ? '+' : ''}{formatNumber((latest.views||0)-(prev.views||0))}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Likes</p>
                          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(latest.likes||0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Comments</p>
                          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatNumber(latest.comments||0)}</p>
                        </div>
                      </div>
                    )
                  })()}
                  <p className="text-[10px] mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(latest.capture_date)} — ER = (likes + comments + shares + saves) / views × 100
                  </p>
                </div>
              </Card>
            )}

            <div>
              {showForm ? (
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <CameraIcon className="w-4 h-4" /> New Snapshot
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                  </div>
                  <form onSubmit={submitSnapshot} className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {['views', 'likes', 'comments', 'shares', 'reach', 'saves'].map(f => (
                        <div key={f}>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                          <input type="number" placeholder="0" value={snapshot[f]} onChange={handleSnapshotChange(f)}
                            className="w-full px-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Followers</label>
                        <input type="number" placeholder="Optional" value={snapshot.followers} onChange={handleSnapshotChange('followers')}
                          className="w-full px-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Watch Time (s)</label>
                        <input type="number" placeholder="Optional" value={snapshot.watch_time} onChange={handleSnapshotChange('watch_time')}
                          className="w-full px-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Retention %</label>
                        <input type="number" step="0.1" min="0" max="100" placeholder="0-100" value={snapshot.retention} onChange={handleSnapshotChange('retention')}
                          className="w-full px-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Capture Date</label>
                        <input type="date" value={snapshot.capture_date} onChange={handleSnapshotChange('capture_date')}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Time</label>
                        <input type="time" value={snapshot.capture_time} onChange={handleSnapshotChange('capture_time')}
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                          style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                    <div
                      ref={dropRef}
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={e => { e.preventDefault(); setDragging(false); processOcrFile(e.dataTransfer.files[0]) }}
                      onClick={() => document.getElementById('ocrFileInput')?.click()}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                      style={{
                        background: dragging ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: dragging ? '#fff' : 'var(--text-primary)',
                        border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-color)'}`,
                        minHeight: 48,
                      }}
                    >
                      <input
                        id="ocrFileInput"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { processOcrFile(e.target.files?.[0]); e.target.value = '' }}
                      />
                      {ocrLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> OCR Processing...</>
                      ) : (
                        <><ImageIcon className="w-4 h-4" /> Drop / Paste / Klik upload screenshot</>
                      )}
                    </div>
                      <Button type="submit" variant="primary" loading={saving}>
                        <CameraIcon className="w-4 h-4" /> Save Snapshot
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4" /> Add Snapshot
                  </Button>
                  <span
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                      title="Hanya tersedia di desktop app"
                    >
                      <Zap className="w-4 h-4" />
                      Auto Update
                    </span>
                </div>
              )}

            </div>

            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Metric History</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({metrics.length} snapshots)</span>
                </div>
                {latestDate && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Last updated: {formatDate(latestDate)}
                  </span>
                )}
              </div>

              <div className="p-4">
                <GrowthMiniChart data={metrics} />

                {loadingMetrics ? (
                  <div className="flex items-center justify-center h-32"><LoaderIcon size={20} className="animate-spin" /></div>
                ) : metrics.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--text-dim)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No snapshots yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Click &quot;Add Snapshot&quot; to record the first metrics</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                        <tr>
                          {historyColumns.map(col => (
                            <th key={col.key} className={`px-3 py-2.5 text-left font-medium uppercase tracking-wider text-[10px] ${col.className || ''}`}
                              style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                        {metrics.map((m, idx) => (
                          <tr key={m.id} className="transition-colors text-xs"
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {historyColumns.map(col => (
                              <td key={col.key} className={`px-3 py-2.5 ${col.className || ''}`} style={{ color: 'var(--text-primary)' }}>
                                {col.render ? col.render(m[col.key], m, idx) : m[col.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="w-[300px] flex-shrink-0 hidden lg:block">
            <div className="sticky top-6" style={{ position: 'sticky', top: '24px' }}>
              <EmbedPreview content={selected} />
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showScrapeConfirm}
        onClose={() => setShowScrapeConfirm(false)}
        title="Update All Content"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Update snapshot semua konten? Proses ini bisa memakan waktu beberapa menit.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowScrapeConfirm(false)}>Batal</Button>
            <Button variant="primary" onClick={handleScrapeAll} loading={scrapingAll}>Mulai</Button>
          </div>
        </div>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal
        isOpen={passwordModal.show}
        onClose={() => { setPasswordModal({ show: false, type: null, id: null, title: '' }); setPasswordInput(''); setPasswordError('') }}
        title="Konfirmasi Password"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
            <Lock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Tindakan ini tidak dapat dikembalikan</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Masukkan password untuk melanjutkan
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError('') }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              style={{ background: 'var(--bg-input)', borderColor: passwordError ? 'var(--danger)' : 'var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Masukkan password"
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordConfirm() }}
              autoFocus
            />
            {passwordError && <p className="text-xs mt-1" style={{ color: 'var(--danger)' }}>{passwordError}</p>}
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => { setPasswordModal({ show: false, type: null, id: null, title: '' }); setPasswordInput(''); setPasswordError('') }}>Batal</Button>
            <Button variant="danger" onClick={handlePasswordConfirm}>
              <Trash2 className="w-4 h-4" /> Hapus
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showImportCsv} onClose={() => { setShowImportCsv(false); setImportCsvText(''); setImportCsvResult(null) }}
        title="Import Metric CSV" size="lg">
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Paste data CSV dengan format: <code className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>publish_id,views,likes,comments,shares,reach,saves,capture_date</code>
          </p>
          <textarea value={importCsvText} onChange={(e) => setImportCsvText(e.target.value)}
            className="w-full h-40 p-3 border rounded-lg text-sm font-mono"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            placeholder={'publish_id,views,likes,comments,shares,reach,saves,capture_date\npmmxaqz79vnqt4u,1500,85,12,8,700,30,2026-06-13\n...'} />
          {importCsvResult && (
            <div className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{
              background: importCsvResult.failed > 0 ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
              color: importCsvResult.failed > 0 ? 'var(--warning)' : '#22c55e'
            }}>
              {importCsvResult.success} berhasil
              {importCsvResult.failed > 0 && `, ${importCsvResult.failed} gagal`}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => { setShowImportCsv(false); setImportCsvText(''); setImportCsvResult(null) }}>Batal</Button>
            <Button variant="primary" onClick={handleImportCsv} loading={importingCsv}>Import</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
