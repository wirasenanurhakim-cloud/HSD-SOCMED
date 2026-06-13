import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Calendar } from 'lucide-react'

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const PRESETS = [
  { label: '7 Hari', days: 7 },
  { label: '28 Hari', days: 28 },
  { label: 'Bulan Ini', key: 'thisMonth' },
  { label: 'Bulan Lalu', key: 'lastMonth' },
  { label: '3 Bulan', key: '3months' },
  { label: '6 Bulan', key: '6months' },
  { label: '12 Bulan', key: '12months' },
  { label: 'Custom', key: 'custom' },
]

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  let startWeekday = firstDay.getDay()
  const days = []
  for (let i = 0; i < startWeekday; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  return days
}

function getPresetRange(preset, availableRange) {
  const today = new Date()
  const end = new Date(today)
  const start = new Date(today)

  if (preset.key === 'thisMonth') {
    start.setDate(1)
  } else if (preset.key === 'lastMonth') {
    start.setMonth(start.getMonth() - 1, 1)
    end.setDate(0)
  } else if (preset.key === '3months') {
    start.setMonth(start.getMonth() - 3, 1)
    end.setDate(0)
    end.setMonth(end.getMonth() + 1)
  } else if (preset.key === '6months') {
    start.setMonth(start.getMonth() - 6, 1)
    end.setDate(0)
    end.setMonth(end.getMonth() + 1)
  } else if (preset.key === '12months') {
    start.setMonth(start.getMonth() - 12, 1)
    end.setDate(0)
    end.setMonth(end.getMonth() + 1)
  } else if (preset.days) {
    start.setDate(start.getDate() - (preset.days - 1))
  }

  if (availableRange?.earliest) {
    const earliest = parseDate(availableRange.earliest.split('T')[0])
    if (start < earliest) start.setTime(earliest.getTime())
    const latest = parseDate(availableRange.latest.split('T')[0])
    if (end > latest) end.setTime(latest.getTime())
  }

  return { startDate: formatDate(start), endDate: formatDate(end) }
}

function isInRange(date, start, end) {
  if (!start || !end) return false
  return date >= start && date <= end
}

export default function DateRangePicker({ value, onChange, availableMonths }) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [selecting, setSelecting] = useState(false)
  const [tempStart, setTempStart] = useState(null)
  const [tempEnd, setTempEnd] = useState(null)
  const [activePreset, setActivePreset] = useState(null)
  const ref = useRef(null)

  const availableSet = useMemo(() => {
    const s = new Set()
    ;(availableMonths || []).forEach(m => s.add(m.month))
    return s
  }, [availableMonths])

  const resetToValue = useCallback(() => {
    if (value?.startDate && value?.endDate) {
      setTempStart(value.startDate)
      setTempEnd(value.endDate)
    } else {
      setTempStart(null)
      setTempEnd(null)
    }
    setSelecting(false)
    setActivePreset(null)
  }, [value])

  useEffect(() => {
    const handler = (e) => {
      const inside = ref.current?.contains(e.target) || portalRef.current?.contains(e.target)
      if (!inside) {
        resetToValue()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [resetToValue])

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  const [dropdownPos, setDropdownPos] = useState(null)
  const btnRef = useRef(null)
  const portalRef = useRef(null)

  const updatePosition = useCallback(() => {
    if (btnRef.current && open) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        right: document.documentElement.clientWidth - rect.right,
        minWidth: 520,
      })
    }
  }, [open])

  useEffect(() => {
    if (open) {
      updatePosition()
      const onScroll = () => updatePosition()
      const onResize = () => updatePosition()
      window.addEventListener('scroll', onScroll, true)
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('scroll', onScroll, true)
        window.removeEventListener('resize', onResize)
      }
    } else {
      setDropdownPos(null)
    }
  }, [open, updatePosition])

  const handlePreset = (preset) => {
    if (preset.key === 'custom') {
      setActivePreset('Custom')
      setTempStart(null)
      setTempEnd(null)
      setSelecting(false)
      return
    }
    const range = getPresetRange(preset, null)
    setActivePreset(preset.label)
    setTempStart(range.startDate)
    setTempEnd(range.endDate)
    setSelecting(false)
  }

  const handleDayClick = (day) => {
    if (!day) return
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (!selecting) {
      setTempStart(d)
      setTempEnd(null)
      setSelecting(true)
      setActivePreset('Custom')
    } else {
      const s = tempStart
      const e = d
      const start = s < e ? s : e
      const end = s < e ? e : s
      setTempStart(start)
      setTempEnd(end)
      setSelecting(false)
      setActivePreset('Custom')
    }
  }

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange({ startDate: tempStart, endDate: tempEnd })
    }
    setOpen(false)
  }

  const handleCancel = () => {
    resetToValue()
    setOpen(false)
  }

  const displayLabel = value?.startDate && value?.endDate
    ? `${value.startDate.slice(5)} - ${value.endDate.slice(5)}`
    : value?.month || 'Pilih Tanggal'

  const renderMonth = (year, month) => {
    const days = getMonthDays(year, month)
    return (
      <div className="flex-1 min-w-0">
        <div className="text-center text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          {new Date(year, month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-0.5 mb-0.5">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} style={{ paddingBottom: '100%' }} />

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
            const hasData = availableSet.has(monthStr)
            const isToday = dateStr === formatDate(new Date())
            const isStart = tempStart === dateStr
            const isEnd = tempEnd === dateStr
            const inRange = isInRange(dateStr, tempStart, tempEnd)

            let bg = 'transparent'
            let color = 'var(--text-primary)'
            let borderRadius = ''

            if (isStart || isEnd) {
              bg = '#d4a843'
              color = '#fff'
              borderRadius = '50%'
            } else if (inRange) {
              bg = '#faf3e0'
              color = 'var(--text-primary)'
              borderRadius = '0'
            } else if (isToday) {
              borderRadius = '50%'
            }

            return (
              <button
                key={dateStr}
                onClick={() => handleDayClick(day)}
                disabled={!hasData}
                className="relative text-xs transition-colors"
                style={{
                  width: '100%',
                  paddingBottom: '100%',
                  background: bg,
                  color,
                  borderRadius,
                  border: isToday && !isStart && !isEnd ? '1px solid #d4a843' : 'none',
                  opacity: hasData ? 1 : 0.3,
                  cursor: hasData ? 'pointer' : 'default',
                }}
              >
                <span className="absolute inset-0 flex items-center justify-center">{day}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative" style={{ minWidth: 240 }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
        }}
      >
        <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <span className="flex-1 text-left">{displayLabel}</span>
        <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
      </button>

      {open && dropdownPos && createPortal(
        <div
          ref={portalRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: Math.min(dropdownPos.minWidth, window.innerWidth - 24),
            maxWidth: window.innerWidth - 24,
            overflow: 'auto',
          }}
          className="p-4"
        >
          {/* Presets */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: activePreset === p.label ? '#d4a843' : 'var(--bg-tertiary)',
                  color: activePreset === p.label ? '#fff' : 'var(--text-secondary)',
                  border: activePreset === p.label ? '1px solid #d4a843' : '1px solid var(--border-color)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Two-month calendar */}
          <div className="flex gap-6 flex-wrap">
            {renderMonth(viewYear, viewMonth)}
            {renderMonth(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1)}
          </div>

          {/* Nav */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setViewYear(y => y - 1) }}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Mundur 1 tahun"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={prevMonth}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selecting && tempStart && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Pilih tanggal akhir
                </span>
              )}
              {tempStart && tempEnd && (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
                    style={{ background: '#d4a843', border: 'none' }}
                  >
                    Terapkan
                  </button>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={nextMonth}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setViewYear(y => y + 1) }}
                className="p-1 rounded transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                title="Maju 1 tahun"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function ChevronDown({ className, style }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
