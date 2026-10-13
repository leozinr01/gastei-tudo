import { supabase } from '../lib/supabase'
import type { Category, CategoryInput } from '../types'
import { requireUserId } from './auth'

function normalize(row: Category): Category {
  return { ...row, monthly_limit: row.monthly_limit == null ? null : Number(row.monthly_limit) }
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw error
  return (data as Category[]).map(normalize)
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, user_id })
    .select()
    .single()
  if (error) throw error
  return normalize(data as Category)
}

export async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return normalize(data as Category)
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
