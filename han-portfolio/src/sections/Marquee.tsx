const items = ['WEB DESIGN', 'CREATIVE DEVELOPMENT', 'DIGITAL EXPERIENCES', 'INTERACTIVE DESIGN']

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={item} className="flex items-center">
          <span className={i % 2 ? 'text-transparent [-webkit-text-stroke:1px_rgba(245,245,245,0.55)]' : ''}>{item}</span>
          <span className="mx-[0.5em] text-ember">•</span>
        </li>
      ))}
    </ul>
  )
}

/** Pure-CSS infinite strip. Pauses on hover; static under reduced motion. */
export function Marquee() {
  return (
    <section aria-label="Disciplines" className="overflow-x-clip py-3">
      <div className="marquee -rotate-[1.2deg] overflow-hidden border-y border-white/10 bg-ink-2 py-5 sm:py-7">
        <div className="marquee-track flex w-max text-[clamp(1.6rem,4.6vw,3.6rem)] font-semibold tracking-[-0.03em] whitespace-nowrap">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  )
}
