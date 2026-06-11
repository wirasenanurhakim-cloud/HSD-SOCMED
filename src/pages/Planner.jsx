import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Check, Trash2, X, UserPlus, CheckCircle, XCircle, Loader as LoaderIcon } from 'lucide-react'
import { Card, Badge, Modal, Button, Input, Select, Loader, ErrorMessage } from '../components'
import { useToast } from '../hooks/useToast'
import { pb } from '../lib/pb'

const TYPE_OPTIONS = ['FEED', 'REELS', 'TIKTOK', 'STORY', 'VIDEO']
const STATUS_OPTIONS = ['PLANNED', 'DONE', 'CANCELLED']

const STATUS_EMOJI = {
  PLANNED: '🗓️ Planned',
  DONE: '✅ Done',
  CANCELLED: '❌ Cancelled',
}

const TYPE_ICONS = {
  FEED: '📷',
  REELS: '🎬',
  TIKTOK: '♪',
  STORY: '⭕',
  VIDEO: '▶',
}

const STATUS_STYLES = {
  PLANNED:    { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' },
  DONE:       { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' },
  CANCELLED:  { bg: 'rgba(107,114,128,0.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.25)' },
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TASK_NOTE_PREFIX = '[TASK_ASSIGNED_TO] '
const TASK_TITLE_RE = /^\[([^\]]+)\]\s*/

function getDaysInMonth(year, month) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  let startDay = firstDay.getDay() - 1
  if (startDay < 0) startDay = 6

  const days = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(d)
  return days
}

function formatMonth(year, month) {
  return new Date(year, month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

function formatDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayStr() {
  // Use local date (en-CA format) instead of UTC toFix timezone issues
  return new Date().toLocaleDateString('en-CA')
}

function addDays(dateStr, days) {
  // Parse as local date and add days
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('en-CA')
}

function makeTaskNotes(name) {
  return `${TASK_NOTE_PREFIX}${name}`
}

function makeTaskTitle(name, taskName) {
  return `[${name}] ${taskName}`
}

function getTaskAssignee(plan) {
  if (plan.assigned_to) return plan.assigned_to
  if (typeof plan.notes === 'string' && plan.notes.startsWith(TASK_NOTE_PREFIX)) {
    return plan.notes.slice(TASK_NOTE_PREFIX.length).trim()
  }
  if (typeof plan.title === 'string') {
    const match = plan.title.match(TASK_TITLE_RE)
    if (match) return match[1].trim()
  }
  return ''
}

function getTaskTitle(plan) {
  if (typeof plan.title !== 'string') return plan.title
  return plan.title.replace(TASK_TITLE_RE, '').trim()
}

function mapPlanRecord(p) {
  const assignedTo = getTaskAssignee(p)
  return {
    id: p.id,
    brand_id: p.brand,
    brand_name: p.expand?.brand?.name || '-',
    brand_color: p.expand?.brand?.color || '#6b7280',
    assigned_to: assignedTo,
    isTask: Boolean(assignedTo),
    title: assignedTo ? getTaskTitle(p) : p.title,
    type: p.type,
    planned_date: p.planned_date,
    status: p.status,
    notes: p.notes,
  }
}

function getMonthRange(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  const start = `${monthKey}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${monthKey}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export default function Planner() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [plans, setPlans] = useState([])
  const [todayPlans, setTodayPlans] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editPlan, setEditPlan] = useState(null)
  const [form, setForm] = useState({ brand_id: '', title: '', type: 'FEED', planned_date: '', status: 'PLANNED', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedBrand, setSelectedBrand] = useState(null)
  const { showToast } = useToast()

  const [members, setMembers] = useState([])
  const [todayTasks, setTodayTasks] = useState([])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ assigned_to: '', task_name: '', planned_date: '' })
  const [taskSaving, setTaskSaving] = useState(false)

  // Task actions modal state
  const [showTaskActions, setShowTaskActions] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  // Expand day to show all tasks
  const [expandedDay, setExpandedDay] = useState(null)

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const today = todayStr()
  const tomorrow = addDays(today, 1)
  const days = getDaysInMonth(year, month)

  // Helper to get first day of next month in local date format
  const getNextMonthDate = () => {
    const nextMonthDate = new Date(year, month + 1, 1)
    return nextMonthDate.toLocaleDateString('en-CA')
  }

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true)
      const { start, end } = getMonthRange(monthKey)
      // Use proper date range filter instead of starts-with
      const data = await pb.collection('content_plan').getFullList({
        filter: `planned_date >= "${start}" && planned_date <= "${end}"`,
        sort: 'planned_date',
        expand: 'brand',
        requestKey: null,
      })
      const mapped = data.map(mapPlanRecord)
      setPlans(mapped)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [monthKey, year, month])

  const loadToday = useCallback(async () => {
    try {
      const data = await pb.collection('content_plan').getFullList({
        filter: `planned_date >= "${today}" && planned_date < "${addDays(today, 1)}"`,
        expand: 'brand',
        requestKey: null,
      })
      const mapped = data.map(mapPlanRecord)
      setTodayPlans(mapped.filter(p => !p.isTask))
      setTodayTasks(mapped.filter(p => p.isTask))
    } catch (err) { /* silent */ }
  }, [today])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  useEffect(() => {
    loadToday()
    const interval = setInterval(loadToday, 60000)
    return () => clearInterval(interval)
  }, [loadToday])

  useEffect(() => {
    pb.collection('brands').getFullList({ requestKey: null }).then(res => setBrands(res || [])).catch(() => setBrands([]))
    pb.collection('settings').getFirstListItem('key = "team_members"', { requestKey: null }).then(row => {
      if (row?.value) setMembers(JSON.parse(row.value))
    }).catch(() => {})
  }, [])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const openAdd = (date) => {
    setEditPlan(null)
    setForm({ brand_id: brands[0]?.id || '', title: '', type: 'FEED', planned_date: date || today, status: 'PLANNED', notes: '' })
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditPlan(plan)
    setForm({
      brand_id: plan.brand_id || '',
      title: plan.title,
      type: plan.type,
      planned_date: plan.planned_date,
      status: plan.status,
      notes: plan.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.planned_date) return
    setSaving(true)
    try {
      const data = {
        brand: form.brand_id || null,
        title: form.title.trim(),
        type: form.type,
        planned_date: form.planned_date,
        status: form.status,
        notes: form.notes || '',
      }
      if (editPlan) {
        await pb.collection('content_plan').update(editPlan.id, data)
      } else {
        await pb.collection('content_plan').create(data)
      }
      setShowModal(false)
      loadPlans()
      loadToday()
      showToast(editPlan ? 'Plan berhasil diperbarui' : 'Plan berhasil ditambah', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setError(null)
    try {
      await pb.collection('content_plan').delete(id)
      setDeleteConfirm(null)
      setShowModal(false)
      loadPlans()
      loadToday()
      showToast('Plan berhasil dihapus', 'success')
    } catch (err) {
      setError(err.message || 'Failed to delete plan')
    }
  }

  const handleStatus = async (id, status) => {
    setError(null)
    try {
      await pb.collection('content_plan').update(id, { status })
      loadPlans()
      loadToday()
      showToast('Status plan diperbarui', 'success')
    } catch (err) {
      setError(err.message || 'Failed to update plan status')
    }
  }

  const handleAssignTask = async () => {
    if (!taskForm.assigned_to || !taskForm.task_name.trim()) return
    setTaskSaving(true)
    try {
      const taskData = {
        brand: null,
        title: makeTaskTitle(taskForm.assigned_to, taskForm.task_name.trim()),
        type: 'FEED',
        planned_date: taskForm.planned_date || today,
        status: 'PLANNED',
        notes: makeTaskNotes(taskForm.assigned_to),
      }
      const created = await pb.collection('content_plan').create(taskData)
      setShowTaskModal(false)
      setTaskForm({ assigned_to: '', task_name: '', planned_date: '' })
      await loadPlans()
      await loadToday()
      showToast(`Task "${taskForm.task_name.trim()}" diberikan ke ${taskForm.assigned_to}`, 'success')
    } catch (err) {
      console.error('[Planner] handleAssignTask error:', err)
      setError(err.message || 'Gagal memberi task')
      showToast('Gagal memberi task: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setTaskSaving(false)
    }
  }

  const handleTaskCheck = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'PLANNED' : 'DONE'
      await pb.collection('content_plan').update(id, { status: newStatus })
      loadPlans()
      loadToday()
    } catch (err) {
      setError(err.message || 'Gagal update task')
    }
  }

  const handleTaskApprove = async (id) => {
    try {
      await pb.collection('content_plan').delete(id)
      loadPlans()
      loadToday()
      showToast('Task di-approve', 'success')
    } catch (err) {
      setError(err.message || 'Gagal approve task')
    }
  }

  const handleTaskReject = async (id) => {
    try {
      await pb.collection('content_plan').update(id, { status: 'CANCELLED' })
      loadPlans()
      loadToday()
      showToast('Task di-reject', 'success')
    } catch (err) {
      setError(err.message || 'Gagal reject task')
    }
  }

  const filteredPlans = selectedBrand
    ? plans.filter(p => p.isTask || p.brand_id === selectedBrand)
    : plans

  const filteredTodayPlans = selectedBrand
    ? todayPlans.filter(p => p.brand_id === selectedBrand)
    : todayPlans

  // Helper to extract date key from PocketBase date field
  // PocketBase may return "2026-06-11" or "2026-06-11 00:00:00"
  const getDateKey = (dateVal) => {
    if (!dateVal) return ''
    const str = String(dateVal)
    const spaceIdx = str.indexOf(' ')
    return spaceIdx > 0 ? str.slice(0, spaceIdx) : str.slice(0, 10)
  }

  const plansByDate = {}
  filteredPlans.forEach(p => {
    const key = getDateKey(p.planned_date)
    if (!key) return
    if (!plansByDate[key]) plansByDate[key] = []
    plansByDate[key].push(p)
  })

  const todayGrouped = {}
  filteredTodayPlans.forEach(p => {
    const key = p.brand_name || 'Unbranded'
    if (!todayGrouped[key]) todayGrouped[key] = { color: p.brand_color, items: [] }
    todayGrouped[key].items.push(p)
  })

  const visibleTodayTasks = todayTasks
  const tasksGrouped = {}
  visibleTodayTasks.forEach(t => {
    const key = t.assigned_to || 'Unassigned'
    if (!tasksGrouped[key]) tasksGrouped[key] = []
    tasksGrouped[key].push(t)
  })
  const taskPeople = [...new Set([...members, ...Object.keys(tasksGrouped)])]
  const todayDoneCount = visibleTodayTasks.filter(t => t.status === 'DONE').length
  const todayRejectedCount = visibleTodayTasks.filter(t => t.status === 'CANCELLED').length

  const brandMap = {}
  brands.forEach(b => { brandMap[b.id] = b })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Content Planner</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Plan and schedule your content</p>
        </div>
        <button
          onClick={() => openAdd(today)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="flex gap-6">
        {/* LEFT — Calendar */}
        <div className="flex-1 min-w-0">
          <Card className="p-0 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', minWidth: 140, textAlign: 'center' }}>
                  {formatMonth(year, month)}
                </span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
                  className="text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)' }}>
                  Today
                </button>
                <button
                  onClick={() => {
                    setTaskForm({ assigned_to: members[0] || '', task_name: '', planned_date: today })
                    setShowTaskModal(true)
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ background: '#7c3aed', color: '#fff' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  title="Assign task"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Task
                </button>
              </div>
            </div>

            {/* Brand filter bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => setSelectedBrand(null)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                style={{
                  background: !selectedBrand ? '#d4a843' : 'transparent',
                  color: !selectedBrand ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${!selectedBrand ? '#d4a843' : 'var(--border-color)'}`,
                }}
              >
                All Brands
              </button>
              {brands.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                  style={{
                    background: selectedBrand === b.id ? '#d4a843' : 'transparent',
                    color: selectedBrand === b.id ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${selectedBrand === b.id ? '#d4a843' : 'var(--border-color)'}`,
                  }}
                >
                  {b.name}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="p-12 flex justify-center"><Loader /></div>
            ) : (
              <div className="p-3">
                {/* Day labels */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
                  ))}
                </div>
                {/* Days grid */}
                <div className="grid grid-cols-7 gap-px" style={{ background: 'var(--border-color)' }}>
                  {days.map((day, i) => {
                    if (day === null) return <div key={`empty-${i}`} style={{ background: 'var(--bg-secondary)' }} />
                    const dateStr = formatDateStr(year, month, day)
                    const isToday = dateStr === today
                    const isTomorrow = dateStr === tomorrow
                    const rawDayPlans = plansByDate[dateStr] || []
                    const dayPlans = (isToday || isTomorrow)
                      ? [...rawDayPlans].sort((a, b) => Number(b.isTask) - Number(a.isTask))
                      : rawDayPlans
                    const displayPlans = expandedDay === dateStr ? rawDayPlans : dayPlans.slice(0, 3)

                    return (
                      <div
                        key={dateStr}
                        className="relative min-h-[90px] p-1.5 cursor-pointer transition-colors group"
                        style={{
                          background: isToday ? 'rgba(var(--accent-rgb),0.04)' : 'var(--bg-secondary)',
                          border: isToday ? '2px solid var(--accent)' : '2px solid transparent',
                          borderRadius: 4,
                        }}
                        onClick={() => openAdd(dateStr)}
                        onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'var(--hover-bg)' }}
                        onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'var(--bg-secondary)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
 <div className="text-xs font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {day}
                          </div>
<button
                            onClick={(e) => {
                              e.stopPropagation()
                              setTaskForm({ assigned_to: members[0] || '', task_name: '', planned_date: dateStr })
                              setShowTaskModal(true)
                            }}
                            className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.12)' }}
                            title={`Add task on ${dateStr}`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {displayPlans.map(p => (
                            <div
                              key={p.id}
                              className="text-xs truncate rounded px-1.5 py-1 cursor-pointer flex items-center gap-1 group"
                              style={{
                                background: p.isTask ? 'rgba(124,58,237,0.14)' : (brandMap[p.brand_id]?.color || '#6b7280') + '20',
                                color: p.isTask ? '#7c3aed' : brandMap[p.brand_id]?.color || '#6b7280',
                                borderLeft: `3px solid ${p.isTask ? '#7c3aed' : brandMap[p.brand_id]?.color || '#6b7280'}`,
                                textDecoration: p.isTask && p.status === 'CANCELLED' ? 'line-through' : 'none',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (p.isTask) {
                                  // Show task actions modal
                                  setSelectedTask(p)
                                  setShowTaskActions(true)
                                } else {
                                  openEdit(p)
                                }
                              }}
                              title={p.isTask ? `${p.assigned_to}: ${p.title}` : `${p.title} (${p.type})`}
                            >
                              {p.isTask && (
                                <div
                                  className="w-3 h-3 rounded border flex items-center justify-center flex-shrink-0"
                                  style={{
                                    borderColor: p.status === 'DONE' ? '#22c55e' : 'rgba(124,58,237,0.4)',
                                    background: p.status === 'DONE' ? '#22c55e' : 'transparent',
                                  }}
                                >
                                  {p.status === 'DONE' && <Check className="w-2 h-2 text-white" />}
                                </div>
                              )}
                              <span className="truncate flex-1">
                                {p.isTask ? `${p.assigned_to}: ${p.title.length > 10 ? p.title.slice(0, 10) + '…' : p.title}` : `${TYPE_ICONS[p.type] || ''} ${p.title.length > 12 ? p.title.slice(0, 12) + '…' : p.title}`}
                              </span>
                              {p.isTask && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTask(p)
                                    setShowTaskActions(true)
                                  }}
                                  className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded"
                                  style={{ color: '#7c3aed' }}
                                  title="Task actions"
                                >
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a1 1 0 110-2 1 1 0 010 2zm0 5a1 1 0 110-2 1 1 0 010 2zm0 5a1 1 0 110-2 1 1 0 010 2z"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {!expandedDay && dayPlans.length > 3 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedDay(dateStr)
                              }}
                              className="text-xs px-1.5 py-0.5 rounded transition-colors"
                              style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.1)' }}
                              title={`Show all ${dayPlans.length} items`}
                            >
                              +{dayPlans.length - 3} more
                            </button>
                          )}
                          {expandedDay === dateStr && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedDay(null)
                              }}
                              className="text-xs px-1.5 py-0.5 rounded transition-colors"
                              style={{ color: 'var(--text-muted)', background: 'transparent' }}
                              title="Collapse"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT — Today Panel */}
        <div className="w-[280px] flex-shrink-0 space-y-4">
          <Card className="p-0 overflow-hidden h-fit">
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Today</span>
                </div>
                <button
                  onClick={() => {
                    setTaskForm({ assigned_to: members[0] || '', task_name: '', planned_date: today })
                    setShowTaskModal(true)
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.08)' }}
                  title="Assign task"
                >
                  <UserPlus className="w-4 h-4" />
                  Task
                </button>
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="p-4">
              {visibleTodayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No tasks today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg text-center" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{visibleTodayTasks.length}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total</div>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
                      <div className="text-base font-semibold" style={{ color: '#22c55e' }}>{todayDoneCount}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Done</div>
                    </div>
                    <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <div className="text-base font-semibold" style={{ color: '#ef4444' }}>{todayRejectedCount}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Reject</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {visibleTodayTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center gap-2 text-xs">
                        <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>{task.assigned_to}</span>
                        <span className="truncate" style={{ color: task.status === 'CANCELLED' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'CANCELLED' ? 'line-through' : 'none' }}>{task.title}</span>
                      </div>
                    ))}
                    {visibleTodayTasks.length > 5 && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>+{visibleTodayTasks.length - 5} more tasks</div>}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {taskPeople.map(person => {
            const items = tasksGrouped[person] || []
            return (
              <Card key={person} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: '#7c3aed' }}>
                      {person.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{person}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{items.length} task hari ini</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTaskForm({ assigned_to: person, task_name: '', planned_date: today })
                      setShowTaskModal(true)
                    }}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                    style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)' }}
                    title={`Assign task to ${person}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {items.length === 0 ? (
                  <div className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>Belum ada task hari ini</div>
                ) : (
                  <div className="space-y-2">
                    {items.map(task => {
                      const done = task.status === 'DONE'
                      const rejected = task.status === 'CANCELLED'
                      return (
                        <div key={task.id} className="p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTaskCheck(task.id, task.status)}
                              disabled={rejected}
                              className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                              style={{ borderColor: done ? '#22c55e' : 'var(--border-color)', background: done ? '#22c55e' : 'transparent', color: '#fff', opacity: rejected ? 0.5 : 1 }}
                              title="Mark task done"
                            >
                              {done && <Check className="w-3 h-3" />}
                            </button>
                            <span className="text-xs flex-1 min-w-0 truncate" style={{ color: rejected ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: rejected ? 'line-through' : 'none' }}>{task.title}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {done ? (
                                <>
                                  <button onClick={() => handleTaskApprove(task.id)} className="p-1 rounded" style={{ color: '#22c55e' }} title="Approve task"><CheckCircle className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleTaskReject(task.id)} className="p-1 rounded" style={{ color: '#ef4444' }} title="Reject task"><XCircle className="w-3.5 h-3.5" /></button>
                                </>
                              ) : null}
                              <button onClick={() => handleDelete(task.id)} className="p-1 rounded" style={{ color: '#9ca3af' }} title="Delete task"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                          {rejected && <div className="text-[10px] mt-1 ml-6" style={{ color: '#ef4444' }}>Belum acc admin</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editPlan ? 'Edit Plan' : 'Add Plan'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Brand</label>
            <select
              value={form.brand_id}
              onChange={e => setForm(f => ({ ...f, brand_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            >
              <option value="">No brand</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Content title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_EMOJI[s] || s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Planned Date</label>
            <input
              type="date"
              value={form.planned_date}
              onChange={e => setForm(f => ({ ...f, planned_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              placeholder="Any notes..."
            />
          </div>

          <div className="flex justify-between pt-2">
            <div>
              {editPlan && deleteConfirm === editPlan.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(editPlan.id)}
                    className="px-2.5 py-1.5 text-xs text-white rounded-lg transition-colors"
                    style={{ background: 'var(--danger)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--danger)'}>Confirm</button>
                  <button onClick={() => setDeleteConfirm(null)}
                    className="px-2.5 py-1.5 text-xs transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>No</button>
                </div>
              ) : editPlan && (
                <button onClick={() => setDeleteConfirm(editPlan.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = 'var(--danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {saving ? 'Saving...' : editPlan ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Assign Task"
        size="sm"
      >
        <div className="space-y-4">
          {members.length === 0 ? (
            <div className="p-4 rounded-lg text-sm" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
              Add team members in Settings first.
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Assign To</label>
                <select
                  value={taskForm.assigned_to}
                  onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  {members.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Task</label>
                <input
                  value={taskForm.task_name}
                  onChange={e => setTaskForm(f => ({ ...f, task_name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAssignTask() }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  placeholder="e.g. Feed, Reels, Story"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date</label>
                <input
                  type="date"
                  value={taskForm.planned_date}
                  onChange={e => setTaskForm(f => ({ ...f, planned_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setShowTaskModal(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssignTask}
              disabled={taskSaving || members.length === 0 || !taskForm.assigned_to || !taskForm.task_name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {taskSaving ? 'Saving...' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Task Actions Modal */}
      <Modal
        isOpen={showTaskActions}
        onClose={() => { setShowTaskActions(false); setSelectedTask(null) }}
        title="Task Actions"
        size="sm"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#7c3aed' }}>{selectedTask.assigned_to}</div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{selectedTask.title}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Status: {selectedTask.status}</div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  handleTaskCheck(selectedTask.id, selectedTask.status)
                  setShowTaskActions(false)
                  setSelectedTask(null)
                }}
                disabled={selectedTask.status === 'CANCELLED'}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <Check className="w-4 h-4" style={{ color: '#22c55e' }} />
                {selectedTask.status === 'DONE' ? 'Mark as Planned' : 'Mark as Done'}
              </button>

              <button
                onClick={() => {
                  handleTaskApprove(selectedTask.id)
                  setShowTaskActions(false)
                  setSelectedTask(null)
                }}
                disabled={selectedTask.status !== 'DONE'}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}
              >
                <CheckCircle className="w-4 h-4" />
                Approve Task
              </button>

              <button
                onClick={() => {
                  handleTaskReject(selectedTask.id)
                  setShowTaskActions(false)
                  setSelectedTask(null)
                }}
                disabled={selectedTask.status === 'CANCELLED'}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
              >
                <XCircle className="w-4 h-4" />
                Reject Task
              </button>

              <button
                onClick={() => {
                  handleDelete(selectedTask.id)
                  setShowTaskActions(false)
                  setSelectedTask(null)
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-sm transition-colors"
                style={{ background: 'var(--bg-secondary)', color: '#9ca3af' }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            </div>

            <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => { setShowTaskActions(false); setSelectedTask(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
