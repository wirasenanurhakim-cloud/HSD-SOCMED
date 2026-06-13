import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { pb } from './lib/pb'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ErrorGuard from './components/ErrorGuard.jsx'
import { pageImports } from './lib/pagePreload.js'

// Lazy load all pages — uses same import functions as preload
const Dashboard  = lazy(pageImports.dashboard)
const Content    = lazy(pageImports.content)
const Metrics    = lazy(pageImports.metrics)
const Analytics  = lazy(pageImports.analytics)
const Planner    = lazy(pageImports.planner)
const Report     = lazy(pageImports.report)
const ImportCsv = lazy(pageImports.import)
const Settings  = lazy(pageImports.settings)

// Lightweight page loading placeholder
function PageLoader() {
  return (
    <div className="page-transition-enter">
      <div className="skeleton-header" />
      <div className="skeleton-grid-2" />
      <div className="skeleton-grid-3" />
    </div>
  )
}

function PrivateRoute({ children }) {
  return pb.authStore.isValid ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Dashboard /></ErrorGuard></Suspense>} />
            <Route path="content" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Content /></ErrorGuard></Suspense>} />
            <Route path="metrics" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Metrics /></ErrorGuard></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Analytics /></ErrorGuard></Suspense>} />
            <Route path="planner" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Planner /></ErrorGuard></Suspense>} />
            <Route path="report" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Report /></ErrorGuard></Suspense>} />
            <Route path="import" element={<Suspense fallback={<PageLoader />}><ErrorGuard><ImportCsv /></ErrorGuard></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><ErrorGuard><Settings /></ErrorGuard></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
