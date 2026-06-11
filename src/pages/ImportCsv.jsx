import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, FileSpreadsheet, Check, AlertTriangle, X, ExternalLink,
  RefreshCw, Search, Plus, ChevronDown, ChevronRight, Download
} from 'lucide-react'
import { Card, Badge, Button, Loader, ErrorMessage, Modal, Select } from '../components'
import { useToast } from '../hooks/useToast'
import { pb } from '../lib/pb'

const DEFAULT_GOALS = ['SELLING', 'EDUCATION', 'ENGAGEMENT', 'AWARENESS', 'TRUST']
const DEFAULT_GENRES = ['POV', 'PRODUCT_KNOWLEDGE', 'MARAH_MARAH', 'STORYTELLING', 'TIPS', 'TESTIMONI', 'TUTORIAL']

function cleanTitle(str) {
  if (!str || typeof str !== 'string' || !str.trim()) return null
  const s = str.trim()
  const truncated = s.length > 30 ? s.slice(0, 30) + '...' : s
  return truncated.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function formatNumber(n) {
  if (n === null || n === undefined) return '-'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Number(n).toLocaleString()
}

function safeFormatDate(str) {
  if (!str) return '-'
  const normalized = normalizeDate(str)
  if (!normalized) return '-'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PlatformBadge({ platform }) {
  if (!platform) return <Badge variant="default" size="sm">?</Badge>
  return <Badge variant={platform === 'TIKTOK' ? 'info' : 'success'} size="sm">{platform}</Badge>
}

function MatchBadge({ method }) {
  if (method === 'url') return <Badge variant="success" size="sm">URL Match</Badge>
  if (method === 'shortcode') return <Badge variant="success" size="sm">Shortcode Match</Badge>
  return <Badge variant="warning" size="sm">Manual</Badge>
}

const META_HEADER_MAP = {
  'post title': 'title',
  'title': 'title',
  'judul': 'title',
  'deskripsi': 'title',
  'post url': 'post_url',
  'post_url': 'post_url',
  'url': 'post_url',
  'link': 'post_url',
  'permalink': 'post_url',
  'platform': 'platform',
  'publish date': 'publish_date',
  'published date': 'publish_date',
  'publish_date': 'publish_date',
  'date': 'publish_date',
  'tanggal': 'publish_date',
  'waktu penerbitan': 'publish_date',
  'impressions': 'views',
  'views': 'views',
  'tayangan': 'views',
  'like': 'likes',
  'likes': 'likes',
  'suka': 'likes',
  'comment': 'comments',
  'comments': 'comments',
  'komentar': 'comments',
  'share': 'shares',
  'shares': 'shares',
  'retweets': 'shares',
  'frekuensi dibagikan': 'shares',
  'save': 'saves',
  'saves': 'saves',
  'bookmarks': 'saves',
  'frekuensi disimpan': 'saves',
  'reach': 'reach',
  'jangkauan': 'reach',
  'followers': 'followers',
  'pengikut': 'followers',
  'mengikuti': 'followers',
  'goal': 'goal',
  'genre': 'genre',
  'brand': 'brand',
  'origin': 'origin',
  'durasi': 'duration',
  'durasi (detik)': 'duration',
}

function splitCsvLines(text) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === '\r') {
    } else if (ch === '\n' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) result.push(current)
  return result
}

function splitCsvLine(str) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function normalizePublishDate(v) {
  if (!v) return null
  const parts = v.trim().split(' ')
  const date = parts[0]
  if (!date) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  if (date.includes('/')) {
    const [m, d, y] = date.split('/')
    if (!y || y.length !== 4) return null
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function normalizeDate(str) {
  if (!str || typeof str !== 'string') return ''
  const s = str.trim()
  if (/[a-zA-Z]/i.test(s)) return ''
  const datePart = s.split(/\s+/)[0]
  const mdy = datePart.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  if (mdy) {
    const [, m, d, y] = mdy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const ymd = datePart.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/)
  if (ymd) return datePart
  return ''
}

function parseCsvClient(text) {
  const clean = text.replace(/^\ufeff/, '')
  const lines = splitCsvLines(clean).filter(l => l.trim())
  if (lines.length < 2) return { error: 'File kosong atau tidak valid' }

  const rawHeaders = splitCsvLine(lines[0]).map(h => h.trim().replace(/^['"]|['"]$/g, ''))
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[\u00a0\u202f\u2000-\u200a\u3000]+/g, ' ').trim())

  const matchedRows = []
  const unmatchedRows = []

  for (let i = 1; i < lines.length; i++) {
    const vals = splitCsvLine(lines[i]).map(v => v.trim().replace(/^['"]|['"]$/g, ''))
    if (vals.length !== headers.length) {
      console.warn(`[CSV] skip baris ${i}: ${vals.length} kolom, expected ${headers.length}`)
      continue
    }
    const row = {}
    headers.forEach((h, idx) => {
      const key = META_HEADER_MAP[h] || h
      if (!row[key]) row[key] = vals[idx] || ''
    })

    const title = row.title || ''
    const postUrl = row.post_url || ''
    const platform = (row.platform || '').toUpperCase()
    const publishDate = normalizeDate(row.publish_date || '')
    const views = parseInt(row.views || '0') || 0
    const likes = parseInt(row.likes || '0') || 0
    const comments = parseInt(row.comments || '0') || 0
    const shares = parseInt(row.shares || '0') || 0
    const saves = parseInt(row.saves || '0') || 0
    const reach = parseInt(row.reach || '0') || 0
    const followers = parseInt(row.followers || '0') || 0
    const duration = parseInt(row.duration || '0') || 0

    const item = { title, post_url: postUrl, platform, publish_date: publishDate, views, likes, comments, shares, saves, reach, followers, duration }

    if (postUrl) {
      matchedRows.push({ ...item, match_method: 'url', has_existing_metrics: false, brand_name: '', content_title: title, publish_id: '', asset_id: '' })
    } else {
      unmatchedRows.push(item)
    }
  }

  return {
    total: matchedRows.length + unmatchedRows.length,
    matched: matchedRows.length,
    unmatched: unmatchedRows.length,
    matchedRows,
    unmatchedRows,
  }
}

export default function ImportCsv() {
  const [file, setFile] = useState(null)
  const [csvText, setCsvText] = useState(null)
  const [step, setStep] = useState('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [captureDate, setCaptureDate] = useState(new Date().toISOString().slice(0, 10))
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [showCreateConfirm, setShowCreateConfirm] = useState(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [createGoal, setCreateGoal] = useState('AWARENESS')
  const [createGenre, setCreateGenre] = useState('')
  const [manualMatchTarget, setManualMatchTarget] = useState({})
  const [unmatchedSearch, setUnmatchedSearch] = useState('')
  const [existingContents, setExistingContents] = useState([])
  const [rowMeta, setRowMeta] = useState({})
  const fileRef = useRef(null)
  const { showToast } = useToast()

  const [goals, setGoals] = useState(DEFAULT_GOALS)
  const [genres, setGenres] = useState(DEFAULT_GENRES)

  const loadSettings = useCallback(async () => {
    try {
      const [goalsRow, genresRow] = await Promise.all([
        pb.collection('settings').getFirstListItem('key = "custom_goals"', { requestKey: null }).catch(() => null),
        pb.collection('settings').getFirstListItem('key = "custom_genres"', { requestKey: null }).catch(() => null),
      ])
      if (goalsRow?.value) {
        try { setGoals(JSON.parse(goalsRow.value)) } catch { /* fallback */ }
      }
      if (genresRow?.value) {
        try { setGenres(JSON.parse(genresRow.value)) } catch { /* fallback */ }
      }
    } catch (err) {
      console.error('[CSV] settings', err)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  useEffect(() => {
    Promise.all([
      pb.collection('publish_instances').getFullList({
        sort: '-publish_date',
        requestKey: null,
      }),
      pb.collection('content_assets').getFullList({ requestKey: null }),
      pb.collection('brands').getFullList({ requestKey: null }),
    ]).then(([publishes, assets, brands]) => {
      const brandMap = Object.fromEntries(brands.map(b => [b.id, b.name]))
      const assetMap = Object.fromEntries(assets.map(a => [a.id, { title: a.title, brand_name: brandMap[a.brand] || '-' }]))
      setExistingContents(publishes.map(p => ({
        publish_id: p.id,
        asset_id: p.asset || '',
        id: p.id,
        title: assetMap[p.asset]?.title || '-',
        brand_name: assetMap[p.asset]?.brand_name || '-',
        platform: p.platform,
        publish_date: p.publish_date,
        post_url: p.post_url,
      })))
    }).catch(err => console.error('[CSV] existing contents', err))
  }, [])

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError(null)
    setResult(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      setCsvText(text)
    }
    reader.readAsText(f)
    e.target.value = ''
  }

  const handleParse = async () => {
    if (!csvText) return
    setLoading(true)
    setError(null)
    try {
      const res = parseCsvClient(csvText)
      if (res.error) {
        console.error('[CSV] parse', res.error)
        setError(res.error)
      } else {
        setResult(res)
        const meta = {}
        res.matchedRows?.forEach((r, i) => { meta[i] = { goal: r.goal || 'AWARENESS', genre: r.genre || 'IMPORTED' } })
        res.unmatchedRows?.forEach((r, i) => { meta['u' + i] = { goal: r.goal || 'AWARENESS', genre: r.genre || 'IMPORTED' } })
        setRowMeta(meta)
        setStep('preview')
      }
    } catch (err) {
      setError(err.message || 'Gagal parse CSV')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!result) return
    setImporting(true)
    setError(null)
    try {
      const allRows = [
        ...result.matchedRows.map((r, i) => ({
          ...r,
          goal: rowMeta[i]?.goal || 'AWARENESS',
          genre: rowMeta[i]?.genre || 'IMPORTED',
        })),
        ...result.unmatchedRows.map((r, i) => ({
          ...r,
          goal: rowMeta['u' + i]?.goal || 'AWARENESS',
          genre: rowMeta['u' + i]?.genre || 'IMPORTED',
        }))
      ]

      let imported = 0, created = 0, skipped = 0, errors = 0

      try {
        const testAsset = await pb.collection('content_assets').create({ title: 'TEST_' + Date.now(), goal: 'AWARENESS', genre: 'TEST', status: 'DRAFT' })
        console.log('[CSV] TEST ASSET CREATED:', testAsset.id)
        await pb.collection('content_assets').delete(testAsset.id)
        console.log('[CSV] TEST ASSET DELETED OK')
      } catch (e) {
        console.error('[CSV] TEST ASSET CRITICAL FAIL:', e?.response?.message || e?.message || e, JSON.stringify(e?.response?.data))
      }

      for (const row of allRows) {
        let createdAsset = null
        let createdPublish = null
        try {
          let publishId = row.publish_id

          if (!publishId) {
            const assetData = {
              title: cleanTitle(row.title) || 'Imported',
              goal: row.goal || 'AWARENESS',
              genre: row.genre || 'IMPORTED',
              status: 'PUBLISHED',
              duration: row.duration || 0,
            }
            createdAsset = await pb.collection('content_assets').create(assetData)

            const pubData = {
              asset: createdAsset.id,
              platform: row.platform || 'INSTAGRAM',
              publish_date: normalizePublishDate(row.publish_date) || captureDate,
              post_url: row.post_url || '',
              origin: 'IMPORTED',
            }
            createdPublish = await pb.collection('publish_instances').create(pubData)
            publishId = createdPublish.id
            created++
          }

          await pb.collection('metric_history').create({
            publish: publishId,
            capture_date: captureDate + 'T00:00:00',
            views: row.views || 0,
            likes: row.likes || 0,
            comments: row.comments || 0,
            shares: row.shares || 0,
            reach: row.reach || 0,
            saves: row.saves || 0,
            followers: row.followers || null,
          })
          imported++
        } catch (err) {
          const msg = err?.response?.message || err?.message || err
          const data = err?.response?.data
          console.error('[CSV] import row error:', msg, data ? JSON.stringify(data) : '')
          if (createdPublish) {
            try { await pb.collection('publish_instances').delete(createdPublish.id) } catch (e) { console.error('[CSV] rollback publish fail:', e) }
          }
          if (createdAsset) {
            try { await pb.collection('content_assets').delete(createdAsset.id) } catch (e) { console.error('[CSV] rollback asset fail:', e) }
          }
          errors++
        }
      }

      try {
        const verifyAsset = await pb.collection('content_assets').getFullList({ requestKey: null })
        console.log('[CSV] post-import asset count:', verifyAsset.length)
      } catch (e) {
        console.error('[CSV] verify assets fail:', e)
      }

      setImportResult({ imported, created, skipped, errors })
      const parts = []
      if (imported > 0) parts.push(`${imported} metrics di-import`)
      if (created > 0) parts.push(`${created} content baru dibuat`)
      if (skipped > 0) parts.push(`${skipped} skipped`)
      if (errors > 0) parts.push(`${errors} errors`)
      showToast(`Import berhasil: ${parts.join(', ')}`, 'success')
      setResult(prev => prev ? { ...prev, unmatchedRows: [], unmatched: 0 } : prev)
    } catch (err) {
      setError(err.message || 'Gagal import')
    } finally {
      setImporting(false)
    }
  }

  const handleCreateContent = async (row) => {
    setCreateLoading(true)
    let createdAsset = null
    let createdPublish = null
    try {
      const assetData = {
        title: cleanTitle(row.title) || 'Imported',
        goal: createGoal || 'AWARENESS',
        genre: createGenre || null,
        status: 'PUBLISHED',
        duration: row.duration || 0,
      }
      createdAsset = await pb.collection('content_assets').create(assetData)

      const pubData = {
        asset: createdAsset.id,
        platform: row.platform || 'INSTAGRAM',
        publish_date: normalizePublishDate(row.publish_date) || captureDate,
        post_url: row.post_url || '',
        origin: 'IMPORTED',
      }
      createdPublish = await pb.collection('publish_instances').create(pubData)
      await pb.collection('metric_history').create({
        publish: createdPublish.id,
        capture_date: captureDate + 'T00:00:00',
        views: row.views || 0,
        likes: row.likes || 0,
        comments: row.comments || 0,
        shares: row.shares || 0,
        reach: row.reach || 0,
        saves: row.saves || 0,
        followers: row.followers || null,
      })

      showToast('Content baru berhasil dibuat', 'success')

      const [publishes, assets, brands] = await Promise.all([
        pb.collection('publish_instances').getFullList({ sort: '-publish_date', requestKey: null }),
        pb.collection('content_assets').getFullList({ requestKey: null }),
        pb.collection('brands').getFullList({ requestKey: null }),
      ])
      const brandMap = Object.fromEntries(brands.map(b => [b.id, b.name]))
      const assetMap = Object.fromEntries(assets.map(a => [a.id, { title: a.title, brand_name: brandMap[a.brand] || '-' }]))
      setExistingContents(publishes.map(p => ({
        publish_id: p.id,
        asset_id: p.asset || '',
        id: p.id,
        title: assetMap[p.asset]?.title || '-',
        brand_name: assetMap[p.asset]?.brand_name || '-',
        platform: p.platform,
        publish_date: p.publish_date,
        post_url: p.post_url,
      })))

      setResult(prev => {
        const newUnmatched = prev.unmatchedRows.filter(r => r !== row)
        return {
          ...prev,
          unmatched: newUnmatched.length,
          unmatchedRows: newUnmatched,
        }
      })
    } catch (err) {
      console.error('[CSV] create content', err)
      if (createdPublish) {
        try { await pb.collection('publish_instances').delete(createdPublish.id) } catch {}
      }
      if (createdAsset) {
        try { await pb.collection('content_assets').delete(createdAsset.id) } catch {}
      }
      showToast('Gagal membuat content', 'error')
    } finally {
      setCreateLoading(false)
      setShowCreateConfirm(null)
    }
  }

  const handleManualMatch = (unmatchedIdx, publishId) => {
    const row = result.unmatchedRows[unmatchedIdx]
    const content = existingContents.find(c => c.publish_id == publishId)
    if (!content || !row) return

    const matchedRow = {
      ...row,
      publish_id: publishId,
      asset_id: content.asset_id || '',
      brand_name: content.brand_name,
      content_title: content.title,
      match_method: 'manual',
      has_existing_metrics: false,
    }

    setResult(prev => {
      const newUnmatched = prev.unmatchedRows.filter((_, i) => i !== unmatchedIdx)
      return {
        ...prev,
        unmatched: newUnmatched.length,
        unmatchedRows: newUnmatched,
        matched: prev.matched + 1,
        matchedRows: [...prev.matchedRows, matchedRow],
      }
    })

    showToast('Manual match berhasil', 'success')
  }

  const resetAll = () => {
    setFile(null)
    setCsvText(null)
    setStep('upload')
    setError(null)
    setResult(null)
    setImportResult(null)
    setManualMatchTarget({})
  }

  const filteredUnmatched = (result?.unmatchedRows || []).filter(row => {
    if (unmatchedSearch) {
      const q = unmatchedSearch.toLowerCase()
      return (row.title || '').toLowerCase().includes(q) ||
             (row.post_url || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Import Meta CSV</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Import metrics dari export CSV Meta Business Suite</p>
        </div>
        {step === 'preview' && (
          <Button variant="ghost" size="sm" onClick={resetAll}>
            <RefreshCw className="w-4 h-4" />
            Import Lain
          </Button>
        )}
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {step === 'upload' && (
        <Card>
          <div
            className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors"
            style={{
              borderColor: 'var(--border-color)',
              background: 'var(--bg-secondary)',
            }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-dim)' }} />
            {file ? (
              <>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Klik atau drop file CSV Meta di sini</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>.csv, .xlsx</p>
              </>
            )}
          </div>

          {csvText && (
            <div className="flex justify-end mt-4">
              <Button variant="primary" onClick={handleParse} loading={loading}>
                <FileSpreadsheet className="w-4 h-4" />
                Parse CSV
              </Button>
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#3b82f6' }}>Cara Export CSV dari Meta Business Suite:</h3>
            <ol className="text-xs space-y-1 ml-4 list-decimal" style={{ color: 'var(--text-secondary)' }}>
              <li>Buka <strong>Meta Business Suite</strong> → <strong>Analytics</strong> atau <strong>Insights</strong></li>
              <li>Pilih periode yang ingin di-export</li>
              <li>Klik <strong>Export</strong> → pilih format <strong>CSV</strong></li>
              <li>Upload file CSV ke sini</li>
            </ol>
          </div>
        </Card>
      )}

      {step === 'preview' && result && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Total Rows</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{result.total}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Matched</p>
              <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{result.matched}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Unmatched</p>
              <p className="text-2xl font-bold" style={{ color: result.unmatched > 0 ? '#f59e0b' : 'var(--text-primary)' }}>{result.unmatched}</p>
            </Card>
            <Card>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Capture Date</p>
              <input
                type="date"
                value={captureDate}
                onChange={e => setCaptureDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </Card>
          </div>

          {!importResult && (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleImport}
                loading={importing}
                disabled={!result.total}
              >
                <Download className="w-4 h-4" />
                Import {result.total} Data {result.unmatched > 0 ? `(${result.matched} matched + ${result.unmatched} baru)` : ''}
              </Button>
              {result.unmatched > 0 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {result.unmatched} konten belum match — akan dibuat otomatis saat import
                </span>
              )}
            </div>
          )}

          {importResult && (
            <Card>
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <Check className="w-5 h-5" style={{ color: '#22c55e' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>Import Berhasil!</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {importResult.imported > 0 && `${importResult.imported} metrics di-import`}
                    {importResult.created > 0 && ` | ${importResult.created} content baru dibuat`}
                    {importResult.skipped > 0 && ` | ${importResult.skipped} skipped`}
                    {importResult.errors > 0 && ` | ${importResult.errors} errors`}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {result.matchedRows?.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" style={{ color: '#22c55e' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Matched ({result.matchedRows.length})
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--bg-tertiary)' }}>
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Content</th>
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Platform</th>
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Match</th>
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Goal</th>
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Genre</th>
                      <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Publish Date</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Views</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Likes</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Cmnts</th>
                      <th className="px-4 py-2.5 text-right text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>Reach</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                    {result.matchedRows.map((row, i) => (
                      <tr key={i}
                        className="transition-colors"
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium truncate max-w-[250px]" style={{ color: 'var(--text-primary)' }}>
                            {row.content_title || row.title || '-'}
                          </p>
                          <p className="text-[10px] truncate max-w-[250px]" style={{ color: 'var(--text-muted)' }}>
                            {row.brand_name || ''} {row.post_url ? <a href={row.post_url} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>Link</a> : ''}
                          </p>
                        </td>
                        <td className="px-4 py-2.5"><PlatformBadge platform={row.platform} /></td>
                        <td className="px-4 py-2.5"><MatchBadge method={row.match_method} /></td>
                        <td className="px-4 py-2.5">
                          <select
                            value={rowMeta[i]?.goal || 'AWARENESS'}
                            onChange={e => setRowMeta(prev => ({ ...prev, [i]: { ...prev[i], goal: e.target.value } }))}
                            className="px-1.5 py-1 rounded text-[11px] outline-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', maxWidth: '110px' }}
                          >
                            {goals.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2.5">
                          <select
                            value={rowMeta[i]?.genre || 'IMPORTED'}
                            onChange={e => setRowMeta(prev => ({ ...prev, [i]: { ...prev[i], genre: e.target.value } }))}
                            className="px-1.5 py-1 rounded text-[11px] outline-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', maxWidth: '130px' }}
                          >
                            <option value="">-- None --</option>
                            {genres.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {safeFormatDate(row.publish_date)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatNumber(row.views)}</td>
                        <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatNumber(row.likes)}</td>
                        <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatNumber(row.comments)}</td>
                        <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatNumber(row.reach)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {result.unmatchedRows?.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Unmatched ({result.unmatchedRows.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={unmatchedSearch}
                        onChange={e => setUnmatchedSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Konten ini tidak ditemukan di database. Match manual atau buat content baru.
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {filteredUnmatched.map((row, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {row.title || 'No title'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <PlatformBadge platform={row.platform} />
                          <span>{row.post_url ? <a href={row.post_url} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>Open</a> : 'No URL'}</span>
                          <span>{safeFormatDate(row.publish_date)}</span>
                          <span>Views: {formatNumber(row.views)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <select
                            value={rowMeta['u' + i]?.goal || 'AWARENESS'}
                            onChange={e => setRowMeta(prev => ({ ...prev, ['u' + i]: { ...prev['u' + i], goal: e.target.value } }))}
                            className="px-1.5 py-1 rounded text-[11px] outline-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', maxWidth: '110px' }}
                          >
                            {goals.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <select
                            value={rowMeta['u' + i]?.genre || 'IMPORTED'}
                            onChange={e => setRowMeta(prev => ({ ...prev, ['u' + i]: { ...prev['u' + i], genre: e.target.value } }))}
                            className="px-1.5 py-1 rounded text-[11px] outline-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', maxWidth: '130px' }}
                          >
                            <option value="">-- None --</option>
                            {genres.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 mt-5">
                        <div className="flex items-center gap-1">
                          <select
                            value={manualMatchTarget[i] || ''}
                            onChange={e => setManualMatchTarget(prev => ({ ...prev, [i]: e.target.value }))}
                            className="px-2 py-1.5 rounded-lg text-xs outline-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                          >
                            <option value="">Select content...</option>
                            {existingContents.map(c => (
                              <option key={c.publish_id || c.id} value={c.publish_id}>
                                {c.title?.slice(0, 40)} ({c.platform})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => manualMatchTarget[i] && handleManualMatch(i, manualMatchTarget[i])}
                            disabled={!manualMatchTarget[i]}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                            style={{ background: manualMatchTarget[i] ? 'var(--accent)' : 'var(--bg-tertiary)', color: manualMatchTarget[i] ? '#fff' : 'var(--text-muted)' }}
                          >
                            Match
                          </button>
                        </div>
                        <button
                          onClick={() => { setCreateGoal('AWARENESS'); setCreateGenre(''); setShowCreateConfirm(i) }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.15)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.08)'}
                          title="Buat content baru"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Modal
            isOpen={showCreateConfirm !== null}
            onClose={() => setShowCreateConfirm(null)}
            title="Buat Content Baru?"
            size="sm"
          >
            {showCreateConfirm !== null && result.unmatchedRows[showCreateConfirm] && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Buat content baru dari data CSV ini?
                </p>
                <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {result.unmatchedRows[showCreateConfirm].title?.slice(0, 80) || 'No title'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Platform: {result.unmatchedRows[showCreateConfirm].platform} |
                    Views: {formatNumber(result.unmatchedRows[showCreateConfirm].views)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Goal"
                    options={goals.map(g => ({ value: g, label: g }))}
                    placeholder="Select goal"
                    value={createGoal}
                    onChange={e => setCreateGoal(e.target.value)}
                  />
                  <Select
                    label="Genre"
                    options={[{ value: '', label: '-- None --' }, ...genres.map(g => ({ value: g, label: g }))]}
                    placeholder="Select genre"
                    value={createGenre}
                    onChange={e => setCreateGenre(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowCreateConfirm(null)}>Batal</Button>
                  <Button variant="primary" onClick={() => handleCreateContent(result.unmatchedRows[showCreateConfirm])} loading={createLoading}>
                    Buat
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  )
}
