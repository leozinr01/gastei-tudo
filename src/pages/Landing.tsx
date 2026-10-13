import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Apple, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUp, ArrowUpRight, BatteryFull, Download, LayoutDashboard, LineChart, Lock, PiggyBank,
  Settings, Signal, Smartphone, Tag, Trash2, TrendingUp, Wifi, type LucideIcon,
} from 'lucide-react'
import { cx, Modal } from '../components/ui'
import { isInstalled, promptInstall } from '../lib/install'

const container = 'mx-auto w-full max-w-6xl px-5 sm:px-8'
const pill = 'inline-flex h-11 shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-full px-6 text-sm font-semibold transition'
const card = 'rounded-3xl border border-line bg-card'
const label = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500'
const footerLink = 'transition hover:text-neutral-100'

/* Números de exemplo usados nas prévias. */
const SPENDING = [
  { name: 'Moradia', value: 'R$ 1.650', share: 34, color: 'bg-emerald-500', stroke: 'stroke-emerald-500' },
  { name: 'Mercado', value: 'R$ 1.060', share: 22, color: 'bg-amber-400', stroke: 'stroke-amber-400' },
  { name: 'Lazer', value: 'R$ 680', share: 14, color: 'bg-sky-400', stroke: 'stroke-sky-400' },
  { name: 'Transporte', value: 'R$ 580', share: 12, color: 'bg-violet-400', stroke: 'stroke-violet-400' },
  { name: 'Saúde', value: 'R$ 390', share: 8, color: 'bg-rose-400', stroke: 'stroke-rose-400' },
  { name: 'Outros', value: 'R$ 472', share: 10, color: 'bg-neutral-500', stroke: 'stroke-neutral-500' },
]

const FEATURES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: ArrowLeftRight, title: 'Transações', text: 'Registre entradas e saídas em segundos. O saldo se atualiza na hora.' },
  { icon: PiggyBank, title: 'Meta de economia', text: 'Guarde por dia, semana, quinzena ou mês e acompanhe a Reserva crescer.' },
  { icon: LineChart, title: 'Gráficos', text: 'Veja quanto entrou, quanto saiu e para onde o saldo está indo.' },
  { icon: Tag, title: 'Categorias', text: 'Crie as suas e descubra qual delas pesa mais no mês.' },
]

const STEPS = [
  { title: 'Crie sua conta', text: 'Nome, e-mail e senha. Leva menos de um minuto.' },
  { title: 'Anote o que entra e o que sai', text: 'Cada movimentação ganha uma categoria e já aparece nos gráficos.' },
  { title: 'Descubra para onde foi', text: 'O mês inteiro em uma tela, e a Reserva crescendo toda semana.' },
]

const SECURITY: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Lock, title: 'Só você vê', text: 'Cada conta enxerga apenas os próprios dados.' },
  { icon: Download, title: 'Seus dados são seus', text: 'Exporte em planilha ou PDF quando quiser.' },
  { icon: Trash2, title: 'Apague quando quiser', text: 'Um botão remove todas as suas informações.' },
]

type Platform = 'ios' | 'android'

const INSTALL: Record<Platform, { title: string; steps: string[] }> = {
  ios: {
    title: 'Instalar no iPhone',
    steps: [
      'Abra o Gastei Tudo no Safari.',
      'Toque nos três pontinhos (…).',
      'Toque em "Compartilhar".',
      'Role a lista e toque em "Ver mais".',
      'Toque em "Adicionar à Tela de Início".',
      'Toque em "Adicionar". O ícone aparece junto dos seus apps.',
    ],
  },
  android: {
    title: 'Instalar no Android',
    steps: [
      'Abra o Gastei Tudo no Chrome.',
      'Toque nos três pontinhos, no canto de cima.',
      'Toque em "Adicionar à tela inicial" ou "Instalar app".',
      'Confirme em "Instalar". O ícone aparece junto dos seus apps.',
    ],
  },
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function Brand({ small }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={cx('flex items-center justify-center rounded-xl bg-accent/10 text-accent', small ? 'h-7 w-7' : 'h-8 w-8 sm:h-9 sm:w-9')}>
        <TrendingUp className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </span>
      <span className={cx('whitespace-nowrap font-display text-neutral-50', small ? 'text-base' : 'text-base sm:text-lg')}>Gastei Tudo</span>
    </span>
  )
}

function SectionTitle({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow mb-3">{eyebrow}</p>
      <h2 className="font-display text-3xl leading-tight text-neutral-50 sm:text-[2.6rem]">{children}</h2>
    </div>
  )
}

const RING_RADIUS = 46
const RING_LENGTH = 2 * Math.PI * RING_RADIUS
const RING_GAP = 2.5

/** Rosca de gastos por categoria (dados de exemplo); o conteúdo vai no centro. */
function Donut({ className, children }: { className?: string; children: ReactNode }) {
  let offset = 0
  return (
    <div className={cx('relative shrink-0', className)}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        {SPENDING.map((item) => {
          const size = (item.share / 100) * RING_LENGTH
          const start = offset
          offset += size
          return (
            <circle key={item.name} cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="15" className={item.stroke}
              strokeDasharray={`${size - RING_GAP} ${RING_LENGTH - size + RING_GAP}`} strokeDashoffset={-start} />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

const PHONE_NAV: Array<{ icon: LucideIcon; label: string }> = [
  { icon: LayoutDashboard, label: 'Início' },
  { icon: ArrowLeftRight, label: 'Transações' },
  { icon: PiggyBank, label: 'Meta' },
  { icon: Settings, label: 'Ajustes' },
]

/** Prévia ilustrativa: o app aberto no celular, com a tela inicial de quem está logado. */
function PhonePreview() {
  const tiny = 'text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500'
  const stat = 'rounded-xl bg-bg/70 px-2.5 py-2'
  return (
    <div className="relative mx-auto w-[280px] text-left sm:w-[304px]" aria-hidden>
      <div className="absolute -inset-10 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative rounded-[3rem] border border-neutral-700 bg-neutral-900 p-2 shadow-2xl shadow-black">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-bg">
          {/* Barra de status */}
          <div className="flex items-center justify-between px-6 pt-3.5 text-[10px] font-semibold text-neutral-200">
            <span>9:41</span>
            <span className="absolute left-1/2 top-2.5 h-5 w-[76px] -translate-x-1/2 rounded-full bg-black" />
            <span className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="space-y-2.5 px-3.5 pb-3.5 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-neutral-500">Bem-vindo de volta</p>
                <p className="font-display text-base leading-tight text-neutral-50">Olá, Leo</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">L</span>
            </div>

            <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 via-card to-card p-3.5">
              <p className={tiny}>Saldo do mês</p>
              <p className="mt-1.5 font-display text-[26px] leading-none text-neutral-50">R$ 3.668</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={stat}>
                  <p className="flex items-center gap-1 text-[9px] text-neutral-500"><ArrowDownLeft className="h-2.5 w-2.5 text-brand" /> Entrou</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-neutral-100">R$ 8.500</p>
                </div>
                <div className={stat}>
                  <p className="flex items-center gap-1 text-[9px] text-neutral-500"><ArrowUpRight className="h-2.5 w-2.5 text-danger" /> Saiu</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-neutral-100">R$ 4.832</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-center justify-between">
                <p className={tiny}>Meta da semana</p>
                <p className="text-[10px] font-semibold text-accent">72%</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full w-[72%] rounded-full bg-accent" />
              </div>
              <p className="mt-2 text-[10px] text-neutral-500"><span className="font-semibold text-neutral-200">R$ 180</span> de R$ 250 guardados</p>
            </div>

            <div className="rounded-2xl border border-line bg-card p-3.5">
              <p className={tiny}>Para onde foi</p>
              <div className="mt-2.5 flex items-center gap-3.5">
                <Donut className="h-[84px] w-[84px]">
                  <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Total</span>
                  <span className="text-[10px] font-semibold text-neutral-100">R$ 4.832</span>
                </Donut>
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {SPENDING.slice(0, 4).map((item) => (
                    <li key={item.name} className="flex items-center gap-2 text-[10px]">
                      <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', item.color)} />
                      <span className="truncate text-neutral-300">{item.name}</span>
                      <span className="ml-auto text-neutral-500">{item.share}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-line bg-card/60 px-2 pt-2">
            <div className="grid grid-cols-4">
              {PHONE_NAV.map(({ icon: Icon, label: name }, index) => (
                <span key={name} className={cx('flex flex-col items-center gap-0.5 text-[7px] font-medium', index === 0 ? 'text-brand' : 'text-neutral-600')}>
                  <Icon className="h-4 w-4" />
                  {name}
                </span>
              ))}
            </div>
            <div className="mx-auto mb-1.5 mt-2.5 h-1 w-24 rounded-full bg-neutral-700" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Ações do topo da página: instalar no celular, com o passo a passo de cada sistema.
 * Quem já abriu pelo ícone da tela inicial vê direto os botões de conta.
 */
function HeroActions() {
  const [guide, setGuide] = useState<Platform | null>(null)
  const actions = 'mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start'
  const primary = cx(pill, 'h-12 bg-accent px-7 text-black shadow-lg shadow-accent/20 hover:bg-yellow-400')

  if (isInstalled()) {
    return (
      <div className={actions}>
        <Link to="/cadastro" className={primary}>Começar agora <ArrowRight className="h-4 w-4" /></Link>
        <Link to="/login" className={cx(pill, 'h-12 border border-line px-7 text-neutral-200 hover:border-neutral-600')}>Já tenho conta</Link>
      </div>
    )
  }

  async function installAndroid() {
    if (!(await promptInstall())) setGuide('android')
  }

  return (
    <>
      <div className={actions}>
        <button type="button" onClick={() => setGuide('ios')} className={primary}>
          <Apple className="h-4 w-4" /> Instalar no iOS
        </button>
        <button type="button" onClick={installAndroid} className={cx(pill, 'h-12 border border-neutral-700 bg-black px-7 text-neutral-100 hover:border-neutral-500')}>
          <Smartphone className="h-4 w-4" /> Instalar no Android
        </button>
      </div>
      <p className="mt-5 text-sm text-neutral-500">
        Sem loja de apps. No computador,{' '}
        <Link to="/cadastro" className="font-medium text-neutral-200 underline-offset-4 hover:underline">crie sua conta</Link> ou{' '}
        <Link to="/login" className="font-medium text-neutral-200 underline-offset-4 hover:underline">entre</Link>.
      </p>
      <div className="text-left">
        <Modal open={guide !== null} eyebrow="Sem loja de apps" title={guide ? INSTALL[guide].title : ''} onClose={() => setGuide(null)}>
          <ol className="space-y-4">
            {guide && INSTALL[guide].steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-sm text-accent">{index + 1}</span>
                <span className="pt-0.5 text-sm leading-relaxed text-neutral-300">{step}</span>
              </li>
            ))}
          </ol>
        </Modal>
      </div>
    </>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className={cx(container, 'flex h-16 items-center justify-between gap-2 sm:gap-4')}>
          <Link to="/" onClick={scrollToTop} aria-label="Gastei Tudo — voltar ao início da página"><Brand /></Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Principal">
            <a className="hidden rounded-full px-3.5 py-2 text-sm text-neutral-400 transition hover:text-neutral-100 md:block" href="#recursos">Recursos</a>
            <a className="hidden rounded-full px-3.5 py-2 text-sm text-neutral-400 transition hover:text-neutral-100 md:block" href="#como-funciona">Como funciona</a>
            <a className="hidden rounded-full px-3.5 py-2 text-sm text-neutral-400 transition hover:text-neutral-100 md:block" href="#seguranca">Segurança</a>
            <Link to="/login" className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-neutral-200 transition hover:text-white sm:px-3.5">Entrar</Link>
            <Link to="/cadastro" className={cx(pill, 'h-9 bg-accent px-3.5 text-black hover:bg-yellow-400 sm:h-10 sm:px-5')}>Criar conta</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
            <div className="absolute left-1/2 top-[-12rem] h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute left-[12%] top-[18rem] h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
          </div>

          <div className={cx(container, 'grid items-center gap-14 pb-8 pt-12 sm:pb-12 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10')}>
            <div className="text-center lg:text-left">
              <p className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-4 py-1.5 text-xs text-neutral-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Controle financeiro sem planilha
              </p>
              <h1 className="animate-fade-in mx-auto mt-7 max-w-3xl font-display text-[2.75rem] leading-[1.05] text-neutral-50 sm:text-7xl lg:mx-0">
                Gastei tudo. <span className="block text-accent">Mas em quê?</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-neutral-400 lg:mx-0">
                Anote o que entra e o que sai, veja para onde o dinheiro foi e guarde um pouco toda semana.
              </p>
              <HeroActions />
            </div>
            <PhonePreview />
          </div>
        </section>

        <section id="recursos" className="scroll-mt-20 pb-14 pt-8 sm:pb-24 sm:pt-12">
          <div className={container}>
            <SectionTitle eyebrow="Recursos">Tudo o que o seu mês precisa, <span className="block text-neutral-400">e nada além.</span></SectionTitle>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className={cx(card, 'p-6 transition hover:border-neutral-700')}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-lg text-neutral-50">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-20 py-14 sm:py-24">
          <div className={container}>
            <SectionTitle eyebrow="Como funciona">Três passos e o mês fica claro.</SectionTitle>
            <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-line to-transparent md:block" aria-hidden />
              {STEPS.map((step, index) => (
                <li key={step.title} className="relative text-center">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-bg font-display text-xl text-accent">{index + 1}</span>
                  <h3 className="mt-5 font-display text-xl text-neutral-50">{step.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="seguranca" className="scroll-mt-20 py-14 sm:py-24">
          <div className={container}>
            <div className={cx(card, 'grid gap-10 p-7 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:items-center')}>
              <div>
                <p className="eyebrow mb-3">Segurança</p>
                <h2 className="font-display text-3xl leading-tight text-neutral-50 sm:text-4xl">Seus dados ficam só com você.</h2>
              </div>
              <ul className="space-y-6">
                {SECURITY.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-neutral-100">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-400">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-4 sm:pb-24">
          <div className={container}>
            <div className="relative overflow-hidden rounded-[2rem] border border-accent/25 bg-card px-6 py-14 text-center sm:py-20">
              <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" aria-hidden />
              <h2 className="relative mx-auto max-w-xl font-display text-3xl leading-tight text-neutral-50 sm:text-5xl">
                No mês que vem, <span className="block text-accent">você vai saber.</span>
              </h2>
              <p className="relative mx-auto mt-4 max-w-md text-base text-neutral-400">Crie sua conta e lance a primeira transação em menos de um minuto.</p>
              <Link to="/cadastro" className={cx(pill, 'relative mt-8 h-12 bg-accent px-7 text-black hover:bg-yellow-400')}>
                Criar minha conta <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className={cx(container, 'grid grid-cols-2 gap-x-8 gap-y-10 py-12 md:grid-cols-[1.6fr_1fr_1fr] md:py-14')}>
          <div className="col-span-2 md:col-span-1">
            <Link to="/" onClick={scrollToTop} className="inline-block" aria-label="Gastei Tudo — voltar ao início da página"><Brand /></Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Controle financeiro simples: saiba para onde o dinheiro vai e guarde um pouco toda semana.
            </p>
          </div>
          <nav aria-label="Produto">
            <p className={label}>Produto</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              <li><a className={footerLink} href="#recursos">Recursos</a></li>
              <li><a className={footerLink} href="#como-funciona">Como funciona</a></li>
              <li><a className={footerLink} href="#seguranca">Segurança</a></li>
            </ul>
          </nav>
          <nav aria-label="Conta">
            <p className={label}>Conta</p>
            <ul className="mt-4 space-y-3 text-sm text-neutral-400">
              <li><Link className={footerLink} to="/login">Entrar</Link></li>
              <li><Link className={footerLink} to="/cadastro">Criar conta</Link></li>
              <li><Link className={footerLink} to="/recuperar-senha">Esqueci minha senha</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line">
          <div className={cx(container, 'flex flex-col items-center justify-between gap-3 py-6 text-xs text-neutral-500 sm:flex-row')}>
            <div className="text-center sm:text-left">
              <p>© {new Date().getFullYear()} Gastei Tudo. Todos os direitos reservados.</p>
              <p className="mt-1 text-[10px] text-neutral-600">Empresa criadora: Nexora</p>
            </div>
            <button type="button" onClick={scrollToTop} className="inline-flex items-center gap-1.5 transition hover:text-neutral-200">
              Voltar ao topo <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
