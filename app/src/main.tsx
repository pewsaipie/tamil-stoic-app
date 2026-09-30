import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles/global.css'
import { App } from './App'
import { registerServiceWorker } from './lib/pwa'

// Hash routing throughout: GitHub Pages serves static files and cannot rewrite
// arbitrary paths, so every deep link has to live behind the fragment.
registerServiceWorker()

const container = document.getElementById('root')
if (!container) throw new Error('root container is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
