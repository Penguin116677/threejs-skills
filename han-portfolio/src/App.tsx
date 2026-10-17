import { MotionConfig } from 'framer-motion'
import { Navigation } from './sections/Navigation'
import { Hero } from './sections/Hero'
import { Marquee } from './sections/Marquee'
import { Services } from './sections/Services'
import { Work } from './sections/Work'
import { Process } from './sections/Process'
import { About } from './sections/About'
import { Contact } from './sections/Contact'
import { Footer } from './sections/Footer'
import { Cursor } from './components/Cursor'
import { BackToTop } from './components/BackToTop'

export default function App() {
  return (
    // reducedMotion="user": Framer Motion drops transform animations when the OS asks for less motion
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-fg px-5 py-3 text-sm font-medium text-ink transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Navigation />
      <main id="main">
        <Hero />
        <Marquee />
        <Services />
        <Work />
        <Process />
        <About />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
      <Cursor />
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
        <div className="grain" />
      </div>
    </MotionConfig>
  )
}
