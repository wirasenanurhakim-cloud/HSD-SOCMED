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

export function preloadPage(key) {
  pageImports[key]().catch(() => {})
}

export function preloadAllPages() {
  Object.keys(pageImports).forEach(key => {
    pageImports[key]().catch(() => {})
  })
}

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
