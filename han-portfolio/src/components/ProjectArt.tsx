import { useId } from 'react'
import type { ProjectArtKey } from '../data/projects'

/**
 * Original, procedural preview compositions for the concept projects.
 * Each is a 16:10 SVG "screen" in the project's art direction.
 * Groups marked `.art-*` react to the parent `.group` hover for a
 * subtle, project-specific transition.
 */

const serif = "'Didot', 'Bodoni 72', 'Playfair Display', Georgia, 'Times New Roman', serif"
const sans = "'Space Grotesk Variable', 'Space Grotesk', system-ui, sans-serif"
const mono = "'JetBrains Mono', ui-monospace, monospace"

const move = 'transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] [transform-box:fill-box] origin-center'

function useUid() {
  return useId().replace(/[^a-zA-Z0-9]/g, '')
}

function Aureon() {
  const id = useUid()
  return (
    <>
      <defs>
        <radialGradient id={`${id}spot`} cx="0.62" cy="0.42" r="0.55">
          <stop offset="0" stopColor="#5a4523" />
          <stop offset="0.45" stopColor="#1a1510" />
          <stop offset="1" stopColor="#0a0907" />
        </radialGradient>
        <linearGradient id={`${id}gold`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6e2a9" />
          <stop offset="0.5" stopColor="#c9a45c" />
          <stop offset="1" stopColor="#6e5226" />
        </linearGradient>
        <linearGradient id={`${id}glass`} x1="0" x2="1">
          <stop offset="0" stopColor="#2a2116" />
          <stop offset="0.3" stopColor="#8a6a35" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#f1e4c3" stopOpacity="0.95" />
          <stop offset="0.75" stopColor="#7a5c2c" />
          <stop offset="1" stopColor="#1d1710" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill={`url(#${id}spot)`} />
      {/* light beam */}
      <path d="M1040 0 L1220 0 L1340 1000 L760 1000 Z" fill="#f1e4c3" opacity="0.05" />
      <g fontFamily={sans} fill="#f1e4c3" fontSize="20" letterSpacing="6">
        <text x="90" y="92" fontFamily={serif} fontSize="34" letterSpacing="10">AUREON</text>
        <text x="1060" y="90" opacity="0.6">COLLECTION</text>
        <text x="1260" y="90" opacity="0.6">MAISON</text>
        <text x="1420" y="90" opacity="0.6">RESERVE</text>
      </g>
      <line x1="90" y1="130" x2="1510" y2="130" stroke="#c9a45c" strokeOpacity="0.3" />
      <g fontFamily={serif} fill="#f1e4c3">
        <text x="90" y="420" fontSize="128" fontStyle="italic">The art</text>
        <text x="90" y="550" fontSize="128">of <tspan fill={`url(#${id}gold)`}>light.</tspan></text>
      </g>
      <text x="94" y="640" fontFamily={sans} fontSize="22" fill="#f1e4c3" opacity="0.6" letterSpacing="2">Eau de Parfum — N° 01 · 50 ml</text>
      <rect x="94" y="700" width="250" height="64" rx="32" fill="none" stroke="#c9a45c" />
      <text x="140" y="741" fontFamily={sans} fontSize="20" fill="#f1e4c3" letterSpacing="5">DISCOVER</text>
      {/* bottle */}
      <g className={`${move} art-lift group-hover:-translate-y-4`}>
        <ellipse cx="1150" cy="860" rx="210" ry="26" fill="#000" opacity="0.6" />
        <rect x="1070" y="250" width="160" height="90" rx="10" fill={`url(#${id}gold)`} />
        <rect x="1110" y="330" width="80" height="40" fill="#3a2d18" />
        <rect x="990" y="365" width="320" height="490" rx="46" fill={`url(#${id}glass)`} />
        <rect x="1010" y="385" width="40" height="440" rx="20" fill="#fff" opacity="0.22" />
        <text x="1150" y="640" textAnchor="middle" fontFamily={serif} fontSize="40" fill="#1a1510" letterSpacing="8">AUREON</text>
        <line x1="1080" y1="664" x2="1220" y2="664" stroke="#1a1510" strokeOpacity="0.5" />
      </g>
      <text x="1510" y="940" textAnchor="end" fontFamily={sans} fontSize="16" fill="#c9a45c" letterSpacing="4" opacity="0.7">SCROLL · 01 / 05</text>
    </>
  )
}

function Nexora() {
  const id = useUid()
  const panel = '#ffffff'
  return (
    <>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b0820" />
          <stop offset="0.6" stopColor="#1b1446" />
          <stop offset="1" stopColor="#3a1f7a" />
        </linearGradient>
        <radialGradient id={`${id}orb`}>
          <stop offset="0" stopColor="#c6b8ff" />
          <stop offset="0.4" stopColor="#7b5cff" />
          <stop offset="1" stopColor="#7b5cff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}line`} x1="0" x2="1">
          <stop offset="0" stopColor="#7b5cff" />
          <stop offset="1" stopColor="#ff6ad5" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill={`url(#${id}bg)`} />
      <circle cx="1180" cy="420" r="420" fill={`url(#${id}orb)`} opacity="0.55" />
      <g fontFamily={sans} fill="#fff">
        <circle cx="104" cy="84" r="14" fill="#7b5cff" />
        <text x="130" y="92" fontSize="26" fontWeight="600">nexora</text>
        <text x="760" y="92" fontSize="18" opacity="0.6">Product</text>
        <text x="880" y="92" fontSize="18" opacity="0.6">Pricing</text>
        <text x="990" y="92" fontSize="18" opacity="0.6">Docs</text>
        <rect x="1340" y="58" width="170" height="52" rx="26" fill="#fff" />
        <text x="1425" y="92" fontSize="18" fill="#0b0820" textAnchor="middle" fontWeight="600">Start free</text>
        <text x="90" y="330" fontSize="92" fontWeight="600" letterSpacing="-3">Insight,</text>
        <text x="90" y="430" fontSize="92" fontWeight="600" letterSpacing="-3" opacity="0.55">automated.</text>
        <text x="94" y="500" fontSize="22" opacity="0.6">Analytics that explain themselves.</text>
      </g>
      {/* floating panels */}
      <g className={`${move} group-hover:-translate-y-3 group-hover:-translate-x-2`}>
        <rect x="760" y="230" width="640" height="400" rx="26" fill={panel} fillOpacity="0.07" stroke={panel} strokeOpacity="0.18" />
        <text x="800" y="290" fontFamily={mono} fontSize="16" fill="#c6b8ff">REVENUE SIGNAL</text>
        <polyline points="800,560 880,520 960,540 1040,460 1120,480 1200,380 1280,400 1360,320" fill="none" stroke={`url(#${id}line)`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="800,560 880,520 960,540 1040,460 1120,480 1200,380 1280,400 1360,320 1360,600 800,600" fill="#7b5cff" opacity="0.15" />
        <circle cx="1200" cy="380" r="10" fill="#fff" />
      </g>
      <g className={`${move} group-hover:translate-y-3 group-hover:translate-x-3`}>
        <rect x="1180" y="560" width="300" height="200" rx="22" fill="#14103a" stroke={panel} strokeOpacity="0.2" />
        <text x="1210" y="610" fontFamily={mono} fontSize="14" fill="#c6b8ff">AI SUMMARY</text>
        <rect x="1210" y="635" width="230" height="10" rx="5" fill="#fff" opacity="0.5" />
        <rect x="1210" y="660" width="190" height="10" rx="5" fill="#fff" opacity="0.3" />
        <rect x="1210" y="685" width="210" height="10" rx="5" fill="#fff" opacity="0.3" />
        <rect x="1210" y="715" width="90" height="26" rx="13" fill="#7b5cff" />
      </g>
      <g className={`${move} group-hover:-translate-y-2`}>
        <rect x="640" y="600" width="300" height="170" rx="22" fill="#14103a" stroke={panel} strokeOpacity="0.2" />
        <text x="670" y="650" fontFamily={mono} fontSize="14" fill="#c6b8ff">ACTIVE USERS</text>
        <text x="670" y="720" fontFamily={sans} fontSize="56" fill="#fff" fontWeight="600">48.2k</text>
        <text x="850" y="720" fontFamily={mono} fontSize="16" fill="#b8ff6a">+12%</text>
      </g>
      <text x="94" y="935" fontFamily={mono} fontSize="14" fill="#fff" opacity="0.35">SAMPLE DATA · CONCEPT INTERFACE</text>
    </>
  )
}

function Velora() {
  const id = useUid()
  return (
    <>
      <defs>
        <linearGradient id={`${id}coat`} x1="0" x2="1">
          <stop offset="0" stopColor="#5e120f" />
          <stop offset="0.5" stopColor="#8c1d18" />
          <stop offset="1" stopColor="#4a0d0b" />
        </linearGradient>
        <linearGradient id={`${id}wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6ddd1" />
          <stop offset="1" stopColor="#cfc3b3" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="#f2ede6" />
      {/* editorial image panel */}
      <rect x="560" y="140" width="520" height="760" fill={`url(#${id}wall)`} />
      <g className={`${move} group-hover:scale-[1.04]`}>
        <path d="M820 300 C 760 300 740 360 760 410 L 700 900 L 940 900 L 880 410 C 900 360 880 300 820 300 Z" fill={`url(#${id}coat)`} />
        <ellipse cx="820" cy="250" rx="46" ry="58" fill="#2b1d16" />
        <path d="M775 230 C 790 170 860 170 870 235 C 850 210 800 210 775 230 Z" fill="#141414" />
        <path d="M760 420 L 700 640 L 726 650 L 790 450 Z" fill="#6d1612" />
      </g>
      <text x="800" y="560" textAnchor="middle" fontFamily={serif} fontSize="330" fill="#141414" letterSpacing="-6" style={{ mixBlendMode: 'multiply' }}>VELORA</text>
      <g fontFamily={sans} fill="#141414">
        <text x="90" y="92" fontSize="18" letterSpacing="4">WOMEN</text>
        <text x="210" y="92" fontSize="18" letterSpacing="4">MEN</text>
        <text x="300" y="92" fontSize="18" letterSpacing="4">ATELIER</text>
        <text x="1510" y="92" fontSize="18" letterSpacing="4" textAnchor="end">BAG (2)</text>
        <text x="90" y="740" fontSize="16" letterSpacing="4" opacity="0.6">AUTUMN / WINTER</text>
        <text x="90" y="800" fontFamily={serif} fontSize="58" fontStyle="italic">The Red Edit</text>
        <text x="90" y="860" fontSize="16" letterSpacing="3" textDecoration="underline">SHOP THE COLLECTION</text>
      </g>
      {/* product thumbs */}
      <g fontFamily={sans} fontSize="15" fill="#141414">
        {[0, 1].map((i) => (
          <g key={i} className={`${move} group-hover:-translate-y-2`} style={{ transitionDelay: `${i * 80}ms` }}>
            <rect x={1170 + i * 180} y="560" width="160" height="210" fill={i ? '#d9cfc2' : '#141414'} />
            <rect x={1215 + i * 180} y="600" width="70" height="140" rx="30" fill={i ? '#8c1d18' : '#3a3a3a'} />
            <text x={1170 + i * 180} y="800">{i ? 'Wool Coat' : 'Silk Dress'}</text>
            <text x={1170 + i * 180} y="824" opacity="0.6">€ —</text>
          </g>
        ))}
      </g>
    </>
  )
}

function Orbital() {
  const id = useUid()
  return (
    <>
      <defs>
        <radialGradient id={`${id}planet`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#7ff0ff" />
          <stop offset="0.25" stopColor="#1d6fa3" />
          <stop offset="0.6" stopColor="#0c2742" />
          <stop offset="1" stopColor="#03060c" />
        </radialGradient>
        <radialGradient id={`${id}atmo`}>
          <stop offset="0.72" stopColor="#39e1ff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#39e1ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#39e1ff" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}grid`} width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M80 0H0V80" fill="none" stroke="#39e1ff" strokeOpacity="0.07" />
        </pattern>
      </defs>
      <rect width="1600" height="1000" fill="#05070d" />
      <rect width="1600" height="1000" fill={`url(#${id}grid)`} />
      {Array.from({ length: 40 }).map((_, i) => (
        <circle key={i} cx={(i * 397) % 1600} cy={(i * 211) % 1000} r={i % 5 === 0 ? 2 : 1} fill="#fff" opacity={0.25 + (i % 4) * 0.12} />
      ))}
      <g className={`${move} group-hover:rotate-[8deg]`}>
        <circle cx="1080" cy="560" r="470" fill={`url(#${id}atmo)`} />
        <circle cx="1080" cy="560" r="360" fill={`url(#${id}planet)`} />
        <path d="M760 520 C 900 470 1050 600 1400 540" stroke="#39e1ff" strokeOpacity="0.25" fill="none" strokeWidth="2" />
        <path d="M780 640 C 950 600 1150 700 1380 650" stroke="#39e1ff" strokeOpacity="0.18" fill="none" strokeWidth="2" />
      </g>
      <ellipse cx="1080" cy="560" rx="560" ry="140" fill="none" stroke="#b8ff6a" strokeOpacity="0.55" strokeWidth="2" transform="rotate(-14 1080 560)" />
      <ellipse cx="1080" cy="560" rx="660" ry="200" fill="none" stroke="#39e1ff" strokeOpacity="0.25" strokeDasharray="4 10" transform="rotate(-14 1080 560)" />
      <circle cx="560" cy="640" r="9" fill="#b8ff6a" />
      <circle cx="1620" cy="440" r="6" fill="#39e1ff" />
      <g fontFamily={sans} fill="#e8f6ff">
        <text x="90" y="92" fontSize="24" fontWeight="600" letterSpacing="8">ORBITAL</text>
        <text x="90" y="330" fontSize="96" fontWeight="600" letterSpacing="-3">See the</text>
        <text x="90" y="430" fontSize="96" fontWeight="600" letterSpacing="-3">whole <tspan fill="#39e1ff">planet.</tspan></text>
        <text x="94" y="500" fontSize="22" opacity="0.6">Satellite data, turned into decisions.</text>
        <rect x="94" y="550" width="230" height="58" rx="29" fill="#b8ff6a" />
        <text x="209" y="586" fontSize="19" fill="#05070d" textAnchor="middle" fontWeight="600">Request access</text>
      </g>
      <g fontFamily={mono} fontSize="14" fill="#39e1ff" opacity="0.7">
        <text x="1300" y="92">LAT 48.8566° N</text>
        <text x="1300" y="116">LON 2.3522° E</text>
        <text x="94" y="935">ORBIT 03 / SYNC ●</text>
      </g>
    </>
  )
}

function Monolith() {
  return (
    <>
      <rect width="1600" height="1000" fill="#f4f4f4" />
      {/* exposed grid */}
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={i} x1={i * 133.3} y1="0" x2={i * 133.3} y2="1000" stroke="#000" strokeOpacity="0.1" />
      ))}
      <line x1="0" y1="140" x2="1600" y2="140" stroke="#000" />
      <g fontFamily={mono} fontSize="16" fill="#000">
        <text x="40" y="90">MONOLITH®</text>
        <text x="540" y="90">INDEX (24)</text>
        <text x="840" y="90">STUDIO</text>
        <text x="1560" y="90" textAnchor="end">CONTACT ↗</text>
      </g>
      <g className={`${move} group-hover:translate-x-6`}>
        <text x="30" y="470" fontFamily={sans} fontWeight="700" fontSize="370" letterSpacing="-28" fill="#000">MONO</text>
      </g>
      <g className={`${move} group-hover:-translate-x-6`}>
        <text x="380" y="800" fontFamily={sans} fontWeight="700" fontSize="370" letterSpacing="-28" fill="none" stroke="#000" strokeWidth="3">LITH</text>
      </g>
      <g className={`${move} group-hover:-translate-y-5`}>
        <rect x="1230" y="300" width="230" height="600" fill="#000" />
        <rect x="1230" y="300" width="18" height="600" fill="#3a3a3a" />
      </g>
      <g fontFamily={mono} fontSize="15" fill="#000">
        <text x="40" y="920">(01) ARCHITECTURE OF ATTENTION</text>
        <text x="40" y="950" opacity="0.5">EXPERIMENTAL LAYOUT SYSTEM — v.02</text>
        <text x="1200" y="950">↓ SCROLL</text>
      </g>
    </>
  )
}

function Liquid() {
  const id = useUid()
  return (
    <>
      <defs>
        <radialGradient id={`${id}chrome`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.18" stopColor="#d7dbe2" />
          <stop offset="0.45" stopColor="#5d626d" />
          <stop offset="0.7" stopColor="#15171c" />
          <stop offset="0.9" stopColor="#ff6a00" />
          <stop offset="1" stopColor="#ffb27a" />
        </radialGradient>
        <radialGradient id={`${id}ember`} cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#ffd2b0" />
          <stop offset="0.35" stopColor="#ff6a00" />
          <stop offset="1" stopColor="#3a1500" />
        </radialGradient>
        <filter id={`${id}blur`}><feGaussianBlur stdDeviation="40" /></filter>
      </defs>
      <rect width="1600" height="1000" fill="#0b0c10" />
      <circle cx="1000" cy="520" r="300" fill="#ff6a00" opacity="0.28" filter={`url(#${id}blur)`} />
      <g className={`${move} group-hover:scale-110 group-hover:rotate-6`}>
        <path d="M760 320 C 900 180 1180 220 1250 400 C 1320 580 1180 800 980 790 C 800 780 720 650 690 540 C 670 450 700 380 760 320 Z" fill={`url(#${id}chrome)`} />
        <path d="M820 360 C 880 300 960 300 1000 330 C 930 330 870 360 830 420 Z" fill="#fff" opacity="0.55" />
      </g>
      <g className={`${move} group-hover:-translate-x-6 group-hover:translate-y-4`}>
        <path d="M1300 640 C 1370 600 1460 640 1450 720 C 1440 800 1340 820 1300 770 C 1260 720 1250 670 1300 640 Z" fill={`url(#${id}ember)`} />
      </g>
      <g className={`${move} group-hover:translate-x-4 group-hover:-translate-y-4`}>
        <circle cx="640" cy="260" r="46" fill={`url(#${id}chrome)`} />
      </g>
      <circle cx="1210" cy="300" r="34" fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="2" />
      <circle cx="1210" cy="300" r="4" fill="#fff" />
      <g fontFamily={sans} fill="#e8ecf2">
        <text x="90" y="92" fontSize="24" fontWeight="600">liquid—lab</text>
        <text x="1510" y="92" fontSize="18" opacity="0.6" textAnchor="end">works · about · say hi</text>
        <text x="90" y="760" fontSize="120" fontWeight="600" letterSpacing="-5">Form</text>
        <text x="90" y="880" fontSize="120" fontWeight="600" letterSpacing="-5" fill="#ff6a00">follows flow.</text>
      </g>
      <text x="1510" y="935" fontFamily={mono} fontSize="14" fill="#e8ecf2" opacity="0.4" textAnchor="end">MOVE YOUR CURSOR</text>
    </>
  )
}

const compositions: Record<ProjectArtKey, () => React.JSX.Element> = {
  aureon: Aureon,
  nexora: Nexora,
  velora: Velora,
  orbital: Orbital,
  monolith: Monolith,
  liquid: Liquid,
}

/** Where each composition keeps its focus when cropped into narrower cards. */
const focus: Partial<Record<ProjectArtKey, string>> = { nexora: 'xMinYMid', orbital: 'xMinYMid', monolith: 'xMinYMid' }

export function ProjectArt({ art, title, className }: { art: ProjectArtKey; title: string; className?: string }) {
  const C = compositions[art]
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio={`${focus[art] ?? 'xMidYMid'} slice`} className={className} role="img" aria-label={title}>
      <C />
    </svg>
  )
}
