import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useScrolled } from '../hooks/useScrolled'
import { ease } from '../lib/motion'

/** Floating back-to-top control, shown after the first screen. */
export function BackToTop() {
  const show = useScrolled(typeof window !== 'undefined' ? window.innerHeight * 1.2 : 900)
  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href="#home"
          aria-label="Back to top"
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } }}
          exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
          className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full border border-white/10 bg-ink-2/80 text-fg shadow-xl backdrop-blur-xl transition-colors hover:border-ember hover:bg-ember hover:text-ink"
        >
          <ArrowUp className="size-5" aria-hidden="true" />
        </motion.a>
      )}
    </AnimatePresence>
  )
}
