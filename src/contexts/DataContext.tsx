import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { errorMessage } from '../lib/errors'
import * as accountService from '../services/account'
import * as categoryService from '../services/categories'
import * as savingsService from '../services/savings'
import * as settingsService from '../services/settings'
import * as transactionService from '../services/transactions'
import type {
  Category, CategoryInput, SavingsDeposit, Settings, SettingsInput, Transaction, TransactionInput,
} from '../types'

interface DataState {
  categories: Category[]
  transactions: Transaction[]
  deposits: SavingsDeposit[]
  settings: Settings
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  saveTransaction: (input: TransactionInput, id?: string) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  saveCategory: (input: CategoryInput, id?: string) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  saveDeposit: (date: string, amount: number) => Promise<void>
  removeDeposit: (date: string) => Promise<void>
  saveSettings: (input: SettingsInput) => Promise<void>
  resetAll: () => Promise<void>
}

const DataContext = createContext<DataState | null>(null)

const byDateDesc = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
const byName = (a: Category, b: Category) => a.name.localeCompare(b.name, 'pt-BR')

export function DataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [deposits, setDeposits] = useState<SavingsDeposit[]>([])
  const [settings, setSettings] = useState<Settings>({
    user_id: userId,
    weekly_goal: 300,
    goal_period: 'weekly',
    initial_balance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Só a carga mais recente aplica o resultado: duas cargas seguidas trocariam os dados
  // duas vezes e cortariam a animação de entrada dos gráficos.
  const loadId = useRef(0)

  const reload = useCallback(async () => {
    const id = ++loadId.current
    setLoading(true)
    setError(null)
    try {
      const [s, c, t, d] = await Promise.all([
        settingsService.getSettings(),
        categoryService.listCategories(),
        transactionService.listTransactions(),
        savingsService.listDeposits(),
      ])
      if (id !== loadId.current) return
      setSettings(s)
      setCategories(c.sort(byName))
      setTransactions(t)
      setDeposits(d)
    } catch (e) {
      if (id !== loadId.current) return
      setError(errorMessage(e, 'Não foi possível carregar seus dados.'))
    } finally {
      if (id === loadId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload, userId])

  const saveTransaction = useCallback(async (input: TransactionInput, id?: string) => {
    const saved = id
      ? await transactionService.updateTransaction(id, input)
      : await transactionService.createTransaction(input)
    setTransactions((list) => [saved, ...list.filter((t) => t.id !== saved.id)].sort(byDateDesc))
  }, [])

  const removeTransaction = useCallback(async (id: string) => {
    await transactionService.deleteTransaction(id)
    setTransactions((list) => list.filter((t) => t.id !== id))
  }, [])

  const saveCategory = useCallback(async (input: CategoryInput, id?: string) => {
    const saved = id
      ? await categoryService.updateCategory(id, input)
      : await categoryService.createCategory(input)
    setCategories((list) => [...list.filter((c) => c.id !== saved.id), saved].sort(byName))
  }, [])

  const removeCategory = useCallback(async (id: string) => {
    await categoryService.deleteCategory(id)
    setCategories((list) => list.filter((c) => c.id !== id))
    // O banco faz "on delete set null"; espelhamos isso localmente.
    setTransactions((list) =>
      list.map((t) => (t.category_id === id ? { ...t, category_id: null } : t)),
    )
  }, [])

  const saveDeposit = useCallback(
    async (date: string, amount: number) => {
      const saved = await savingsService.saveDeposit(date, amount, settings.weekly_goal, settings.goal_period)
      setDeposits((list) =>
        [saved, ...list.filter((d) => d.date !== date)].sort((a, b) => b.date.localeCompare(a.date)),
      )
    },
    [settings.weekly_goal, settings.goal_period],
  )

  const removeDeposit = useCallback(async (date: string) => {
    await savingsService.deleteDeposit(date)
    setDeposits((list) => list.filter((d) => d.date !== date))
  }, [])

  const saveSettings = useCallback(async (input: SettingsInput) => {
    setSettings(await settingsService.updateSettings(input))
  }, [])

  const resetAll = useCallback(async () => {
    await accountService.resetAllData()
    await reload()
  }, [reload])

  const value = useMemo<DataState>(
    () => ({
      categories, transactions, deposits, settings, loading, error, reload,
      saveTransaction, removeTransaction, saveCategory, removeCategory,
      saveDeposit, removeDeposit, saveSettings, resetAll,
    }),
    [
      categories, transactions, deposits, settings, loading, error, reload,
      saveTransaction, removeTransaction, saveCategory, removeCategory,
      saveDeposit, removeDeposit, saveSettings, resetAll,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData precisa estar dentro de DataProvider')
  return ctx
}
