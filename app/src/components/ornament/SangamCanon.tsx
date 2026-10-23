import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useMaterials } from '../../materials/useMaterials.ts'
import { useOrnamentParallax } from './useOrnamentParallax'

export type CanonTheme =
  | 'kurinji-vaikarai'
  | 'marutham-vidiyal'
  | 'olai-agal'
  | 'mullai-erpaadu'
  | 'palai-nanpagal'
  | 'natukal'
  | 'chola-varalaru'

interface CanonLayer {
  name: string
  motion?:
    | 'anim-canon-root'
    | 'anim-canon-hanging'
    | 'anim-canon-water'
    | 'anim-canon-glow'
    | 'anim-chola-sheen'
}

const ROUTE_LAYERS: Record<Exclude<CanonTheme, 'kurinji-vaikarai'>, readonly CanonLayer[]> = {
  'marutham-vidiyal': [
    { name: 'marutham-checks', motion: 'anim-canon-water' },
    { name: 'marutham-paddy', motion: 'anim-canon-root' },
    { name: 'marutham-lotus', motion: 'anim-canon-water' },
  ],
  'olai-agal': [
    { name: 'olai-fibre' },
    { name: 'olai-stylus' },
    { name: 'olai-lamp' },
  ],
  'mullai-erpaadu': [
    { name: 'mullai-banyan', motion: 'anim-canon-root' },
    { name: 'mullai-screen', motion: 'anim-canon-hanging' },
    { name: 'mullai-jasmine' },
  ],
  'palai-nanpagal': [
    { name: 'palai-branch', motion: 'anim-canon-root' },
    { name: 'palai-kalli' },
    { name: 'palai-bundle' },
  ],
  natukal: [
    { name: 'natukal-light', motion: 'anim-canon-glow' },
    { name: 'natukal-ground' },
  ],
  'chola-varalaru': [
    { name: 'chola-bronze', motion: 'anim-chola-sheen' },
    { name: 'chola-weapons' },
    { name: 'chola-archaeology' },
    { name: 'chola-wealth', motion: 'anim-canon-glow' },
  ],
}

const ROUTE_WEATHER = {
  'marutham-vidiyal': 'anim-canon-water',
  'olai-agal': 'anim-canon-glow',
  'mullai-erpaadu': 'anim-canon-glow',
  'palai-nanpagal': 'anim-canon-shimmer',
  natukal: 'anim-canon-dust',
  'chola-varalaru': 'anim-canon-glow',
} as const

export function canonForPath(pathname: string): CanonTheme {
  if (pathname === '/chapters' || pathname.startsWith('/chapters/')) return 'marutham-vidiyal'
  if (pathname.startsWith('/kural/')) return 'olai-agal'
  if (pathname === '/ask' || pathname.startsWith('/ask/')) return 'mullai-erpaadu'
  if (pathname === '/saved' || pathname.startsWith('/saved/')) return 'palai-nanpagal'
  if (pathname === '/credits' || pathname.startsWith('/credits/')) return 'natukal'
  if (pathname === '/history' || pathname.startsWith('/history/')) return 'chola-varalaru'
  return 'kurinji-vaikarai'
}

/**
 * Owns the route's historical identity and mounts only that route's layers.
 * Home keeps its PR #29 hero-local stage; every other route receives a fixed,
 * viewport-edge stage behind the feature surfaces. CSS background rules mean
 * the other five canons are never fetched merely by visiting this one.
 */
export function SangamCanon() {
  const { pathname } = useLocation()
  const theme = canonForPath(pathname)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.canon = theme
    return () => {
      if (root.dataset.canon === theme) delete root.dataset.canon
    }
  }, [theme])

  if (theme === 'kurinji-vaikarai') return null
  return <RouteOrnament key={theme} theme={theme} />
}

function RouteOrnament({ theme }: { theme: Exclude<CanonTheme, 'kurinji-vaikarai'> }) {
  const { tier } = useMaterials()
  const stageRef = useRef<HTMLDivElement | null>(null)
  useOrnamentParallax(stageRef)

  if (tier === 'plain' || tier === 'contrast') return null

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      className={`ornament-stage ornament-stage--route ornament-stage--${theme}`}
      data-ornament={theme}
      data-route-ornament="true"
    >
      <div className={`canon-weather canon-weather--${theme} ${ROUTE_WEATHER[theme]}`} />
      {ROUTE_LAYERS[theme].map((layer) => (
        <div key={layer.name} className={`ornament-layer ornament-layer--${layer.name}`}>
          <div
            className={`ornament-sway ornament-sway--${layer.name} ornament-bg--${layer.name}${layer.motion ? ` ${layer.motion}` : ''}`}
          />
        </div>
      ))}
    </div>
  )
}
