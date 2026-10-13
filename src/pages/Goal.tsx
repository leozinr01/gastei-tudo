import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flame, History, Loader2, PiggyBank, Plus, Settings as SettingsIcon, Trash2, Trophy, X } from 'lucide-react'
import { Button, Card, CardTitle, cx, EmptyState, IconButton, MoneyInput, PageHeader, useToast } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { todayISO, weekdayName } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { goalStreak, goalSummaries, sumDeposits } from '../lib/finance'
import { formatBRL, formatDate, formatDayMonth } from '../lib/format'
import { currentGoalStatus, GOAL_PERIOD_ORDER, GOAL_PERIODS, type GoalDayStatus, type GoalStatus } from '../lib/goal'
import type { GoalPeriod } from '../types'

function DayRow({ day, suggestion, showMissed }: { day: GoalDayStatus; suggestion: number; showMissed: boolean }) {
  const { saveDeposit, removeDeposit } = useData()
  const toast = useToast()
  const saved = day.deposit?.amount ?? 0
  const checked = Boolean(day.deposit)
  const [amount, setAmount] = useState(saved)
  const [busy, setBusy] = useState(false)

  useEffect(() => setAmount(saved), [saved])

  async function persist(value: number) {
    setBusy(true)
    try {
      await saveDeposit(day.date, value)
    } catch (e) {
      setAmount(saved)
      toast.error(errorMessage(e, 'Não foi possível salvar o valor guardado.'))
    } finally {
      setBusy(false)
    }
  }

  async function toggle() {
    if (busy || day.isFuture) return
    if (checked) {
      setBusy(true)
      try {
        await removeDeposit(day.date)
      } catch (e) {
        toast.error(errorMessage(e, 'Não foi possível desmarcar o dia.'))
      } finally {
        setBusy(false)
      }
      return
    }
    // Sem valor digitado, usa a sugestão do dia.
    const value = amount > 0 ? amount : suggestion
    if (!(value > 0)) {
      toast.error('Informe quanto você guardou neste dia antes de marcar.')
      return
    }
    setAmount(value)
    await persist(value)
  }

  function handleBlur() {
    if (!checked || amount === saved) return
    if (!(amount > 0)) {
      setAmount(saved)
      toast.error('O valor precisa ser maior que zero. Para remover, desmarque o dia.')
      return
    }
    void persist(amount)
  }

  const missed = showMissed && day.isPast && !checked

  return (
    <li className={cx(
      'flex items-center gap-3 rounded-xl border px-3 py-3 transition sm:gap-4 sm:px-4',
      checked ? 'border-brand/30 bg-brand/[0.06]' : day.isToday ? 'border-accent/40 bg-bg' : 'border-line bg-bg',
      day.isFuture && 'opacity-50',
    )}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`Guardei dinheiro em ${weekdayName(day.date)}, ${formatDate(day.date)}`}
        disabled={day.isFuture || busy}
        onClick={toggle}
        className={cx(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition disabled:cursor-not-allowed',
          checked ? 'border-brand bg-brand text-black' : 'border-neutral-600 hover:border-brand',
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : checked ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-neutral-100">
          {weekdayName(day.date)}
          {day.isToday && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">Hoje</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
          {formatDayMonth(day.date)}
          {missed && <span className="flex items-center gap-1 text-danger"><X className="h-3 w-3" /> não guardou</span>}
          {checked && <span className="text-brand">guardou</span>}
        </p>
      </div>

      <MoneyInput
        className="w-32 sm:w-40"
        ariaLabel={`Valor guardado em ${weekdayName(day.date)}`}
        value={amount}
        onChange={setAmount}
        onBlur={handleBlur}
        disabled={day.isFuture || busy}
      />
    </li>
  )
}

/**
 * Registro da quinzena e do mês: em vez de uma linha por dia, um campo para guardar
 * um valor e a lista dos depósitos já feitos no período.
 */
function DepositLog({ status }: { status: GoalStatus }) {
  const { saveDeposit, removeDeposit } = useData()
  const toast = useToast()
  const today = todayISO()
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const made = status.days.filter((d) => d.deposit).reverse()
  const text = GOAL_PERIODS[status.period]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!(amount > 0)) {
      toast.error('Informe quanto você guardou.')
      return
    }
    if (!date || date < status.start || date > today) {
      toast.error(`Escolha um dia ${text.ofThe} atual, até hoje.`)
      return
    }
    setSaving(true)
    try {
      // Existe um depósito por dia: um novo valor no mesmo dia soma ao que já estava lá.
      const existing = status.days.find((d) => d.date === date)?.deposit?.amount ?? 0
      await saveDeposit(date, Math.round((existing + amount) * 100) / 100)
      toast.success(`${formatBRL(amount)} guardados.`)
      setAmount(0)
      setDate(today)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar o valor guardado.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(day: string) {
    setRemoving(day)
    try {
      await removeDeposit(day)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível excluir o depósito.'))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label className="field-label" htmlFor="deposit-amount">Valor para guardar</label>
          <MoneyInput id="deposit-amount" value={amount} onChange={setAmount} disabled={saving} />
        </div>
        <div>
          <label className="field-label" htmlFor="deposit-date">Dia</label>
          <input id="deposit-date" type="date" className="field" value={date} min={status.start} max={today} disabled={saving} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button type="submit" loading={saving} icon={<Plus className="h-4 w-4" />}>Guardar</Button>
      </form>

      <p className="eyebrow mb-2 mt-6">Depósitos {text.ofThe}</p>
      {made.length === 0 ? (
        <p className="rounded-xl border border-line bg-bg px-4 py-6 text-center text-sm text-neutral-500">Você ainda não guardou nada {text.inCurrent}.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-bg">
          {made.map((d) => (
            <li key={d.date} className="flex items-center gap-3 py-2 pl-4 pr-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-100">{formatDate(d.date)}</p>
                <p className="text-xs text-neutral-500">{weekdayName(d.date)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-brand">{formatBRL(d.deposit!.amount)}</span>
              <IconButton label={`Excluir depósito de ${formatDate(d.date)}`} disabled={removing === d.date} onClick={() => handleRemove(d.date)} className="hover:!text-danger">
                {removing === d.date ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="flex items-center gap-4 max-sm:!p-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand max-sm:hidden">{icon}</div>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="mt-1 truncate font-display text-2xl text-neutral-50">{value}</p>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
    </Card>
  )
}

export default function GoalPage() {
  const { deposits, settings, saveSettings } = useData()
  const toast = useToast()
  const [changing, setChanging] = useState(false)
  const status = useMemo(() => currentGoalStatus(deposits, settings), [deposits, settings])
  const periods = useMemo(() => goalSummaries(deposits, settings), [deposits, settings])
  const streak = goalStreak(periods)
  const totalSaved = sumDeposits(deposits)
  const pastPeriods = periods.filter((p) => !p.isCurrent).reverse()
  const period = status.period
  const text = GOAL_PERIODS[period]
  const daily = period === 'daily'
  // Na quinzena e no mês não há uma linha por dia: só o campo de valor e os depósitos feitos.
  const longPeriod = period === 'biweekly' || period === 'monthly'

  async function changePeriod(next: GoalPeriod) {
    if (next === period || changing) return
    setChanging(true)
    try {
      await saveSettings({ goal_period: next })
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível mudar o período da meta.'))
    } finally {
      setChanging(false)
    }
  }

  let tip: string
  if (status.goal <= 0) tip = 'Defina um valor de meta em Configurações para acompanhar seu progresso.'
  else if (status.hit) tip = `Meta ${text.ofThe} batida. Tudo o que guardar a mais vai direto para a Reserva.`
  else if (longPeriod) tip = `Faltam ${formatBRL(status.remaining)} para bater a meta ${text.ofThe}.`
  else if (daily)
    tip = `Para bater a meta, guarde ${status.daysLeft > 0 ? formatBRL(status.suggestion) : `mais ${formatBRL(status.remaining)}`} hoje.`
  else if (status.daysLeft > 0)
    tip = `Para bater a meta, guarde ${formatBRL(status.suggestion)} por dia ${status.daysLeft === 1 ? 'no dia que resta' : `nos ${status.daysLeft} dias que restam`}.`
  else tip = `Faltam ${formatBRL(status.remaining)} e não há mais dias livres ${text.inCurrent}. Aumente o valor de um dia já marcado para chegar lá.`

  return (
    <>
      <PageHeader eyebrow={text.range} title={text.title}>
        <div className="flex rounded-xl border border-line bg-card p-1" role="group" aria-label="Período da meta">
          {GOAL_PERIOD_ORDER.map((p) => (
            <button key={p} type="button" aria-pressed={p === period} disabled={changing} onClick={() => changePeriod(p)}
              className={cx('h-9 flex-1 rounded-lg px-3 text-sm font-medium transition disabled:cursor-wait', p === period ? 'bg-accent/15 text-accent' : 'text-neutral-400 hover:text-neutral-100')}>
              {GOAL_PERIODS[p].label}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Progresso do período + números gerais */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="flex flex-col">
          <CardTitle
            eyebrow={daily ? formatDate(status.start) : `${formatDayMonth(status.start)} a ${formatDayMonth(status.end)}`}
            title={text.current}
            action={
              <Link to="/configuracoes" className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent hover:underline">
                <SettingsIcon className="h-3.5 w-3.5" /> Ajustar meta
              </Link>
            }
          />
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-4xl text-neutral-50">{formatBRL(status.saved)}</p>
              <p className="mt-1 text-sm text-neutral-500">de {formatBRL(status.goal)} {text.per}</p>
            </div>
            <p className={cx('font-display text-3xl', status.hit ? 'text-brand' : 'text-accent')}>{status.percent}%</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={status.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso da ${text.title.toLowerCase()}`}>
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${status.percent}%` }} />
          </div>
          <p className={cx('mt-auto flex items-start gap-2 pt-5 text-sm', status.hit ? 'text-neutral-100' : 'text-neutral-400')} role="status">
            {status.hit && <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
            {tip}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Stat icon={<PiggyBank className="h-5 w-5" />} label="Reserva" value={formatBRL(totalSaved)} hint="Total guardado desde o início" />
          <Stat icon={<Flame className="h-5 w-5" />} label="Sequência" value={`${streak} ${text.unit[streak === 1 ? 0 : 1]}`} hint={text.streakHint} />
        </div>
      </div>

      {/* Registro dos dias + histórico */}
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle eyebrow="Registro" title={longPeriod ? 'Guardar dinheiro' : 'Quanto você guardou'} />
          {longPeriod ? (
            <DepositLog status={status} />
          ) : (
            <>
              <ul className="space-y-2">
                {status.days.map((d) => <DayRow key={d.date} day={d} suggestion={status.suggestion} showMissed={period === 'weekly'} />)}
              </ul>
              <p className="mt-3 text-xs text-neutral-600">
                Marque o dia para salvar na hora. Se o valor estiver em branco, entra a sugestão do dia. Desmarcar remove o depósito.
              </p>
            </>
          )}
        </Card>

        <Card className="!p-0">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <CardTitle eyebrow="Histórico" title={text.past} />
          </div>
          {pastPeriods.length === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} title="Ainda sem histórico" text="Os períodos concluídos aparecem aqui, com a meta e o quanto você guardou." />
          ) : (
            <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto border-t border-line">
              {pastPeriods.map((w) => (
                <li key={w.start} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', w.hit ? 'bg-brand/15 text-brand' : 'bg-danger/10 text-danger')}>
                    {w.hit ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-100">{daily ? formatDate(w.start) : `${formatDayMonth(w.start)} a ${formatDate(w.end)}`}</p>
                    <p className="text-xs text-neutral-500">Meta {formatBRL(w.goal)}</p>
                  </div>
                  <span className={cx('text-sm font-semibold', w.hit ? 'text-brand' : 'text-neutral-300')}>{formatBRL(w.saved)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
