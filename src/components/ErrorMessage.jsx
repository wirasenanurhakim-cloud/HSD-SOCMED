import { AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-4 border rounded-lg animate-slide-up'
      )}
      style={{ background: 'var(--danger-bg)', borderColor: 'var(--danger)' }}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--danger-text)' }} />
      <p className="flex-1 text-sm" style={{ color: 'var(--danger-text)' }}>{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 transition-colors"
          style={{ color: 'var(--danger-text)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--danger-text)' }}
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}