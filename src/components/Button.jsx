import { clsx } from 'clsx'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'text-white',
    secondary: '',
    danger: 'text-white',
    ghost: '',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  }

  const styleMap = {
    primary: {
      background: 'var(--accent)',
      borderRadius: '8px',
      fontWeight: 600,
      boxShadow: '0 1px 2px rgba(212,168,67,0.3)',
    },
    secondary: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      color: 'var(--text-primary)',
      borderRadius: '8px',
    },
    danger: {
      background: 'var(--danger)',
      borderRadius: '8px',
    },
    ghost: {
      color: 'var(--text-secondary)',
      borderRadius: '8px',
    },
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      style={{ ...styleMap[variant], transition: 'all 0.15s ease' }}
      onMouseEnter={e => {
        if (disabled) return
        const el = e.currentTarget
        if (variant === 'primary') {
          el.style.background = 'var(--accent-hover)'
          el.style.boxShadow = '0 2px 6px rgba(212,168,67,0.4)'
        } else if (variant === 'secondary') {
          el.style.background = 'var(--hover-bg)'
          el.style.borderColor = 'var(--accent)'
        } else if (variant === 'danger') {
          el.style.background = 'var(--danger-hover)'
        } else if (variant === 'ghost') {
          el.style.background = 'var(--hover-bg)'
        }
      }}
      onMouseLeave={e => {
        if (disabled) return
        const el = e.currentTarget
        if (variant === 'primary') {
          el.style.background = 'var(--accent)'
          el.style.boxShadow = '0 1px 2px rgba(212,168,67,0.3)'
        } else if (variant === 'secondary') {
          el.style.background = 'var(--bg-surface)'
          el.style.borderColor = 'var(--border-color)'
        } else if (variant === 'danger') {
          el.style.background = 'var(--danger)'
        } else if (variant === 'ghost') {
          el.style.background = 'transparent'
        }
      }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
