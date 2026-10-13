import { supabase } from '../lib/supabase'
import type { Category, RecurringTransaction, SavingsDeposit, Settings, Transaction } from '../types'

export interface ExportPayload {
  exported_at: string
  settings: Settings
  categories: Category[]
  transactions: Transaction[]
  recurring_transactions: RecurringTransaction[]
  savings_deposits: SavingsDeposit[]
}

/** Baixa todos os dados do usuário em um arquivo JSON. */
export function downloadExport(data: Omit<ExportPayload, 'exported_at'>): void {
  const payload: ExportPayload = { exported_at: new Date().toISOString(), ...data }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastei-tudo-${payload.exported_at.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Apaga tudo do usuário e recria configurações e categorias padrão (função do schema.sql). */
export async function resetAllData(): Promise<void> {
  const { error } = await supabase.rpc('reset_user_data')
  if (error) throw error
}
