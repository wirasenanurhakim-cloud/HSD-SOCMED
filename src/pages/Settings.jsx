import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Tag, RefreshCw, Users, Key, X, LogIn, Eye, EyeOff, UserPlus, UserX, Lock, Save } from 'lucide-react'
import { Button, Input, Select, Modal, Card, Badge, Loader, ErrorMessage } from '../components'
import { useToast } from '../hooks/useToast'
import { pb } from '../lib/pb'

const PRESET_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
  '#a855f7', '#be123c', '#0d9488', '#d97706', '#4f46e5',
]

export default function Settings() {
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [members, setMembers] = useState([])
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [deleteMemberConfirm, setDeleteMemberConfirm] = useState(null)

  const [goals, setGoals] = useState([])
  const [genres, setGenres] = useState([])
  const [geminiKey, setGeminiKey] = useState('')
  const [showGeminiKey, setShowGeminiKey] = useState(false)

  const { showToast } = useToast()

  // Password protection state
  const [passwordModal, setPasswordModal] = useState({ show: false, pendingAction: null, localState: null })
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handlePasswordConfirm = () => {
    if (passwordInput !== 'admin12345') {
      setPasswordError('Password salah')
      return
    }
    setPasswordError('')
    setSaving(true)
    const action = passwordModal.pendingAction
    const localState = passwordModal.localState
    setPasswordModal({ show: false, pendingAction: null, localState: null })
    setPasswordInput('')
    
    if (action) {
      Promise.resolve(action(localState))
        .then(() => showToast('Berhasil disimpan', 'success'))
        .catch(err => showToast('Gagal menyimpan: ' + err.message, 'error'))
        .finally(() => setSaving(false))
    } else {
      setSaving(false)
    }
  }

  const openPasswordModal = (action, localState = null) => {
    setPasswordModal({ show: true, pendingAction: action, localState })
    setPasswordInput('')
    setPasswordError('')
  }

  const DEFAULT_GOALS = ['SELLING', 'EDUCATION', 'ENGAGEMENT', 'AWARENESS', 'TRUST']
  const DEFAULT_GENRES = ['POV', 'PRODUCT_KNOWLEDGE', 'MARAH_MARAH', 'STORYTELLING', 'TIPS', 'TESTIMONI', 'TUTORIAL']

  const loadSettings = useCallback(async () => {
    try {
      let savedGoals = DEFAULT_GOALS
      try {
        const row = await pb.collection('settings').getFirstListItem('key = "custom_goals"')
        if (row?.value) savedGoals = JSON.parse(row.value)
      } catch {}
      setGoals(savedGoals)

      let savedGenres = DEFAULT_GENRES
      try {
        const row = await pb.collection('settings').getFirstListItem('key = "custom_genres"')
        if (row?.value) savedGenres = JSON.parse(row.value)
      } catch {}
      setGenres(savedGenres)

      try {
        const row = await pb.collection('settings').getFirstListItem('key = "gemini_api_key"')
        if (row?.value) setGeminiKey(row.value)
      } catch {}
    } catch {}
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleAddGoal = async (val) => {
    const updated = [...new Set([...goals, val])]
    setGoals(updated)
    openPasswordModal(async () => {
      try {
        const existing = await pb.collection('settings').getFirstListItem('key = "custom_goals"').catch(() => null)
        if (existing) {
          await pb.collection('settings').update(existing.id, { value: JSON.stringify(updated) })
        } else {
          await pb.collection('settings').create({ key: 'custom_goals', value: JSON.stringify(updated) })
        }
      } catch { showToast('Gagal menyimpan goal', 'error') }
    })
  }

  const handleDeleteGoal = async (idx) => {
    const updated = goals.filter((_, i) => i !== idx)
    setGoals(updated)
    openPasswordModal(async () => {
      try {
        const existing = await pb.collection('settings').getFirstListItem('key = "custom_goals"').catch(() => null)
        if (existing) {
          await pb.collection('settings').update(existing.id, { value: JSON.stringify(updated) })
        } else {
          await pb.collection('settings').create({ key: 'custom_goals', value: JSON.stringify(updated) })
        }
      } catch { showToast('Gagal menyimpan goal', 'error') }
    })
  }

  const handleAddGenre = async (val) => {
    const updated = [...new Set([...genres, val])]
    setGenres(updated)
    openPasswordModal(async () => {
      try {
        const existing = await pb.collection('settings').getFirstListItem('key = "custom_genres"').catch(() => null)
        if (existing) {
          await pb.collection('settings').update(existing.id, { value: JSON.stringify(updated) })
        } else {
          await pb.collection('settings').create({ key: 'custom_genres', value: JSON.stringify(updated) })
        }
      } catch { showToast('Gagal menyimpan genre', 'error') }
    })
  }

  const handleDeleteGenre = async (idx) => {
    const updated = genres.filter((_, i) => i !== idx)
    setGenres(updated)
    openPasswordModal(async () => {
      try {
        const existing = await pb.collection('settings').getFirstListItem('key = "custom_genres"').catch(() => null)
        if (existing) {
          await pb.collection('settings').update(existing.id, { value: JSON.stringify(updated) })
        } else {
          await pb.collection('settings').create({ key: 'custom_genres', value: JSON.stringify(updated) })
        }
      } catch { showToast('Gagal menyimpan genre', 'error') }
    })
  }

  const handleSaveGeminiKey = async () => {
    try {
      const existing = await pb.collection('settings').getFirstListItem('key = "gemini_api_key"').catch(() => null)
      if (existing) {
        await pb.collection('settings').update(existing.id, { value: geminiKey })
      } else {
        await pb.collection('settings').create({ key: 'gemini_api_key', value: geminiKey })
      }
      showToast('API Key tersimpan', 'success')
    } catch (err) {
      showToast('Gagal menyimpan: ' + err.message, 'error')
    }
  }

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await pb.collection('brands').getFullList()
      setBrands(data)
    } catch (err) {
      setError(err.message || 'Failed to load brands')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMembers = useCallback(async () => {
    try {
      const row = await pb.collection('settings').getFirstListItem('key = "team_members"', { requestKey: null }).catch(() => null)
      if (row?.value) setMembers(JSON.parse(row.value))
      else setMembers([])
    } catch { setMembers([]) }
  }, [])

  useEffect(() => { fetchBrands(); loadMembers() }, [fetchBrands, loadMembers])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    try {
      await pb.collection('brands').create({ name: newName.trim(), color: newColor })
      setNewName('')
      setNewColor('#3b82f6')
      setShowAdd(false)
      await fetchBrands()
      showToast('Brand berhasil ditambah', 'success')
    } catch (err) {
      setError(err.message || 'Failed to create brand')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setError(null)
    try {
      await pb.collection('brands').delete(id)
      setDeleteConfirm(null)
      await fetchBrands()
      showToast('Brand berhasil dihapus', 'success')
    } catch (err) {
      setError(err.message || 'Failed to delete brand')
    }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    if (!newMemberName.trim()) return
    setSaving(true)
    try {
      const updated = [...new Set([...members, newMemberName.trim()])]
      setMembers(updated)
      const existing = await pb.collection('settings').getFirstListItem('key = "team_members"', { requestKey: null }).catch(() => null)
      if (existing) {
        await pb.collection('settings').update(existing.id, { value: JSON.stringify(updated) })
      } else {
        await pb.collection('settings').create({ key: 'team_members', value: JSON.stringify(updated) })
      }
      setNewMemberName('')
      setShowAddMember(false)
      showToast('Anggota berhasil ditambah', 'success')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan anggota')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMember = async (name) => {
    const updated = members.filter(m => m !== name)
    setMembers(updated)
    try {
      const existing = await pb.collection('settings').getFirstListItem('key = "team_members"', { requestKey: null }).catch(() => null)
      if (existing) {
        await pb.collection('settings').update(existing.id, { value: JSON.stringify(updated) })
      } else {
        await pb.collection('settings').create({ key: 'team_members', value: JSON.stringify(updated) })
      }
      setDeleteMemberConfirm(null)
      showToast('Anggota berhasil dihapus', 'success')
    } catch { showToast('Gagal menyimpan anggota', 'error') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchBrands} loading={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            Add Brand
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Tag className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Brand Management</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader size="lg" /></div>
        ) : brands.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No brands yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Add your first brand to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {brands.map(brand => (
              <div key={brand.id}
                className="flex items-center gap-4 p-4 rounded-xl border transition-colors"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brand.color || '#555' }}>
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{brand.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Created {new Date(brand.created).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Color:</span>
                    <div className="w-6 h-6 rounded-lg border" style={{ backgroundColor: brand.color || '#555', borderColor: 'var(--border-color)' }} />
                  </div>
                  {deleteConfirm === brand.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(brand.id)}
                        className="px-2.5 py-1.5 text-xs text-white rounded-lg transition-colors"
                        style={{ background: 'var(--danger)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--danger)'}>Confirm</button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="px-2.5 py-1.5 text-xs transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(brand.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      title="Delete brand">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Team Members</h2>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAddMember(true)}>
            <UserPlus className="w-4 h-4" />
            Add Member
          </Button>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No team members yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Add your team to assign tasks in Planner</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map(name => (
              <div key={name}
                className="flex items-center gap-4 p-4 rounded-xl border transition-colors"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#d4a843' }}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
                </div>
                <div className="flex items-center gap-3">
                  {deleteMemberConfirm === name ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeleteMember(name)}
                        className="px-2.5 py-1.5 text-xs text-white rounded-lg transition-colors"
                        style={{ background: 'var(--danger)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--danger)'}>Confirm</button>
                      <button onClick={() => setDeleteMemberConfirm(null)}
                        className="px-2.5 py-1.5 text-xs transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteMemberConfirm(name)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--danger)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      title="Remove member">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Tag className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Goal Management</h2>
        </div>
        <EditableChipList
          items={goals}
          onAdd={handleAddGoal}
          onDelete={handleDeleteGoal}
          placeholder="Add new goal..."
          label="Goals"
        />
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Tag className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Genre Management</h2>
        </div>
        <EditableChipList
          items={genres}
          onAdd={handleAddGenre}
          onDelete={handleDeleteGenre}
          placeholder="Add new genre..."
          label="Genres"
        />
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>AI OCR (Gemini)</h2>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Gemini API Key</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                placeholder="Masukkan Gemini API Key..."
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={handleSaveGeminiKey}>Save</Button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Dapatkan API key gratis di{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              Google AI Studio
            </a>
            . Digunakan untuk membaca screenshot di tab Metrics.
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <LogIn className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Scraper Login Session</h2>
        </div>
        <div className="p-4 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Scraper sessions are not available on the web version. Use the desktop app for TikTok/Instagram scraping.
          </p>
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Brand" size="sm">
        <form onSubmit={handleAdd} className="space-y-5">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Brand Name *</label>
            <input type="text" placeholder="e.g. Nike, Apple, Gojek" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              required autoFocus />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Brand Color</label>
            <div className="flex items-center gap-3 mb-3">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                className="w-10 h-10 rounded-lg border cursor-pointer"
                style={{ borderColor: 'var(--border-color)', background: 'transparent' }} />
              <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{newColor}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${newColor === color ? 'scale-110' : ''}`}
                  style={{ backgroundColor: color, borderColor: newColor === color ? 'var(--text-primary)' : 'transparent' }} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>Add Brand</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Team Member" size="sm">
        <form onSubmit={handleAddMember} className="space-y-5">
          <Input label="Member Name *" placeholder="e.g. Ari, Budi, Citra" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} required autoFocus />
          <div className="flex items-center justify-end gap-3 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <Button type="button" variant="secondary" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>Add Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function EditableChipList({ items, onAdd, onDelete, placeholder, label }) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (!input.trim()) return
    onAdd(input.trim().toUpperCase())
    setInput('')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none transition-colors"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {item}
            <button
              onClick={() => onDelete(i)}
              className="p-0.5 rounded-full transition-colors hover:bg-red-100"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
