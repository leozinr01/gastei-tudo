import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, PieChart as PieIcon, PiggyBank, Plus, Receipt, Scale, Wallet } from 'lucide-react'
import { AXIS, ChartTooltip, GRID } from '../components/charts'
import PeriodFilter, { defaultPeriodState, presetPeriod, type PeriodPreset } from '../components/PeriodFilter'
import TransactionForm from '../components/TransactionForm'
import { Button, Card, CardTitle, cx, EmptyState, PageHeader } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { monthShortLabel, todayISO } from '../lib/dates'
import { availableBalance, balanceSeries, inPeriod, monthlyFlow, sumDeposits, totals } from '../lib/finance'
import { formatBRL, formatCompact, formatDate, formatDayMonth } from '../lib/format'
import { currentGoalStatus, GOAL_PERIODS } from '../lib/goal'

const PRESETS: Array<{ id: Exclude<PeriodPreset, 'custom'>; label: string }> = [
  { id: 'month', label: 'Mês atual' },
  { id: 'last-month', label: 'Mês passado' },
  { id: '3-months', label: '3 meses' },
  { id: 'year', label: 'Este ano' },
]

const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.14em]'

/** Bloco pequeno dentro do cartão de saldo: um total do período. */
function Stat({ label, value, icon, auto }: { label: string; value: number; icon: React.ReactNode; auto?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg/70 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-xs text-neutral-500">{icon} {label}</p>
      <p className={cx('mt-1 truncate text-base font-semibold', !auto ? 'text-neutral-100' : value < 0 ? 'text-danger' : 'text-brand')}>{formatBRL(value)}</p>
    </div>
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
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="#141414" strokeWidth={2}>
          {data.map((c) => <Cell key={c.name} fill={c.fill} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
})

export default function DashboardPage() {
  const { transactions, deposits, settings, categories } = useData()
  const [filter, setFilter] = useState(defaultPeriodState)
  const [formOpen, setFormOpen] = useState(false)
  const { period } = filter

  const balance = availableBalance(settings, transactions, deposits)
  const reserve = sumDeposits(deposits)
  const periodTx = useMemo(() => inPeriod(transactions, period), [transactions, period])
  const periodTotals = totals(periodTx)
  const week = useMemo(() => currentGoalStatus(deposits, settings), [deposits, settings])
  const goalText = GOAL_PERIODS[week.period]

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

  const monthly = useMemo(
    () => monthlyFlow(settings, transactions, deposits).slice(-6).map((m) => ({ label: monthShortLabel(m.month), Entradas: m.income, Saídas: m.expense })),
    [settings, transactions, deposits],
  )

  const recent = transactions.slice(0, 6)
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const isEmpty = transactions.length === 0

  return (
    <>
      <PageHeader eyebrow="Visão geral" title="Dashboard">
        <PeriodFilter value={filter} onChange={setFilter} />
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Nova transação</Button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Período">
        {PRESETS.map((p) => {
          const active = filter.preset === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter({ preset: p.id, period: presetPeriod(p.id) })}
              className={cx(
                'h-9 rounded-full border px-4 text-sm transition',
                active ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-card text-neutral-400 hover:border-neutral-600 hover:text-neutral-100',
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Saldo + meta do período */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex flex-col rounded-2xl border border-accent/25 bg-linear-to-br from-accent/[0.16] via-card to-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cx(LABEL, 'text-accent')}>Saldo disponível</p>
              <p className={cx('mt-2 truncate font-display text-4xl sm:text-5xl', balance < 0 ? 'text-danger' : 'text-neutral-50')}>{formatBRL(balance)}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Wallet className="h-5 w-5" />
            </span>
          </div>
          <p className={cx(LABEL, 'mt-auto pt-6 text-neutral-500')}>No período · {formatDate(period.from)} — {formatDate(period.to)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            <Stat label="Entrou" value={periodTotals.income} icon={<ArrowDownLeft className="h-3.5 w-3.5 text-brand" />} />
            <Stat label="Saiu" value={periodTotals.expense} icon={<ArrowUpRight className="h-3.5 w-3.5 text-danger" />} />
            <Stat label="Reserva" value={reserve} icon={<PiggyBank className="h-3.5 w-3.5 text-accent" />} />
            <Stat label="Resultado" value={periodTotals.result} auto icon={<Scale className="h-3.5 w-3.5 text-neutral-400" />} />
          </div>
        </section>

        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <p className={cx(LABEL, 'text-neutral-500')}>Meta {goalText.ofThe}</p>
            <Link to="/meta" aria-label="Abrir meta" className="-my-2 -mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-white/5 hover:text-neutral-100">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <p className="truncate font-display text-3xl text-neutral-50">{formatBRL(week.saved)}</p>
            <p className="pb-1 text-sm font-semibold text-accent">{week.percent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${week.percent}%` }} />
          </div>
          <p className="mt-2.5 text-sm text-neutral-500">de {formatBRL(week.goal)} guardados</p>
          {week.period === 'weekly' && (
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {week.days.map((d) => (
                <span key={d.date} title={formatDate(d.date)}
                  className={cx('h-1.5 flex-1 rounded-full', d.deposit ? 'bg-brand' : d.isPast ? 'bg-danger/50' : d.isToday ? 'bg-accent/70' : 'bg-line')} />
              ))}
            </div>
          )}
          <p className="mt-auto pt-5 text-sm text-neutral-400">
            {week.hit
              ? `Parabéns, a meta ${goalText.ofThe} está garantida.`
              : week.daysLeft > 0 && week.period === 'weekly'
                ? <>Faltam <b className="text-neutral-100">{formatBRL(week.remaining)}</b>. Guarde <b className="text-accent">{formatBRL(week.suggestion)}</b> por dia {goalText.until}.</>
                : <>Faltam <b className="text-neutral-100">{formatBRL(week.remaining)}</b> para a meta.</>}
          </p>
        </Card>
      </div>

      {isEmpty && (
        <Card className="mt-5">
          <EmptyState icon={<Receipt className="h-5 w-5" />} title="Comece registrando uma transação"
            text="Assim que você lançar entradas e saídas, os gráficos e o histórico aparecem aqui."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setFormOpen(true)}>Nova transação</Button>} />
        </Card>
      )}

      {/* Categorias + recentes */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle eyebrow="Gastos por categoria" title="Para onde foi" />
          {byCategory.length === 0 ? (
            <EmptyState icon={<PieIcon className="h-5 w-5" />} title="Sem saídas no período" text="Quando houver gastos neste período, eles aparecem aqui divididos por categoria." />
          ) : (
            <div className="flex flex-col items-center gap-8 sm:flex-row">
              <div className="relative h-48 w-48 shrink-0">
                <CategoryPie data={byCategory} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cx(LABEL, 'text-[10px] text-neutral-500')}>Total</span>
                  <span className="text-sm font-semibold text-neutral-100">{formatBRL(periodTotals.expense)}</span>
                </div>
              </div>
              <ul className="w-full min-w-0 flex-1 space-y-3.5">
                {byCategory.slice(0, 9).map((c) => (
                  <li key={c.name} className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.fill }} />
                    <span className="min-w-0 truncate font-medium text-neutral-100">{c.name}</span>
                    <span className="text-xs text-neutral-500">{Math.round((c.value / periodTotals.expense) * 100)}%</span>
                    <span className="ml-auto shrink-0 pl-3 text-neutral-400">{formatBRL(c.value)}</span>
                  </li>
                ))}
                {byCategory.length > 9 && <li className="text-xs text-neutral-600">+ {byCategory.length - 9} outras categorias</li>}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle eyebrow="Movimentações" title="Transações recentes"
            action={<Link to="/transacoes" className="text-xs font-medium text-accent hover:underline">Ver todas</Link>} />
          {isEmpty ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="Nada por aqui ainda" text="Suas últimas movimentações aparecem nesta lista." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((t) => {
                const cat = t.category_id ? categoryById.get(t.category_id) : undefined
                const income = t.type === 'income'
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', income ? 'bg-brand/10 text-brand' : 'bg-danger/10 text-danger')}>
                      {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-100">{t.description || (cat?.name ?? (income ? 'Entrada' : 'Saída'))}</p>
                      <p className="truncate text-xs text-neutral-500">{cat?.name ?? 'Sem categoria'} · {formatDate(t.date)}</p>
                    </div>
                    <span className={cx('shrink-0 text-sm font-semibold', income ? 'text-brand' : 'text-neutral-200')}>{income ? '+' : '−'}{formatBRL(t.amount)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Histórico de saldo + comparação mensal */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Fluxo no tempo" title="Histórico de saldo" />
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

        <Card>
          <CardTitle eyebrow="Últimos meses" title="Entradas x saídas" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} width={48} tickFormatter={formatCompact} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#a3a3a3' }} />
                <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} />
    </>
  )
}
