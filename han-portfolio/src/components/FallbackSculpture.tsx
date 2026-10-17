import { cn } from '../lib/cn'

/**
 * Pure CSS/SVG stand-in for the WebGL hero: a chrome orb, ember ring and
 * satellites. Used while the 3D chunk loads, on devices without WebGL,
 * on low-end hardware and when the GPU can't hold frame rate.
 */
export function FallbackSculpture({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <div className={cn('relative aspect-square w-full', className)} aria-hidden="true">
      {/* glow */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.45),transparent_65%)] blur-2xl" />
      {/* chrome orb */}
      <div
        className="absolute inset-[22%] rounded-[46%_54%_52%_48%/52%_44%_56%_48%] shadow-[inset_-20px_-30px_60px_rgba(0,0,0,0.7),inset_16px_18px_40px_rgba(255,255,255,0.35),0_40px_80px_-20px_rgba(255,106,0,0.35)]"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #ffffff 0%, #d9dce3 9%, #7b808c 26%, #1c1e24 52%, #3a2416 72%, #ff7a1a 92%, #ffb27a 100%)',
          animation: animated ? 'float-slow 9s ease-in-out infinite' : undefined,
        }}
      >
        <div
          className="absolute inset-0 rounded-[inherit] opacity-60 mix-blend-screen"
          style={{
            background: 'conic-gradient(from 210deg, transparent 0 40%, rgba(255,255,255,0.55) 48%, transparent 56% 80%, rgba(184,255,106,0.35) 86%, transparent 92%)',
            animation: animated ? 'spin-slow 24s linear infinite' : undefined,
          }}
        />
      </div>
      {/* ember ring */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="fb-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#ff6a00" stopOpacity="0" />
            <stop offset="0.35" stopColor="#ff6a00" />
            <stop offset="0.7" stopColor="#ffb27a" />
            <stop offset="1" stopColor="#ff6a00" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="200" rx="178" ry="58" fill="none" stroke="url(#fb-ring)" strokeWidth="3" transform="rotate(-18 200 200)" />
        <ellipse cx="200" cy="200" rx="192" ry="66" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" transform="rotate(-18 200 200)" />
        <circle cx="62" cy="96" r="9" fill="#e9ecf2" opacity="0.85" />
        <circle cx="338" cy="300" r="6" fill="#ff8a3a" />
        <circle cx="96" cy="320" r="3.5" fill="#b8ff6a" />
      </svg>
    </div>
  )
}
