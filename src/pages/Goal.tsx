import { useMemo, useState, type FormEvent } from 'react'
import { Flame, History, Loader2, PiggyBank, Plus, Target, Trash2, Trophy } from 'lucide-react'
import { Button, Card, CardTitle, cx, EmptyState, IconButton, Modal, MoneyInput, PageHeader, useToast } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { todayISO, weekdayName } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { goalStreak, goalSummaries, sumDeposits } from '../lib/finance'
import { formatBRL, formatDate, formatDayMonth } from '../lib/format'
import { currentGoalStatus, GOAL_PERIOD_ORDER, GOAL_PERIODS, type GoalStatus } from '../lib/goal'
import type { GoalPeriod } from '../types'

/** Dias de cada período, para sugerir o valor equivalente quando a pessoa troca de um para outro. */
const PERIOD_DAYS: Record<GoalPeriod, number> = { daily: 1, weekly: 7, biweekly: 15, monthly: 30 }

/** Valores de atalho para somar ao campo "valor para guardar". */
const QUICK_AMOUNTS = [10, 50, 100]

const RING_RADIUS = 52
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** Anel de progresso da meta, com a porcentagem no centro. */
function ProgressRing({ percent, hit }: { percent: number; hit: boolean }) {
  return (
    <div className="relative h-28 w-28 shrink-0 sm:h-36 sm:w-36" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-white/[0.07]" />
        <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" strokeLinecap="round"
          className={cx('transition-[stroke-dashoffset] duration-700', hit ? 'stroke-brand' : 'stroke-accent')}
          strokeDasharray={RING_LENGTH} strokeDashoffset={RING_LENGTH * (1 - percent / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hit ? <Trophy className="mb-0.5 h-4 w-4 text-accent" /> : null}
        <span className="font-display text-2xl leading-none text-neutral-50 sm:text-3xl">{percent}%</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">da meta</span>
      </div>
    </div>
  )
}

/** Um número de apoio, na faixa de baixo do cartão principal. */
function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-bg/70 px-2.5 py-3 sm:px-4">
      <p className="flex items-center gap-1 text-[10px] text-neutral-500 sm:gap-1.5 sm:text-xs">{icon} <span className="truncate">{label}</span></p>
      <p className="mt-1 truncate text-[13px] font-semibold text-neutral-100 sm:text-lg">{value}</p>
    </div>
  )
}

/**
 * Registro do período: um campo para guardar um valor e a lista dos depósitos já
 * feitos. Na meta diária não há escolha de dia, porque o período é só hoje.
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
  const daily = status.period === 'daily'
  const chip = 'h-8 rounded-full border border-line bg-bg px-3 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:text-neutral-100 disabled:opacity-50'

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
      <form onSubmit={handleSubmit}>
        <div className={cx('grid gap-3', !daily && 'sm:grid-cols-[1fr_11rem]')}>
          <div>
            <label className="field-label" htmlFor="deposit-amount">Valor para guardar</label>
            <MoneyInput id="deposit-amount" value={amount} onChange={setAmount} disabled={saving} />
          </div>
          {!daily && (
            <div>
              <label className="field-label" htmlFor="deposit-date">Dia</label>
              <input id="deposit-date" type="date" className="field" value={date} min={status.start} max={today} disabled={saving} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {QUICK_AMOUNTS.map((v) => (
            <button key={v} type="button" className={chip} disabled={saving} onClick={() => setAmount((a) => Math.round((a + v) * 100) / 100)}>+ {formatBRL(v)}</button>
          ))}
          {status.remaining > 0 && (
            <button type="button" className={cx(chip, '!border-accent/40 !text-accent')} disabled={saving} onClick={() => setAmount(status.remaining)}>
              Completar a meta · {formatBRL(status.remaining)}
            </button>
          )}
        </div>
        <Button type="submit" loading={saving} icon={<Plus className="h-4 w-4" />} className="mt-4 w-full sm:w-auto">Guardar</Button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-3 text-xs font-medium text-neutral-500">Depósitos {text.ofThe}</p>
        {made.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-neutral-500">Você ainda não guardou nada {text.inCurrent}.</p>
        ) : (
          <ul className="space-y-2">
            {made.map((d) => (
              <li key={d.date} className="flex items-center gap-3 rounded-xl bg-bg py-2 pl-3 pr-1.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <PiggyBank className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-100">{formatDate(d.date)}</p>
                  <p className="text-xs text-neutral-500">{weekdayName(d.date)}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-brand">+ {formatBRL(d.deposit!.amount)}</span>
                <IconButton label={`Excluir depósito de ${formatDate(d.date)}`} disabled={removing === d.date} onClick={() => handleRemove(d.date)} className="hover:!text-danger">
                  {removing === d.date ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export default function GoalPage() {
  const { deposits, settings, saveSettings } = useData()
  const toast = useToast()
  const [changing, setChanging] = useState(false)
  // Período escolhido no seletor, esperando a pessoa confirmar o valor da nova meta.
  const [pending, setPending] = useState<GoalPeriod | null>(null)
  const [pendingGoal, setPendingGoal] = useState(0)
  const [initial, setInitial] = useState(0)
  const [negative, setNegative] = useState(false)
  const status = useMemo(() => currentGoalStatus(deposits, settings), [deposits, settings])
  const periods = useMemo(() => goalSummaries(deposits, settings), [deposits, settings])
  const streak = goalStreak(periods)
  const totalSaved = sumDeposits(deposits)
  const pastPeriods = periods.filter((p) => !p.isCurrent).reverse()
  const period = status.period
  const text = GOAL_PERIODS[period]
  const daily = period === 'daily'

  // Trocar o período pede o valor da nova meta, já sugerindo o equivalente ao atual.
  function askPeriod(next: GoalPeriod) {
    if (next === period || changing) return
    setPendingGoal(Math.round((status.goal * PERIOD_DAYS[next]) / PERIOD_DAYS[period]))
    setPending(next)
  }

  // Ajustar o valor da meta e o saldo inicial, mantendo o período atual.
  function askValue() {
    if (changing) return
    setPendingGoal(status.goal)
    setInitial(Math.abs(settings.initial_balance))
    setNegative(settings.initial_balance < 0)
    setPending(period)
  }

  async function confirmPeriod(e: FormEvent) {
    e.preventDefault()
    if (!pending) return
    setChanging(true)
    try {
      const adjusting = pending === period
      await saveSettings({
        goal_period: pending,
        weekly_goal: pendingGoal,
        ...(adjusting ? { initial_balance: negative ? -initial : initial } : {}),
      })
      if (adjusting) toast.success('Meta atualizada.')
      setPending(null)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar a meta.'))
    } finally {
      setChanging(false)
    }
  }

  let tip: string
  if (status.goal <= 0) tip = 'Use "Ajustar meta", logo abaixo, e defina um valor para acompanhar seu progresso.'
  else if (status.hit) tip = `Meta ${text.ofThe} batida. Tudo o que guardar a mais vai direto para a Reserva.`
  else if (period === 'weekly' && status.daysLeft > 0)
    tip = `Para bater a meta, guarde ${formatBRL(status.suggestion)} por dia ${status.daysLeft === 1 ? 'no dia que resta' : `nos ${status.daysLeft} dias que restam`}.`
  else tip = `Faltam ${formatBRL(status.remaining)} para bater a meta ${text.ofThe}.`

  return (
    <>
      <PageHeader eyebrow={text.range} title={text.title}>
        <div className="flex rounded-xl border border-line bg-card p-1" role="group" aria-label="Período da meta">
          {GOAL_PERIOD_ORDER.map((p) => (
            <button key={p} type="button" aria-pressed={p === period} disabled={changing} onClick={() => askPeriod(p)}
              className={cx('h-9 flex-1 rounded-lg px-3 text-sm font-medium transition disabled:cursor-wait', p === period ? 'bg-accent/15 text-accent' : 'text-neutral-400 hover:text-neutral-100')}>
              {GOAL_PERIODS[p].label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* Progresso do período */}
          <section className="rounded-2xl border border-accent/25 bg-linear-to-br from-accent/[0.14] via-card to-card p-5 sm:p-6">
            <div className="flex items-center gap-5 sm:gap-7">
              <ProgressRing percent={status.percent} hit={status.hit} />
              <div className="min-w-0 flex-1">
                <p className="eyebrow">{text.current}</p>
                <p className="mt-2 truncate font-display text-3xl text-neutral-50 sm:text-5xl">{formatBRL(status.saved)}</p>
                <p className="mt-1.5 text-sm text-neutral-400">de {formatBRL(status.goal)} {text.per}</p>
                <p className="mt-1 text-xs text-neutral-600">{daily ? formatDate(status.start) : `${formatDayMonth(status.start)} a ${formatDayMonth(status.end)}`}</p>
              </div>
            </div>

            <p className={cx('mt-5 text-sm', status.hit ? 'text-neutral-100' : 'text-neutral-400')} role="status">{tip}</p>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <Tile icon={<Target className="h-3.5 w-3.5 shrink-0 text-accent" />} label="Falta" value={formatBRL(status.remaining)} />
              <Tile icon={<PiggyBank className="h-3.5 w-3.5 shrink-0 text-brand" />} label="Reserva" value={formatBRL(totalSaved)} />
              <Tile icon={<Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />} label="Sequência" value={`${streak} ${text.unit[streak === 1 ? 0 : 1]}`} />
            </div>
          </section>

          {/* Guardar + depósitos do período */}
          <Card>
            <CardTitle eyebrow="Registro" title="Guardar dinheiro"
              action={<Button variant="secondary" className="h-9 shrink-0" icon={<Target className="h-4 w-4" />} onClick={askValue}>Ajustar meta</Button>} />
            <DepositLog key={period} status={status} />
          </Card>
        </div>

        {/* Histórico */}
        <Card className="!p-0">
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <CardTitle eyebrow="Histórico" title={text.past} />
          </div>
          {pastPeriods.length === 0 ? (
            <EmptyState icon={<History className="h-5 w-5" />} title="Ainda sem histórico" text="Os períodos concluídos aparecem aqui, com a meta e o quanto você guardou." />
          ) : (
            <ul className="max-h-[34rem] divide-y divide-line overflow-y-auto border-t border-line">
              {pastPeriods.map((w) => {
                const ratio = w.goal > 0 ? Math.min(1, w.saved / w.goal) : 0
                return (
                  <li key={w.start} className="px-5 py-3.5 sm:px-6">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-neutral-100">{daily ? formatDate(w.start) : `${formatDayMonth(w.start)} a ${formatDate(w.end)}`}</span>
                      <span className={cx('shrink-0 font-semibold', w.hit ? 'text-brand' : 'text-neutral-300')}>{formatBRL(w.saved)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className={cx('h-full rounded-full', w.hit ? 'bg-brand' : 'bg-neutral-500')} style={{ width: `${ratio * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Meta {formatBRL(w.goal)} · {w.hit ? <span className="text-brand">batida</span> : `${Math.round(ratio * 100)}%`}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={Boolean(pending)} onClose={() => setPending(null)} eyebrow={pending === period ? 'Ajustar meta' : 'Mudar período'} title={pending ? GOAL_PERIODS[pending].title : ''}>
        {pending && (
          <form onSubmit={confirmPeriod} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="new-goal">Quanto você quer guardar {GOAL_PERIODS[pending].per}?</label>
              <MoneyInput id="new-goal" value={pendingGoal} onChange={setPendingGoal} autoFocus disabled={changing} />
              <p className="mt-1.5 text-xs text-neutral-600">
                {pending === period
                  ? 'Vale a partir do período atual. Os períodos já concluídos mantêm a meta que tinham.'
                  : `Hoje sua meta é ${formatBRL(status.goal)} ${text.per}. O valor acima é o equivalente aproximado; ajuste como quiser.`}
              </p>
            </div>
            {pending === period && (
              <div>
                <label className="field-label" htmlFor="initial">Saldo inicial</label>
                <MoneyInput id="initial" value={initial} onChange={setInitial} disabled={changing} />
                <p className="mt-1.5 text-xs text-neutral-600">Quanto você tinha antes da primeira transação registrada aqui.</p>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                  <input type="checkbox" className="h-4 w-4 accent-red-500" checked={negative} onChange={(e) => setNegative(e.target.checked)} disabled={changing} />
                  Comecei com saldo negativo
                </label>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setPending(null)} disabled={changing}>Cancelar</Button>
              <Button type="submit" loading={changing}>Salvar</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
