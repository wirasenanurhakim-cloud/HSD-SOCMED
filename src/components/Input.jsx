import { clsx } from 'clsx'

export default function Input({
  label,
  error,
  className = '',
  ...props
}) {
  const id = props.id || props.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={clsx(
          'w-full px-3 py-2 text-sm placeholder:text-[var(--text-muted)]',
          'focus:outline-none',
          'disabled:cursor-not-allowed',
          error && '!border-[var(--danger)]',
          className
        )}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid',
          borderColor: error ? 'var(--danger)' : 'var(--border-color)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          fontSize: '14px',
          padding: '8px 12px',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={e => {
          if (!error) {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,168,67,0.12)'
          }
        }}
        onBlur={e => {
          e.currentTarget.style.boxShadow = 'none'
          if (!error) {
            e.currentTarget.style.borderColor = 'var(--border-color)'
          }
        }}
        {...props}
      />
      {error && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
