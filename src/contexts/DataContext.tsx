import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { todayISO } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import * as accountService from '../services/account'
import * as categoryService from '../services/categories'
import * as recurringService from '../services/recurring'
import * as savingsService from '../services/savings'
import * as settingsService from '../services/settings'
import * as transactionService from '../services/transactions'
import type {
  Category, CategoryInput, RecurringTransaction, RecurringUpdate, SavingsDeposit, Settings, SettingsInput, Transaction, TransactionInput,
} from '../types'

interface DataState {
  categories: Category[]
  transactions: Transaction[]
  /** Transações que se repetem todo mês */
  recurring: RecurringTransaction[]
  deposits: SavingsDeposit[]
  settings: Settings
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  /** Com `repeat`, a transação nova passa a se repetir todo mês, no mesmo dia. */
  saveTransaction: (input: TransactionInput, id?: string, options?: { repeat?: boolean }) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  saveRecurring: (id: string, input: RecurringUpdate) => Promise<void>
  removeRecurring: (id: string) => Promise<void>
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
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [deposits, setDeposits] = useState<SavingsDeposit[]>([])
  const [settings, setSettings] = useState<Settings>({
    user_id: userId,
    weekly_goal: 300,
    goal_period: 'weekly',
    initial_balance: 0,
    avatar: null,
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
      const [s, c, loaded, d, models] = await Promise.all([
        settingsService.getSettings(),
        categoryService.listCategories(),
        transactionService.listTransactions(),
        savingsService.listDeposits(),
        recurringService.listRecurring(),
      ])
      // Lança o que venceu das recorrentes antes de mostrar, para a tela já abrir completa.
      // Se falhar, o app abre do mesmo jeito e tenta de novo na próxima vez.
      let t = loaded
      let r = models
      try {
        const due = await recurringService.launchDue(models, todayISO())
        if (due.created.length) t = [...due.created, ...loaded].sort(byDateDesc)
        r = due.recurring
      } catch {
        /* segue com o que já estava no banco */
      }
      if (id !== loadId.current) return
      setSettings(s)
      setCategories(c.sort(byName))
      setTransactions(t)
      setRecurring(r)
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

  const saveTransaction = useCallback(async (input: TransactionInput, id?: string, options?: { repeat?: boolean }) => {
    const saved = id
      ? await transactionService.updateTransaction(id, input)
      : await transactionService.createTransaction(input)
    let added = [saved]
    if (!id && options?.repeat) {
      // A transação recém-criada já vale como o primeiro lançamento; se a data for antiga,
      // os meses entre ela e hoje são lançados agora.
      const model = await recurringService.createRecurring({
        type: input.type,
        amount: input.amount,
        description: input.description,
        category_id: input.category_id,
        day_of_month: Number(input.date.slice(8)),
        last_date: input.date,
      })
      const due = await recurringService.launchDue([model], todayISO())
      added = [saved, ...due.created]
      setRecurring((list) => [...list, ...due.recurring])
    }
    const ids = new Set(added.map((t) => t.id))
    setTransactions((list) => [...added, ...list.filter((t) => !ids.has(t.id))].sort(byDateDesc))
  }, [])

  const saveRecurring = useCallback(async (id: string, input: RecurringUpdate) => {
    const saved = await recurringService.updateRecurring(id, input)
    setRecurring((list) => list.map((r) => (r.id === id ? saved : r)))
  }, [])

  const removeRecurring = useCallback(async (id: string) => {
    await recurringService.deleteRecurring(id)
    setRecurring((list) => list.filter((r) => r.id !== id))
    // O banco faz "on delete set null" na transação lançada; espelhamos isso localmente.
    setTransactions((list) => list.map((t) => (t.recurring_id === id ? { ...t, recurring_id: null } : t)))
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
    setRecurring((list) => list.map((r) => (r.category_id === id ? { ...r, category_id: null } : r)))
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
      categories, transactions, recurring, deposits, settings, loading, error, reload,
      saveTransaction, removeTransaction, saveRecurring, removeRecurring, saveCategory, removeCategory,
      saveDeposit, removeDeposit, saveSettings, resetAll,
    }),
    [
      categories, transactions, recurring, deposits, settings, loading, error, reload,
      saveTransaction, removeTransaction, saveRecurring, removeRecurring, saveCategory, removeCategory,
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
