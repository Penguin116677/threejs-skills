import { ArrowUp } from 'lucide-react'
import { navLinks } from '../data/navigation'
import { socialLinks } from '../data/socials'
import { Wordmark } from '../components/Wordmark'
import { site } from '../config/site'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="relative border-t border-white/[0.07] bg-ink pt-20">
      <div className="container-x">
        <div className="grid gap-12 pb-16 md:grid-cols-12">
          <div className="md:col-span-6">
            <a href="#home" className="text-5xl sm:text-6xl" aria-label={`${site.brand} — back to top`}>
              <Wordmark />
            </a>
            <p className="mt-6 max-w-sm leading-relaxed text-muted">{site.statement}</p>
          </div>
          <nav aria-label="Footer" className="md:col-span-3">
            <p className="label mb-4">Navigate</p>
            <ul className="space-y-1">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-flex min-h-10 items-center text-fg/85 transition-colors hover:text-ember">{l.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          {socialLinks.length > 0 && (
            <div className="md:col-span-3">
              <p className="label mb-4">Social</p>
              <ul className="space-y-1">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-fg/85 transition-colors hover:text-ember">
                      <Icon className="size-4" /> {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* oversized wordmark strip */}
        <p aria-hidden="true" className="pointer-events-none select-none bg-gradient-to-b from-white/[0.09] to-transparent bg-clip-text text-center text-[28vw] font-semibold leading-[0.75] tracking-[-0.08em] text-transparent">
          {site.brand}
        </p>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] py-8 sm:flex-row">
          <p className="text-sm text-muted">
            © {year} {site.brand}. All rights reserved.
          </p>
          <a
            href="#home"
            className="group inline-flex min-h-11 items-center gap-3 rounded-full border border-white/10 pl-5 pr-1.5 text-sm transition-colors hover:border-white/30"
          >
            Back to top
            <span className="flex size-8 items-center justify-center rounded-full bg-white/[0.06] transition-[background-color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:bg-ember group-hover:text-ink">
              <ArrowUp className="size-4" aria-hidden="true" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}
