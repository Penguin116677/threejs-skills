import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { inView, reveal, stagger } from '../lib/motion'
import { profile } from '../config/site'

/** Edit your about copy & principles here. */
const paragraphs = [
  "I'm a web designer focused on creating modern digital experiences that combine visual storytelling, thoughtful user experience, and functional design.",
  'I believe a website should do more than look beautiful. It should communicate clearly, build trust, and help a business achieve its goals.',
]
const principles = ['Purposeful Design', 'Clear User Experience', 'Responsive by Default', 'Performance Matters', 'Attention to Detail']

/** Abstract generative "portrait": topographic rings around a monogram. */
function AbstractPortrait() {
  const rings = Array.from({ length: 14 })
  return (
    <svg viewBox="0 0 400 500" className="size-full" role="img" aria-label="Abstract portrait placeholder for HAN">
      <defs>
        <radialGradient id="ab-glow" cx="0.55" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#ff6a00" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ab-stroke" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff6a00" />
          <stop offset="1" stopColor="#b8ff6a" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="#0d0f13" />
      <rect width="400" height="500" fill="url(#ab-glow)" />
      <g fill="none" stroke="url(#ab-stroke)">
        {rings.map((_, i) => {
          const r = 22 + i * 13
          const wobble = 6 + i * 1.6
          return (
            <path
              key={i}
              strokeOpacity={0.85 - i * 0.05}
              strokeWidth={i === 5 ? 1.6 : 0.8}
              d={`M ${210 - r} 210
                C ${210 - r} ${210 - r * 1.2 - wobble}, ${210 + r + wobble} ${210 - r * 1.25}, ${210 + r} 210
                S ${210 + r * 0.6} ${210 + r * 1.35 + wobble}, ${210 - r * 0.2} ${210 + r * 1.2}
                S ${210 - r - wobble} ${210 + r * 0.4}, ${210 - r} 210 Z`}
            />
          )
        })}
      </g>
      <text x="210" y="232" textAnchor="middle" fontFamily="Space Grotesk Variable, sans-serif" fontWeight="600" fontSize="64" fill="#f5f5f5" letterSpacing="-4">H</text>
      {/* frame ticks */}
      <g stroke="#f5f5f5" strokeOpacity="0.5">
        <path d="M16 40V16h24M360 16h24v24M384 460v24h-24M40 484H16v-24" fill="none" />
      </g>
      <text x="24" y="470" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#a0a0a0" letterSpacing="2">PORTRAIT · PLACEHOLDER</text>
    </svg>
  )
}

export function About() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['8%', '-8%'])

  return (
    <section id="about" aria-labelledby="about-title" className="relative py-28 sm:py-36">
      <div className="container-x grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
        <div ref={ref} className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
          <motion.div style={{ y }} className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_60px_120px_-50px_rgba(255,106,0,0.45)]">
            {profile.photo ? (
              <img src={profile.photo} alt={profile.photoAlt} loading="lazy" decoding="async" className="size-full object-cover" />
            ) : (
              <AbstractPortrait />
            )}
          </motion.div>
          <div aria-hidden="true" className="absolute -bottom-6 -right-4 hidden rounded-2xl border border-white/10 bg-ink-2/80 px-5 py-4 backdrop-blur-xl sm:block">
            <span className="label block">Approach</span>
            <span className="mt-1 block font-semibold tracking-tight">Strategy × Craft</span>
          </div>
        </div>

        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={inView} className="lg:col-span-6 lg:col-start-7">
          <motion.div variants={reveal} className="flex items-center gap-3">
            <span className="label text-ember">04</span>
            <span className="h-px w-10 bg-white/20" />
            <span className="label">About</span>
          </motion.div>
          <motion.h2 id="about-title" variants={reveal} className="display mt-6 text-[clamp(2.6rem,7vw,6rem)]">
            DESIGNING WITH <span className="text-gradient">PURPOSE.</span>
          </motion.h2>
          {paragraphs.map((p) => (
            <motion.p key={p} variants={reveal} className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-fg/80">
              {p}
            </motion.p>
          ))}

          <motion.ul variants={reveal} className="mt-10 border-t border-white/10" aria-label="Design principles">
            {principles.map((item, i) => (
              <li key={item} className="group flex items-center justify-between border-b border-white/10 py-4">
                <span className="flex items-baseline gap-5">
                  <span className="label w-6 text-ember">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-lg font-medium tracking-tight transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5">{item}</span>
                </span>
                <span aria-hidden="true" className="size-1.5 rounded-full bg-white/20 transition-colors duration-300 group-hover:bg-lime" />
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  )
}
