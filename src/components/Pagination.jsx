import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, pageSize, totalCount, onChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  if (totalPages <= 1) return null

  const range = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }

  for (let i = start; i <= end; i++) range.push(i)

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg transition-colors disabled:opacity-30"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => { if (!(page <= 1)) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onChange(1)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >1</button>
          {start > 2 && <span className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>...</span>}
        </>
      )}

      {range.map(i => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: i === page ? 'var(--accent)' : 'transparent',
            color: i === page ? '#fff' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => { if (i !== page) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={e => { if (i !== page) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
        >{i}</button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-xs" style={{ color: 'var(--text-muted)' }}>...</span>}
          <button
            onClick={() => onChange(totalPages)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >{totalPages}</button>
        </>
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg transition-colors disabled:opacity-30"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => { if (!(page >= totalPages)) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
