import type { RecurringTransaction } from '../types'
import { addMonths, monthEnd, monthKey } from './dates'

/** Vencimento no mês: o dia escolhido ou, em meses mais curtos, o último dia. */
export function dueDateIn(month: string, day: number): string {
  const last = monthEnd(month)
  return day >= Number(last.slice(8)) ? last : `${month}-${String(day).padStart(2, '0')}`
}

// Proteção contra uma conta parada há muito tempo: no máximo três anos de lançamentos.
const MAX_MONTHS = 36

/**
 * Vencimentos que ainda não foram lançados, do mais antigo para o mais novo, até hoje.
 * Cada mês tem no máximo um lançamento: depois do último já feito, o próximo é sempre
 * no mês seguinte (mesmo que o dia do mês tenha sido trocado no meio do caminho).
 */
export function pendingDueDates(
  item: Pick<RecurringTransaction, 'day_of_month' | 'last_date' | 'created_at'>,
  today: string,
): string[] {
  const created = item.created_at.slice(0, 10)
  let month = item.last_date ? addMonths(monthKey(item.last_date), 1) : monthKey(created)
  const out: string[] = []
  for (let i = 0; i < MAX_MONTHS && month <= monthKey(today); i++, month = addMonths(month, 1)) {
    const due = dueDateIn(month, item.day_of_month)
    if (due <= today && (item.last_date || due >= created)) out.push(due)
  }
  return out
}
