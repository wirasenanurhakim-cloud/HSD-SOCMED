/**
 * Centralized page import map for lazy loading + preloading.
 * All pages are dynamically imported here so we can reuse the same
 * import function for both React.lazy() and background preloading.
 */

export const pageImports = {
  dashboard: () => import('../pages/Dashboard.jsx'),
  content: () => import('../pages/Content.jsx'),
  planner: () => import('../pages/Planner.jsx'),
  metrics: () => import('../pages/Metrics.jsx'),
  analytics: () => import('../pages/Analytics.jsx'),
  report: () => import('../pages/Report.jsx'),
  import: () => import('../pages/ImportCsv.jsx'),
  settings: () => import('../pages/Settings.jsx'),
}

// Track which pages have been preloaded
const preloaded = {}

export function preloadPage(key) {
  if (preloaded[key]) return
  preloaded[key] = true
  pageImports[key]().catch(err => {
    console.warn(`[Preload] Failed to preload ${key}:`, err)
    // Clear flag so retry on next hover
    preloaded[key] = false
  })
}

export function preloadAllPages() {
  Object.keys(pageImports).forEach(key => preloadPage(key))
}

// Expose for Layout nav items
export const navItems = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard'  },
  { key: 'content',   to: '/content',   label: 'Content'    },
  { key: 'planner',   to: '/planner',   label: 'Planner'    },
  { key: 'metrics',   to: '/metrics',   label: 'Metrics'    },
  { key: 'analytics', to: '/analytics', label: 'Analytics'  },
  { key: 'report',    to: '/report',    label: 'Report'     },
  { key: 'import',   to: '/import',    label: 'Import'     },
  { key: 'settings',  to: '/settings',  label: 'Settings'   },
]