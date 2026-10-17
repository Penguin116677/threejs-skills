import { motion } from 'framer-motion'
import { ArrowUpRight, Mail } from 'lucide-react'
import { InquiryForm } from '../components/InquiryForm'
import { ButtonLink } from '../components/Button'
import { WhatsappIcon } from '../components/BrandIcons'
import { contact, emailUrl, whatsappUrl } from '../config/site'
import { socialLinks } from '../data/socials'
import { inView, reveal, stagger } from '../lib/motion'

export function Contact() {
  const hasDirect = !!whatsappUrl || !!emailUrl

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative isolate overflow-hidden pb-24 pt-32 sm:pb-32 sm:pt-44">
      {/* dramatic light */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[42rem] w-[min(120vw,90rem)] -translate-x-1/2 bg-[radial-gradient(50%_60%_at_50%_0%,rgba(255,106,0,0.35),transparent_70%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember/70 to-transparent" />
        <div className="absolute bottom-0 left-1/2 size-[40rem] -translate-x-1/2 translate-y-1/2 rounded-full bg-lime/[0.05] blur-3xl" />
      </div>

      <div className="container-x">
        <motion.div variants={stagger(0.1)} initial="hidden" whileInView="show" viewport={inView} className="mx-auto max-w-5xl text-center">
          <motion.p variants={reveal} className="label flex items-center justify-center gap-3">
            <span className="text-ember">05</span>
            <span className="h-px w-10 bg-white/20" />
            Contact
          </motion.p>
          <motion.h2 id="contact-title" variants={reveal} className="display mt-6 text-[clamp(2.8rem,9.5vw,8.5rem)]">
            LET&rsquo;S MAKE SOMETHING <span className="text-gradient">REMARKABLE.</span>
          </motion.h2>
          <motion.p variants={reveal} className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-muted">
            Have an idea, a business, or a project in mind? Let&rsquo;s turn it into a digital experience worth remembering.
          </motion.p>
          <motion.div variants={reveal} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="#inquiry" className="w-full sm:w-auto">Start a Project</ButtonLink>
            {whatsappUrl && (
              <ButtonLink href={whatsappUrl} target="_blank" rel="noopener noreferrer" variant="outline" icon={false} className="w-full sm:w-auto">
                <span className="flex items-center gap-2"><WhatsappIcon className="size-4" /> Chat on WhatsApp</span>
              </ButtonLink>
            )}
            {emailUrl && (
              <ButtonLink href={emailUrl} variant="outline" icon={false} className="w-full sm:w-auto">
                <span className="flex items-center gap-2"><Mail className="size-4" aria-hidden="true" /> {contact.email}</span>
              </ButtonLink>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          id="inquiry"
          variants={reveal}
          initial="hidden"
          whileInView="show"
          viewport={inView}
          className="mx-auto mt-24 grid max-w-6xl scroll-mt-28 gap-10 rounded-[2rem] border border-white/10 bg-ink-2/80 p-5 shadow-[0_60px_120px_-60px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-10 lg:grid-cols-12 lg:gap-14"
        >
          <div className="lg:col-span-4">
            <h3 className="text-3xl font-semibold leading-none tracking-[-0.04em]">Project inquiry</h3>
            <p className="mt-4 text-muted">
              Share a few details and I&rsquo;ll reply with next steps, questions, and how we could work together.
            </p>

            {(hasDirect || socialLinks.length > 0) && (
              <div className="mt-10 space-y-6">
                {hasDirect && (
                  <div>
                    <p className="label mb-3">Direct</p>
                    <ul className="space-y-2">
                      {whatsappUrl && (
                        <li>
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex min-h-11 items-center gap-3 text-fg/90 hover:text-ember">
                            <WhatsappIcon className="size-5" /> WhatsApp
                            <ArrowUpRight className="size-4 opacity-50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                          </a>
                        </li>
                      )}
                      {emailUrl && (
                        <li>
                          <a href={emailUrl} className="group inline-flex min-h-11 items-center gap-3 break-all text-fg/90 hover:text-ember">
                            <Mail className="size-5 shrink-0" aria-hidden="true" /> {contact.email}
                          </a>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                {socialLinks.length > 0 && (
                  <div>
                    <p className="label mb-3">Elsewhere</p>
                    <ul className="flex flex-wrap gap-2">
                      {socialLinks.map(({ label, href, icon: Icon }) => (
                        <li key={label}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm transition-colors hover:border-ember hover:text-ember"
                          >
                            <Icon className="size-4" /> {label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {import.meta.env.DEV && !hasDirect && socialLinks.length === 0 && (
              <p className="mt-10 rounded-2xl border border-dashed border-white/15 p-4 font-mono text-xs leading-relaxed text-muted">
                Dev note (hidden in production): add WhatsApp, email and social links in <code className="text-fg">src/config/site.ts</code>.
              </p>
            )}
          </div>

          <div className="lg:col-span-8">
            <InquiryForm />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
