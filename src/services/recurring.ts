import { addDays, addMonths, monthEnd, monthKey } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { RecurringInput, RecurringTransaction, Transaction } from '../types'
import { requireUserId } from './auth'

function normalize(row: RecurringTransaction): RecurringTransaction {
  return { ...row, amount: Number(row.amount), day_of_month: Number(row.day_of_month) }
}

export async function listRecurring(): Promise<RecurringTransaction[]> {
  const { data, error } = await supabase.from('recurring_transactions').select('*').order('created_at')
  if (error) throw error
  return (data as RecurringTransaction[]).map(normalize)
}

export async function createRecurring(input: RecurringInput): Promise<RecurringTransaction> {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('recurring_transactions')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return normalize(data as RecurringTransaction)
}

/** Para de repetir. As transações já lançadas continuam no histórico. */
export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
  if (error) throw error
}

/** Vencimento no mês: o dia escolhido ou, em meses mais curtos, o último dia. */
function dueDateIn(month: string, day: number): string {
  const last = monthEnd(month)
  return day >= Number(last.slice(8)) ? last : `${month}-${String(day).padStart(2, '0')}`
}

// Proteção contra uma conta parada há muito tempo: no máximo três anos de lançamentos.
const MAX_MONTHS = 36

/** Vencimentos que ainda não foram lançados, do mais antigo para o mais novo, até hoje. */
export function pendingDueDates(item: RecurringTransaction, today: string): string[] {
  const after = item.last_date ?? addDays(item.created_at.slice(0, 10), -1)
  const out: string[] = []
  let month = monthKey(after)
  for (let i = 0; i < MAX_MONTHS && month <= monthKey(today); i++, month = addMonths(month, 1)) {
    const due = dueDateIn(month, item.day_of_month)
    if (due > after && due <= today) out.push(due)
  }
  return out
}

/**
 * Lança as transações recorrentes que venceram até hoje e ainda não existem.
 * Devolve as transações criadas e os modelos com o último vencimento atualizado.
 */
export async function launchDue(
  items: RecurringTransaction[],
  today: string,
): Promise<{ created: Transaction[]; recurring: RecurringTransaction[] }> {
  const created: Transaction[] = []
  const recurring: RecurringTransaction[] = []

  for (const item of items) {
    const dues = pendingDueDates(item, today)
    if (dues.length === 0) {
      recurring.push(item)
      continue
    }
    const rows = dues.map((date) => ({
      user_id: item.user_id,
      type: item.type,
      amount: item.amount,
      description: item.description,
      category_id: item.category_id,
      date,
      recurring_id: item.id,
    }))
    // O índice único (recurring_id, date) descarta o que outro aparelho já lançou.
    const inserted = await supabase
      .from('transactions')
      .upsert(rows, { onConflict: 'recurring_id,date', ignoreDuplicates: true })
      .select()
    if (inserted.error) throw inserted.error
    created.push(...(inserted.data as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) })))

    const last_date = dues[dues.length - 1]
    const updated = await supabase.from('recurring_transactions').update({ last_date }).eq('id', item.id)
    if (updated.error) throw updated.error
    recurring.push({ ...item, last_date })
  }
  return { created, recurring }
}
