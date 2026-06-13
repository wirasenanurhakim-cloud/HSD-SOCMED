import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { pb } from './lib/pb'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'

// Lazy load all pages for faster initial bundle
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Content = lazy(() => import('./pages/Content.jsx'))
const Metrics = lazy(() => import('./pages/Metrics.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Planner = lazy(() => import('./pages/Planner.jsx'))
const Report = lazy(() => import('./pages/Report.jsx'))
const ImportCsv = lazy(() => import('./pages/ImportCsv.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))

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
            <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="content" element={<Suspense fallback={<PageLoader />}><Content /></Suspense>} />
            <Route path="metrics" element={<Suspense fallback={<PageLoader />}><Metrics /></Suspense>} />
            <Route path="analytics" element={<Suspense fallback={<PageLoader />}><Analytics /></Suspense>} />
            <Route path="planner" element={<Suspense fallback={<PageLoader />}><Planner /></Suspense>} />
            <Route path="report" element={<Suspense fallback={<PageLoader />}><Report /></Suspense>} />
            <Route path="import" element={<Suspense fallback={<PageLoader />}><ImportCsv /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
