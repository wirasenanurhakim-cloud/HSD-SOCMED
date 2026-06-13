import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { pb } from '../lib/pb'
import { Button, Modal } from '../components'
import ToastContainer from './ToastContainer'
import { ToastProvider } from '../hooks/useToast'
import { navItems, preloadPage } from '../lib/pagePreload'

function Sidebar({ onLogout }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'theme-dark'

  return (
    <aside className="sidebar" style={{
      width: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      padding: '24px 16px',
      background: 'var(--bg-secondary, #1a1a1a)',
      borderRight: '1px solid var(--border-color, #333)',
    }}>
      <div className="sidebar-logo-area" style={{ marginBottom: 16 }}>
        <img src="/logo-hsd.jpg" style={{ width: 48, height: 48, objectFit: 'contain', marginBottom: 8, borderRadius: 8 }} alt="HSD Logo" />
        <div className="sidebar-title" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary, #f0f0f0)' }}>Social Analytics</div>
        <div className="sidebar-subtitle" style={{ fontSize: 10, color: 'var(--text-muted, #555)' }}>Made by Luvv HSD</div>
      </div>
      {navItems.map(n => (
        <NavLink key={n.to} to={n.to} end={n.to === '/dashboard'}
          className={({ isActive }) => `sidebar-nav-link${isActive ? ' active' : ''}`}
          style={{
            padding: '8px 12px', borderRadius: 6, textDecoration: 'none',
            fontSize: 13, cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            color: 'var(--text-muted, #555)',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            // Preload page on hover — makes first click instant
            preloadPage(n.key)
            if (!e.currentTarget.classList.contains('active')) {
              e.currentTarget.style.background = 'var(--bg-tertiary, #141414)'
              e.currentTarget.style.color = 'var(--text-primary, #f0f0f0)'
            }
          }}
          onMouseLeave={e => {
            if (!e.currentTarget.classList.contains('active')) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted, #555)'
            }
          }}
        >{n.label}</NavLink>
      ))}
      <div style={{ flex: 1 }} />
      <button
        onClick={toggleTheme}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 6,
          background: 'transparent', border: '1px solid var(--border-color, #333)',
          color: 'var(--text-secondary, #888)', fontSize: 13, cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary, #141414)'; e.currentTarget.style.color = 'var(--text-primary, #f0f0f0)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary, #888)' }}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </button>
      <button
        onClick={onLogout}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 6,
          background: 'transparent', border: '1px solid var(--border-color, #333)',
          color: 'var(--text-secondary, #888)', fontSize: 13, cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary, #141414)'; e.currentTarget.style.color = 'var(--danger, #ef4444)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary, #888)' }}
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </aside>
  )
}

export default function Layout() {
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = () => {
    pb.authStore.clear()
    navigate('/login')
  }

  return (
    <div className={theme} style={{ display: 'flex', height: '100vh', background: 'var(--bg-primary, #f7f7f5)', color: 'var(--text-primary, #1a1a1a)' }}>
      <ToastProvider>
        <Sidebar onLogout={() => setShowLogoutConfirm(true)} />
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
        <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Logout" size="sm">
          <p className="mb-4" style={{ color: 'var(--text-primary, #1a1a1a)' }}>Yakin ingin logout?</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)}>Batal</Button>
            <Button variant="danger" onClick={() => { setShowLogoutConfirm(false); handleLogout() }}>Logout</Button>
          </div>
        </Modal>
        <ToastContainer />
      </ToastProvider>
    </div>
  )
}
