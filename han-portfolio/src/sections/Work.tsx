import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { projects, type Project } from '../data/projects'
import { SectionHeading } from '../components/SectionHeading'
import { ProjectArt } from '../components/ProjectArt'
import { ProjectModal } from '../components/ProjectModal'
import { ButtonLink } from '../components/Button'
import { inView, reveal } from '../lib/motion'
import { cn } from '../lib/cn'

/** Editorial layout: span + aspect per slot (lg 12-col grid). */
const slots = [
  { span: 'lg:col-span-8', aspect: 'aspect-[4/3] sm:aspect-[16/10]' },
  { span: 'lg:col-span-4 lg:mt-24', aspect: 'aspect-[4/3] lg:aspect-[4/3.6]' },
  { span: 'lg:col-span-5', aspect: 'aspect-[4/3] lg:aspect-[4/3.6]' },
  { span: 'lg:col-span-7 lg:mt-16', aspect: 'aspect-[4/3] sm:aspect-[16/10]' },
  { span: 'lg:col-span-12', aspect: 'aspect-[4/3] sm:aspect-[16/9] lg:aspect-[16/8]' },
  { span: 'lg:col-span-7', aspect: 'aspect-[4/3] sm:aspect-[16/10]' },
]

const HASH_PREFIX = '#project/'
const projectFromHash = () =>
  window.location.hash.startsWith(HASH_PREFIX) ? projects.find((p) => p.id === window.location.hash.slice(HASH_PREFIX.length)) ?? null : null

function ProjectCard({ project, index, onOpen }: { project: Project; index: number; onOpen: (p: Project) => void }) {
  const slot = slots[index % slots.length]
  return (
    <motion.article variants={reveal} initial="hidden" whileInView="show" viewport={inView} className={cn('group relative', slot.span)}>
      <div
        data-cursor="view"
        className={cn(
          'relative overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-ink-2 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]',
          slot.aspect,
        )}
      >
        <motion.div layoutId={`art-${project.id}`} className="absolute inset-0">
          {project.image ? (
            <img src={project.image} alt={`${project.name} — ${project.category} preview`} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
          ) : (
            <ProjectArt
              art={project.art}
              title={`${project.name} — ${project.category} concept preview`}
              className="size-full transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
            />
          )}
        </motion.div>

        {/* hover veil + label */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity duration-500 group-hover:opacity-90" />
        <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between sm:inset-x-6 sm:top-6">
          <span className="label rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[0.62rem] text-fg backdrop-blur-md">
            {String(index + 1).padStart(2, '0')} · {project.isConcept ? 'Concept project' : 'Client project'}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 right-5 hidden size-24 scale-75 items-center justify-center rounded-full bg-ember text-sm font-medium text-ink opacity-0 transition-[transform,opacity] duration-500 ease-[var(--ease-out-expo)] group-hover:scale-100 group-hover:opacity-100 md:flex"
        >
          View
          <ArrowUpRight className="ml-0.5 size-4" />
        </span>

        {/* Whole preview is the trigger (accessible name = project) */}
        <button
          type="button"
          onClick={() => onOpen(project)}
          className="absolute inset-0 z-10 rounded-[1.75rem] focus-visible:outline-offset-[-4px]"
          aria-label={`View project: ${project.name}, ${project.category}`}
        />
      </div>

      <div className="mt-5 flex flex-col gap-4 px-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-[clamp(1.6rem,3.2vw,2.5rem)] font-semibold leading-none tracking-[-0.04em]">{project.name}</h3>
          <p className="label mt-2">{project.category}</p>
          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">{project.summary}</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(project)}
          className="group/btn inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-white/15 px-5 text-sm transition-colors duration-200 hover:border-ember hover:bg-ember hover:text-ink"
          aria-label={`View project ${project.name}`}
        >
          View Project
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  )
}

export function Work() {
  const [active, setActive] = useState<Project | null>(null)
  const pushed = useRef(false)

  // Deep-linking: #project/<id> opens the modal; Back closes it.
  useEffect(() => {
    const sync = () => {
      const p = projectFromHash()
      if (!p) pushed.current = false
      setActive(p)
    }
    sync()
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  const open = useCallback((p: Project) => {
    if (projectFromHash()) window.history.replaceState(null, '', `${HASH_PREFIX}${p.id}`)
    else {
      window.history.pushState(null, '', `${HASH_PREFIX}${p.id}`)
      pushed.current = true
    }
    setActive(p)
  }, [])

  const close = useCallback(() => {
    setActive(null)
    if (pushed.current) {
      pushed.current = false
      window.history.back()
    } else {
      window.history.replaceState(null, '', '#work')
    }
  }, [])

  /** Close and jump to another section (e.g. contact). */
  const closeTo = useCallback((target: string) => {
    setActive(null)
    pushed.current = false
    window.history.replaceState(null, '', target)
    setTimeout(() => document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [])

  return (
    <section id="work" aria-labelledby="work-title" className="relative overflow-x-clip py-28 sm:py-36">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-40 -z-10 h-[50rem] w-[80rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,106,0,0.09),transparent)]" />
      <div className="container-x">
        <SectionHeading
          id="work-title"
          index="02"
          label="Selected work"
          title={
            <>
              SELECTED <span className="text-gradient">DIGITAL</span> EXPERIENCES
            </>
          }
          intro={
            <>
              Self-initiated <strong className="font-medium text-fg">concept projects</strong> that explore different industries and
              art directions — each one a full design exploration.
            </>
          }
        />

        <div className="mt-16 grid gap-x-5 gap-y-16 lg:grid-cols-12 lg:gap-y-24">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} onOpen={open} />
          ))}

          {/* closing tile in the grid */}
          <motion.div
            variants={reveal}
            initial="hidden"
            whileInView="show"
            viewport={inView}
            className="relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border border-dashed border-white/15 p-7 sm:p-10 lg:col-span-5 lg:mt-24"
          >
            <div aria-hidden="true" className="absolute -right-20 -top-20 size-72 rounded-full bg-ember/20 blur-3xl" />
            <span className="label">Next up</span>
            <p className="relative mt-10 text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1] tracking-[-0.04em]">
              Have a project in mind? Let&rsquo;s make it the <span className="text-gradient">next one</span> here.
            </p>
            <ButtonLink href="#contact" className="relative mt-10 self-start">
              Let&rsquo;s Build Your Website
            </ButtonLink>
          </motion.div>
        </div>
      </div>

      <ProjectModal project={active} onClose={close} onNavigate={open} onCloseTo={closeTo} />
    </section>
  )
}
