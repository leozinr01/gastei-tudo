import type { GoalPeriod, SavingsDeposit, Settings } from '../types'
import { daysBetween, periodEndOf, periodStartOf, todayISO } from './dates'
import { round2 } from './format'

/** Textos de cada período da meta, já no gênero certo. */
export interface GoalPeriodText {
  /** Opção no seletor: "Semanal" */
  label: string
  /** "Meta semanal" */
  title: string
  /** "Esta semana" */
  current: string
  /** "nesta semana" */
  inCurrent: string
  /** "da semana" */
  ofThe: string
  /** "por semana" */
  per: string
  /** ["semana", "semanas"] */
  unit: [string, string]
  /** "Semanas anteriores" */
  past: string
  /** "Semanas seguidas batendo a meta" */
  streakHint: string
  /** Como o período é contado: "Domingo a sábado" */
  range: string
}

export const GOAL_PERIODS: Record<GoalPeriod, GoalPeriodText> = {
  daily: {
    label: 'Diária', title: 'Meta diária', current: 'Hoje', inCurrent: 'hoje', ofThe: 'do dia', per: 'por dia',
    unit: ['dia', 'dias'], past: 'Dias anteriores', streakHint: 'Dias seguidos batendo a meta',
    range: 'Um valor para cada dia',
  },
  weekly: {
    label: 'Semanal', title: 'Meta semanal', current: 'Esta semana', inCurrent: 'nesta semana', ofThe: 'da semana', per: 'por semana',
    unit: ['semana', 'semanas'], past: 'Semanas anteriores', streakHint: 'Semanas seguidas batendo a meta',
    range: 'Domingo a sábado',
  },
  biweekly: {
    label: 'Quinzenal', title: 'Meta quinzenal', current: 'Esta quinzena', inCurrent: 'nesta quinzena', ofThe: 'da quinzena', per: 'por quinzena',
    unit: ['quinzena', 'quinzenas'], past: 'Quinzenas anteriores', streakHint: 'Quinzenas seguidas batendo a meta',
    range: 'Do dia 1 ao 15 e do 16 ao fim do mês',
  },
  monthly: {
    label: 'Mensal', title: 'Meta mensal', current: 'Este mês', inCurrent: 'neste mês', ofThe: 'do mês', per: 'por mês',
    unit: ['mês', 'meses'], past: 'Meses anteriores', streakHint: 'Meses seguidos batendo a meta',
    range: 'Do dia 1 ao fim do mês',
  },
}

export const GOAL_PERIOD_ORDER: GoalPeriod[] = ['daily', 'weekly', 'biweekly', 'monthly']

export interface GoalDayStatus {
  date: string
  deposit: SavingsDeposit | undefined
  isToday: boolean
  isPast: boolean
  isFuture: boolean
}

export interface GoalStatus {
  period: GoalPeriod
  start: string
  end: string
  days: GoalDayStatus[]
  goal: number
  saved: number
  remaining: number
  percent: number
  hit: boolean
  /** Dias de hoje até o fim do período que ainda não foram marcados. */
  daysLeft: number
  /** Quanto guardar por dia nos dias restantes para bater a meta. */
  suggestion: number
}

/** Situação do período atual da meta (hoje, esta semana, esta quinzena ou este mês). */
export function currentGoalStatus(
  deposits: SavingsDeposit[],
  settings: Settings,
  today = todayISO(),
): GoalStatus {
  const period = settings.goal_period
  const start = periodStartOf(today, period)
  const end = periodEndOf(start, period)
  const byDate = new Map(deposits.map((d) => [d.date, d]))

  const days = daysBetween(start, end).map<GoalDayStatus>((date) => ({
    date,
    deposit: byDate.get(date),
    isToday: date === today,
    isPast: date < today,
    isFuture: date > today,
  }))

  const goal = settings.weekly_goal
  const saved = round2(days.reduce((s, d) => s + (d.deposit?.amount ?? 0), 0))
  const remaining = round2(Math.max(0, goal - saved))
  const daysLeft = days.filter((d) => !d.isPast && !d.deposit).length
  // Arredonda para cima nos centavos, para a soma dos dias nunca ficar abaixo da meta.
  const suggestion = daysLeft > 0 ? Math.ceil(round2((remaining / daysLeft) * 100)) / 100 : 0

  return {
    period,
    start,
    end,
    days,
    goal,
    saved,
    remaining,
    percent: goal > 0 ? Math.min(100, Math.round((saved / goal) * 100)) : 0,
    hit: goal > 0 && saved >= goal,
    daysLeft,
    suggestion,
  }
}
