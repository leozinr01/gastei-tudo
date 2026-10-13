import { supabase } from '../lib/supabase'
import type { GoalPeriod, SavingsDeposit } from '../types'
import { requireUserId } from './auth'

const PAGE = 1000

function normalize(row: SavingsDeposit): SavingsDeposit {
  return {
    ...row,
    amount: Number(row.amount),
    goal_snapshot: row.goal_snapshot === null ? null : Number(row.goal_snapshot),
    goal_period_snapshot: row.goal_period_snapshot ?? null,
  }
}

export async function listDeposits(): Promise<SavingsDeposit[]> {
  const all: SavingsDeposit[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('savings_deposits')
      .select('*')
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    all.push(...(data as SavingsDeposit[]).map(normalize))
    if (data.length < PAGE) break
  }
  return all
}

/** Cria ou atualiza o depósito do dia (existe no máximo um por dia). */
export async function saveDeposit(
  date: string,
  amount: number,
  goal: number,
  goalPeriod: GoalPeriod,
): Promise<SavingsDeposit> {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('savings_deposits')
    .upsert({ user_id, date, amount, goal_snapshot: goal, goal_period_snapshot: goalPeriod }, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw error
  return normalize(data as SavingsDeposit)
}

export async function deleteDeposit(date: string): Promise<void> {
  const { error } = await supabase.from('savings_deposits').delete().eq('date', date)
  if (error) throw error
}
