import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { pb } from './lib/pb'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Content from './pages/Content.jsx'
import Metrics from './pages/Metrics.jsx'
import Analytics from './pages/Analytics.jsx'
import Planner from './pages/Planner.jsx'
import Report from './pages/Report.jsx'
import ImportCsv from './pages/ImportCsv.jsx'
import Settings from './pages/Settings.jsx'

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
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="content" element={<Content />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="planner" element={<Planner />} />
            <Route path="report" element={<Report />} />
            <Route path="import" element={<ImportCsv />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
