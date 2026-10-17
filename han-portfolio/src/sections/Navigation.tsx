import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { navLinks } from '../data/navigation'
import { Wordmark } from '../components/Wordmark'
import { ButtonLink } from '../components/Button'
import { useScrolled } from '../hooks/useScrolled'
import { useLockBody } from '../hooks/useLockBody'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ease, easeIn } from '../lib/motion'
import { cn } from '../lib/cn'
import { site } from '../config/site'

function useActiveSection() {
  const [active, setActive] = useState('#home')
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1))
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`))
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return active
}

export function Navigation() {
  const scrolled = useScrolled()
  const active = useActiveSection()
  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useLockBody(open)
  useFocusTrap(panel, open, close)

  // Close the mobile menu if the viewport grows to desktop size.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const onChange = () => mql.matches && setOpen(false)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9, ease }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
      >
        <nav
          aria-label="Primary"
          className={cn(
            'mx-auto flex h-14 max-w-[88rem] items-center justify-between rounded-full border pl-5 pr-2 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500',
            scrolled
              ? 'border-white/10 bg-ink/70 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl'
              : 'border-transparent bg-transparent',
          )}
        >
          <a href="#home" className="text-2xl" aria-label={`${site.brand} — back to top`}>
            <Wordmark />
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const isActive = active === link.href
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'relative rounded-full px-4 py-2 text-sm transition-colors duration-200',
                      isActive ? 'text-fg' : 'text-muted hover:text-fg',
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-white/[0.07]"
                        transition={{ duration: 0.45, ease }}
                      />
                    )}
                    <span className="relative">{link.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2">
            <ButtonLink href="#contact" className="min-h-10 px-5 text-sm max-sm:hidden">
              Start a Project
            </ButtonLink>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panel}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="fixed inset-0 z-[80] flex flex-col bg-ink/95 px-5 pb-8 pt-4 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.35, ease } }}
            exit={{ opacity: 0, transition: { duration: 0.25, ease: easeIn } }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 size-80 rounded-full bg-ember/25 blur-3xl" />
            <div className="flex h-14 items-center justify-between pl-2">
              <span className="text-2xl"><Wordmark /></span>
              <button
                type="button"
                onClick={close}
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <ul className="relative mt-10 flex flex-1 flex-col gap-1">
              {navLinks.map((link, i) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.06 + i * 0.05, duration: 0.5, ease } }}
                >
                  <a
                    href={link.href}
                    onClick={close}
                    className="flex items-baseline gap-4 border-b border-white/[0.07] py-4 text-[clamp(2rem,9vw,3rem)] font-semibold tracking-[-0.04em]"
                  >
                    <span className="label w-6 text-ember">0{i + 1}</span>
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.5, ease } }}
            >
              <ButtonLink href="#contact" onClick={close} className="w-full">
                Start a Project
              </ButtonLink>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
