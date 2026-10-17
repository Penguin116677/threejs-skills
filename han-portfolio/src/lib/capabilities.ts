/**
 * Decide whether the device should get the WebGL hero or the CSS fallback.
 * Conservative on purpose: low-end Android phones get the lightweight version.
 */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!gl
  } catch {
    return false
  }
}

export function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }
  const cores = nav.hardwareConcurrency ?? 8
  const memory = nav.deviceMemory ?? 8
  const saveData = nav.connection?.saveData === true
  const slowNet = /(^|-)2g$/.test(nav.connection?.effectiveType ?? '')
  return saveData || slowNet || cores <= 2 || memory <= 2 || (cores <= 4 && memory <= 4)
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
