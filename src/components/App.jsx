import { useEffect, useMemo, useRef, useState } from 'react'
import { useFavorites, useInstallPrompt, useReactions, useStreak, withTransition } from '../state'
import { vibrate, pad } from '../lib/util'
import { useTheme } from '../ThemeProvider'
import { SITUATIONS, MOODS } from '../data/content'
import TopBar from './TopBar'
import InstallBanner from './InstallBanner'
import DailyKural from './DailyKural'
import MoodPicker from './MoodPicker'
import Books from './Books'
import Situations from './Situations'
import Browse from './Browse'
import Reader from './Reader'
import Favorites from './Favorites'
import { KURALS, CHAPTERS, SECTIONS, THEMES } from '../data/kurals'

const PAGE_SIZE = 12

export default function App() {
  const [book, setBook] = useState('all')
  const [chapter, setChapter] = useState('all')
  const [themeFilter, setThemeFilter] = useState('all')
  const [situation, setSituation] = useState(null)
  const [mood, setMood] = useState(null)
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [dailyIdx, setDailyIdx] = useState(() => todayIndex(KURALS.length))
  const [readerOpen, setReaderOpen] = useState(false)
  const [readerStart, setReaderStart] = useState(0)
  const [favsOpen, setFavsOpen] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [installDismissed, setInstallDismissed] = useState(() => {
    try { return sessionStorage.getItem('ts.install.dismissed') === '1' } catch { return false }
  })
  const [favs, toggleFav] = useFavorites()
  const [reactions, react] = useReactions()
  const streak = useStreak()
  const { showTranslit, setShowTranslit, showTranslation, setShowTranslation, showMeaning, setShowMeaning } = useTheme()
  const install = useInstallPrompt()
  const sentinelRef = useRef(null)

  // Reset shown when filters change
  useEffect(() => { setShown(PAGE_SIZE) }, [book, chapter, themeFilter, situation, query])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(KURALS.length)
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && resultsRef.current.length > shown) {
        setShown((s) => Math.min(resultsRef.current.length, s + PAGE_SIZE))
      }
    }, { rootMargin: '700px 0px' })
    io.observe(el)
    return () => io.disconnect()
  })

  // Apply hash routes: #kural-151, #chapter-16, #book-1, #situation-anger
  useEffect(() => {
    const applyHash = () => {
      const m = (window.location.hash || '').match(/^#(kural|chapter|book|situation)-([\w-]+)$/)
      if (!m) return
      const [, kind, val] = m
      withTransition(() => {
        if (kind === 'chapter') setChapter(val)
        else if (kind === 'book') setBook(val === 'all' ? 'all' : Number(val))
        else if (kind === 'situation') {
          const sit = SITUATIONS.find((s) => s.id === val)
          if (sit) { setSituation(sit.id); setThemeFilter(sit.theme) }
        } else if (kind === 'kural') {
          const n = parseInt(val, 10)
          const idx = KURALS.findIndex((k) => k.n === n)
          if (idx >= 0) openReader(idx)
        }
      })
      setTimeout(() => {
        const target = document.getElementById('browse') || document.getElementById('daily')
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
      }, 50)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filtered results
  const results = useMemo(() => {
    return KURALS.filter((k) => {
      if (book !== 'all' && k.sec !== book) return false
      if (chapter !== 'all' && String(k.ch) !== String(chapter)) return false
      if (themeFilter !== 'all' && k.th !== themeFilter) return false
      const q = (query || '').trim().toLowerCase()
      if (!q) return true
      if (/^\d+$/.test(q)) return String(k.n) === String(parseInt(q, 10))
      const ch = CHAPTERS.find((c) => c.n === k.ch)
      const sec = SECTIONS.find((s) => s.id === k.sec)
      const haystack = [
        k.ta[0], k.ta[1], k.tr[0], k.tr[1], k.en[0], k.en[1], k.s,
        ch ? ch.ta : '', ch ? ch.en : '',
        sec ? sec.ta : '', sec ? sec.en : '',
      ].join(' \n ').toLowerCase()
      return q.split(/\s+/).every((w) => haystack.indexOf(w) !== -1)
    })
  }, [book, chapter, themeFilter, query])

  // Stash latest results for the observer closure
  const resultsRef = useRef(results)
  useEffect(() => { resultsRef.current = results }, [results])

  const visible = results.slice(0, shown)

  // When a mood is chosen, show its situation subset; clicking a situation sets theme.
  const moodFilter = mood ? MOODS.find((m) => m.id === mood) : null

  const onPickSituation = (id) => {
    vibrate(6)
    if (situation === id) {
      setSituation(null); setThemeFilter('all')
    } else {
      const sit = SITUATIONS.find((s) => s.id === id)
      if (sit) { setSituation(sit.id); setThemeFilter(sit.theme); setChapter('all'); setBook('all') }
    }
  }

  const onPickBook = (id) => {
    vibrate(6)
    setBook(id); setChapter('all'); setThemeFilter('all'); setSituation(null); setMood(null)
    setTimeout(() => scrollToId('browse'), 50)
  }

  const onPickMood = (id) => {
    vibrate(6)
    setMood(mood === id ? null : id)
  }

  const onClear = () => {
    setBook('all'); setChapter('all'); setThemeFilter('all'); setSituation(null); setMood(null); setQuery('')
    const s = document.getElementById('search')
    if (s) s.value = ''
  }

  const openReader = (startIdx) => {
    setReaderStart(startIdx)
    setReaderOpen(true)
    document.body.style.overflow = 'hidden'
  }
  const closeReader = () => {
    setReaderOpen(false)
    document.body.style.overflow = ''
  }

  const handleShareApp = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'திருக்குறள் · Tamil Stoic',
          text: 'A quiet corner for Thirukkural — one couplet a day.',
          url: window.location.origin + '/tamil-stoic-app/',
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        flash('Link copied')
      }
    } catch { /* user cancel */ }
  }

  const flash = (msg) => {
    setShareStatus(msg)
    setTimeout(() => setShareStatus(''), 1800)
  }

  const onInstall = async () => {
    const accepted = await install.show()
    if (accepted) setInstallDismissed(true)
  }
  const onDismissInstall = () => {
    setInstallDismissed(true)
    try { sessionStorage.setItem('ts.install.dismissed', '1') } catch { /* ignore */ }
  }

  return (
    <>
      <TopBar
        onOpenFavs={() => setFavsOpen(true)}
        favCount={favs.length}
        canInstall={install.canInstall && !installDismissed}
        installed={install.installed}
        onInstall={onInstall}
        onShare={handleShareApp}
      />

      <InstallBanner
        visible={install.canInstall && !installDismissed && !install.installed}
        onInstall={onInstall}
        onDismiss={onDismissInstall}
      />

      <header className="site-header" id="top">
        <span className="eyebrow">Tamil Stoic · தமிழ் ஸ்டோயிக்</span>
        <h1>திருக்குறள்</h1>
        <p className="subtitle">Thirukkural — couplets of Thiruvalluvar</p>
        <p className="tagline">
          One couplet a day. Three books to walk through. A door for the situation
          you're in right now — and every verse in <b>Tamil</b> with a plain-English meaning.
          Install it to read offline.
        </p>
      </header>

      <DailyKural
        kurals={KURALS}
        chapters={CHAPTERS}
        sections={SECTIONS}
        initialIndex={dailyIdx}
        setDailyIdx={setDailyIdx}
        favs={favs}
        onFav={toggleFav}
        reactions={reactions}
        onReact={react}
        streak={streak}
        onOpenReader={(i) => openReader(i)}
        onStatus={flash}
        themes={THEMES}
      />

      <MoodPicker active={mood} onPick={onPickMood} />

      <Books sections={SECTIONS} kurals={KURALS} active={book} onPick={onPickBook} />

      <Situations active={situation} moodFilter={moodFilter} onPick={onPickSituation} />

      <Browse
        kurals={KURALS}
        chapters={CHAPTERS}
        sections={SECTIONS}
        themes={THEMES.filter((t) => t.id !== 'all')}
        favs={favs}
        onFav={toggleFav}
        reactions={reactions}
        onReact={react}
        book={book}
        chapter={chapter}
        theme={themeFilter}
        situation={situation}
        query={query}
        shown={shown}
        visible={visible}
        results={results}
        onSetBook={setBook}
        onSetChapter={(n) => { vibrate(6); setChapter(n); setSituation(null); if (n !== 'all') setThemeFilter('all') }}
        onSetTheme={(id) => { vibrate(6); setThemeFilter(id); setSituation(null); if (id !== 'all') setChapter('all') }}
        onSetSituation={setSituation}
        onSetQuery={setQuery}
        onClear={onClear}
        onOpenReader={(listIdx) => {
          const k = visible[listIdx]
          if (!k) return
          const globalIdx = KURALS.findIndex((x) => x.n === k.n)
          openReader(globalIdx)
        }}
        onStatus={flash}
        sentinelRef={sentinelRef}
        showTranslit={showTranslit}
        onToggleTranslit={() => setShowTranslit((v) => !v)}
        showTranslation={showTranslation}
        onToggleTranslation={() => setShowTranslation((v) => !v)}
        showMeaning={showMeaning}
        onToggleMeaning={() => setShowMeaning((v) => !v)}
      />

      <Reader
        open={readerOpen}
        startIndex={readerStart}
        kurals={KURALS}
        chapters={CHAPTERS}
        sections={SECTIONS}
        favs={favs}
        onFav={toggleFav}
        reactions={reactions}
        onReact={react}
        onClose={closeReader}
        onStatus={flash}
      />

      <Favorites
        open={favsOpen}
        favs={favs}
        kurals={KURALS}
        chapters={CHAPTERS}
        sections={SECTIONS}
        onFav={toggleFav}
        reactions={reactions}
        onReact={react}
        onOpenReader={(idx) => { setFavsOpen(false); openReader(idx) }}
        onClose={() => setFavsOpen(false)}
        onStatus={flash}
      />

      <footer className="site-footer">
        <div className="footer-inner">
          <p className="footer-ta"><b>யாதனின் யாதனின் நீங்கியான் நோதல் அதனின் யாதனின் இல்லன் நலம்.</b> (குறள் 360)</p>
          <p>
            English verse translations and prose explanations by <b>G. U. Pope</b> (with W. H. Drew,
            John Lazarus &amp; F. W. Ellis, 1886) — in the public domain. The simple-English meanings
            are original to this app, written from Pope's prose. Tamil text follows the standard
            Parimelalagar recension, built from <b>github.com/tk120404/thirukkural</b>
            (Apache&nbsp;License&nbsp;2.0) via <code>scripts/build-kurals.mjs</code>.
          </p>
          <p><b>tamil-stoic-app</b> · A calm corner for Tamil wisdom. அறம் · பொருள் · காமம்</p>
        </div>
      </footer>

      <div className={shareStatus ? 'share-status show' : 'share-status'} role="status" aria-live="polite">{shareStatus}</div>
      <canvas id="share-canvas" width="1080" height="1080" style={{ display: 'none' }} />
    </>
  )
}

// ---------- helpers ----------
function todayIndex(total) {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d - start
  const day = Math.floor(diff / 86400000)
  return day % Math.max(1, total)
}

function scrollToId(id) {
  const el = document.getElementById(id)
  if (el && typeof el.scrollIntoView === 'function') {
    try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }) } catch { /* ignore */ }
  }
}
