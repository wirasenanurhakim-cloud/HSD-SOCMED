import { clsx } from 'clsx'

const colors = {
  default: { bg: 'var(--bg-tertiary)', text: 'var(--text-primary)' },
  primary: { bg: 'var(--accent-soft)', text: 'var(--accent-text)' },
  success: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
  warning: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
  danger: { bg: 'var(--danger-bg)', text: 'var(--danger-text)' },
  info: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
  tiktok: { bg: 'var(--tiktok-bg)', text: 'var(--tiktok-text)' },
  instagram: { bg: 'var(--instagram-bg)', text: 'var(--instagram-text)' },
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
  size = 'md',
  style: externalStyle = {},
}) {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  const c = colors[variant]

  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium',
        sizes[size],
        className
      )}
      style={{
        background: c.bg,
        color: externalStyle.color || c.text,
        borderRadius: '999px',
        padding: '2px 10px',
        fontSize: '11px',
        fontWeight: 600,
        ...externalStyle,
      }}
    >
      {children}
    </span>
  )
}
