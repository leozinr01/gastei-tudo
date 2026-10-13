import { useEffect, useState, type FormEvent } from 'react'
import { useData } from '../contexts/DataContext'
import { todayISO } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import type { Transaction, TransactionType } from '../types'
import { Button, cx, Modal, MoneyInput, useToast } from './ui'

interface Props {
  open: boolean
  editing?: Transaction | null
  onClose: () => void
  /** Com isso, a edição ganha o botão de excluir (a confirmação fica por conta de quem chama). */
  onDelete?: (transaction: Transaction) => void
}

export default function TransactionForm({ open, editing, onClose, onDelete }: Props) {
  const { categories, saveTransaction } = useData()
  const toast = useToast()
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [repeat, setRepeat] = useState(false)
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setType(editing?.type ?? 'expense')
    setAmount(editing?.amount ?? 0)
    setDescription(editing?.description ?? '')
    setCategoryId(editing?.category_id ?? '')
    setDate(editing?.date ?? todayISO())
    setRepeat(false)
    setErrors({})
  }, [open, editing])

  const options = categories.filter((c) => c.type === type)

  function changeType(next: TransactionType) {
    setType(next)
    if (!categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!(amount > 0)) found.amount = 'Informe um valor maior que zero.'
    if (!date) found.date = 'Informe a data.'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    try {
      await saveTransaction(
        { type, amount, description: description.trim(), category_id: categoryId || null, date },
        editing?.id,
        { repeat },
      )
      toast.success(editing ? 'Transação atualizada.' : repeat ? `Transação registrada. Ela se repete todo dia ${Number(date.slice(8))}.` : 'Transação registrada.')
      onClose()
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar a transação.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} eyebrow={editing ? 'Editar' : 'Nova'} title="Transação">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              aria-pressed={type === t}
              className={cx(
                'h-9 rounded-lg text-sm font-semibold transition',
                type === t
                  ? t === 'income' ? 'bg-brand/15 text-brand' : 'bg-danger/15 text-danger'
                  : 'text-neutral-500 hover:text-neutral-200',
              )}
            >
              {t === 'income' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>

        <div>
          <label className="field-label" htmlFor="tx-amount">Valor</label>
          <MoneyInput id="tx-amount" value={amount} onChange={setAmount} autoFocus={!editing} />
          {errors.amount && <p className="mt-1.5 text-xs text-danger">{errors.amount}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="tx-desc">Descrição</label>
          <input
            id="tx-desc"
            className="field"
            maxLength={120}
            placeholder={type === 'income' ? 'Ex.: Salário de outubro' : 'Ex.: Compras da semana'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="tx-cat">Categoria</label>
            <select id="tx-cat" className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="tx-date">Data</label>
            <input id="tx-date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
            {errors.date && <p className="mt-1.5 text-xs text-danger">{errors.date}</p>}
          </div>
        </div>

        {!editing && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-300">
            <input type="checkbox" className="h-4 w-4 accent-yellow-500" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            Repetir todo mês{date ? `, no dia ${Number(date.slice(8))}` : ''}
          </label>
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {editing && onDelete && (
            <Button variant="danger" className="sm:mr-auto" disabled={saving} onClick={() => { onClose(); onDelete(editing) }}>Excluir</Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" loading={saving}>{editing ? 'Salvar alterações' : 'Adicionar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
