import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays } from 'lucide-react'
import { AXIS, ChartTooltip, GRID } from '../components/charts'
import { Card, CardTitle, cx, EmptyState, PageHeader } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { monthKey, monthLongLabel, monthShortLabel, todayISO, weekdayName } from '../lib/dates'
import { dailyFlow, monthlyFlow } from '../lib/finance'
import { formatBRL, formatCompact, formatDate } from '../lib/format'

function Money({ value, tone }: { value: number; tone?: 'in' | 'out' | 'auto' | 'reserve' }) {
  const color =
    tone === 'in' ? (value ? 'text-brand' : 'text-neutral-600')
    : tone === 'out' ? (value ? 'text-danger' : 'text-neutral-600')
    : tone === 'reserve' ? (value ? 'text-accent' : 'text-neutral-600')
    : tone === 'auto' ? (value < 0 ? 'text-danger' : 'text-neutral-100')
    : 'text-neutral-100'
  return <span className={cx('whitespace-nowrap', color)}>{formatBRL(value)}</span>
}

const th = 'px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500 first:text-left sm:px-6'
const td = 'px-4 py-3 text-right text-sm first:text-left sm:px-6'

export default function CashFlowPage() {
  const { transactions, deposits, settings } = useData()
  const months = useMemo(() => monthlyFlow(settings, transactions, deposits), [settings, transactions, deposits])
  const current = monthKey(todayISO())
  const [selected, setSelected] = useState(current)
  const month = months.some((m) => m.month === selected) ? selected : current
  const daily = useMemo(() => dailyFlow(month, settings, transactions, deposits), [month, settings, transactions, deposits])

  const chartData = months.map((m) => ({ label: monthShortLabel(m.month), 'Saldo acumulado': m.balance }))
  const newestFirst = [...months].reverse()

  return (
    <>
      <PageHeader eyebrow="Mês a mês" title="Fluxo de caixa" />

      <Card className="mb-4">
        <CardTitle eyebrow="Evolução" title="Saldo acumulado" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" {...AXIS} minTickGap={16} />
              <YAxis {...AXIS} width={48} tickFormatter={formatCompact} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#333' }} />
              <Line type="monotone" dataKey="Saldo acumulado" stroke="#22c55e" strokeWidth={2.5}
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mb-4 !p-0">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <CardTitle eyebrow="Resumo" title="Mês a mês" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-y border-line">
                <th className={th}>Mês</th>
                <th className={th}>Entradas</th>
                <th className={th}>Saídas</th>
                <th className={th}>Resultado</th>
                <th className={th}>Reserva</th>
                <th className={th}>Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {newestFirst.map((m) => (
                <tr key={m.month} onClick={() => setSelected(m.month)}
                  className={cx('cursor-pointer transition hover:bg-white/[0.03]', m.month === month && 'bg-brand/[0.06]')}>
                  <td className={cx(td, 'font-medium text-neutral-100')}>
                    <button type="button" className="text-left hover:underline" onClick={() => setSelected(m.month)}>
                      {monthLongLabel(m.month)}
                    </button>
                  </td>
                  <td className={td}><Money value={m.income} tone="in" /></td>
                  <td className={td}><Money value={m.expense} tone="out" /></td>
                  <td className={cx(td, 'font-medium')}><Money value={m.result} tone="auto" /></td>
                  <td className={td}><Money value={m.saved} tone="reserve" /></td>
                  <td className={cx(td, 'font-semibold')}><Money value={m.balance} tone="auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-3 text-xs text-neutral-600 sm:px-6">
          Resultado = entradas − saídas. O saldo acumulado desconta também o que foi enviado à Reserva. Toque em um mês para ver o dia a dia.
        </p>
      </Card>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:pt-6">
          <div>
            <p className="eyebrow mb-1">Dia a dia</p>
            <h2 className="font-display text-xl text-neutral-50">{monthLongLabel(month)}</h2>
          </div>
          <select className="field h-10 w-auto" aria-label="Mês" value={month} onChange={(e) => setSelected(e.target.value)}>
            {newestFirst.map((m) => <option key={m.month} value={m.month}>{monthLongLabel(m.month)}</option>)}
          </select>
        </div>
        {daily.days.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Sem movimentação" text="Não há entradas, saídas nem depósitos neste mês." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-y border-line">
                  <th className={th}>Dia</th>
                  <th className={th}>Entradas</th>
                  <th className={th}>Saídas</th>
                  <th className={th}>Reserva</th>
                  <th className={th}>Saldo do dia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className={cx(td, 'text-neutral-500')} colSpan={4}>Saldo no início do mês</td>
                  <td className={cx(td, 'font-medium')}><Money value={daily.opening} tone="auto" /></td>
                </tr>
                {daily.days.map((d) => (
                  <tr key={d.date}>
                    <td className={cx(td, 'text-neutral-100')}>
                      {formatDate(d.date)} <span className="ml-1 text-xs text-neutral-600">{weekdayName(d.date)}</span>
                    </td>
                    <td className={td}><Money value={d.income} tone="in" /></td>
                    <td className={td}><Money value={d.expense} tone="out" /></td>
                    <td className={td}><Money value={d.saved} tone="reserve" /></td>
                    <td className={cx(td, 'font-semibold')}><Money value={d.balance} tone="auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="h-3" />
      </Card>
    </>
  )
}
