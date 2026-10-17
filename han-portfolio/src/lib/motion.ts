import type { Transition, Variants } from 'framer-motion'

/**
 * Brand motion identity — "Premium" personality.
 * One signature curve, three durations, one entrance pattern (rise + fade).
 */
export const ease = [0.16, 1, 0.3, 1] as const // ease-out-expo: decelerating entrances
export const easeIn = [0.4, 0, 1, 1] as const // exits accelerate away

export const duration = { quick: 0.2, standard: 0.5, slow: 0.9 } as const

export const transition: Transition = { duration: duration.standard, ease }

export const reveal: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
}

/** Stagger container — total stagger kept under ~500ms. */
export const stagger = (step = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
})

export const inView = { once: true, margin: '0px 0px -12% 0px' } as const
