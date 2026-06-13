import { useState, useEffect } from 'react'
import { Lock, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pb'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (pb.authStore.isValid) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await pb.collection('users').authWithPassword(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.data?.message || 'Username atau password salah')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-hsd.jpg" alt="HSD Logo" className="w-16 h-16 mx-auto mb-4 rounded-xl object-contain" />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Social Analytics</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Made by Luvv HSD</p>
        </div>

        <div className="p-6 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="Masukkan username"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="Masukkan password"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-center py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'var(--bg-tertiary)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {loading ? 'Masuk...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}