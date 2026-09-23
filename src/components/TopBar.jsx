import { useState } from 'react'
import { cx } from '../lib/util'
import { THEMES, FONT_SIZES, useTheme } from '../ThemeProvider'

function Icon({ name }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  switch (name) {
    case 'sun': return (<svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>)
    case 'moon': return (<svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>)
    case 'leaf': return (<svg {...common}><path d="M20 4c0 10-8 16-16 16 0-10 8-16 16-16z"/><path d="M4 20l9-9"/></svg>)
    case 'font': return (<svg {...common}><path d="M4 20l6-14 6 14M7 14h6M14 11h5l2 9"/></svg>)
    case 'heart': return (<svg {...common}><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg>)
    case 'share': return (<svg {...common}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>)
    case 'install': return (<svg {...common}><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16"/></svg>)
    case 'book': return (<svg {...common}><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/></svg>)
    default: return null
  }
}

export default function TopBar({ onOpenFavs, favCount, onInstall, canInstall, installed, onShare }) {
  const { theme, setTheme, fontsize, setFontsize } = useTheme()
  const [fontOpen, setFontOpen] = useState(false)
  const cycleTheme = () => {
    const next = THEMES[(THEMES.findIndex((t) => t.id === theme) + 1) % THEMES.length]
    setTheme(next.id)
  }
  const currentTheme = THEMES.find((t) => t.id === theme)
  return (
    <div className="topbar" role="navigation" aria-label="App controls">
      <div className="topbar-inner">
        <a href="#top" className="topbar-brand">
          தமிழ் ஸ்டோயிக் <span className="en">Tamil Stoic</span>
        </a>

        <button
          className="icon-btn"
          onClick={onShare}
          aria-label="Share Tamil Stoic"
          title="Share"
        ><Icon name="share" /></button>

        <button
          className={cx('icon-btn', favCount > 0 && 'active')}
          onClick={onOpenFavs}
          aria-label={`Favorites (${favCount})`}
          title={`Favorites (${favCount})`}
        ><Icon name="heart" /></button>

        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setFontOpen((v) => !v)}
            aria-label="Change text size"
            aria-haspopup="menu"
            aria-expanded={fontOpen}
            title="Text size"
          ><Icon name="font" /></button>
          {fontOpen && (
            <div className="menu-pop" role="menu" onMouseLeave={() => setFontOpen(false)}>
              {FONT_SIZES.map((f) => (
                <button key={f.id} role="menuitemradio" aria-checked={fontsize === f.id}
                  className={cx('menu-item', fontsize === f.id && 'active')}
                  onClick={() => { setFontsize(f.id); setFontOpen(false) }}>
                  <span style={{ fontSize: f.size }}>A</span>
                  <span>{f.id[0].toUpperCase() + f.id.slice(1)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="icon-btn"
          onClick={cycleTheme}
          aria-label={`Theme: ${currentTheme.label}`}
          title={`Theme: ${currentTheme.label}`}
          data-theme-btn
        ><Icon name={theme === 'night' ? 'moon' : theme === 'olive' ? 'leaf' : 'sun'} /></button>

        {canInstall && !installed && (
          <button
            className="icon-btn"
            onClick={onInstall}
            aria-label="Install app"
            title="Install app"
          ><Icon name="install" /></button>
        )}
      </div>
    </div>
  )
}
