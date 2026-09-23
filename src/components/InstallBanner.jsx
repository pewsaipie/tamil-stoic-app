import { cx } from '../lib/util'

export default function InstallBanner({ visible, onInstall, onDismiss }) {
  return (
    <div className={cx('install-banner', visible && 'visible')} role="region" aria-label="Install app">
      <span aria-hidden="true">📱</span>
      <span><b>Install Tamil Stoic</b> — one tap on your home screen, works offline.</span>
      <button type="button" onClick={onInstall}>Install</button>
      <button type="button" className="dismiss" onClick={onDismiss} aria-label="Dismiss install banner">Dismiss</button>
    </div>
  )
}
