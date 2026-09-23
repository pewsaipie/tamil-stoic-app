import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider } from './ThemeProvider.jsx'
import './styles/app.css'

function Root() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const register = () => {
        navigator.serviceWorker.register('./sw.js', { scope: import.meta.env.BASE_URL })
          .catch((err) => console.warn('SW register failed', err))
      }
      if (import.meta.env.PROD) {
        window.addEventListener('load', register)
      }
    }
  }, [])
  return (
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
