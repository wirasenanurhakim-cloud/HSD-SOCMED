import { clsx } from 'clsx'

export default function Card({
  children,
  className = '',
  padding = 'p-6',
  hover = false
}) {
  return (
    <div
      className={clsx(
        padding,
        hover && 'cursor-pointer',
        className
      )}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseEnter={e => {
        if (hover) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)'
        }
      }}
      onMouseLeave={e => {
        if (hover) {
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)'
        }
      }}
    >
      {children}
    </div>
  )
}
