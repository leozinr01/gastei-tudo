import type { Period, SavingsDeposit, Settings, Transaction } from '../types'
import {
  addDays, periodEndOf, periodStartOf, todayISO,
} from './dates'
import { round2 } from './format'

export function inPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  return items.filter((i) => i.date >= period.from && i.date <= period.to)
}

export function totals(transactions: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income: round2(income), expense: round2(expense), result: round2(income - expense) }
}

export function sumDeposits(deposits: SavingsDeposit[]): number {
  return round2(deposits.reduce((s, d) => s + d.amount, 0))
}

/** Saldo disponível = saldo inicial + entradas - saídas - valores enviados à Reserva. */
export function availableBalance(
  settings: Settings,
  transactions: Transaction[],
  deposits: SavingsDeposit[],
): number {
  const t = totals(transactions)
  return round2(settings.initial_balance + t.result - sumDeposits(deposits))
}

/** Variação do saldo disponível por dia. */
function dailyDeltas(transactions: Transaction[], deposits: SavingsDeposit[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of transactions) {
    map.set(t.date, (map.get(t.date) ?? 0) + (t.type === 'income' ? t.amount : -t.amount))
  }
  for (const d of deposits) {
    map.set(d.date, (map.get(d.date) ?? 0) - d.amount)
  }
  return map
}

export interface BalancePoint {
  date: string
  balance: number
}

/** Saldo disponível ao fim de cada dia do período. */
export function balanceSeries(
  settings: Settings,
  transactions: Transaction[],
  deposits: SavingsDeposit[],
  period: Period,
): BalancePoint[] {
  const deltas = dailyDeltas(transactions, deposits)
  let balance = settings.initial_balance
  for (const [date, delta] of deltas) if (date < period.from) balance += delta

  const points: BalancePoint[] = []
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) {
    balance += deltas.get(d) ?? 0
    points.push({ date: d, balance: round2(balance) })
    if (points.length > 1100) break // proteção contra intervalos absurdos
  }
  return points
}

export interface GoalSummary {
  start: string
  end: string
  goal: number
  saved: number
  hit: boolean
  isCurrent: boolean
}

/**
 * Resumo de cada período da meta (dia, semana, quinzena ou mês, conforme as Configurações),
 * do primeiro em que houve depósito até o atual. O período atual usa a meta das Configurações;
 * os anteriores usam a meta que valia quando o último depósito daquele período foi feito,
 * desde que ela tenha sido definida para o mesmo tipo de período.
 */
export function goalSummaries(
  deposits: SavingsDeposit[],
  settings: Settings,
  today = todayISO(),
): GoalSummary[] {
  const period = settings.goal_period
  const currentStart = periodStartOf(today, period)
  const byStart = new Map<string, { saved: number; goal: number | null; lastDate: string }>()
  let first = currentStart

  for (const d of deposits) {
    const s = periodStartOf(d.date, period)
    if (s < first) first = s
    const cur = byStart.get(s) ?? { saved: 0, goal: null, lastDate: '' }
    cur.saved += d.amount
    if (d.date >= cur.lastDate) {
      cur.lastDate = d.date
      cur.goal = (d.goal_period_snapshot ?? 'weekly') === period ? d.goal_snapshot : null
    }
    byStart.set(s, cur)
  }

  const out: GoalSummary[] = []
  for (let s = first; s <= currentStart; s = addDays(periodEndOf(s, period), 1)) {
    const info = byStart.get(s)
    const isCurrent = s === currentStart
    const goal = isCurrent ? settings.weekly_goal : info?.goal ?? settings.weekly_goal
    const saved = round2(info?.saved ?? 0)
    out.push({
      start: s,
      end: periodEndOf(s, period),
      goal,
      saved,
      hit: goal > 0 && saved >= goal,
      isCurrent,
    })
  }
  return out
}

/** Períodos seguidos batendo a meta. O período atual, ainda em andamento, não quebra a sequência. */
export function goalStreak(periods: GoalSummary[]): number {
  let streak = 0
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i]
    if (p.hit) streak++
    else if (p.isCurrent) continue
    else break
  }
  return streak
}
