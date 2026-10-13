import { supabase } from '../lib/supabase'
import type { Settings, SettingsInput } from '../types'
import { requireUserId } from './auth'

function normalize(row: Settings): Settings {
  return {
    ...row,
    weekly_goal: Number(row.weekly_goal),
    goal_period: row.goal_period ?? 'weekly',
    initial_balance: Number(row.initial_balance),
    avatar: row.avatar ?? null,
  }
}

/** Lê as configurações; se por algum motivo ainda não existirem, cria com os padrões. */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').maybeSingle()
  if (error) throw error
  if (data) return normalize(data as Settings)

  const user_id = await requireUserId()
  const created = await supabase.from('settings').upsert({ user_id }).select().single()
  if (created.error) throw created.error
  return normalize(created.data as Settings)
}

export async function updateSettings(input: SettingsInput): Promise<Settings> {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('settings')
    .update(input)
    .eq('user_id', user_id)
    .select()
    .single()
  if (error) throw error
  return normalize(data as Settings)
}
