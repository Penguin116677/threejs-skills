import type { SVGProps } from 'react'

/** Minimal brand marks (lucide no longer ships brand icons). */
type P = SVGProps<SVGSVGElement>
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const InstagramIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)
export const LinkedinIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10.5V16M8 7.6v.01M11.5 16v-3.2c0-1.5 1-2.3 2.1-2.3s1.9.8 1.9 2.3V16M11.5 10.5V16" />
  </svg>
)
export const BehanceIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 7h5a2.5 2.5 0 0 1 0 5H3V7Zm0 5h5.5a2.5 2.5 0 0 1 0 5H3v-5ZM14.5 7.5h5M14 14h7a3.5 3.5 0 1 0-1 2.6" />
  </svg>
)
export const WhatsappIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20l1.3-4A8 8 0 1 1 8 18.8L4 20Z" />
    <path d="M9 9.5c.3 1.9 1.6 3.4 3.5 4.3l1-1 2 .8-.3 1.6c-3.3.2-7-3.5-6.8-6.8L10 8l.8 2-1 1" />
  </svg>
)
