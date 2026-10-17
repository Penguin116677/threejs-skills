import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { FallbackSculpture } from './FallbackSculpture'
import { isLowEndDevice, prefersReducedMotion, supportsWebGL } from '../lib/capabilities'
import { useMediaQuery } from '../hooks/useMediaQuery'

const HeroScene = lazy(() => import('../three/HeroScene'))

type Mode = 'pending' | 'webgl' | 'fallback'

export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('pending')
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(true)
  const compact = useMediaQuery('(max-width: 767px)')
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  // Decide once, after first paint, so the 3D chunk never blocks the headline.
  useEffect(() => {
    const decide = () => setMode(supportsWebGL() && !isLowEndDevice() && !prefersReducedMotion() ? 'webgl' : 'fallback')
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(decide, { timeout: 900 })
    else setTimeout(decide, 300)
  }, [])

  // Pause the render loop when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let onScreen = true
    const update = () => setVisible(onScreen && document.visibilityState === 'visible')
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      update()
    })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <div ref={ref} className="relative h-full w-full">
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
        style={{ opacity: mode === 'webgl' && ready ? 0 : 1 }}
      >
        <FallbackSculpture className="max-w-[min(78vw,560px)]" animated={!reduced} />
      </div>

      {mode === 'webgl' && (
        <div
          className="absolute inset-0 transition-opacity delay-300 duration-[1400ms] ease-[var(--ease-out-expo)]"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <Suspense fallback={null}>
            <HeroScene
              paused={!visible}
              reducedMotion={reduced}
              compact={compact}
              onPerformanceFail={() => setMode('fallback')}
            />
            <ReadySignal onReady={() => setReady(true)} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

/** Renders inside Suspense — mounts only once the lazy 3D chunk resolved. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const t = setTimeout(onReady, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, [])
  return null
}
