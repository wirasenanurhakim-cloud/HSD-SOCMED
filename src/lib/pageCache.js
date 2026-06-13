/**
 * Centralized page data cache with stale-while-revalidate pattern.
 * Pages show cached data instantly, then refresh in background.
 */

const DEFAULT_TTL = 180000 // 3 minutes

export function loadPageCache(key, ttl = DEFAULT_TTL) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.ts < ttl) return data.data
  } catch {}
  return null
}

export function savePageCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export function clearPageCache(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}
