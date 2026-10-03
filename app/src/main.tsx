import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './styles/global.css'
import { App } from './App'
import { registerServiceWorker } from './lib/pwa'
import { upgradeLegacyUrl } from './lib/legacyRoutes'

// Hash routing throughout: GitHub Pages serves static files and cannot rewrite
// arbitrary paths, so every deep link has to live behind the fragment.
// Bookmarks and shared links from the shipped reader arrive as flat fragments
// (#kural-151, #theme-anger, …); upgrade them before the router reads the hash.
upgradeLegacyUrl()
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
