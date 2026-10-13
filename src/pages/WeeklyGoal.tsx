import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Flame, History, Loader2, PiggyBank, Settings as SettingsIcon, Trophy, X } from 'lucide-react'
import { Card, CardTitle, cx, EmptyState, MoneyInput, PageHeader, useToast } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { weekdayName } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { goalStreak, sumDeposits, weeklySummaries } from '../lib/finance'
import { formatBRL, formatDate, formatDayMonth } from '../lib/format'
import { currentWeekStatus, type WeekDayStatus } from '../lib/week'

function DayRow({ day, suggestion }: { day: WeekDayStatus; suggestion: number }) {
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

  const missed = day.isPast && !checked

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

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
      <div className="min-w-0">
        <p className="eyebrow">{label}</p>
        <p className="mt-1 truncate font-display text-2xl text-neutral-50">{value}</p>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
    </Card>
  )
}

export default function WeeklyGoalPage() {
  const { deposits, settings } = useData()
  const week = useMemo(() => currentWeekStatus(deposits, settings), [deposits, settings])
  const weeks = useMemo(() => weeklySummaries(deposits, settings), [deposits, settings])
  const streak = goalStreak(weeks)
  const totalSaved = sumDeposits(deposits)
  const pastWeeks = weeks.filter((w) => !w.isCurrent).reverse()

  let tip: string
  if (week.goal <= 0) tip = 'Defina um valor de meta em Configurações para acompanhar seu progresso.'
  else if (week.hit) tip = 'Meta da semana batida. Tudo o que guardar a mais vai direto para a Reserva.'
  else if (week.daysLeft > 0)
    tip = `Para bater a meta, guarde ${formatBRL(week.suggestion)} por dia ${week.daysLeft === 1 ? 'no dia que resta' : `nos ${week.daysLeft} dias que restam`}.`
  else tip = `Faltam ${formatBRL(week.remaining)} e não há mais dias livres nesta semana. Aumente o valor de um dia já marcado para chegar lá.`

  return (
    <>
      <PageHeader eyebrow="Domingo a sábado" title="Meta semanal">
        <Link to="/configuracoes" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-semibold text-neutral-200 transition hover:border-neutral-600">
          <SettingsIcon className="h-4 w-4" /> Ajustar meta
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle eyebrow={`${formatDayMonth(week.weekStart)} a ${formatDayMonth(week.weekEnd)}`} title="Esta semana" />

          {week.hit && (
            <div className="animate-fade-in relative mb-5 flex items-center gap-3 overflow-hidden rounded-xl border border-brand/40 bg-brand/10 px-4 py-3.5" role="status">
              <Trophy className="h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-display text-lg leading-tight text-neutral-50">Meta batida!</p>
                <p className="text-xs text-neutral-400">Você guardou {formatBRL(week.saved)} nesta semana.</p>
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-end gap-3 pb-2" aria-hidden>
                {[0, 0.5, 1, 1.5, 0.8].map((delay, i) => (
                  <span key={i} className={cx('spark h-1.5 w-1.5 rounded-full', i % 2 ? 'bg-accent' : 'bg-brand')} style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl text-neutral-50">{formatBRL(week.saved)}</p>
              <p className="mt-1 text-sm text-neutral-500">de {formatBRL(week.goal)}</p>
            </div>
            <p className={cx('font-display text-3xl', week.hit ? 'text-brand' : 'text-accent')}>{week.percent}%</p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={week.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta semanal">
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${week.percent}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-neutral-500">
            <span>Guardado <b className="font-medium text-neutral-200">{formatBRL(week.saved)}</b></span>
            <span>Falta <b className="font-medium text-neutral-200">{formatBRL(week.remaining)}</b></span>
          </div>

          <p className="mt-5 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-sm text-neutral-200">{tip}</p>

          <ul className="mt-5 space-y-2">
            {week.days.map((d) => <DayRow key={d.date} day={d} suggestion={week.suggestion} />)}
          </ul>
          <p className="mt-3 text-xs text-neutral-600">
            Marque o dia para salvar na hora. Se o valor estiver em branco, entra a sugestão do dia. Desmarcar remove o depósito.
          </p>
        </Card>

        <div className="space-y-4">
          <Stat icon={<PiggyBank className="h-5 w-5" />} label="Reserva" value={formatBRL(totalSaved)} hint="Total guardado desde o início" />
          <Stat icon={<Flame className="h-5 w-5" />} label="Sequência" value={`${streak} ${streak === 1 ? 'semana' : 'semanas'}`} hint="Semanas seguidas batendo a meta" />

          <Card className="!p-0">
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <CardTitle eyebrow="Histórico" title="Semanas anteriores" />
            </div>
            {pastWeeks.length === 0 ? (
              <EmptyState icon={<History className="h-5 w-5" />} title="Ainda sem histórico" text="As semanas concluídas aparecem aqui, com a meta e o quanto você guardou." />
            ) : (
              <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto border-t border-line">
                {pastWeeks.map((w) => (
                  <li key={w.weekStart} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                    <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', w.hit ? 'bg-brand/15 text-brand' : 'bg-danger/10 text-danger')}>
                      {w.hit ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-100">{formatDayMonth(w.weekStart)} a {formatDate(w.weekEnd)}</p>
                      <p className="text-xs text-neutral-500">Meta {formatBRL(w.goal)} · {w.hit ? 'bateu' : 'não bateu'}</p>
                    </div>
                    <span className={cx('text-sm font-semibold', w.hit ? 'text-brand' : 'text-neutral-300')}>{formatBRL(w.saved)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
