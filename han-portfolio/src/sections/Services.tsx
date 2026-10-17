import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { services, type Service } from '../data/services'
import { SectionHeading } from '../components/SectionHeading'
import { ServiceVisual } from '../components/ServiceVisual'
import { inView, reveal, stagger } from '../lib/motion'
import { cn } from '../lib/cn'

/** Bento placement per card (12-col grid on large screens). */
const layout: Record<Service['id'], { span: string; wide?: boolean }> = {
  landing: { span: 'md:col-span-2 lg:col-span-7' },
  business: { span: 'lg:col-span-5' },
  portfolio: { span: 'lg:col-span-4' },
  ecommerce: { span: 'lg:col-span-4' },
  interactive: { span: 'lg:col-span-4' },
  redesign: { span: 'md:col-span-2 lg:col-span-12', wide: true },
}

function ServiceCard({ service }: { service: Service }) {
  const ref = useRef<HTMLElement>(null)
  const [live, setLive] = useState(false)
  const { span, wide } = layout[service.id]
  const Icon = service.icon

  // Only run the miniature's CSS animations while the card is on screen.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Spotlight follows the pointer via CSS variables (no React re-render).
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <motion.article
      ref={ref}
      variants={reveal}
      onPointerMove={onPointerMove}
      aria-labelledby={`svc-${service.id}`}
      className={cn(
        'group relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-ink-2 p-5 transition-[border-color,transform] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:border-white/20 sm:p-7',
        span,
        wide && 'lg:grid lg:grid-cols-12 lg:items-center lg:gap-10',
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,50%), rgba(255,106,0,0.14), transparent 60%)' }}
      />

      <div
        className={cn(
          'svc-anim relative mb-7 h-52 overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#16181e,#0c0d10)] p-4 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.015] sm:h-60',
          wide && 'lg:order-2 lg:col-span-7 lg:mb-0 lg:h-72',
          live && 'is-live',
        )}
        aria-hidden="true"
      >
        <ServiceVisual id={service.id} />
      </div>

      <div className={cn(wide && 'lg:col-span-5')}>
        <div className="mb-5 flex items-center justify-between">
          <span className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-ember transition-colors duration-300 group-hover:border-ember/50 group-hover:bg-ember group-hover:text-ink">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="label">{service.index}</span>
        </div>
        <h3 id={`svc-${service.id}`} className="text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-none tracking-[-0.035em]">
          {service.title}
        </h3>
        <p className="mt-3 max-w-md text-[0.97rem] leading-relaxed text-muted">{service.description}</p>
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Includes">
          {service.tags.map((tag) => (
            <li key={tag} className="rounded-full border border-white/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-muted">
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  )
}

export function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="relative py-28 sm:py-36">
      <div className="container-x">
        <SectionHeading
          id="services-title"
          index="01"
          label="Services"
          title={
            <>
              WHAT I CAN <span className="text-gradient">CREATE</span> FOR YOU
            </>
          }
          intro="I transform ideas into modern, immersive, and high-performing websites that help brands make a lasting impression."
        />

        <motion.div
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={inView}
          className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-5"
        >
          {services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
