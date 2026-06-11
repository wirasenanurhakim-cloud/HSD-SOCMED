import { clsx } from 'clsx'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

function ToastIcon({ type }) {
  if (type === 'success') return <CheckCircle className="w-5 h-5 flex-shrink-0" />
  if (type === 'error') return <AlertCircle className="w-5 h-5 flex-shrink-0" />
  return <Info className="w-5 h-5 flex-shrink-0" />
}

const accentColors = {
  success: { accent: '#16a34a', icon: '#16a34a' },
  error: { accent: '#dc2626', icon: '#dc2626' },
  info: { accent: '#d4a843', icon: '#d4a843' },
}

export default function Toast({ toasts, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2" role="region" aria-live="polite">
      {toasts.map(({ id, message, type }) => (
        <div
          key={id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 animate-slide-in',
            'min-w-[280px] max-w-md'
          )}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
            borderLeft: `3px solid ${(accentColors[type] || accentColors.info).accent}`,
            color: 'var(--text-primary)',
          }}
          role="alert"
        >
          <span style={{ color: (accentColors[type] || accentColors.info).icon }}>
            <ToastIcon type={type} />
          </span>
          <p className="flex-1 text-sm">{message}</p>
          <button
            onClick={() => onClose(id)}
            className="p-1 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
