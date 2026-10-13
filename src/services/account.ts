import { todayISO } from '../lib/dates'
import { EXPORT_HEADER, exportCells, exportRows, toCsv } from '../lib/export'
import { availableBalance, sumDeposits, totals } from '../lib/finance'
import { formatBRL, formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Category, SavingsDeposit, Settings, Transaction } from '../types'

export interface ExportData {
  settings: Settings
  categories: Category[]
  transactions: Transaction[]
  deposits: SavingsDeposit[]
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Baixa o extrato (transações e depósitos da meta) em uma planilha CSV. */
export function downloadCsv({ transactions, deposits, categories }: ExportData): void {
  const csv = toCsv(exportRows(transactions, deposits, categories))
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `gastei-tudo-${todayISO()}.csv`)
}

/** Baixa o extrato em PDF, com um resumo no topo. A biblioteca só é baixada na hora de gerar. */
export async function downloadPdf({ settings, transactions, deposits, categories }: ExportData): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const today = todayISO()
  const rows = exportRows(transactions, deposits, categories)
  const { income, expense } = totals(transactions)
  // A fonte padrão do PDF não tem o espaço especial que o formatador de moeda usa.
  const money = (value: number) => formatBRL(value).replace(/ /g, ' ')

  const doc = new jsPDF()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Gastei Tudo', 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(`Extrato gerado em ${formatDate(today)}`, 14, 25)

  autoTable(doc, {
    startY: 31,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1.5 },
    columnStyles: { 0: { textColor: 110 }, 1: { halign: 'right', fontStyle: 'bold' } },
    tableWidth: 90,
    body: [
      ['Entradas', money(income)],
      ['Saídas', money(expense)],
      ['Guardado na reserva', money(sumDeposits(deposits))],
      ['Saldo disponível', money(availableBalance(settings, transactions, deposits))],
    ],
  })

  autoTable(doc, {
    startY: 66,
    head: [EXPORT_HEADER],
    body: rows.length > 0 ? rows.map(exportCells) : [['', '', 'Nenhuma movimentação registrada.', '', '']],
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [22, 163, 74], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 34 }, 4: { cellWidth: 30, halign: 'right' } },
    didParseCell: (hook) => {
      if (hook.section !== 'body' || hook.column.index !== 4 || rows.length === 0) return
      hook.cell.styles.textColor = rows[hook.row.index].amount < 0 ? [200, 40, 40] : [22, 130, 60]
    },
  })

  doc.save(`gastei-tudo-${today}.pdf`)
}

/** Apaga tudo do usuário e recria configurações e categorias padrão (função do schema.sql). */
export async function resetAllData(): Promise<void> {
  const { error } = await supabase.rpc('reset_user_data')
  if (error) throw error
}
