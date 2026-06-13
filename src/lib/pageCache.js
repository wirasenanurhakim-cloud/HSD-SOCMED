/**
 * Centralized page data cache with stale-while-revalidate pattern.
 * Pages show cached data instantly, then refresh in background.
 * loadPageCache always returns data regardless of TTL (stale is better than blank).
 * Use isCacheFresh() to decide if background refresh is needed.
 */

const DEFAULT_TTL = 180000 // 3 minutes

export function loadPageCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    return data.data
  } catch {}
  return null
}

export function savePageCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export function isCacheFresh(key, ttl = DEFAULT_TTL) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const data = JSON.parse(raw)
    return Date.now() - data.ts < ttl
  } catch {}
  return false
}

export function clearPageCache(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}
