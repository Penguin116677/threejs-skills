import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { inView, reveal, stagger } from '../lib/motion'
import { cn } from '../lib/cn'

interface Props {
  index: string
  label: string
  title: ReactNode
  intro?: ReactNode
  id?: string
  className?: string
}

export function SectionHeading({ index, label, title, intro, id, className }: Props) {
  return (
    <motion.header
      variants={stagger(0.1)}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      className={cn('grid gap-6 md:grid-cols-12 md:items-end', className)}
    >
      <motion.div variants={reveal} className="flex items-center gap-3 md:col-span-12">
        <span className="label text-ember">{index}</span>
        <span className="h-px w-10 bg-white/20" />
        <span className="label">{label}</span>
      </motion.div>
      <motion.h2
        id={id}
        variants={reveal}
        className="display text-[clamp(2.4rem,7.4vw,6.5rem)] md:col-span-8"
      >
        {title}
      </motion.h2>
      {intro && (
        <motion.p variants={reveal} className="max-w-md text-base leading-relaxed text-muted md:col-span-4 md:justify-self-end md:pb-3">
          {intro}
        </motion.p>
      )}
    </motion.header>
  )
}
