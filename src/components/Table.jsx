import { clsx } from 'clsx'

export default function Table({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
  renderRowActions
}) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className={clsx('px-4 py-3 text-left', col.className)}
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  width: col.width,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
            {renderRowActions && (
              <th
                className="px-4 py-3 text-right"
                style={{
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (renderRowActions ? 1 : 0)} className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr
                key={row[keyField]}
                className={clsx(
                  onRowClick && 'cursor-pointer'
                )}
                style={{
                  background: 'var(--bg-surface)',
                  borderBottom: '1px solid var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--accent-light)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-surface)'
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {renderRowActions && (
                  <td className="px-4 py-3 text-right">
                    {renderRowActions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
