import { cn } from '../lib/cn'
import { site } from '../config/site'

/** Custom typographic wordmark: HAN with an ember aperture dot. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline font-semibold tracking-[-0.06em]', className)}>
      {site.brand}
      <span aria-hidden="true" className="ml-[0.08em] inline-block size-[0.22em] translate-y-[-0.05em] rounded-full bg-ember shadow-[0_0_12px_rgba(255,106,0,0.9)]" />
    </span>
  )
}
