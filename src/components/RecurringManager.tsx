import { useState, type FormEvent } from 'react'
import { Pencil, Repeat, Trash2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import { formatBRL } from '../lib/format'
import type { RecurringTransaction } from '../types'
import { Button, ConfirmDialog, cx, EmptyState, IconButton, MoneyInput, useToast } from './ui'

/** Formulário de edição: muda o que será lançado daqui para a frente. */
function RecurringForm({ item, onDone }: { item: RecurringTransaction; onDone: () => void }) {
  const { categories, saveRecurring } = useData()
  const toast = useToast()
  const [amount, setAmount] = useState(item.amount)
  const [description, setDescription] = useState(item.description)
  const [categoryId, setCategoryId] = useState(item.category_id ?? '')
  const [day, setDay] = useState(String(item.day_of_month))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const dayNumber = Number(day)
    if (!(amount > 0)) return setError('Informe um valor maior que zero.')
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) return setError('O dia precisa ser de 1 a 31.')
    setSaving(true)
    try {
      await saveRecurring(item.id, { amount, description: description.trim(), category_id: categoryId || null, day_of_month: dayNumber })
      toast.success('Recorrente atualizada.')
      onDone()
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar a recorrente.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div>
          <label className="field-label" htmlFor="rec-amount">Valor</label>
          <MoneyInput id="rec-amount" value={amount} onChange={(v) => { setAmount(v); setError('') }} />
        </div>
        <div>
          <label className="field-label" htmlFor="rec-day">Dia do mês</label>
          <input id="rec-day" className="field" type="number" inputMode="numeric" min={1} max={31} value={day} onChange={(e) => { setDay(e.target.value); setError('') }} />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="rec-desc">Descrição</label>
        <input id="rec-desc" className="field" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="rec-cat">Categoria</label>
        <select id="rec-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sem categoria</option>
          {categories.filter((c) => c.type === item.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <p className="text-xs text-neutral-600">Vale para os próximos lançamentos. O que já foi lançado continua como está.</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone} disabled={saving}>Voltar</Button>
        <Button type="submit" loading={saving}>Salvar alterações</Button>
      </div>
    </form>
  )
}

/** Lista das transações que se repetem todo mês, com as opções de editar e de parar cada uma. */
export default function RecurringManager() {
  const { recurring, categories, removeRecurring } = useData()
  const toast = useToast()
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
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

  if (editing) return <RecurringForm item={editing} onDone={() => setEditing(null)} />

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
                <li key={r.id} className="flex items-center gap-2 py-3 first:pt-0">
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
                  <div className="flex shrink-0">
                    <IconButton label={`Editar ${r.description || 'recorrente'}`} onClick={() => setEditing(r)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Parar de repetir ${r.description || 'transação'}`} onClick={() => setToStop(r)} className="hover:!text-danger">
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
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
