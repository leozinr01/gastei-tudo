import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import { formatNumber } from '../lib/format'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/* ---------- Cartão ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cx('rounded-2xl border border-line bg-card p-5 sm:p-6', className)}>
      {children}
    </section>
  )
}

export function CardTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="font-display text-xl text-neutral-50">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow mb-1.5">{eyebrow}</p>
        <h1 className="font-display text-3xl text-neutral-50 sm:text-4xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}

/* ---------- Botão ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-black hover:bg-yellow-400',
  secondary: 'border border-line bg-card text-neutral-200 hover:border-neutral-600',
  ghost: 'text-neutral-400 hover:bg-white/5 hover:text-neutral-100',
  danger: 'border border-danger/40 text-danger hover:bg-danger/10',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white/5 hover:text-neutral-100 disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------- Campo de valor em reais ---------- */
/** Digitação no estilo de app de banco: os dígitos entram pelos centavos (30000 -> 300,00). */
export function MoneyInput({
  value, onChange, onBlur, disabled, id, className, autoFocus, ariaLabel,
}: {
  value: number
  onChange: (value: number) => void
  onBlur?: () => void
  disabled?: boolean
  id?: string
  className?: string
  autoFocus?: boolean
  ariaLabel?: string
}) {
  return (
    <div className={cx('relative', className)}>
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-500">R$</span>
      <input
        id={id}
        aria-label={ariaLabel}
        className="field pl-10 text-right"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        value={formatNumber(value)}
        onBlur={onBlur}
        onFocus={(e) => {
          const el = e.currentTarget
          requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length))
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
          onChange(Number(digits || '0') / 100)
        }}
      />
    </div>
  )
}

/* ---------- Estados ---------- */
export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-neutral-500" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-brand" />
      {label}
    </div>
  )
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg text-neutral-500">
        {icon}
      </div>
      <p className="font-display text-lg text-neutral-100">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-neutral-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 p-5 sm:flex-row sm:items-center" role="alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
      <p className="flex-1 text-sm text-neutral-200">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Tentar de novo</Button>}
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ open, title, eyebrow, onClose, children }: { open: boolean; title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />
      <div className="animate-fade-in relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-card p-6 sm:max-w-md sm:rounded-3xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h2 className="font-display text-2xl text-neutral-50">{title}</h2>
          </div>
          <IconButton label="Fechar" onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open, title, text, confirmLabel = 'Excluir', loading, onConfirm, onClose,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-neutral-400">{text}</p>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

/* ---------- Avisos (toasts) ---------- */
interface Toast { id: number; kind: 'success' | 'error'; message: string }
interface ToastApi { success: (message: string) => void; error: (message: string) => void }
const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback((kind: Toast['kind'], message: string) => {
    const id = nextId.current++
    setToasts((list) => [...list.slice(-2), { id, kind, message }])
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6500 : 3000)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'animate-fade-in pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm shadow-2xl shadow-black',
              t.kind === 'error' ? 'border-danger/40 text-neutral-100' : 'border-brand/40 text-neutral-100',
            )}
          >
            {t.kind === 'error'
              ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de ToastProvider')
  return ctx
}
