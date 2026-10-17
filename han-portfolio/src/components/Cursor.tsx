import { useEffect, useRef } from 'react'
import { useIsDesktopPointer, useMediaQuery } from '../hooks/useMediaQuery'

/**
 * Subtle trailing ring on desktop only. The native cursor stays visible,
 * so usability is never affected. Grows over interactive elements.
 */
export function Cursor() {
  const desktop = useIsDesktopPointer()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const ring = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!desktop || reduced || !ring.current) return
    const el = ring.current
    let x = -100, y = -100, tx = -100, ty = -100, scale = 1, ts = 1, raf = 0, running = false

    const tick = () => {
      x += (tx - x) * 0.2
      y += (ty - y) * 0.2
      scale += (ts - scale) * 0.18
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - scale) > 0.1) raf = requestAnimationFrame(tick)
      else running = false
    }
    const kick = () => {
      if (!running) {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }
    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      const interactive = (e.target as HTMLElement).closest('a, button, [data-cursor="view"], input, select, textarea, label')
      ts = interactive ? 1.9 : 1
      el.dataset.active = interactive ? 'true' : 'false'
      el.style.opacity = '1'
      kick()
    }
    const onLeave = () => (el.style.opacity = '0')

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [desktop, reduced])

  if (!desktop || reduced) return null
  return (
    <div
      ref={ring}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] size-8 rounded-full border border-ember/70 opacity-0 mix-blend-screen transition-[opacity,background-color,border-color] duration-200 data-[active=true]:border-lime/60 data-[active=true]:bg-lime/10"
    />
  )
}
