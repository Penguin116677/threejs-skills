import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, Info, X } from 'lucide-react'
import { projects, type Project } from '../data/projects'
import { ProjectArt } from './ProjectArt'
import { useLockBody } from '../hooks/useLockBody'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ease, easeIn } from '../lib/motion'

interface Props {
  project: Project | null
  onClose: () => void
  onNavigate: (p: Project) => void
  onCloseTo: (target: string) => void
}

export function ProjectModal({ project, onClose, onNavigate, onCloseTo }: Props) {
  const dialog = useRef<HTMLDivElement>(null)
  useLockBody(!!project)
  useFocusTrap(dialog, !!project, onClose)

  // Prev/next keeps the dialog open — start each project from the top.
  useEffect(() => {
    dialog.current?.scrollTo({ top: 0 })
  }, [project?.id])

  const index = project ? projects.findIndex((p) => p.id === project.id) : -1
  const prev = index >= 0 ? projects[(index - 1 + projects.length) % projects.length] : null
  const next = index >= 0 ? projects[(index + 1) % projects.length] : null

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.25, ease: easeIn } }}
        >
          <button type="button" aria-label="Close project" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-md" />

          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-title"
            tabIndex={-1}
            className="scroll-thin relative flex max-h-[94svh] w-full max-w-6xl flex-col overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-white/10 bg-ink-2 shadow-2xl sm:rounded-[1.75rem]"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.5, ease } }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.25, ease: easeIn } }}
          >
            {/* sticky top bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-ink-2/85 px-4 py-3 backdrop-blur-xl sm:px-6">
              <span className="label truncate">
                {String(index + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')} · {project.category}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition-colors hover:border-white/30"
                aria-label="Close project and return to gallery"
              >
                <X className="size-5" />
              </button>
            </div>

            <motion.div layoutId={`art-${project.id}`} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden sm:aspect-[16/8]">
              {project.image ? (
                <img src={project.image} alt={`${project.name} — ${project.category} preview`} className="size-full object-cover" />
              ) : (
                <ProjectArt art={project.art} title={`${project.name} — ${project.category} concept preview`} className="size-full" />
              )}
            </motion.div>

            <motion.div
              key={project.id}
              className="grid gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.15, ease } }}
            >
              <div className="lg:col-span-7">
                {project.isConcept && (
                  <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/[0.07] px-3 py-1.5 text-xs text-lime">
                    <Info className="size-3.5" aria-hidden="true" />
                    Concept project — a self-initiated design exploration, not client work.
                  </p>
                )}
                <h2 id="project-title" className="display text-[clamp(2.6rem,7vw,5.5rem)]">
                  {project.name}
                </h2>
                <p className="label mt-3 text-ember">{project.category}</p>
                <p className="mt-8 text-lg leading-relaxed text-fg/85">{project.concept}</p>

                <div className="mt-10 grid gap-8 sm:grid-cols-2">
                  <div>
                    <h3 className="label mb-4">Design goals</h3>
                    <ul className="space-y-3">
                      {project.goals.map((g) => (
                        <li key={g} className="flex gap-3 text-[0.95rem] text-muted">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" aria-hidden="true" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="label mb-4">Key experiences</h3>
                    <ul className="space-y-3">
                      {project.features.map((f) => (
                        <li key={f} className="flex gap-3 text-[0.95rem] text-muted">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-lime" aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <aside className="flex flex-col gap-8 lg:col-span-5 lg:border-l lg:border-white/[0.07] lg:pl-10">
                <div>
                  <h3 className="label mb-4">Palette</h3>
                  <ul className="flex gap-2">
                    {project.palette.map((c) => (
                      <li key={c} className="flex-1">
                        <span className="block h-16 rounded-xl border border-white/10" style={{ background: c }} />
                        <span className="mt-2 block font-mono text-[0.65rem] uppercase text-muted">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="label mb-3">Typography</h3>
                  <p className="text-[0.95rem] text-fg/85">{project.typography}</p>
                </div>
                <div>
                  <h3 className="label mb-3">Deliverables</h3>
                  <p className="text-[0.95rem] text-fg/85">Art direction · UI design · Responsive layouts · Motion concept</p>
                </div>

                <div className="mt-auto flex flex-col gap-3">
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-6 text-sm hover:border-white/40"
                    >
                      Visit live site <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  )}
                  <a
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault()
                      onCloseTo('#contact')
                    }}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ember px-6 text-[0.95rem] font-medium text-ink transition-transform active:scale-[0.97]"
                  >
                    Start a similar project <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                </div>
              </aside>
            </motion.div>

            {/* prev / next */}
            {prev && next && (
              <nav aria-label="More projects" className="grid grid-cols-2 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onNavigate(prev)}
                  className="group flex min-h-20 items-center gap-3 px-5 py-5 text-left transition-colors hover:bg-white/[0.03] sm:px-10"
                >
                  <ArrowLeft className="size-5 shrink-0 text-muted transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                  <span>
                    <span className="label block">Previous</span>
                    <span className="mt-1 block text-lg font-semibold tracking-tight">{prev.name}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(next)}
                  className="group flex min-h-20 items-center justify-end gap-3 border-l border-white/[0.07] px-5 py-5 text-right transition-colors hover:bg-white/[0.03] sm:px-10"
                >
                  <span>
                    <span className="label block">Next</span>
                    <span className="mt-1 block text-lg font-semibold tracking-tight">{next.name}</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              </nav>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
