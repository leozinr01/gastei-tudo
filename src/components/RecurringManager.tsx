import { useState } from 'react'
import { Repeat, Trash2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import { formatBRL } from '../lib/format'
import type { RecurringTransaction } from '../types'
import { ConfirmDialog, cx, EmptyState, IconButton, useToast } from './ui'

/** Lista das transações que se repetem todo mês, com a opção de parar cada uma. */
export default function RecurringManager() {
  const { recurring, categories, removeRecurring } = useData()
  const toast = useToast()
  const [toStop, setToStop] = useState<RecurringTransaction | null>(null)
  const [stopping, setStopping] = useState(false)

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  async function confirmStop() {
    if (!toStop) return
    setStopping(true)
    try {
      await removeRecurring(toStop.id)
      toast.success('A transação não se repete mais.')
      setToStop(null)
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível parar a repetição.'))
    } finally {
      setStopping(false)
    }
  }

  return (
    <div>
      {recurring.length === 0 ? (
        <EmptyState icon={<Repeat className="h-5 w-5" />} title="Nada se repetindo"
          text='Ao registrar uma transação, marque "Repetir todo mês" e ela passa a ser lançada sozinha.' />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {recurring.map((r) => {
              const cat = r.category_id ? categoryById.get(r.category_id) : undefined
              const income = r.type === 'income'
              return (
                <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">{r.description || (cat?.name ?? (income ? 'Entrada' : 'Saída'))}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                      <span className="shrink-0">Todo dia {r.day_of_month}</span>
                      <span>·</span>
                      {cat && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat.color }} />}
                      <span className="truncate">{cat?.name ?? 'Sem categoria'}</span>
                    </p>
                  </div>
                  <span className={cx('shrink-0 text-sm font-semibold', income ? 'text-brand' : 'text-danger')}>
                    {income ? '+' : '−'} {formatBRL(r.amount)}
                  </span>
                  <IconButton label={`Parar de repetir ${r.description || 'transação'}`} onClick={() => setToStop(r)} className="hover:!text-danger">
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-xs text-neutral-600">
            Cada uma é lançada sozinha no dia marcado. Em meses mais curtos, entra no último dia do mês.
          </p>
        </>
      )}

      <ConfirmDialog
        open={Boolean(toStop)}
        title="Parar de repetir?"
        text={toStop ? `"${toStop.description || 'Transação'}" de ${formatBRL(toStop.amount)} deixa de ser lançada todo mês. As transações já lançadas continuam no histórico.` : ''}
        confirmLabel="Parar de repetir"
        loading={stopping}
        onConfirm={confirmStop}
        onClose={() => setToStop(null)}
      />
    </div>
  )
}
