import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Eye, EyeOff, MailCheck, TrendingUp } from 'lucide-react'
import { Button, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { errorMessage } from '../lib/errors'
import * as auth from '../services/auth'

function AuthShell({ eyebrow, title, subtitle, children, footer }: {
  eyebrow: string; title: string; subtitle: string; children: ReactNode; footer?: ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between gap-2 px-4 sm:gap-4 sm:px-8 lg:px-12">
          <Link to="/" aria-label="Gastei Tudo — voltar à página inicial"><Brand /></Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <Link to="/login" className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-neutral-200 transition hover:text-white sm:px-3.5">Entrar</Link>
            <Link to="/cadastro" className="inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-accent px-3.5 text-sm font-semibold text-black transition hover:bg-yellow-400 sm:h-10 sm:px-5">Criar conta</Link>
          </nav>
        </div>
      </header>
      <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
        {/* Painel da marca (desktop) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-12 lg:flex">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_20%,black,transparent)]" />
            <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="font-display text-5xl leading-[1.08] text-neutral-50">
              Gastei tudo. <span className="block text-accent">Mas em quê?</span>
            </h2>
            <ul className="mt-8 space-y-3.5 text-sm text-neutral-300">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative rounded-2xl border border-line bg-card/80 p-5 backdrop-blur-sm" aria-hidden>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-neutral-500">Meta da semana · exemplo</span>
              <span className="font-semibold text-accent">72%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full w-[72%] rounded-full bg-accent" />
            </div>
            <p className="mt-3 text-sm text-neutral-400"><span className="font-semibold text-neutral-100">R$ 180</span> de R$ 250 guardados</p>
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="animate-fade-in w-full max-w-sm">
            <p className="eyebrow mb-2">{eyebrow}</p>
            <h1 className="font-display text-4xl text-neutral-50">{title}</h1>
            <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6 text-center text-sm text-neutral-500">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  )
}

const BENEFITS = [
  'Veja para onde o dinheiro foi, categoria por categoria',
  'Acompanhe o saldo mês a mês',
  'Guarde um pouco toda semana',
]

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
        <TrendingUp className="h-4 w-4" />
      </span>
      <span className="font-display text-lg text-neutral-50">Gastei Tudo</span>
    </span>
  )
}

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${className ?? ''} pr-11`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Esconder senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-500 transition hover:text-neutral-200"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function FormError({ message }: { message: string }) {
  if (!message) return null
  return <p className="rounded-xl border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-sm text-danger" role="alert">{message}</p>
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center py-2 text-center">
      <MailCheck className="mb-3 h-8 w-8 text-brand" />
      <p className="font-display text-lg text-neutral-50">{title}</p>
      <p className="mt-1 text-sm text-neutral-400">{text}</p>
    </div>
  )
}

const link = 'font-medium text-brand hover:underline'
const MIN_PASSWORD = 8
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!isEmail(email.trim())) return setError('Informe um e-mail válido.')
    if (!password) return setError('Informe sua senha.')
    setError('')
    setLoading(true)
    try {
      await auth.signIn(email.trim(), password)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar.'))
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Que bom te ver de novo" title="Entrar" subtitle="Acompanhe seu dinheiro e sua meta da semana."
      footer={<>Ainda não tem conta? <Link className={link} to="/cadastro">Criar conta</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="field-label" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="password">Senha</label>
            <Link className="mb-1.5 text-xs text-neutral-500 hover:text-brand" to="/recuperar-senha">Esqueci minha senha</Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <FormError message={error} />
        <Button type="submit" loading={loading} className="w-full">Entrar</Button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const toast = useToast()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Informe seu nome.')
    if (!surname.trim()) return setError('Informe seu sobrenome.')
    if (!isEmail(email.trim())) return setError('Informe um e-mail válido.')
    if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
    if (password !== confirm) return setError('As senhas não conferem.')
    setError('')
    setLoading(true)
    try {
      const loggedIn = await auth.signUp(`${name.trim()} ${surname.trim()}`, email.trim(), password)
      if (loggedIn) toast.success('Cadastrado com sucesso!')
      else setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível criar a conta.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Comece agora" title="Criar conta" subtitle="Leva um minuto. Seus dados ficam só com você."
      footer={<>Já tem conta? <Link className={link} to="/login">Entrar</Link></>}>
      {sent ? (
        <Notice title="Confirme seu e-mail" text={`Enviamos um link de confirmação para ${email.trim()}. Abra o link e depois entre com sua senha.`} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="name">Nome</label>
              <input id="name" type="text" autoComplete="given-name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="surname">Sobrenome</label>
              <input id="surname" type="text" autoComplete="family-name" className="field" value={surname} onChange={(e) => setSurname(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="password">Senha</label>
            <PasswordInput id="password" autoComplete="new-password" className="field" placeholder={`Mínimo de ${MIN_PASSWORD} caracteres`} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="confirm">Confirmar senha</label>
            <PasswordInput id="confirm" autoComplete="new-password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <FormError message={error} />
          <Button type="submit" loading={loading} className="w-full">Criar conta</Button>
        </form>
      )}
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!isEmail(email.trim())) return setError('Informe um e-mail válido.')
    setError('')
    setLoading(true)
    try {
      await auth.sendPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível enviar o e-mail.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Recuperação" title="Esqueci minha senha" subtitle="Enviaremos um link para você criar uma nova senha."
      footer={<Link className={link} to="/login">Voltar para o login</Link>}>
      {sent ? (
        <Notice title="Verifique seu e-mail" text={`Se existir uma conta para ${email.trim()}, o link de recuperação chega em instantes.`} />
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <FormError message={error} />
          <Button type="submit" loading={loading} className="w-full">Enviar link</Button>
        </form>
      )}
    </AuthShell>
  )
}

/** Tela aberta pelo link do e-mail de recuperação (o link já deixa a pessoa autenticada). */
export function ResetPasswordPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
    if (password !== confirm) return setError('As senhas não conferem.')
    setError('')
    setLoading(true)
    try {
      await auth.updatePassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível alterar a senha.'))
      setLoading(false)
    }
  }

  return (
    <AuthShell eyebrow="Recuperação" title="Nova senha" subtitle="Escolha a senha que você vai usar daqui em diante.">
      {!authLoading && !user ? (
        <div className="text-center text-sm text-neutral-400">
          <p>Este link expirou ou já foi usado.</p>
          <Link className={`${link} mt-3 inline-block`} to="/recuperar-senha">Pedir um novo link</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="field-label" htmlFor="password">Nova senha</label>
            <PasswordInput id="password" autoComplete="new-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="confirm">Confirmar nova senha</label>
            <PasswordInput id="confirm" autoComplete="new-password" className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <FormError message={error} />
          <Button type="submit" loading={loading || authLoading} className="w-full">Salvar nova senha</Button>
        </form>
      )}
    </AuthShell>
  )
}
