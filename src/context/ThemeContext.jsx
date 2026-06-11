import { createContext, useContext, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sa_theme') || 'theme-light'
  })

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'theme-dark' ? 'theme-light' : 'theme-dark'
    localStorage.setItem('sa_theme', next)
    return next
  })

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
