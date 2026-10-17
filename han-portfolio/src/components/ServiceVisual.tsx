import type { ServiceVisual as Key } from '../data/services'

/** Shared mini browser chrome used by several previews. */
function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-3 py-2">
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="size-1.5 rounded-full bg-white/20" />
        <span className="ml-3 h-1.5 w-16 rounded-full bg-white/10" />
      </div>
      {children}
    </div>
  )
}

const Bar = ({ w, className = '' }: { w: string; className?: string }) => (
  <span className={`block h-1.5 rounded-full bg-white/15 ${className}`} style={{ width: w }} />
)

function Landing() {
  return (
    <Frame className="h-full w-full">
      <div className="relative flex h-full flex-col justify-center gap-3 px-6 pb-8">
        <div className="absolute right-[-10%] top-[-10%] size-40 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.45),transparent_65%)]" />
        <span className="label text-[0.55rem] text-ember">New launch</span>
        <span className="block h-4 w-[78%] rounded bg-white/85" />
        <span className="block h-4 w-[56%] rounded bg-white/85" />
        <Bar w="64%" className="mt-1" />
        <div className="relative mt-2 h-7 w-24">
          <span className="absolute inset-0 rounded-full bg-ember" />
          <span className="absolute inset-0 rounded-full border-2 border-ember [animation:click-ripple_4s_var(--ease-premium)_infinite]" />
        </div>
        {/* moving pointer */}
        <svg viewBox="0 0 24 24" className="absolute left-6 top-1/2 size-5 text-fg [animation:cursor-path_4s_var(--ease-premium)_infinite]" aria-hidden="true">
          <path d="M4 3l14 7-6 2-2 6L4 3Z" fill="currentColor" stroke="#08090B" strokeWidth="1.2" />
        </svg>
      </div>
    </Frame>
  )
}

function Business() {
  return (
    <Frame className="h-full w-full">
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <span className="h-2 w-10 rounded bg-white/70" />
          <div className="flex gap-2"><Bar w="18px" /><Bar w="18px" /><Bar w="18px" /></div>
        </div>
        <div className="grid flex-1 grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="rounded-md border border-white/[0.06]"
              style={{ animation: `tile-fill 4.8s var(--ease-premium) ${i * 0.35}s infinite` }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <span className="h-2 flex-1 origin-left rounded-full bg-lime/70 [animation:bar-grow_4s_var(--ease-premium)_infinite]" />
          <span className="h-2 w-8 rounded-full bg-white/15" />
        </div>
      </div>
    </Frame>
  )
}

function Portfolio() {
  const tiles = ['h-16 bg-[linear-gradient(135deg,#ff6a00,#3a1500)]', 'h-24 bg-white/10', 'h-12 bg-[linear-gradient(135deg,#b8ff6a,#24400a)]', 'h-20 bg-white/[0.06]', 'h-14 bg-[linear-gradient(135deg,#e9ecf2,#5a5f6b)]', 'h-24 bg-[linear-gradient(135deg,#2c2140,#7b5cff)]']
  const col = (offset: number) => (
    <div className="flex flex-col gap-2 [animation:masonry-scroll_14s_linear_infinite]" style={{ animationDelay: `${offset}s` }}>
      {[...tiles, ...tiles].map((t, i) => <span key={i} className={`block rounded-md ${t}`} />)}
    </div>
  )
  return (
    <Frame className="h-full w-full">
      <div className="grid h-full grid-cols-3 gap-2 overflow-hidden p-3 [mask-image:linear-gradient(transparent,black_15%,black_85%,transparent)]">
        {col(0)}
        {col(-5)}
        {col(-9)}
      </div>
    </Frame>
  )
}

function Ecommerce() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="w-[62%] max-w-56 rounded-2xl border border-white/10 bg-ink p-3 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_40%,#2a2d35,#111318)]">
          <span className="size-14 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#ffb27a_25%,#ff6a00_55%,#4a1d00)] shadow-[0_18px_30px_-10px_rgba(255,106,0,0.7)] [animation:float-slow_6s_ease-in-out_infinite]" />
          <span className="label absolute left-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[0.5rem]">New</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="block h-2 w-16 rounded bg-white/70" />
          <span className="font-mono text-[0.6rem] text-muted">$ ••</span>
        </div>
        <span className="mt-3 flex h-7 items-center justify-center rounded-full bg-fg text-[0.6rem] font-medium text-ink [animation:add-press_3.2s_var(--ease-premium)_infinite]">Add to bag</span>
      </div>
      <span className="absolute right-[12%] top-[14%] flex size-9 items-center justify-center rounded-full border border-white/10 bg-ink-2 [animation:bag-bump_3.2s_var(--ease-premium)_infinite]">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Zm3 0a3 3 0 0 1 6 0" /></svg>
        <span className="absolute -right-1 -top-1 size-3.5 rounded-full bg-lime" />
      </span>
    </div>
  )
}

function Interactive() {
  const face = 'absolute inset-0 border border-ember/70 bg-ember/[0.06]'
  return (
    <div className="relative flex h-full w-full items-center justify-center [perspective:600px]">
      <div className="absolute size-44 rounded-full border border-white/10 [animation:orbit_18s_linear_infinite]">
        <span className="absolute -top-1 left-1/2 size-2 rounded-full bg-lime shadow-[0_0_12px_#b8ff6a]" />
      </div>
      <div className="absolute size-28 rounded-full border border-dashed border-white/15 [animation:orbit_10s_linear_infinite_reverse]">
        <span className="absolute -bottom-1 left-1/2 size-1.5 rounded-full bg-ember" />
      </div>
      <div className="relative size-14 [transform-style:preserve-3d] [animation:cube-spin_9s_linear_infinite]">
        <span className={face} style={{ transform: 'translateZ(28px)' }} />
        <span className={face} style={{ transform: 'rotateY(180deg) translateZ(28px)' }} />
        <span className={face} style={{ transform: 'rotateY(90deg) translateZ(28px)' }} />
        <span className={face} style={{ transform: 'rotateY(-90deg) translateZ(28px)' }} />
        <span className={face} style={{ transform: 'rotateX(90deg) translateZ(28px)' }} />
        <span className={face} style={{ transform: 'rotateX(-90deg) translateZ(28px)' }} />
      </div>
    </div>
  )
}

function Redesign() {
  return (
    <Frame className="h-full w-full">
      <div className="relative h-full">
        {/* after (modern) */}
        <div className="absolute inset-0 flex flex-col justify-center gap-2.5 bg-[radial-gradient(80%_80%_at_80%_20%,rgba(255,106,0,0.3),transparent)] px-6">
          <span className="block h-5 w-[60%] rounded bg-white/90" />
          <span className="block h-5 w-[42%] rounded bg-gradient-to-r from-ember to-lime" />
          <Bar w="50%" className="mt-1" />
          <span className="mt-2 block h-6 w-20 rounded-full bg-ember" />
        </div>
        {/* before (dated) — revealed up to the moving divider */}
        <BeforePane />
      </div>
    </Frame>
  )
}

/** "Before" layer: separate element so its width follows the wipe line. */
function BeforePane() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0" style={{ animation: 'wipe-clip 6s var(--ease-premium) infinite' }}>
        <div className="flex h-full w-full flex-col gap-2 bg-[#1b1d21] p-4">
          <span className="h-3 w-full rounded-sm bg-white/10" />
          <div className="grid flex-1 grid-cols-[1fr_2fr] gap-2">
            <span className="rounded-sm bg-white/[0.06]" />
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => <Bar key={i} w={`${90 - i * 9}%`} className="bg-white/10" />)}
            </div>
          </div>
          <span className="label text-[0.5rem]">Before</span>
        </div>
      </div>
      <span className="absolute inset-y-0 w-px bg-lime shadow-[0_0_14px_#b8ff6a]" style={{ animation: 'wipe 6s var(--ease-premium) infinite' }}>
        <span className="absolute left-1/2 top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lime text-[0.55rem] font-bold text-ink">↔</span>
      </span>
      <span className="label absolute bottom-3 right-4 text-[0.5rem] text-fg">After</span>
    </div>
  )
}

const map: Record<Key, () => React.JSX.Element> = {
  landing: Landing,
  business: Business,
  portfolio: Portfolio,
  ecommerce: Ecommerce,
  interactive: Interactive,
  redesign: Redesign,
}

export function ServiceVisual({ id }: { id: Key }) {
  const C = map[id]
  return <C />
}
