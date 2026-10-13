import type { GoalPeriod } from '../types'

// Todas as datas circulam pelo app como texto "aaaa-mm-dd" (data local, sem fuso),
// o que permite comparar com < e > e evita o deslocamento de um dia do UTC.

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return toISO(d)
}

/** Domingo da semana que contém a data (a semana vai de domingo a sábado). */
export function weekStartOf(iso: string): string {
  const d = parseISO(iso)
  return addDays(iso, -d.getDay())
}

/** Todos os dias de `from` até `to`, incluindo os dois. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

/** aaaa-mm */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthStart(month: string): string {
  return `${month}-01`
}

export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return toISO(new Date(y, m, 0))
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/** 2026-10 -> out/26 */
export function monthShortLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS_SHORT[Number(m) - 1]}/${y.slice(2)}`
}

/** 2026-10 -> Outubro de 2026 */
export function monthLongLabel(month: string): string {
  const [y, m] = month.split('-')
  return `${MONTHS_LONG[Number(m) - 1]} de ${y}`
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[parseISO(iso).getDay()]
}

/**
 * Primeiro dia do período da meta que contém a data. A semana vai de domingo a sábado
 * e a quinzena é a do calendário: do dia 1 ao 15 e do 16 ao fim do mês.
 */
export function periodStartOf(iso: string, period: GoalPeriod): string {
  if (period === 'daily') return iso
  if (period === 'weekly') return weekStartOf(iso)
  const month = monthKey(iso)
  if (period === 'biweekly' && iso.slice(8) >= '16') return `${month}-16`
  return monthStart(month)
}

/** Último dia do período da meta que começa em `start`. */
export function periodEndOf(start: string, period: GoalPeriod): string {
  if (period === 'daily') return start
  if (period === 'weekly') return addDays(start, 6)
  const month = monthKey(start)
  if (period === 'biweekly' && start.slice(8) === '01') return `${month}-15`
  return monthEnd(month)
}
