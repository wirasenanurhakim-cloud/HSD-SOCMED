import { clsx } from 'clsx'

export default function Select({
  label,
  options = [],
  placeholder = 'Select...',
  clearable = false,
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
      <select
        id={id}
        className={clsx(
          'w-full text-sm',
          'focus:outline-none',
          'disabled:cursor-not-allowed appearance-none',
          'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")] bg-[length:1.5rem_1.5rem] bg-[right_0.5rem_center] bg-no-repeat pr-10',
          error && '!border-[var(--danger)]',
          className
        )}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid',
          borderColor: error ? 'var(--danger)' : 'var(--border-color)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '14px',
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
      >
        <option value="" disabled={!clearable}>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}
