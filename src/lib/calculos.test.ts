import { describe, expect, it } from 'vitest'
import type { GoalPeriod, SavingsDeposit, Settings, Transaction } from '../types'
import { daysBetween, monthEnd, periodEndOf, periodStartOf, weekStartOf } from './dates'
import { exportRows, toCsv } from './export'
import { availableBalance, balanceSeries, goalStreak, goalSummaries, totals } from './finance'
import { currentGoalStatus } from './goal'
import { dueDateIn, pendingDueDates } from './recurring'

const settings = (over: Partial<Settings> = {}): Settings => ({
  user_id: 'u', weekly_goal: 300, goal_period: 'weekly', initial_balance: 0, avatar: null, ...over,
})

let seq = 0
const tx = (type: Transaction['type'], amount: number, date: string): Transaction => ({
  id: `t${seq++}`, user_id: 'u', type, amount, description: '', category_id: null, date, created_at: `${date}T12:00:00Z`, recurring_id: null,
})
const dep = (date: string, amount: number, goal: number | null = 300, period: GoalPeriod | null = 'weekly'): SavingsDeposit => ({
  id: `d${seq++}`, user_id: 'u', date, amount, goal_snapshot: goal, goal_period_snapshot: period, created_at: `${date}T12:00:00Z`,
})

describe('datas', () => {
  it('a semana começa no domingo', () => {
    // 13/10/2026 é uma terça-feira.
    expect(weekStartOf('2026-10-13')).toBe('2026-10-11')
    expect(weekStartOf('2026-10-11')).toBe('2026-10-11')
  })

  it('o último dia do mês respeita fevereiro e ano bissexto', () => {
    expect(monthEnd('2026-02')).toBe('2026-02-28')
    expect(monthEnd('2028-02')).toBe('2028-02-29')
    expect(monthEnd('2026-12')).toBe('2026-12-31')
  })

  it('calcula o início e o fim de cada período da meta', () => {
    const cases: Array<[GoalPeriod, string, string, string]> = [
      ['daily', '2026-10-13', '2026-10-13', '2026-10-13'],
      ['weekly', '2026-10-13', '2026-10-11', '2026-10-17'],
      ['biweekly', '2026-10-13', '2026-10-01', '2026-10-15'],
      ['biweekly', '2026-10-15', '2026-10-01', '2026-10-15'],
      ['biweekly', '2026-10-16', '2026-10-16', '2026-10-31'],
      ['biweekly', '2026-02-20', '2026-02-16', '2026-02-28'],
      ['monthly', '2026-10-13', '2026-10-01', '2026-10-31'],
    ]
    for (const [period, day, start, end] of cases) {
      expect(periodStartOf(day, period), `${period} ${day}`).toBe(start)
      expect(periodEndOf(start, period), `${period} ${day}`).toBe(end)
    }
  })

  it('lista os dias entre duas datas, incluindo as pontas', () => {
    expect(daysBetween('2026-02-27', '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01'])
  })
})

describe('saldo', () => {
  const transactions = [tx('income', 1000, '2026-10-01'), tx('expense', 250.5, '2026-10-03'), tx('expense', 49.5, '2026-10-05')]
  const deposits = [dep('2026-10-04', 100)]

  it('soma entradas, saídas e resultado', () => {
    expect(totals(transactions)).toEqual({ income: 1000, expense: 300, result: 700 })
  })

  it('saldo disponível = saldo inicial + resultado − reserva', () => {
    expect(availableBalance(settings({ initial_balance: 50 }), transactions, deposits)).toBe(650)
    expect(availableBalance(settings({ initial_balance: -800 }), transactions, deposits)).toBe(-200)
  })

  it('o histórico de saldo acumula dia a dia e considera o que veio antes do período', () => {
    const series = balanceSeries(settings({ initial_balance: 50 }), transactions, deposits, { from: '2026-10-03', to: '2026-10-05' })
    expect(series).toEqual([
      { date: '2026-10-03', balance: 799.5 },
      { date: '2026-10-04', balance: 699.5 },
      { date: '2026-10-05', balance: 650 },
    ])
  })
})

describe('meta', () => {
  it('soma só os depósitos do período atual e calcula o que falta', () => {
    const deposits = [dep('2026-10-12', 100), dep('2026-10-13', 50), dep('2026-10-09', 999)]
    const status = currentGoalStatus(deposits, settings(), '2026-10-13')
    expect(status.start).toBe('2026-10-11')
    expect(status.end).toBe('2026-10-17')
    expect(status.days).toHaveLength(7)
    expect(status.saved).toBe(150)
    expect(status.remaining).toBe(150)
    expect(status.percent).toBe(50)
    expect(status.hit).toBe(false)
    // Restam quarta, quinta, sexta e sábado sem depósito: 150 / 4.
    expect(status.daysLeft).toBe(4)
    expect(status.suggestion).toBe(37.5)
  })

  it('a meta mensal usa o mês inteiro e bate quando chega no valor', () => {
    const deposits = [dep('2026-10-02', 200, 300, 'monthly'), dep('2026-10-20', 100, 300, 'monthly')]
    const status = currentGoalStatus(deposits, settings({ goal_period: 'monthly' }), '2026-10-20')
    expect(status.days).toHaveLength(31)
    expect(status.saved).toBe(300)
    expect(status.hit).toBe(true)
    expect(status.percent).toBe(100)
    expect(status.remaining).toBe(0)
  })

  it('meta zerada nunca é batida', () => {
    const status = currentGoalStatus([dep('2026-10-13', 10)], settings({ weekly_goal: 0 }), '2026-10-13')
    expect(status.hit).toBe(false)
    expect(status.percent).toBe(0)
  })

  it('o histórico usa a meta que valia em cada período, se era do mesmo tipo', () => {
    const deposits = [
      dep('2026-09-29', 200, 200, 'weekly'), // semana de 27/09: meta antiga de 200, batida
      dep('2026-10-06', 100, 300, 'weekly'), // semana de 04/10: meta de 300, não batida
      dep('2026-10-13', 50, 300, 'weekly'), // semana atual
    ]
    const weeks = goalSummaries(deposits, settings(), '2026-10-13')
    expect(weeks.map((w) => [w.start, w.goal, w.saved, w.hit, w.isCurrent])).toEqual([
      ['2026-09-27', 200, 200, true, false],
      ['2026-10-04', 300, 100, false, false],
      ['2026-10-11', 300, 50, false, true],
    ])
  })

  it('ao trocar de período, o histórico é reagrupado e usa a meta atual', () => {
    const deposits = [dep('2026-09-10', 150, 300, 'weekly'), dep('2026-09-25', 150, 300, 'weekly')]
    const months = goalSummaries(deposits, settings({ goal_period: 'monthly', weekly_goal: 250 }), '2026-10-13')
    expect(months.map((m) => [m.start, m.end, m.goal, m.saved, m.hit])).toEqual([
      ['2026-09-01', '2026-09-30', 250, 300, true],
      ['2026-10-01', '2026-10-31', 250, 0, false],
    ])
  })

  it('a sequência conta períodos seguidos batidos e ignora o atual em andamento', () => {
    const period = (hit: boolean, isCurrent = false) => ({ start: '', end: '', goal: 1, saved: hit ? 1 : 0, hit, isCurrent })
    expect(goalStreak([period(false), period(true), period(true), period(false, true)])).toBe(2)
    expect(goalStreak([period(true), period(false), period(true, true)])).toBe(1)
    expect(goalStreak([period(true), period(false)])).toBe(0)
    expect(goalStreak([])).toBe(0)
  })
})

describe('exportação', () => {
  const categories = [{ id: 'c1', user_id: 'u', name: 'Mercado', type: 'expense' as const, color: '#fff', monthly_limit: null, created_at: '' }]
  const transactions = [
    tx('income', 1000, '2026-10-01'),
    { ...tx('expense', 1250.5, '2026-10-03'), category_id: 'c1', description: 'Compra; do "mês"' },
    { ...tx('expense', 10, '2026-10-02'), description: '=SOMA(A1)' },
  ]
  const rows = exportRows(transactions, [dep('2026-10-04', 100)], categories)

  it('junta transações e depósitos, do mais recente para o mais antigo, com sinal no valor', () => {
    expect(rows.map((r) => [r.date, r.kind, r.category, r.amount])).toEqual([
      ['2026-10-04', 'Guardado na meta', '', -100],
      ['2026-10-03', 'Saída', 'Mercado', -1250.5],
      ['2026-10-02', 'Saída', 'Sem categoria', -10],
      ['2026-10-01', 'Entrada', 'Sem categoria', 1000],
    ])
  })

  it('gera a planilha com ponto e vírgula, vírgula decimal e texto protegido', () => {
    const lines = toCsv(rows).replace('﻿', '').trimEnd().split('\r\n')
    expect(lines).toEqual([
      'Data;Tipo;Descrição;Categoria;Valor (R$)',
      '04/10/2026;Guardado na meta;Reserva;;-100,00',
      '03/10/2026;Saída;"Compra; do ""mês""";Mercado;-1.250,50',
      "02/10/2026;Saída;'=SOMA(A1);Sem categoria;-10,00",
      '01/10/2026;Entrada;;Sem categoria;1.000,00',
    ])
  })
})

describe('recorrentes', () => {
  const model = (day_of_month: number, last_date: string | null, created = '2026-01-10') => ({
    day_of_month, last_date, created_at: `${created}T12:00:00Z`,
  })

  it('em meses mais curtos o vencimento cai no último dia', () => {
    expect(dueDateIn('2026-02', 31)).toBe('2026-02-28')
    expect(dueDateIn('2026-04', 31)).toBe('2026-04-30')
    expect(dueDateIn('2026-10', 5)).toBe('2026-10-05')
  })

  it('nada a lançar quando o mês já foi lançado', () => {
    expect(pendingDueDates(model(13, '2026-10-13'), '2026-10-13')).toEqual([])
    expect(pendingDueDates(model(13, '2026-10-13'), '2026-11-12')).toEqual([])
  })

  it('lança no dia do vencimento e recupera os meses em que o app ficou fechado', () => {
    expect(pendingDueDates(model(13, '2026-10-13'), '2026-11-13')).toEqual(['2026-11-13'])
    expect(pendingDueDates(model(31, '2026-01-31'), '2026-04-30')).toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('trocar o dia no meio do mês não lança duas vezes no mesmo mês', () => {
    // Já lançou em 05/10; o dia passou para 20. O próximo é só 20/11.
    expect(pendingDueDates(model(20, '2026-10-05'), '2026-10-25')).toEqual([])
    expect(pendingDueDates(model(20, '2026-10-05'), '2026-11-20')).toEqual(['2026-11-20'])
  })

  it('sem lançamento anterior, começa do primeiro vencimento a partir da criação', () => {
    expect(pendingDueDates(model(5, null, '2026-10-10'), '2026-11-06')).toEqual(['2026-11-05'])
    expect(pendingDueDates(model(15, null, '2026-10-10'), '2026-10-20')).toEqual(['2026-10-15'])
  })

  it('não passa de três anos de lançamentos de uma vez', () => {
    expect(pendingDueDates(model(1, '2020-01-01'), '2026-10-13')).toHaveLength(36)
  })
})
