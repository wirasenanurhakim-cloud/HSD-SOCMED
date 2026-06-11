import { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import Button from './Button'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer
}) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="fixed inset-0 animate-fade-in"
        style={{ background: 'var(--bg-overlay)', backdropFilter: 'blur(4px)' }}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'relative w-full shadow-xl animate-slide-up',
          sizes[size]
        )}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', padding: '20px 24px' }}>
            <h2 id="modal-title" className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)', borderRadius: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto" style={{ padding: '24px' }}>
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
