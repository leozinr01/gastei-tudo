import type { Category, SavingsDeposit, Transaction } from '../types'
import { formatDate, formatNumber } from './format'

/** Uma linha do extrato exportado. O valor já vem com sinal: o que saiu do saldo é negativo. */
export interface ExportRow {
  date: string
  kind: 'Entrada' | 'Saída' | 'Guardado na meta'
  description: string
  category: string
  amount: number
}

export const EXPORT_HEADER = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)']

/** Junta transações e depósitos da meta em um extrato só, do mais recente para o mais antigo. */
export function exportRows(transactions: Transaction[], deposits: SavingsDeposit[], categories: Category[]): ExportRow[] {
  const categoryById = new Map(categories.map((c) => [c.id, c.name]))
  const rows: ExportRow[] = [
    ...transactions.map((t): ExportRow => ({
      date: t.date,
      kind: t.type === 'income' ? 'Entrada' : 'Saída',
      description: t.description,
      category: (t.category_id && categoryById.get(t.category_id)) || 'Sem categoria',
      amount: t.type === 'income' ? t.amount : -t.amount,
    })),
    ...deposits.map((d): ExportRow => ({
      date: d.date, kind: 'Guardado na meta', description: 'Reserva', category: '', amount: -d.amount,
    })),
  ]
  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

/** As células de uma linha, já formatadas para leitura (data dd/mm/aaaa e valor 1.234,56). */
export function exportCells(row: ExportRow): string[] {
  return [formatDate(row.date), row.kind, row.description, row.category, formatNumber(row.amount)]
}

function csvCell(value: string): string {
  // Texto começando com =, +, - ou @ seria lido como fórmula pela planilha.
  const safe = /^[=+\-@]/.test(value) && !/^-?[\d.]+,\d{2}$/.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** CSV no formato que o Excel e o Google Planilhas abrem direto em português: ponto e vírgula e vírgula decimal. */
export function toCsv(rows: ExportRow[]): string {
  const lines = [EXPORT_HEADER, ...rows.map(exportCells)].map((cells) => cells.map(csvCell).join(';'))
  // O BOM no início faz o Excel reconhecer os acentos.
  return `﻿${lines.join('\r\n')}\r\n`
}
