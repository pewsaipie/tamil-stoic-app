/**
 * HeroScene — the Three.js side of the hero background.
 *
 * This module is the *only* place that imports three / @react-three/fiber, and
 * it is loaded through a dynamic import from HeroCanvas so the ~135 KB library
 * never touches the first paint.
 */
import { useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AGED_LEAF_FRAGMENT, AGED_LEAF_VERTEX } from './shaders/agedLeaf'

interface LeafColors {
  a: string
  b: string
  c: string
  ember: number
}

/** Read the hero material colours straight from the active theme's tokens. */
function readColors(): LeafColors {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback

  const root = document.documentElement
  const theme = root.dataset['theme'] ?? 'system'
  // "Follow system" has no explicit data-theme, so ask the OS directly.
  const isNight = theme === 'night' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return {
    a: read('--hero-tint-a', '#e8d9b0'),
    b: read('--hero-tint-b', '#b98f4a'),
    c: read('--hero-tint-c', '#6b4a1c'),
    // Sangam Night pools ember light; Palm-Leaf does not.
    ember: isNight ? 1 : 0,
  }
}

/**
 * Track the active theme. `data-theme` covers the explicit choice; the media
 * query covers "Follow system" while the OS flips appearance at dusk.
 */
function useHeroColors(): LeafColors {
  const [colors, setColors] = useState<LeafColors>(readColors)

  useEffect(() => {
    const sync = (): void => setColors(readColors())

    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', sync)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', sync)
    }
  }, [])

  return colors
}

function LeafPlane({ frozen }: { frozen: boolean }) {
  const { size } = useThree()
  const colors = useHeroColors()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color('#e8d9b0') },
      uColorB: { value: new THREE.Color('#b98f4a') },
      uColorC: { value: new THREE.Color('#6b4a1c') },
      uEmber: { value: 0 },
    }),
    [],
  )

  // Re-tint the material when the reader switches theme.
  useEffect(() => {
    uniforms.uColorA.value.set(colors.a)
    uniforms.uColorB.value.set(colors.b)
    uniforms.uColorC.value.set(colors.c)
    uniforms.uEmber.value = colors.ember
  }, [colors, uniforms])

  // Keep the shader's aspect correction in step with the canvas size.
  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height)
  }, [size, uniforms])

  useFrame((_, delta) => {
    // Reduced motion freezes the material rather than slowing it: the canvas
    // is also switched to on-demand rendering by the parent.
    if (!frozen) uniforms.uTime.value += delta
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={AGED_LEAF_VERTEX}
        fragmentShader={AGED_LEAF_FRAGMENT}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export interface HeroSceneProps {
  /** Freeze the material when the reader asks for reduced motion. */
  frozen?: boolean
}

export default function HeroScene({ frozen = false }: HeroSceneProps) {
  return (
    <Canvas
      // 'demand' renders a single frame and stays idle — the right choice when
      // the material is frozen.
      frameloop={frozen ? 'demand' : 'always'}
      // Cap the pixel ratio: retina phones otherwise burn battery on a
      // background nobody looks at directly.
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: 'low-power', alpha: true }}
      camera={{ position: [0, 0, 1] }}
      style={{ width: '100%', height: '100%' }}
    >
      <LeafPlane frozen={frozen} />
    </Canvas>
  )
}
