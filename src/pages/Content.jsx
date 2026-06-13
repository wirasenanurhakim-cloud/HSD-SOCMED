import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, RefreshCw, FileText, RefreshCw as ReScrape, Check, Minus, ChevronDown, Lock, X } from 'lucide-react'
import { Button, Input, Select, Modal, Card, Badge, Loader, ErrorMessage, Pagination } from '../components'
import { PLATFORM, ORIGIN, STATUS } from '../lib/constants'
import { useToast } from '../hooks/useToast'
import { pb } from '../lib/pb'

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatDate(d) {
  if (!d) return '-'
  try {
    const dateStr = typeof d === 'string' ? d.slice(0, 10) : d
    const [y, m, day] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return d }
}

const DEFAULT_GOALS = ['SELLING', 'EDUCATION', 'ENGAGEMENT', 'AWARENESS', 'TRUST']
const DEFAULT_GENRES = ['POV', 'PRODUCT_KNOWLEDGE', 'MARAH_MARAH', 'STORYTELLING', 'TIPS', 'TESTIMONI', 'TUTORIAL']

const STATUS_EMOJI = {
  PUBLISHED: '✅ Published',
  DRAFT: '📝 Draft',
  ARCHIVED: '🗃️ Archived',
  PLANNED: '🗓️ Planned',
  DONE: '✅ Done',
  CANCELLED: '❌ Cancelled',
}

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

function detectPlatform(url) {
  if (url.includes('tiktok.com')) return 'TIKTOK'
  if (url.includes('instagram.com')) return 'INSTAGRAM'
  return ''
}

const emptyForm = {
  brand_id: '', title: '', goal: '', genre: '', platform: '', origin: 'ORIGINAL',
  publish_date: new Date().toISOString().slice(0, 10), post_url: '', duration: '', status: 'PUBLISHED',
  views: '', likes: '', comments: '', shares: '', reach: '', saves: '', followers: ''
}

const emptyBulkForm = {
  brand_id: '', goal: '', genre: '', platform: '', origin: '',
  publish_date: '', duration: '', status: '',
  views: '', likes: '', comments: '', shares: '', reach: '', saves: '', followers: ''
}

function AddContentForm({ form, setForm, brands, onSubmit, onClose, loading, goals, genres }) {
  const handleChange = (field) => (e) => {
    const val = e.target.value
    if (field === 'post_url') {
      const platform = detectPlatform(val)
      setForm(prev => ({ ...prev, post_url: val, platform: platform || prev.platform }))
    } else {
      setForm(prev => ({ ...prev, [field]: val }))
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Post URL *</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={form.post_url}
            onChange={handleChange('post_url')}
            placeholder="Paste TikTok atau Instagram URL..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            required
          />
          {form.platform && (
            <PlatformLogo platform={form.platform} size={22} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Platform *"
          options={PLATFORM.map(p => ({ value: p, label: p }))}
          placeholder="Auto-detect from URL"
          value={form.platform}
          onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
          required
        />
        <Select
          label="Brand *"
          options={brands.map(b => ({ value: b.id, label: b.name }))}
          placeholder="Select brand"
          value={form.brand_id}
          onChange={e => setForm(prev => ({ ...prev, brand_id: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select label="Goal *" options={(goals || []).map(g => ({ value: g, label: g }))} placeholder="Select goal" value={form.goal} onChange={e => setForm(prev => ({ ...prev, goal: e.target.value }))} required />
        <Select label="Genre *" options={(genres || []).map(g => ({ value: g, label: g }))} placeholder="Select genre" value={form.genre} onChange={e => setForm(prev => ({ ...prev, genre: e.target.value }))} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Publish Date *" type="date" value={form.publish_date} onChange={e => setForm(prev => ({ ...prev, publish_date: e.target.value }))} required />
        <Select label="Origin" options={ORIGIN.map(o => ({ value: o, label: o }))} placeholder="Select origin" value={form.origin} onChange={e => setForm(prev => ({ ...prev, origin: e.target.value }))} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Duration (seconds)" type="number" min="0" placeholder="e.g. 60" value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))} />
        <Select label="Status" options={STATUS.map(s => ({ value: s, label: STATUS_EMOJI[s] || s }))} placeholder="Select status" value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))} />
      </div>

      <div>
        <Input label="Title" placeholder="Content title" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))} />
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Kosongkan untuk auto-detect dari URL</p>
      </div>

      {/* Social Media Metrics */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Social Media Metrics (Optional)</p>
        <div className="grid grid-cols-4 gap-3">
          <Input label="Views" type="number" min="0" placeholder="0" value={form.views} onChange={e => setForm(prev => ({ ...prev, views: e.target.value }))} />
          <Input label="Likes" type="number" min="0" placeholder="0" value={form.likes} onChange={e => setForm(prev => ({ ...prev, likes: e.target.value }))} />
          <Input label="Comments" type="number" min="0" placeholder="0" value={form.comments} onChange={e => setForm(prev => ({ ...prev, comments: e.target.value }))} />
          <Input label="Shares" type="number" min="0" placeholder="0" value={form.shares} onChange={e => setForm(prev => ({ ...prev, shares: e.target.value }))} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Input label="Reach" type="number" min="0" placeholder="0" value={form.reach} onChange={e => setForm(prev => ({ ...prev, reach: e.target.value }))} />
          <Input label="Saves" type="number" min="0" placeholder="0" value={form.saves} onChange={e => setForm(prev => ({ ...prev, saves: e.target.value }))} />
          <Input label="Followers" type="number" min="0" placeholder="0" value={form.followers} onChange={e => setForm(prev => ({ ...prev, followers: e.target.value }))} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}>Add Content</Button>
      </div>
    </form>
  )
}

function EditContentForm({ form, setForm, brands, onSubmit, onClose, loading, goals, genres }) {
  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Brand *"
          options={brands.map(b => ({ value: b.id, label: b.name }))}
          placeholder="Select brand"
          value={form.brand_id}
          onChange={handleChange('brand_id')}
          required
        />
        <Select
          label="Platform *"
          options={PLATFORM.map(p => ({ value: p, label: p }))}
          placeholder="Select platform"
          value={form.platform}
          onChange={handleChange('platform')}
          required
        />
      </div>
      <div>
        <Input label="Title *" placeholder="Content title" value={form.title} onChange={handleChange('title')} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Goal *" options={(goals || []).map(g => ({ value: g, label: g }))} placeholder="Select goal" value={form.goal} onChange={handleChange('goal')} required />
        <Select label="Genre *" options={(genres || []).map(g => ({ value: g, label: g }))} placeholder="Select genre" value={form.genre} onChange={handleChange('genre')} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Publish Date *" type="date" value={form.publish_date} onChange={handleChange('publish_date')} required />
        <Select label="Origin" options={ORIGIN.map(o => ({ value: o, label: o }))} placeholder="Select origin" value={form.origin} onChange={handleChange('origin')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Duration (seconds)" type="number" min="0" placeholder="e.g. 60" value={form.duration} onChange={handleChange('duration')} />
        <Select label="Status" options={STATUS.map(s => ({ value: s, label: STATUS_EMOJI[s] || s }))} placeholder="Select status" value={form.status} onChange={handleChange('status')} />
      </div>
      <div>
        <Input label="Post URL" type="url" placeholder="https://tiktok.com/..." value={form.post_url} onChange={handleChange('post_url')} />
      </div>

      {/* Social Media Metrics */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Social Media Metrics (Optional)</p>
        <div className="grid grid-cols-4 gap-3">
          <Input label="Views" type="number" min="0" placeholder="0" value={form.views} onChange={handleChange('views')} />
          <Input label="Likes" type="number" min="0" placeholder="0" value={form.likes} onChange={handleChange('likes')} />
          <Input label="Comments" type="number" min="0" placeholder="0" value={form.comments} onChange={handleChange('comments')} />
          <Input label="Shares" type="number" min="0" placeholder="0" value={form.shares} onChange={handleChange('shares')} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Input label="Reach" type="number" min="0" placeholder="0" value={form.reach} onChange={handleChange('reach')} />
          <Input label="Saves" type="number" min="0" placeholder="0" value={form.saves} onChange={handleChange('saves')} />
          <Input label="Followers" type="number" min="0" placeholder="0" value={form.followers} onChange={handleChange('followers')} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading}>
          Update Content
        </Button>
      </div>
    </form>
  )
}

function BulkEditForm({ form, setForm, brands, onSubmit, onClose, loading, goals, genres, selectedCount }) {
  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const hasValue = Object.values(form).some(v => v !== '')
  const filledCount = Object.values(form).filter(v => v !== '').length

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Edit <strong className="font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCount} content</strong>. Kosongkan field yang tidak ingin diubah.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Brand"
          options={[{ value: '', label: '-- No Change --' }, ...brands.map(b => ({ value: b.id, label: b.name }))]}
          placeholder="No Change"
          value={form.brand_id}
          onChange={handleChange('brand_id')}
        />
        <Select
          label="Platform"
          options={[{ value: '', label: '-- No Change --' }, ...PLATFORM.map(p => ({ value: p, label: p }))]}
          placeholder="No Change"
          value={form.platform}
          onChange={handleChange('platform')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Goal"
          options={[{ value: '', label: '-- No Change --' }, ...(goals || []).map(g => ({ value: g, label: g }))]}
          placeholder="No Change"
          value={form.goal}
          onChange={handleChange('goal')}
        />
        <Select
          label="Genre"
          options={[{ value: '', label: '-- No Change --' }, ...(genres || []).map(g => ({ value: g, label: g }))]}
          placeholder="No Change"
          value={form.genre}
          onChange={handleChange('genre')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Status"
          options={[{ value: '', label: '-- No Change --' }, ...STATUS.map(s => ({ value: s, label: STATUS_EMOJI[s] || s }))]}
          placeholder="No Change"
          value={form.status}
          onChange={handleChange('status')}
        />
        <Select
          label="Origin"
          options={[{ value: '', label: '-- No Change --' }, ...ORIGIN.map(o => ({ value: o, label: o }))]}
          placeholder="No Change"
          value={form.origin}
          onChange={handleChange('origin')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Publish Date"
          type="date"
          value={form.publish_date}
          onChange={handleChange('publish_date')}
          placeholder=""
        />
        <Input
          label="Duration (seconds)"
          type="number"
          min="0"
          value={form.duration}
          onChange={handleChange('duration')}
          placeholder=""
        />
      </div>

      {hasValue && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.3)' }}>
          <Check className="w-4 h-4" style={{ color: '#d4a843' }} />
          <span className="text-xs" style={{ color: '#d4a843' }}>{filledCount} field akan diupdate</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={loading} disabled={!hasValue}>
          Apply to {selectedCount} Content
        </Button>
      </div>
    </form>
  )
}

export default function Content() {
  // Page data cache - per query (page + filters + search)
  const CACHE_KEY = `sa_content_cache_${page}_${search}_${filters.brand_id}_${filters.platform}_${filters.goal}_${filters.genre}`
  const CACHE_TTL = 180000 // 3 minutes

  function loadContentCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw)
      if (Date.now() - data.ts < CACHE_TTL) return data
    } catch {}
    return null
  }

  function saveContentCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }))
    } catch {}
  }

  const cached = loadContentCache()

  const [contents, setContents] = useState(cached?.contents || [])
  const [totalCount, setTotalCount] = useState(cached?.totalCount || 0)
  const [page, setPage] = useState(cached?.page || 1)
  const pageSize = 10
  const [brands, setBrands] = useState(cached?.brands || [])
  // loading = true only on very first visit with no data
  // refreshing = true when doing background refresh with visible data
  const [loading, setLoading] = useState(!cached?.contents)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState(cached?.search || '')
  const [filters, setFilters] = useState(cached?.filters || { brand_id: '', platform: '', goal: '', genre: '' })
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [scrapeResult, setScrapeResult] = useState(null)
  const [showTitlePrompt, setShowTitlePrompt] = useState(false)
  const [pendingAssetId, setPendingAssetId] = useState(null)
  const [promptTitle, setPromptTitle] = useState('')
  const [promptSaving, setPromptSaving] = useState(false)
  const [rescrapping, setRescrapping] = useState({})
  const { showToast } = useToast()

  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [genres, setGenres] = useState(DEFAULT_GENRES)

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [bulkForm, setBulkForm] = useState(emptyBulkForm)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Password protection state
  const [passwordModal, setPasswordModal] = useState({ show: false, type: null, id: null, ids: [] })
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: 'publish_date', direction: 'desc' })
  const [columnFilters, setColumnFilters] = useState({
    brand_name: '',
    platform: '',
    status: '',
    publish_date_start: '',
    publish_date_end: '',
    title: '',
    goal: '',
    genre: '',
    views_min: '',
    views_max: '',
    likes_min: '',
    likes_max: '',
  })

  const handleColumnFilterChange = (key) => (e) => {
    const value = e.target.value
    setColumnFilters(prev => ({ ...prev, [key]: value }))
    // Auto-sort when filter changes
    if (value) {
      // Sort by the column being filtered
      setSortConfig({ key, direction: 'asc' })
    }
  }

  const handleClearColumnFilters = () => {
    setColumnFilters({
      brand_name: '',
      platform: '',
      status: '',
      publish_date_start: '',
      publish_date_end: '',
      title: '',
      goal: '',
      genre: '',
      views_min: '',
      views_max: '',
      likes_min: '',
      likes_max: '',
    })
    setSortConfig({ key: 'publish_date', direction: 'desc' })
  }

  const hasColumnFilters = Object.values(columnFilters).some(v => v !== '')

  // Filter and sort contents
  const filteredContents = contents.filter(row => {
    if (columnFilters.brand_name && !row.brand_name?.toLowerCase().includes(columnFilters.brand_name.toLowerCase())) return false
    if (columnFilters.platform && row.platform !== columnFilters.platform) return false
    if (columnFilters.status && row.status !== columnFilters.status) return false
    if (columnFilters.title && !row.title?.toLowerCase().includes(columnFilters.title.toLowerCase())) return false
    if (columnFilters.goal && row.goal !== columnFilters.goal) return false
    if (columnFilters.genre && row.genre !== columnFilters.genre) return false
    if (columnFilters.publish_date_start && row.publish_date < columnFilters.publish_date_start) return false
    if (columnFilters.publish_date_end && row.publish_date > columnFilters.publish_date_end) return false
    if (columnFilters.views_min && (row.views || 0) < parseInt(columnFilters.views_min)) return false
    if (columnFilters.views_max && (row.views || 0) > parseInt(columnFilters.views_max)) return false
    if (columnFilters.likes_min && (row.likes || 0) < parseInt(columnFilters.likes_min)) return false
    if (columnFilters.likes_max && (row.likes || 0) > parseInt(columnFilters.likes_max)) return false
    return true
  }).sort((a, b) => {
    const { key, direction } = sortConfig
    let aVal = a[key]
    let bVal = b[key]
    
    // Handle null/undefined
    if (aVal == null) aVal = ''
    if (bVal == null) bVal = ''
    
    // Handle dates
    if (key === 'publish_date') {
      aVal = aVal || ''
      bVal = bVal || ''
    }
    
    // Numeric sort
    if (['views', 'likes', 'comments', 'shares', 'reach'].includes(key)) {
      aVal = parseInt(aVal) || 0
      bVal = parseInt(bVal) || 0
    }
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handlePasswordConfirm = () => {
    if (passwordInput !== 'admin12345') {
      setPasswordError('Password salah')
      return
    }
    setPasswordError('')
    setPasswordInput('')
    
    if (passwordModal.type === 'delete_single') {
      confirmDelete(passwordModal.id)
    } else if (passwordModal.type === 'delete_bulk') {
      confirmBulkDelete()
    }
    setPasswordModal({ show: false, type: null, id: null, ids: [] })
  }

  const openPasswordModal = (type, id = null, ids = []) => {
    setPasswordModal({ show: true, type, id, ids })
    setPasswordInput('')
    setPasswordError('')
  }

  const loadBrands = useCallback(async () => {
    try {
      const data = await pb.collection('brands').getFullList({ requestKey: null })
      setBrands(data)
      return data
    } catch (err) {
      console.error('[PB] brands', err)
      return []
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const [goalsRow, genresRow] = await Promise.all([
        pb.collection('settings').getFirstListItem('key = "custom_goals"', { requestKey: null }).catch(() => null),
        pb.collection('settings').getFirstListItem('key = "custom_genres"', { requestKey: null }).catch(() => null),
      ])
      if (goalsRow?.value) {
        try { setGoals(JSON.parse(goalsRow.value)) } catch { /* fallback to default */ }
      }
      if (genresRow?.value) {
        try { setGenres(JSON.parse(genresRow.value)) } catch { /* fallback to default */ }
      }
    } catch (err) {
      console.error('[PB] settings', err)
    }
  }, [])

  const fetchData = useCallback(async (opts = {}) => {
    const silent = opts.silent
    if (!silent) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    const brandList = await loadBrands()
    const brandMap = Object.fromEntries(brandList.map(b => [b.id, b.name]))

    try {
      const filterParts = []
      if (filters.brand_id) filterParts.push(`brand = '${filters.brand_id}'`)
      if (filters.goal) filterParts.push(`goal = '${filters.goal}'`)
      if (filters.genre) filterParts.push(`genre = '${filters.genre}'`)
      if (search.trim()) filterParts.push(`title ~ '${search.trim()}'`)

      let assetIds = []
      let result

      if (filters.platform) {
        const platformPublishes = await pb.collection('publish_instances').getFullList({
          filter: `platform = '${filters.platform}'`,
          fields: 'asset',
          requestKey: null,
        })
        assetIds = [...new Set(platformPublishes.map(p => p.asset))]
        if (assetIds.length === 0) {
          setContents([])
          setTotalCount(0)
          setLoading(false)
          return
        }
        const assetFilter = assetIds.map(id => `id = '${id}'`).join(' || ')
        filterParts.push(`(${assetFilter})`)
      }

      const contentFilter = filterParts.length > 0 ? filterParts.join(' && ') : undefined

      let listOptions = { sort: '-id' }
      if (contentFilter) listOptions.filter = contentFilter
      try {
        result = await pb.collection('content_assets').getList(page, pageSize, { ...listOptions, requestKey: null })
      } catch (err) {
        console.warn('[PB] sort=-id failed, retrying without sort:', err)
        const { sort, ...fallbackOpts } = listOptions
        result = await pb.collection('content_assets').getList(page, pageSize, { ...fallbackOpts, requestKey: null })
      }

      const fetchedAssetIds = result.items.map(a => a.id)

      let publishes = []
      if (fetchedAssetIds.length > 0) {
        try {
          const pubFilter = fetchedAssetIds.map(id => `asset = '${id}'`).join(' || ')
          publishes = await pb.collection('publish_instances').getFullList({
            filter: pubFilter,
            sort: '-publish_date',
            requestKey: null,
          })
        } catch (err) {
          console.error('[PB] publishes', err)
        }
      }

      const latestPublish = {}
      for (const p of publishes) {
        if (!latestPublish[p.asset] || p.publish_date > latestPublish[p.asset].publish_date) {
          latestPublish[p.asset] = p
        }
      }

      const publishIds = Object.values(latestPublish).map(p => p.id)
      const latestMetrics = {}
      if (publishIds.length > 0) {
        try {
          const metricFilter = publishIds.map(id => `publish = '${id}'`).join(' || ')
          const allMetrics = await pb.collection('metric_history').getFullList({
            filter: metricFilter,
            sort: '-capture_date',
            requestKey: null,
          })
          for (const m of allMetrics) {
            if (!latestMetrics[m.publish]) {
              latestMetrics[m.publish] = m
            }
          }
        } catch (err) {
          console.error('[PB] metrics', err)
        }
      }

      const data = result.items.map(asset => {
        const pub = latestPublish[asset.id]
        const metric = pub ? latestMetrics[pub.id] : null
        return {
          id: asset.id,
          brand_id: asset.brand,
          brand_name: brandMap[asset.brand] || '-',
          title: asset.title || '',
          goal: asset.goal || '',
          genre: asset.genre || '',
          duration: asset.duration,
          status: asset.status || '',
          platform: pub?.platform || '',
          publish_date: pub?.publish_date || '',
          post_url: pub?.post_url || '',
          origin: pub?.origin || '',
          publish_id: pub?.id || null,
          views: metric?.views || 0,
          likes: metric?.likes || 0,
          comments: metric?.comments || 0,
          shares: metric?.shares || 0,
          reach: metric?.reach || 0,
          saves: metric?.saves || 0,
          retention: metric?.retention || null,
        }
      })

      setContents(data)
      setTotalCount(result.totalItems)
      // Save to cache for next visit
      saveContentCache({ contents: data, totalCount: result.totalItems, page, brands: brandList, search, filters })
    } catch (err) {
      console.error('[PB] content', err)
      setError(err.message || 'Failed to load content')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, search, page, loadBrands])

  // On mount: show cached data instantly, refresh in background
  useEffect(() => { fetchData({ silent: !!cached?.contents }) }, [fetchData])

  useEffect(() => { loadSettings() }, [loadSettings])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [contents])

  const handleFilterChange = (field) => (e) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ brand_id: '', platform: '', goal: '', genre: '' })
    setSearch('')
    setPage(1)
  }

  const openAddModal = () => {
    setForm(emptyForm)
    setEditId(null)
    setShowModal(true)
  }

  const openEditModal = (row) => {
    setForm({
      brand_id: String(row.brand_id),
      title: row.title,
      goal: row.goal,
      genre: row.genre,
      platform: row.platform || 'TIKTOK',
      origin: row.origin || 'ORIGINAL',
      publish_date: row.publish_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      post_url: row.post_url || '',
      duration: row.duration != null ? String(row.duration) : '',
      status: row.status || 'PUBLISHED',
    })
    setEditId(row.id)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editId) {
        await pb.collection('content_assets').update(editId, {
          brand: form.brand_id,
          title: form.title,
          goal: form.goal,
          genre: form.genre,
          duration: form.duration ? Number(form.duration) : null,
          status: form.status,
        })

        const existingPublishes = await pb.collection('publish_instances').getFullList({
          filter: `asset = '${editId}'`,
          requestKey: null,
        })
        if (existingPublishes.length > 0) {
          await pb.collection('publish_instances').update(existingPublishes[0].id, {
            platform: form.platform,
            publish_date: form.publish_date,
            post_url: form.post_url || null,
            origin: form.origin || 'ORIGINAL',
          })
        }

        setShowModal(false)
        await fetchData()
        showToast('Konten berhasil diperbarui', 'success')
        return
      }

      const asset = await pb.collection('content_assets').create({
        brand: form.brand_id,
        title: form.title.trim() || 'Loading...',
        goal: form.goal,
        genre: form.genre,
        duration: form.duration ? Number(form.duration) : null,
        status: form.status || 'PUBLISHED',
      })

      const publish = await pb.collection('publish_instances').create({
        asset: asset.id,
        platform: form.platform,
        origin: form.origin || 'ORIGINAL',
        publish_date: form.publish_date,
        post_url: form.post_url || null,
      })

      const asset_id = asset.id
      const publish_id = publish.id

      if (!form.post_url) {
        setShowModal(false)
        await fetchData()
        showToast('Konten berhasil ditambah', 'success')
        return
      }

      showToast('⏳ Menyimpan data...', 'info')

      // Scraping not available in web version — prompt for title
      if (!form.title || form.title === 'Loading...') {
        setPendingAssetId(asset_id)
        setPromptTitle('')
        setShowTitlePrompt(true)
        setScrapeResult(null)
      } else {
        showToast('✅ Konten ditambah (metrics perlu diisi manual)', 'success')
      }

      setShowModal(false)
      await fetchData()
    } catch (err) {
      setError(err.message || 'Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFallbackTitle = async () => {
    if (!promptTitle.trim()) return
    setPromptSaving(true)
    try {
      await pb.collection('content_assets').update(pendingAssetId, {
        title: promptTitle.trim(),
        goal: form.goal,
        genre: form.genre,
        duration: form.duration ? Number(form.duration) : null,
        status: form.status,
      })
      setShowTitlePrompt(false)
      setPendingAssetId(null)
      if (scrapeResult?.success) {
        showToast(`✅ Konten ditambah: ${scrapeResult.views} views, ${scrapeResult.likes} likes`, 'success')
      } else {
        showToast('✅ Konten ditambah (metrics perlu diisi manual)', 'success')
      }
      await fetchData()
    } catch (err) {
      setError(err.message || 'Failed to update title')
    } finally {
      setPromptSaving(false)
    }
  }

  const handleReScrape = async (row) => {
    if (!row.publish_id || !row.post_url) return
    setRescrapping(prev => ({ ...prev, [row.id]: true }))
    try {
      await new Promise(r => setTimeout(r, 500))
      showToast('❌ Scraping tidak tersedia', 'danger')
      await fetchData()
    } catch (err) {
      showToast(`❌ ${err.message}`, 'danger')
    } finally {
      setRescrapping(prev => ({ ...prev, [row.id]: false }))
    }
  }

  const handleDelete = async (id) => {
    // Open password modal instead of direct delete
    openPasswordModal('delete_single', id)
  }

  const confirmDelete = async (id) => {
    setError(null)
    try {
      const publishes = await pb.collection('publish_instances').getFullList({
        filter: `asset = '${id}'`,
        requestKey: null,
      })
      for (const pub of publishes) {
        const metrics = await pb.collection('metric_history').getFullList({
          filter: `publish = '${pub.id}'`,
          requestKey: null,
        })
        for (const m of metrics) {
          await pb.collection('metric_history').delete(m.id)
        }
        await pb.collection('publish_instances').delete(pub.id)
      }
      await pb.collection('content_assets').delete(id)
      setDeleteConfirm(null)
      await fetchData()
      showToast('Konten berhasil dihapus', 'success')
    } catch (err) {
      setError(err.message || 'Failed to delete content')
    }
  }

  // === BULK ACTIONS ===
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contents.map(c => c.id)))
    }
  }

  const isAllSelected = contents.length > 0 && selectedIds.size === contents.length
  const isPartial = selectedIds.size > 0 && selectedIds.size < contents.length

  const handleBulkEdit = async (e) => {
    e.preventDefault()
    setBulkSaving(true)
    try {
      const assetPatch = {}
      if (bulkForm.brand_id) assetPatch.brand = bulkForm.brand_id
      if (bulkForm.goal) assetPatch.goal = bulkForm.goal
      if (bulkForm.genre) assetPatch.genre = bulkForm.genre
      if (bulkForm.status) assetPatch.status = bulkForm.status
      if (bulkForm.duration !== '') assetPatch.duration = bulkForm.duration ? Number(bulkForm.duration) : null

      const publishPatch = {}
      if (bulkForm.platform) publishPatch.platform = bulkForm.platform
      if (bulkForm.origin) publishPatch.origin = bulkForm.origin
      if (bulkForm.publish_date) publishPatch.publish_date = bulkForm.publish_date

      const ids = Array.from(selectedIds)
      for (const id of ids) {
        if (Object.keys(assetPatch).length > 0) {
          await pb.collection('content_assets').update(id, assetPatch)
        }
        if (Object.keys(publishPatch).length > 0) {
          const pubs = await pb.collection('publish_instances').getFullList({
            filter: `asset = '${id}'`,
            requestKey: null,
          })
          for (const pub of pubs) {
            await pb.collection('publish_instances').update(pub.id, publishPatch)
          }
        }
      }

      setSelectedIds(new Set())
      setShowBulkEditModal(false)
      setBulkForm(emptyBulkForm)
      await fetchData()
      showToast(`${Object.keys(assetPatch).length + Object.keys(publishPatch).length} field diupdate di ${ids.length} content`, 'success')
    } catch (err) {
      setError(err.message || 'Failed to bulk update')
    } finally {
      setBulkSaving(false)
    }
  }

  const handleBulkDelete = async () => {
    // Open password modal instead of direct delete
    openPasswordModal('delete_bulk', null, Array.from(selectedIds))
  }

  const confirmBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      const ids = Array.from(passwordModal.ids)
      for (const id of ids) {
        const publishes = await pb.collection('publish_instances').getFullList({
          filter: `asset = '${id}'`,
          requestKey: null,
        })
        for (const pub of publishes) {
          const metrics = await pb.collection('metric_history').getFullList({
            filter: `publish = '${pub.id}'`,
            requestKey: null,
          })
          for (const m of metrics) {
            await pb.collection('metric_history').delete(m.id)
          }
          await pb.collection('publish_instances').delete(pub.id)
        }
        await pb.collection('content_assets').delete(id)
      }
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      await fetchData()
      showToast('Konten terpilih berhasil dihapus', 'success')
    } catch (err) {
      setError(err.message || 'Failed to bulk delete')
    } finally {
      setBulkDeleting(false)
    }
  }

  const columns = [
    { key: 'brand_name', label: 'Brand', minWidth: '110px' },
    { key: 'platform', label: 'Platform', minWidth: '90px', render: (v) => <PlatformLogo platform={v} /> },
    { key: 'status', label: 'Status', minWidth: '90px', render: (v) => {
        const map = { PUBLISHED: 'success', DRAFT: 'warning', ARCHIVED: 'default' }
        const colorMap = { PUBLISHED: '#22c55e', DRAFT: '#f59e0b', ARCHIVED: '#6b7280' }
        return <Badge variant={map[v] || 'default'} size="sm" style={{ color: colorMap[v] }}>{STATUS_EMOJI[v] || v || '-'}</Badge>
      }
    },
    { key: 'publish_date', label: 'Date', minWidth: '100px', render: (v) => formatDate(v) },
    { key: 'title', label: 'Title', minWidth: '200px', render: (v) => v?.length > 30 ? v.slice(0, 30) + '...' : v },
    { key: 'goal', label: 'Goal', minWidth: '110px', render: (v) => <Badge variant="primary" size="sm">{v}</Badge> },
    { key: 'genre', label: 'Genre', minWidth: '130px', render: (v) => <Badge variant="warning" size="sm">{v}</Badge> },
    { key: 'views', label: 'Views', minWidth: '70px', render: (v) => formatNumber(v), className: 'text-right font-mono' },
    { key: 'likes', label: 'Likes', minWidth: '60px', render: (v) => formatNumber(v), className: 'text-right font-mono' },
    { key: 'comments', label: 'Cmnts', minWidth: '60px', render: (v) => formatNumber(v), className: 'text-right font-mono' },
    { key: 'shares', label: 'Shares', minWidth: '60px', render: (v) => formatNumber(v), className: 'text-right font-mono' },
    { key: 'reach', label: 'Reach', minWidth: '70px', render: (v) => formatNumber(v), className: 'text-right font-mono' },
    { key: 'retention', label: 'Ret%', minWidth: '60px', render: (v) => v != null ? `${v.toFixed(1)}%` : '-', className: 'text-right font-mono' },
  ]

  const hasFilters = Object.values(filters).some(Boolean) || search.trim()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Input Content</h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => fetchData()} loading={refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="primary" size="sm" onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Content
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <Select clearable options={brands.map(b => ({ value: b.id, label: b.name }))} placeholder="All Brands" value={filters.brand_id} onChange={handleFilterChange('brand_id')} className="w-[140px]" />
          <Select clearable options={PLATFORM.map(p => ({ value: p, label: p }))} placeholder="All Platforms" value={filters.platform} onChange={handleFilterChange('platform')} className="w-[140px]" />
          <Select clearable options={goals.map(g => ({ value: g, label: g }))} placeholder="All Goals" value={filters.goal} onChange={handleFilterChange('goal')} className="w-[140px]" />
          <Select clearable options={genres.map(g => ({ value: g, label: g }))} placeholder="All Genres" value={filters.genre} onChange={handleFilterChange('genre')} className="w-[140px]" />
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>}
          {hasColumnFilters && (
            <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--accent)', color: 'white' }}>
              {filteredContents.length} filtered
            </span>
          )}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>{filteredContents.length} of {totalCount} content(s)</p>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#d4a843', color: '#fff' }}>
              {selectedIds.size}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {selectedIds.size} content selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setBulkForm(emptyBulkForm); setShowBulkEditModal(true) }}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Bulk Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openPasswordModal('delete_bulk', null, Array.from(selectedIds))}
              style={{ color: 'var(--danger)' }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <Minus className="w-3.5 h-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading && contents.length === 0 ? (
        <Card className="flex items-center justify-center h-64">
          <Loader size="lg" />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <tr>
                  <th className="px-3 py-3 text-center" style={{ minWidth: '40px' }}>
                    <button
                      onClick={toggleSelectAll}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                      style={{
                        background: isAllSelected ? '#d4a843' : isPartial ? 'rgba(212,168,67,0.3)' : 'transparent',
                        borderColor: isAllSelected || isPartial ? '#d4a843' : 'var(--border-color)',
                      }}
                    >
                      {isAllSelected && <Check className="w-3 h-3 text-white" />}
                      {isPartial && !isAllSelected && <Minus className="w-3 h-3" style={{ color: '#d4a843' }} />}
                    </button>
                  </th>
                  {columns.map(col => (
                    <th key={col.key} className={`px-3 py-3 text-left font-medium uppercase tracking-wider text-xs ${col.className || ''}`}
                      style={{ color: 'var(--text-secondary)', minWidth: col.minWidth }}>
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 hover:opacity-80"
                      >
                        {col.label}
                        {sortConfig.key === col.key && (
                          <ChevronDown className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium uppercase tracking-wider text-xs" style={{ color: 'var(--text-secondary)', minWidth: '110px' }}>Actions</th>
                </tr>
                {/* Filter Row */}
                <tr className="bg-[var(--bg-primary)]" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <th className="px-3 py-2"></th>
                  <th className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={columnFilters.brand_name}
                      onChange={handleColumnFilterChange('brand_name')}
                      className="w-full px-2 py-1 text-xs border rounded"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={columnFilters.platform}
                      onChange={handleColumnFilterChange('platform')}
                      className="w-full px-2 py-1 text-xs border rounded"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">All</option>
                      {PLATFORM.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={columnFilters.status}
                      onChange={handleColumnFilterChange('status')}
                      className="w-full px-2 py-1 text-xs border rounded"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">All</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="date"
                        value={columnFilters.publish_date_start}
                        onChange={handleColumnFilterChange('publish_date_start')}
                        className="w-full px-2 py-1 text-xs border rounded"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
                      <input
                        type="date"
                        value={columnFilters.publish_date_end}
                        onChange={handleColumnFilterChange('publish_date_end')}
                        className="w-full px-2 py-1 text-xs border rounded"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={columnFilters.title}
                      onChange={handleColumnFilterChange('title')}
                      className="w-full px-2 py-1 text-xs border rounded"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={columnFilters.goal}
                      onChange={handleColumnFilterChange('goal')}
                      className="w-full px-2 py-1 text-xs border rounded"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">All</option>
                      {goals.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <select
                      value={columnFilters.genre}
                      onChange={handleColumnFilterChange('genre')}
                      className="w-full px-2 py-1 text-xs border rounded"
                      style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    >
                      <option value="">All</option>
                      {genres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </th>
                  <th className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={columnFilters.views_min}
                        onChange={handleColumnFilterChange('views_min')}
                        className="w-full px-1 py-1 text-xs border rounded"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={columnFilters.likes_min}
                        onChange={handleColumnFilterChange('likes_min')}
                        className="w-full px-1 py-1 text-xs border rounded"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">
                    {hasColumnFilters && (
                      <button
                        onClick={handleClearColumnFilters}
                        className="w-full px-2 py-1 text-xs rounded transition-colors"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {filteredContents.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-6 py-20 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
                      <p className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>No content found</p>
                      <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-dim)' }}>
                        {hasColumnFilters ? 'Coba ubah filter' : 'Click <strong>+ Add Content</strong> to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredContents.map(row => (
                    <tr key={row.id} className="transition-colors" onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleSelect(row.id)}
                          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                          style={{
                            background: selectedIds.has(row.id) ? '#d4a843' : 'transparent',
                            borderColor: selectedIds.has(row.id) ? '#d4a843' : 'var(--border-color)',
                          }}
                        >
                          {selectedIds.has(row.id) && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                      {columns.map(col => (
                        <td key={col.key} className={`px-3 py-3 ${col.className || ''}`} style={{ color: col.className?.includes('text-right') ? 'var(--text-primary)' : 'inherit' }}>
                          {col.render ? col.render(row[col.key], row) : <span style={{ color: 'var(--text-primary)' }}>{row[col.key]}</span>}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.post_url && row.publish_id && (
                            <span
                              className="p-1.5 rounded-lg opacity-40 cursor-not-allowed"
                              style={{ color: 'var(--text-muted)' }}
                              title="Scraping hanya tersedia di desktop app"
                            >
                              <ReScrape className="w-4 h-4" />
                            </span>
                          )}
                          <button onClick={() => openEditModal(row)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                            title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {deleteConfirm === row.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openPasswordModal('delete_single', row.id)}
                                className="px-2 py-1 text-xs text-white rounded transition-colors"
                                style={{ background: 'var(--danger)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--danger)'}>Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(row.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: 'var(--text-secondary)' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                              title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Pagination page={page} pageSize={pageSize} totalCount={totalCount} onChange={setPage} />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Content' : 'Add New Content'} size="lg">
        {editId ? (
          <EditContentForm form={form} setForm={setForm} brands={brands} onSubmit={handleSubmit} onClose={() => setShowModal(false)} loading={saving} goals={goals} genres={genres} />
        ) : (
          <AddContentForm form={form} setForm={setForm} brands={brands} onSubmit={handleSubmit} onClose={() => setShowModal(false)} loading={saving} goals={goals} genres={genres} />
        )}
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal isOpen={showBulkEditModal} onClose={() => setShowBulkEditModal(false)} title="Bulk Edit Content" size="lg">
        <BulkEditForm
          form={bulkForm}
          setForm={setBulkForm}
          brands={brands}
          onSubmit={handleBulkEdit}
          onClose={() => setShowBulkEditModal(false)}
          loading={bulkSaving}
          goals={goals}
          genres={genres}
          selectedCount={selectedIds.size}
        />
      </Modal>

      {/* Bulk Delete Confirm */}
      <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Delete Selected Content" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Hapus <strong style={{ color: 'var(--text-primary)' }}>{selectedIds.size} content</strong> beserta semua metrics terkait?
          </p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="text-xs" style={{ color: '#ef4444' }}>⚠️ Tindakan ini tidak dapat dibatalkan</span>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <Button variant="secondary" onClick={() => { setPasswordModal({ show: false, type: null, id: null, ids: [] }); setShowBulkDeleteConfirm(false) }}>Batal</Button>
            <Button variant="danger" onClick={() => { setShowBulkDeleteConfirm(false); openPasswordModal('delete_bulk', null, Array.from(selectedIds)) }}>
              Delete {selectedIds.size} Content
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showTitlePrompt} onClose={() => setShowTitlePrompt(false)} title="Masukkan Judul Konten" size="sm">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tidak bisa mengambil judul otomatis. Masukkan judul konten:
          </p>
          <input
            type="text"
            value={promptTitle}
            onChange={e => setPromptTitle(e.target.value)}
            placeholder="Judul konten..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            autoFocus
          />
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowTitlePrompt(false)}>Nanti Saja</Button>
            <Button variant="primary" onClick={handleSaveFallbackTitle} loading={promptSaving}>Simpan</Button>
          </div>
        </div>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal isOpen={passwordModal.show} onClose={() => { setPasswordModal({ show: false, type: null, id: null, ids: [] }); setPasswordInput(''); setPasswordError('') }} title="Konfirmasi Password" size="sm">
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
            <Button variant="secondary" onClick={() => { setPasswordModal({ show: false, type: null, id: null, ids: [] }); setPasswordInput('') }}>Batal</Button>
            <Button variant="danger" onClick={handlePasswordConfirm}>
              <Trash2 className="w-4 h-4" /> Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
