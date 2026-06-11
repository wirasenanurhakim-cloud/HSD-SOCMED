import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info', duration) => {
    const id = Date.now() + Math.random()
    const timeouts = { success: 3000, error: 5000, info: 3000, warning: 4000, danger: 5000 }
    const safeType = timeouts[type] ? type : 'info'
    setToasts(prev => [...prev, { id, message, type: safeType }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration || timeouts[safeType])
  }, [])

  const closeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast, closeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}