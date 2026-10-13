export type TransactionType = 'income' | 'expense'

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  type: TransactionType
  /** Quanto a pessoa quer gastar por mês na categoria (só saídas; sem valor = sem limite) */
  monthly_limit: number | null
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string
  category_id: string | null
  /** Data no formato aaaa-mm-dd */
  date: string
  created_at: string
  /** Modelo recorrente que lançou esta transação, se foi lançada sozinha */
  recurring_id: string | null
}

/** Modelo de uma transação que se repete todo mês, no dia escolhido. */
export interface RecurringTransaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string
  category_id: string | null
  day_of_month: number
  /** Último vencimento já lançado (aaaa-mm-dd) */
  last_date: string | null
  created_at: string
}

/** De quanto em quanto tempo a meta de economia se renova. */
export type GoalPeriod = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface SavingsDeposit {
  id: string
  user_id: string
  /** Data no formato aaaa-mm-dd */
  date: string
  amount: number
  /** Meta vigente quando o depósito foi feito */
  goal_snapshot: number | null
  /** Período da meta vigente quando o depósito foi feito (sem valor = semanal) */
  goal_period_snapshot: GoalPeriod | null
  created_at: string
}

export interface Settings {
  user_id: string
  /** Valor da meta por período (o nome vem de quando a meta era só semanal). */
  weekly_goal: number
  goal_period: GoalPeriod
  initial_balance: number
}

export type CategoryInput = Pick<Category, 'name' | 'color' | 'type' | 'monthly_limit'>
export type RecurringInput = Pick<
  RecurringTransaction,
  'type' | 'amount' | 'description' | 'category_id' | 'day_of_month' | 'last_date'
>
export type RecurringUpdate = Pick<RecurringTransaction, 'amount' | 'description' | 'category_id' | 'day_of_month'>
export type TransactionInput = Pick<
  Transaction,
  'type' | 'amount' | 'description' | 'category_id' | 'date'
>
export type SettingsInput = Partial<Pick<Settings, 'weekly_goal' | 'goal_period' | 'initial_balance'>>

export interface Period {
  from: string
  to: string
}
