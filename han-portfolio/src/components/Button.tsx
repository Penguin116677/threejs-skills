import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'ghost' | 'outline'

const base =
  'group relative inline-flex min-h-12 select-none items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 text-[0.95rem] font-medium tracking-tight transition-[transform,background-color,color,border-color,box-shadow] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary:
    'bg-ember text-black shadow-[0_10px_40px_-10px_rgba(255,106,0,0.7)] hover:shadow-[0_14px_50px_-8px_rgba(255,106,0,0.9)] hover:-translate-y-0.5',
  ghost: 'text-fg hover:bg-white/[0.06]',
  outline: 'border border-white/15 bg-white/[0.02] text-fg backdrop-blur-sm hover:border-white/40 hover:bg-white/[0.06]',
}

function Inner({ children, icon = true }: { children: ReactNode; icon?: boolean }) {
  return (
    <>
      {/* sheen sweep on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-[300%] group-hover:opacity-100"
      />
      <span className="relative">{children}</span>
      {icon && (
        <ArrowUpRight
          aria-hidden="true"
          className="relative size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      )}
    </>
  )
}

export function ButtonLink({
  variant = 'primary',
  icon,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; icon?: boolean }) {
  return (
    <a className={cn(base, variants[variant], className)} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </a>
  )
}

export function Button({
  variant = 'primary',
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: boolean }) {
  return (
    <button type={type} className={cn(base, variants[variant], className)} {...rest}>
      <Inner icon={icon}>{children}</Inner>
    </button>
  )
}
