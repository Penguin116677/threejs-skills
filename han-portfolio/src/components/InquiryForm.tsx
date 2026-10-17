import { useId, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Info, LoaderCircle, Mail } from 'lucide-react'
import { budgetRanges, projectTypes } from '../data/inquiry'
import { contact, form as formConfig } from '../config/site'
import { Button } from './Button'
import { ease } from '../lib/motion'
import { cn } from '../lib/cn'

type Fields = { name: string; email: string; type: string; budget: string; message: string }
type Errors = Partial<Record<keyof Fields, string>>
type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'demo' }
  | { kind: 'error'; message: string }

const empty: Fields = { name: '', email: '', type: '', budget: '', message: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(v: Fields): Errors {
  const e: Errors = {}
  if (v.name.trim().length < 2) e.name = 'Please enter your name.'
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Please enter a valid email address, e.g. name@company.com.'
  if (!v.type) e.type = 'Please choose the type of project.'
  if (v.message.trim().length < 20) e.message = 'Please describe your project in at least 20 characters.'
  else if (v.message.length > 3000) e.message = 'Please keep the description under 3000 characters.'
  return e
}

const isDemo = !formConfig.endpoint

const inputBase =
  'w-full rounded-2xl border bg-white/[0.03] px-4 py-3.5 text-base text-fg placeholder:text-white/30 transition-[border-color,background-color] duration-200 focus:bg-white/[0.05] focus:outline-none focus-visible:outline-2 focus-visible:outline-lime'

export function InquiryForm() {
  const uid = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Fields>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    setValues((v) => ({ ...v, [k]: value }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: validate({ ...values, [k]: value })[k] }))
    if (status.kind !== 'idle' && status.kind !== 'sending') setStatus({ kind: 'idle' })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    const firstInvalid = (Object.keys(found) as (keyof Fields)[])[0]
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      setStatus({ kind: 'error', message: 'Please fix the highlighted fields and try again.' })
      return
    }

    if (isDemo) {
      setStatus({ kind: 'demo' })
      return
    }

    setStatus({ kind: 'sending' })
    try {
      const res = await fetch(formConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      setStatus({ kind: 'sent' })
      setValues(empty)
    } catch {
      setStatus({
        kind: 'error',
        message: contact.email
          ? `Your message couldn't be sent right now. Please try again, or email ${contact.email} directly.`
          : "Your message couldn't be sent right now. Please check your connection and try again.",
      })
    }
  }

  const mailtoDraft = contact.email
    ? `mailto:${contact.email}?subject=${encodeURIComponent(`Project inquiry — ${values.type || 'Website'}`)}&body=${encodeURIComponent(
        `Name: ${values.name}\nEmail: ${values.email}\nProject type: ${values.type}\nBudget: ${values.budget || '—'}\n\n${values.message}`,
      )}`
    : ''

  const field = (k: keyof Fields) => ({
    id: `${uid}-${k}`,
    name: k,
    value: values[k],
    onChange: set(k),
    'aria-invalid': !!errors[k] || undefined,
    'aria-describedby': errors[k] ? `${uid}-${k}-err` : undefined,
    className: cn(inputBase, errors[k] ? 'border-red-400/70' : 'border-white/10 hover:border-white/20'),
  })

  const Err = ({ k }: { k: keyof Fields }) =>
    errors[k] ? (
      <p id={`${uid}-${k}-err`} className="mt-2 flex items-center gap-1.5 text-sm text-red-300">
        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
        {errors[k]}
      </p>
    ) : null

  const labelCls = 'mb-2 block text-sm font-medium text-fg/90'

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-describedby={isDemo ? `${uid}-demo` : undefined} className="relative">
      {isDemo && (
        <p id={`${uid}-demo`} className="mb-6 flex gap-2.5 rounded-2xl border border-lime/25 bg-lime/[0.06] p-4 text-sm leading-relaxed text-lime/90">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Demo mode:</strong> this form isn&rsquo;t connected to an email service yet, so messages
            are validated but <strong className="font-semibold">not sent</strong>.
          </span>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-name`} className={labelCls}>Name</label>
          <input {...field('name')} type="text" autoComplete="name" placeholder="Your name" required />
          <Err k="name" />
        </div>
        <div>
          <label htmlFor={`${uid}-email`} className={labelCls}>Email</label>
          <input {...field('email')} type="email" autoComplete="email" inputMode="email" placeholder="you@company.com" required />
          <Err k="email" />
        </div>
        <div>
          <label htmlFor={`${uid}-type`} className={labelCls}>Project type</label>
          <select {...field('type')} required>
            <option value="" disabled>Select a project type</option>
            {projectTypes.map((t) => <option key={t} value={t} className="bg-ink-2">{t}</option>)}
          </select>
          <Err k="type" />
        </div>
        <div>
          <label htmlFor={`${uid}-budget`} className={labelCls}>
            Budget range <span className="font-normal text-muted">(optional)</span>
          </label>
          <select {...field('budget')}>
            <option value="">Prefer not to say</option>
            {budgetRanges.map((b) => <option key={b} value={b} className="bg-ink-2">{b}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${uid}-message`} className={labelCls}>Project description</label>
          <textarea {...field('message')} rows={5} placeholder="Tell me about your business, goals, timeline and anything you already have in mind." required className={cn(field('message').className, 'resize-y min-h-36')} />
          <Err k="message" />
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={status.kind === 'sending'} icon={status.kind !== 'sending'} className="w-full sm:w-auto">
          {status.kind === 'sending' ? (
            <span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Sending…</span>
          ) : (
            'Send Inquiry'
          )}
        </Button>
        <p className="text-xs text-muted">Your details are only used to reply to your inquiry.</p>
      </div>

      <div aria-live="polite" role="status" className="mt-6 min-h-0">
        <AnimatePresence mode="wait">
          {status.kind === 'sent' && (
            <Notice key="sent" tone="success">
              Thank you — your message was sent. I&rsquo;ll get back to you as soon as possible.
            </Notice>
          )}
          {status.kind === 'demo' && (
            <Notice key="demo" tone="info">
              <span>
                Everything looks good — but this form is in <strong>demo mode</strong>, so <strong>your message was not sent</strong>.
                {mailtoDraft ? ' You can send the same details by email instead:' : ' Please use one of the contact options on this page instead.'}
              </span>
              {mailtoDraft && (
                <a href={mailtoDraft} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-ink">
                  <Mail className="size-4" aria-hidden="true" /> Open in email app
                </a>
              )}
            </Notice>
          )}
          {status.kind === 'error' && (
            <Notice key="error" tone="error">{status.message}</Notice>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}

function Notice({ tone, children }: { tone: 'success' | 'info' | 'error'; children: React.ReactNode }) {
  const styles = {
    success: 'border-lime/30 bg-lime/[0.07] text-lime',
    info: 'border-ember/30 bg-ember/[0.08] text-fg',
    error: 'border-red-400/30 bg-red-500/[0.08] text-red-200',
  }[tone]
  const Icon = tone === 'success' ? Check : tone === 'error' ? AlertCircle : Info
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
      className={cn('flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed', styles)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col items-start">{children}</div>
    </motion.div>
  )
}
