import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { Compass, PenTool, Rocket, Search } from 'lucide-react'
import { ease, inView, reveal, stagger } from '../lib/motion'

const steps = [
  { n: '01', title: 'Discover', icon: Search, text: 'Understand the business, target audience, and goals.' },
  { n: '02', title: 'Define', icon: Compass, text: 'Build the structure, user journey, and visual direction.' },
  { n: '03', title: 'Design & Develop', icon: PenTool, text: 'Create the interface, interactions, responsive layouts, and functional website.' },
  { n: '04', title: 'Refine & Launch', icon: Rocket, text: 'Test the experience, optimize performance, and prepare for launch.' },
]

function Step({ step, i, progress }: { step: (typeof steps)[number]; i: number; progress: MotionValue<number> }) {
  const at = (i + 0.3) / steps.length
  const lit = useTransform(progress, [at - 0.12, at], [0, 1])
  const Icon = step.icon
  return (
    <motion.li
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={inView}
      transition={{ duration: 0.8, ease }}
      className="relative pb-16 pl-16 last:pb-0 sm:pl-24"
    >
      {/* node */}
      <span className="absolute left-0 top-0 flex size-11 items-center justify-center rounded-full border border-white/15 bg-ink sm:left-2">
        <motion.span style={{ opacity: lit, scale: lit }} className="absolute inset-0 rounded-full bg-ember shadow-[0_0_30px_rgba(255,106,0,0.6)]" />
        <Icon className="relative size-[1.1rem]" aria-hidden="true" />
      </span>
      <span className="label text-ember">{step.n}</span>
      <h3 className="mt-2 text-[clamp(1.9rem,4.4vw,3.4rem)] font-semibold leading-none tracking-[-0.045em]">{step.title}</h3>
      <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-muted">{step.text}</p>
    </motion.li>
  )
}

export function Process() {
  const list = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 70%', 'end 55%'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  return (
    <section id="process" aria-labelledby="process-title" className="relative overflow-x-clip border-y border-white/[0.06] bg-ink-2 py-28 sm:py-36">
      <div aria-hidden="true" className="absolute -left-40 top-1/3 size-[36rem] rounded-full bg-lime/[0.05] blur-3xl" />
      <div className="container-x grid gap-16 lg:grid-cols-12">
        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={inView} className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
          <motion.div variants={reveal} className="flex items-center gap-3">
            <span className="label text-ember">03</span>
            <span className="h-px w-10 bg-white/20" />
            <span className="label">Process</span>
          </motion.div>
          <motion.h2 id="process-title" variants={reveal} className="display mt-6 text-[clamp(2.4rem,6.4vw,5.5rem)]">
            FROM IDEA TO <span className="text-gradient">DIGITAL EXPERIENCE</span>
          </motion.h2>
          <motion.p variants={reveal} className="mt-6 max-w-sm text-muted">
            A clear, collaborative process — so you always know what happens next and why.
          </motion.p>
        </motion.div>

        <div className="relative lg:col-span-6 lg:col-start-7">
          {/* track + scroll-linked fill */}
          <span aria-hidden="true" className="absolute bottom-0 left-[21px] top-0 w-px bg-white/10 sm:left-[29px]" />
          <motion.span
            aria-hidden="true"
            style={{ scaleY: progress }}
            className="absolute bottom-0 left-[21px] top-0 w-px origin-top bg-gradient-to-b from-ember via-ember to-lime sm:left-[29px]"
          />
          <ol ref={list} className="relative">
            {steps.map((s, i) => (
              <Step key={s.n} step={s} i={i} progress={progress} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
