import { useState, type FormEvent } from 'react'
import { ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import type { Category, TransactionType } from '../types'
import { formatBRL } from '../lib/format'
import { Button, ConfirmDialog, cx, IconButton, MoneyInput, useToast } from './ui'

const SWATCHES = ['#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#a3a3a3']

export default function CategoryManager() {
  const { categories, transactions, saveCategory, removeCategory } = useData()
  const toast = useToast()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [color, setColor] = useState(SWATCHES[0])
  const [limit, setLimit] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  // Qual lista está aberta (Saídas ou Entradas); sempre fica uma.
  const [open, setOpen] = useState<TransactionType>('expense')
  const [deleting, setDeleting] = useState(false)

  function reset() {
    setEditingId(null)
    setName('')
    setLimit(0)
    setError('')
  }

  function startEdit(c: Category) {
    setEditingId(c.id)
    setName(c.name)
    setType(c.type)
    setColor(c.color)
    setLimit(c.monthly_limit ?? 0)
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Dê um nome para a categoria.')
    const duplicate = categories.some(
      (c) => c.id !== editingId && c.type === type && c.name.toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicate) return setError('Já existe uma categoria com esse nome.')

    setSaving(true)
    try {
      await saveCategory({ name: trimmed, type, color, monthly_limit: type === 'expense' && limit > 0 ? limit : null }, editingId ?? undefined)
      toast.success(editingId ? 'Categoria atualizada.' : 'Categoria criada.')
      setOpen(type)
      reset()
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar a categoria.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await removeCategory(toDelete.id)
      if (editingId === toDelete.id) reset()
      toast.success('Categoria excluída.')
      setToDelete(null)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível excluir a categoria.'))
    } finally {
      setDeleting(false)
    }
  }

  const used = toDelete ? transactions.filter((t) => t.category_id === toDelete.id).length : 0

  const shown = categories.filter((c) => c.type === open)

  return (
    <div className="@container">
      <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-bg p-3" noValidate>
        <div className="grid grid-cols-2 gap-2.5 @lg:grid-cols-[minmax(0,1fr)_7.5rem_10rem]">
          <div className="col-span-2 @lg:col-span-1">
            <label className="field-label" htmlFor="cat-name">{editingId ? 'Editar categoria' : 'Nova categoria'}</label>
            <input id="cat-name" className="field bg-card" maxLength={40} placeholder="Nome" value={name}
              onChange={(e) => { setName(e.target.value); setError('') }} />
          </div>
          <div>
            <label className="field-label" htmlFor="cat-type">Tipo</label>
            <select id="cat-type" className="field bg-card" value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="expense">Saída</option>
              <option value="income">Entrada</option>
            </select>
          </div>
          {type === 'expense' && (
            <div>
              <label className="field-label" htmlFor="cat-limit" title="Deixe em 0,00 para não ter limite.">Limite por mês</label>
              <MoneyInput id="cat-limit" value={limit} onChange={setLimit} />
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-3 flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {SWATCHES.map((s) => (
              <button key={s} type="button" aria-label={`Cor ${s}`} aria-pressed={color === s} onClick={() => setColor(s)}
                className="h-6 w-6 rounded-full border-2 transition"
                style={{ background: s, borderColor: color === s ? '#fff' : 'transparent' }} />
            ))}
            <label className="relative flex h-6 cursor-pointer items-center gap-1.5 rounded-full border border-line px-2 text-xs text-neutral-400">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> Outra
              <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            {editingId && <Button variant="ghost" className="h-9" onClick={reset} icon={<X className="h-4 w-4" />}>Cancelar</Button>}
            <Button type="submit" loading={saving} icon={editingId ? undefined : <Plus className="h-4 w-4" />} className="h-9 flex-1 @lg:flex-none">
              {editingId ? 'Salvar' : 'Criar categoria'}
            </Button>
          </div>
        </div>
      </form>

      <div>
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={open === t} onClick={() => setOpen(t)}
              className={cx('flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition',
                open === t ? 'border-accent bg-accent text-black' : 'border-line bg-bg text-neutral-300 hover:text-neutral-100')}>
              {t === 'expense' ? 'Saídas' : 'Entradas'}
              <span className={cx('font-normal', open === t ? 'text-black/60' : 'text-neutral-500')}>{categories.filter((c) => c.type === t).length}</span>
              <ChevronDown className={cx('ml-auto h-4 w-4 shrink-0 transition-transform', open === t ? 'rotate-180 text-black/70' : 'text-neutral-500')} />
            </button>
          ))}
        </div>

        {(
          <div className="mt-2 rounded-xl border border-line bg-bg">
            {shown.length === 0 ? (
              <p className="px-4 py-4 text-sm text-neutral-500">Nenhuma categoria de {open === 'expense' ? 'saída' : 'entrada'} ainda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {shown.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-1 pl-4 pr-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-neutral-200">{c.name}</span>
                      {c.monthly_limit && <span className="block text-xs text-neutral-500">até {formatBRL(c.monthly_limit)} por mês</span>}
                    </span>
                    <IconButton label={`Editar ${c.name}`} onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label={`Excluir ${c.name}`} onClick={() => setToDelete(c)} className="hover:!text-danger"><Trash2 className="h-4 w-4" /></IconButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir categoria?"
        text={
          used > 0
            ? `"${toDelete?.name}" está em ${used} ${used === 1 ? 'transação, que ficará' : 'transações, que ficarão'} sem categoria. As transações não são apagadas.`
            : `A categoria "${toDelete?.name}" será excluída.`
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  )
}
