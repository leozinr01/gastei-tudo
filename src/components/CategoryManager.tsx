import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import type { Category, TransactionType } from '../types'
import { formatBRL } from '../lib/format'
import { Button, ConfirmDialog, EmptyState, IconButton, MoneyInput, useToast } from './ui'

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

  return (
    <div>
      <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-bg p-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <div>
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
        </div>
        {type === 'expense' && (
          <div className="mt-3">
            <label className="field-label" htmlFor="cat-limit">Limite por mês (opcional)</label>
            <MoneyInput id="cat-limit" value={limit} onChange={setLimit} />
            <p className="mt-1.5 text-xs text-neutral-600">Deixe em 0,00 para não ter limite. O Dashboard mostra quanto do limite já foi gasto no mês.</p>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SWATCHES.map((s) => (
            <button key={s} type="button" aria-label={`Cor ${s}`} aria-pressed={color === s} onClick={() => setColor(s)}
              className="h-7 w-7 rounded-full border-2 transition"
              style={{ background: s, borderColor: color === s ? '#fff' : 'transparent' }} />
          ))}
          <label className="relative flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-line px-2.5 text-xs text-neutral-400">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} /> Outra
            <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-4 flex gap-2">
          <Button type="submit" loading={saving} icon={editingId ? undefined : <Plus className="h-4 w-4" />} className="h-10">
            {editingId ? 'Salvar' : 'Criar categoria'}
          </Button>
          {editingId && <Button variant="ghost" className="h-10" onClick={reset} icon={<X className="h-4 w-4" />}>Cancelar</Button>}
        </div>
      </form>

      {categories.length === 0 ? (
        <EmptyState icon={<Tags className="h-5 w-5" />} title="Nenhuma categoria" text="Crie a primeira categoria para organizar suas transações." />
      ) : (
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {(['expense', 'income'] as const).map((t) => (
            <div key={t}>
              <p className="mb-2 text-xs font-medium text-neutral-500">{t === 'expense' ? 'Saídas' : 'Entradas'}</p>
              <ul className="divide-y divide-line">
                {categories.filter((c) => c.type === t).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2">
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
            </div>
          ))}
        </div>
      )}

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
