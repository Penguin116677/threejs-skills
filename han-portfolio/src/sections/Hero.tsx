import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { HeroVisual } from '../components/HeroVisual'
import { ButtonLink } from '../components/Button'
import { ease } from '../lib/motion'
import { site } from '../config/site'

/** Headline split into lines; `accent` words get the animated gradient. */
const headline: { text: string; accent?: boolean }[][] = [
  [{ text: 'I' }, { text: 'DESIGN' }],
  [{ text: 'DIGITAL', accent: true }],
  [{ text: 'EXPERIENCES', accent: true }],
  [{ text: 'THAT' }, { text: 'STAND' }, { text: 'OUT.', accent: true }],
]

// Choreography (seconds): background → headline → object (fades in itself) → copy → CTAs
const T = { bg: 0, headline: 0.35, copy: 1.05, cta: 1.25, meta: 1.5 }

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '18%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '-12%'])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  let wordIndex = 0

  return (
    <section
      ref={ref}
      id="home"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-24"
    >
      {/* 1 — atmosphere fades in */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, delay: T.bg, ease: 'easeOut' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_70%_45%,rgba(255,106,0,0.22),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_40%_at_15%_90%,rgba(184,255,106,0.06),transparent_70%)]" />
        <div
          className="absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(70%_60%_at_60%_45%,black,transparent)]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink" />
      </motion.div>

      {/* 3 — 3D centerpiece (parallax) */}
      <motion.div
        style={{ y: visualY }}
        className="pointer-events-none absolute inset-x-0 top-16 -z-[5] h-[46svh] sm:h-[52svh] lg:inset-y-0 lg:left-auto lg:right-[-4vw] lg:top-0 lg:h-auto lg:w-[62vw]"
      >
        <HeroVisual />
      </motion.div>

      <motion.div style={{ y: textY, opacity: fade }} className="container-x relative mt-auto flex flex-1 flex-col justify-end pb-24 pt-[40svh] sm:pt-[46svh] lg:justify-center lg:pt-0">
        <motion.p
          className="label mb-6 flex items-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: T.headline - 0.1, ease }}
        >
          <span className="h-px w-8 bg-ember" />
          {site.title}
        </motion.p>

        {/* 2 — headline reveals word by word from a mask */}
        <h1 id="hero-title" className="display max-w-[15ch] text-[clamp(2.75rem,8.2vw,7.5rem)]">
          {headline.map((line, li) => (
            <span key={li} className="block">
              {line.map((word) => {
                const i = wordIndex++
                return (
                  <span key={word.text} className="mr-[0.22em] inline-block overflow-hidden pb-[0.08em] align-bottom last:mr-0">
                    <motion.span
                      className={word.accent ? 'text-gradient inline-block bg-[length:200%_100%]' : 'inline-block'}
                      initial={{ y: '105%' }}
                      animate={{ y: '0%', ...(word.accent && !reduced ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : {}) }}
                      transition={{
                        y: { duration: 1, delay: T.headline + i * 0.06, ease },
                        backgroundPosition: { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 },
                      }}
                    >
                      {word.text}
                    </motion.span>
                  </span>
                )
              })}
            </span>
          ))}
        </h1>

        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <motion.p
            className="max-w-md text-[1.05rem] leading-relaxed text-muted sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: T.copy, ease }}
          >
            Websites with purpose. Experiences with personality.{' '}
            <span className="text-fg">Design that moves your brand forward.</span>
          </motion.p>

          {/* 5 — CTAs */}
          <motion.div
            className="flex flex-col gap-3 sm:flex-row"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: T.cta, ease }}
          >
            <ButtonLink href="#work">Explore My Work</ButtonLink>
            <ButtonLink href="#contact" variant="outline">
              Let&rsquo;s Talk
            </ButtonLink>
          </motion.div>
        </div>
      </motion.div>

      {/* meta + scroll indicator */}
      <motion.div
        className="container-x absolute inset-x-0 bottom-6 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: T.meta }}
      >
        {site.availability ? (
          <span className="label hidden items-center gap-2 sm:flex">
            <span className="size-1.5 rounded-full bg-lime [animation:pulse-dot_2.4s_ease-in-out_infinite]" />
            {site.availability}
          </span>
        ) : (
          <span />
        )}
        <a href="#services" className="label mx-auto flex flex-col items-center gap-2 sm:mx-0" aria-label="Scroll to services">
          <span className="relative h-10 w-px overflow-hidden bg-white/15">
            <span className="absolute inset-x-0 top-0 h-1/2 bg-ember [animation:scroll-cue_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
          </span>
          Scroll
        </a>
        <span className="label hidden sm:block">Design · Motion · Build</span>
      </motion.div>
    </section>
  )
}
