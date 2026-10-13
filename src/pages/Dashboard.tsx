import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowDownLeft, ArrowUpRight, PieChart as PieIcon, Plus, Receipt } from 'lucide-react'
import { AXIS, ChartTooltip, GRID } from '../components/charts'
import PeriodFilter, { defaultPeriodState } from '../components/PeriodFilter'
import TransactionForm from '../components/TransactionForm'
import { Button, Card, CardTitle, cx, EmptyState, PageHeader } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { todayISO } from '../lib/dates'
import { availableBalance, balanceSeries, inPeriod, totals } from '../lib/finance'
import { formatBRL, formatCompact, formatDate, formatDayMonth } from '../lib/format'
import { currentGoalStatus, GOAL_PERIODS } from '../lib/goal'

const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.14em]'
const CARD_LINK = 'text-xs font-medium text-accent hover:underline'

/** Um total do período, na linha de baixo do cartão de saldo. */
function Stat({ label, value, tone }: { label: string; value: number; tone: 'in' | 'out' | 'auto' }) {
  const color = tone === 'in' ? 'text-brand' : tone === 'out' ? 'text-danger' : value < 0 ? 'text-danger' : 'text-neutral-100'
  return (
    <div className="min-w-0">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={cx('mt-1 truncate text-sm font-semibold sm:text-lg', color)}>{formatBRL(value)}</p>
    </div>
  )
}

/** Título que separa os blocos da página. No celular não aparece: a tela segue enxuta, só com os cartões. */
function SectionTitle({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <h2 className={cx('mb-3 flex items-center gap-3 text-sm font-semibold text-neutral-300 max-md:hidden', first ? 'mt-0' : 'mt-8')}>
      {children}
      <span className="h-px flex-1 bg-line" aria-hidden />
    </h2>
  )
}

type CategorySlice = { name: string; value: number; fill: string }

/**
 * Rosca de gastos por categoria. Fica em um componente memoizado porque qualquer
 * novo desenho do gráfico no meio da animação de entrada faz ela ser cortada.
 */
const CategoryPie = memo(function CategoryPie({ data }: { data: CategorySlice[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" paddingAngle={2} stroke="#141414" strokeWidth={2}>
          {data.map((c) => <Cell key={c.name} fill={c.fill} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
})

const TOP_CATEGORIES = 5

export default function DashboardPage() {
  const { transactions, deposits, settings, categories } = useData()
  const [filter, setFilter] = useState(defaultPeriodState)
  const [formOpen, setFormOpen] = useState(false)
  const { period } = filter

  const balance = availableBalance(settings, transactions, deposits)
  const periodTx = useMemo(() => inPeriod(transactions, period), [transactions, period])
  const periodTotals = totals(periodTx)
  const goal = useMemo(() => currentGoalStatus(deposits, settings), [deposits, settings])
  const goalText = GOAL_PERIODS[goal.period]

  const history = useMemo(
    () => {
      // Não projeta dias futuros: o gráfico vai até hoje (ou até o fim do período, se já passou).
      const today = todayISO()
      const to = period.from <= today && today < period.to ? today : period.to
      return balanceSeries(settings, transactions, deposits, { from: period.from, to }).map((p) => ({ date: p.date, Saldo: p.balance }))
    },
    [settings, transactions, deposits, period],
  )

  const byCategory = useMemo(() => {
    const names = new Map(categories.map((c) => [c.id, c]))
    const map = new Map<string, CategorySlice>()
    for (const t of periodTx) {
      if (t.type !== 'expense') continue
      const cat = t.category_id ? names.get(t.category_id) : undefined
      const key = cat?.id ?? 'none'
      const cur = map.get(key) ?? { name: cat?.name ?? 'Sem categoria', value: 0, fill: cat?.color ?? '#525252' }
      cur.value += t.amount
      map.set(key, cur)
    }
    return [...map.values()].map((c) => ({ ...c, value: Math.round(c.value * 100) / 100 })).sort((a, b) => b.value - a.value)
  }, [periodTx, categories])

  const recent = transactions.slice(0, 5)
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const isEmpty = transactions.length === 0

  return (
    <>
      {/* No celular o topo já traz a saudação; o título da página fica só em telas largas. */}
      <div className="max-md:hidden">
        <PageHeader eyebrow="Visão geral" title="Dashboard">
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Nova transação</Button>
        </PageHeader>
      </div>

      <div className="mb-4 md:mb-5">
        <PeriodFilter value={filter} onChange={setFilter} />
      </div>

      {/* Saldo + meta */}
      <SectionTitle first>Resumo</SectionTitle>
      <div className="grid gap-3 md:gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-2xl border border-accent/25 bg-linear-to-br from-accent/[0.16] via-card to-card p-5 sm:p-6">
          <p className={cx(LABEL, 'text-accent')}>Saldo disponível</p>
          <p className={cx('mt-2 truncate font-display text-4xl sm:text-5xl', balance < 0 ? 'text-danger' : 'text-neutral-50')}>{formatBRL(balance)}</p>
          {/* Celular: entrou e saiu em dois blocos, como na prévia da página inicial. */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 md:hidden">
            <div className="min-w-0 rounded-xl bg-bg/70 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-xs text-neutral-500"><ArrowDownLeft className="h-3.5 w-3.5 text-brand" /> Entrou</p>
              <p className="mt-1 truncate text-base font-semibold text-neutral-100">{formatBRL(periodTotals.income)}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-bg/70 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-xs text-neutral-500"><ArrowUpRight className="h-3.5 w-3.5 text-danger" /> Saiu</p>
              <p className="mt-1 truncate text-base font-semibold text-neutral-100">{formatBRL(periodTotals.expense)}</p>
            </div>
          </div>
          <div className="mt-auto pt-6 max-md:hidden">
            <p className="text-xs text-neutral-500">{formatDate(period.from)} a {formatDate(period.to)}</p>
            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <Stat label="Entrou" value={periodTotals.income} tone="in" />
              <Stat label="Saiu" value={periodTotals.expense} tone="out" />
              <Stat label="Resultado" value={periodTotals.result} tone="auto" />
            </div>
          </div>
        </section>

        {/* Celular: meta em uma faixa curta, que abre a página da meta ao tocar. */}
        <Link to="/meta" className="block rounded-2xl border border-line bg-card p-5 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className={cx(LABEL, 'text-neutral-500')}>Meta {goalText.ofThe}</p>
            <p className="text-sm font-semibold text-accent">{goal.percent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${goal.percent}%` }} />
          </div>
          <p className="mt-3 text-sm text-neutral-500"><span className="font-semibold text-neutral-200">{formatBRL(goal.saved)}</span> de {formatBRL(goal.goal)} guardados</p>
        </Link>

        <Card className="flex flex-col max-md:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className={cx(LABEL, 'text-neutral-500')}>Meta {goalText.ofThe}</p>
            <Link to="/meta" className={CARD_LINK}>Abrir</Link>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="truncate font-display text-3xl text-neutral-50">{formatBRL(goal.saved)}</p>
            <p className="pb-1 text-sm font-semibold text-accent">{goal.percent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${goal.percent}%` }} />
          </div>
          <p className="mt-auto pt-5 text-sm text-neutral-400">
            {goal.hit
              ? `Meta ${goalText.ofThe} batida.`
              : <>Faltam <b className="font-semibold text-neutral-100">{formatBRL(goal.remaining)}</b> de {formatBRL(goal.goal)}.</>}
          </p>
        </Card>
      </div>

      {isEmpty ? (
        <Card className="mt-3 md:mt-5">
          <EmptyState icon={<Receipt className="h-5 w-5" />} title="Comece registrando uma transação"
            text="Assim que você lançar entradas e saídas, os gráficos e o histórico aparecem aqui."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Nova transação</Button>} />
        </Card>
      ) : (
        <>
          {/* Categorias + recentes */}
          <SectionTitle>Gastos e movimentações</SectionTitle>
          <div className="grid gap-3 max-md:mt-3 md:gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Card>
              <CardTitle eyebrow="Gastos por categoria" title="Para onde foi" />
              {byCategory.length === 0 ? (
                <EmptyState icon={<PieIcon className="h-5 w-5" />} title="Sem saídas no período" text="Quando houver gastos neste período, eles aparecem aqui divididos por categoria." />
              ) : (
                <div className="flex items-center gap-4 sm:gap-8">
                  <div className="relative h-32 w-32 shrink-0 sm:h-48 sm:w-48">
                    <CategoryPie data={byCategory} />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className={cx(LABEL, 'text-[10px] text-neutral-500')}>Total</span>
                      <span className="text-[11px] font-semibold text-neutral-100 sm:text-sm">{formatBRL(periodTotals.expense)}</span>
                    </div>
                  </div>
                  <ul className="w-full min-w-0 flex-1 space-y-2.5 sm:space-y-3.5">
                    {byCategory.slice(0, TOP_CATEGORIES).map((c) => (
                      <li key={c.name} className="flex items-center gap-3 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.fill }} />
                        <span className="min-w-0 truncate text-neutral-100">{c.name}</span>
                        <span className="ml-auto shrink-0 pl-3 text-neutral-400 max-sm:hidden">{formatBRL(c.value)}</span>
                        <span className="w-9 shrink-0 text-right text-xs text-neutral-500 max-sm:ml-auto">{Math.round((c.value / periodTotals.expense) * 100)}%</span>
                      </li>
                    ))}
                    {byCategory.length > TOP_CATEGORIES && (
                      <li className="text-xs text-neutral-600">+ {byCategory.length - TOP_CATEGORIES} {byCategory.length - TOP_CATEGORIES === 1 ? 'outra categoria' : 'outras categorias'}</li>
                    )}
                  </ul>
                </div>
              )}
            </Card>

            <Card>
              <CardTitle eyebrow="Movimentações" title="Recentes" action={<Link to="/transacoes" className={CARD_LINK}>Ver todas</Link>} />
              <ul className="divide-y divide-line">
                {recent.map((t) => {
                  const cat = t.category_id ? categoryById.get(t.category_id) : undefined
                  const income = t.type === 'income'
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', income ? 'bg-brand/10 text-brand' : 'bg-danger/10 text-danger')}>
                        {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-100">{t.description || (cat?.name ?? (income ? 'Entrada' : 'Saída'))}</p>
                        <p className="truncate text-xs text-neutral-500">{formatDayMonth(t.date)} · {cat?.name ?? 'Sem categoria'}</p>
                      </div>
                      <span className={cx('shrink-0 text-sm font-semibold', income ? 'text-brand' : 'text-neutral-200')}>{income ? '+' : '−'}{formatBRL(t.amount)}</span>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>

          {/* Histórico de saldo */}
          <SectionTitle>Evolução</SectionTitle>
          <Card className="max-md:mt-3">
            <CardTitle eyebrow="No período" title="Histórico de saldo" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="date" {...AXIS} tickFormatter={formatDayMonth} minTickGap={28} />
                  <YAxis {...AXIS} width={48} tickFormatter={formatCompact} />
                  <Tooltip content={<ChartTooltip labelFormatter={formatDate} />} cursor={{ stroke: '#333' }} />
                  <Area type="monotone" dataKey="Saldo" stroke="#22c55e" strokeWidth={2} fill="url(#balanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {/* No celular, o botão de nova transação fica flutuando acima da barra inferior. */}
      <button type="button" aria-label="Nova transação" onClick={() => setFormOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black shadow-lg shadow-black/50 transition hover:bg-yellow-400 md:hidden">
        <Plus className="h-6 w-6" />
      </button>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  )
}
