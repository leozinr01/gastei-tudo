import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, Receipt, Repeat, Search, Tags, Trash2 } from 'lucide-react'
import CategoryManager from '../components/CategoryManager'
import RecurringManager from '../components/RecurringManager'
import TransactionForm from '../components/TransactionForm'
import { Button, Card, ConfirmDialog, cx, EmptyState, IconButton, Modal, PageHeader, useToast } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import { totals } from '../lib/finance'
import { formatBRL, formatDate } from '../lib/format'
import type { Category, Transaction } from '../types'

const PAGE_SIZE = 50

const TYPES: Array<{ id: Transaction['type']; label: string; icon: typeof ArrowDownLeft; active: string }> = [
  { id: 'income', label: 'Entradas', icon: ArrowDownLeft, active: 'bg-brand/15 text-brand' },
  { id: 'expense', label: 'Saídas', icon: ArrowUpRight, active: 'bg-danger/15 text-danger' },
]

/** Uma coluna da página: só entradas ou só saídas, com o total no cabeçalho. */
function TransactionColumn({ type, items, total, filtered, categoryById, onEdit, onDelete }: {
  type: Transaction['type']
  items: Transaction[]
  total: number
  /** Há busca, categoria ou datas escolhidas: muda o texto de lista vazia. */
  filtered: boolean
  categoryById: Map<string, Category>
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const income = type === 'income'

  return (
    <Card className="!p-0">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4 sm:px-6">
        <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', income ? 'bg-brand/10 text-brand' : 'bg-danger/10 text-danger')}>
          {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-neutral-100">{income ? 'Entradas' : 'Saídas'}</h2>
          <p className="text-xs text-neutral-500">{items.length} {items.length === 1 ? 'transação' : 'transações'}</p>
        </div>
        <span className={cx('shrink-0 text-base font-semibold', income ? 'text-brand' : 'text-danger')}>{formatBRL(total)}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-neutral-500 sm:px-6">{filtered ? `Nenhuma ${income ? 'entrada' : 'saída'} combina com os filtros.` : income ? 'Nenhuma entrada registrada ainda.' : 'Nenhuma saída registrada ainda.'}</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {items.slice(0, limit).map((t) => {
              const cat = t.category_id ? categoryById.get(t.category_id) : undefined
              return (
                <li key={t.id} className="flex items-center gap-1 pr-2 sm:pr-4">
                  {/* A linha inteira abre a edição; no celular os botões somem e o excluir fica lá dentro. */}
                  <button type="button" onClick={() => onEdit(t)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left sm:pl-6">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-neutral-100">{t.description || (cat?.name ?? (income ? 'Entrada' : 'Saída'))}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500">
                        {t.recurring_id && <Repeat className="h-3 w-3 shrink-0" aria-label="Lançada automaticamente" />}
                        <span className="shrink-0">{formatDate(t.date)}</span>
                        <span>·</span>
                        {cat && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat.color }} />}
                        <span className="truncate">{cat?.name ?? 'Sem categoria'}</span>
                      </span>
                    </span>
                    <span className={cx('shrink-0 text-sm font-semibold', income ? 'text-brand' : 'text-danger')}>
                      {income ? '+' : '−'} {formatBRL(t.amount)}
                    </span>
                  </button>
                  <div className="flex shrink-0 max-sm:hidden">
                    <IconButton label="Editar" onClick={() => onEdit(t)}><Pencil className="h-4 w-4" /></IconButton>
                    <IconButton label="Excluir" onClick={() => onDelete(t)} className="hover:!text-danger"><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
          {items.length > limit && (
            <div className="border-t border-line p-4 text-center">
              <Button variant="ghost" onClick={() => setLimit((n) => n + PAGE_SIZE)}>Mostrar mais ({items.length - limit} restantes)</Button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default function TransactionsPage() {
  const { transactions, categories, removeTransaction } = useData()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [type, setType] = useState<Transaction['type']>('income')
  const [categoryId, setCategoryId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions.filter(
      (t) =>
        (!q || t.description.toLowerCase().includes(q)) &&
        (!categoryId || (categoryId === 'none' ? !t.category_id : t.category_id === categoryId)) &&
        (!from || t.date >= from) &&
        (!to || t.date <= to),
    )
  }, [transactions, search, categoryId, from, to])

  const sum = totals(filtered)
  const incomes = useMemo(() => filtered.filter((t) => t.type === 'income'), [filtered])
  const expenses = useMemo(() => filtered.filter((t) => t.type === 'expense'), [filtered])
  const hasFilters = Boolean(search || categoryId || from || to)

  function clearFilters() {
    setSearch(''); setCategoryId(''); setFrom(''); setTo('')
  }

  // No celular só um tipo aparece por vez, então a aba acompanha a categoria escolhida.
  function changeCategory(id: string) {
    setCategoryId(id)
    const cat = categoryById.get(id)
    if (cat) setType(cat.type)
  }

  function changeType(next: Transaction['type']) {
    setType(next)
    const cat = categoryById.get(categoryId)
    if (cat && cat.type !== next) setCategoryId('')
  }

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(t: Transaction) { setEditing(t); setFormOpen(true) }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await removeTransaction(toDelete.id)
      toast.success('Transação excluída.')
      setToDelete(null)
    } catch (e) {
      toast.error(errorMessage(e, 'Não foi possível excluir a transação.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow="Entradas e saídas" title="Transações">
        <Button variant="secondary" icon={<Tags className="h-4 w-4" />} onClick={() => setCategoriesOpen(true)}>Categorias</Button>
        <Button variant="secondary" icon={<Repeat className="h-4 w-4" />} onClick={() => setRecurringOpen(true)}>Recorrentes</Button>
        <Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Nova transação</Button>
      </PageHeader>

      {/* Só no celular: escolhe ver entradas ou saídas. Em telas largas as duas ficam lado a lado. */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-card p-1 lg:hidden" role="group" aria-label="Tipo de transação">
        {TYPES.map(({ id, label, icon: Icon, active }) => (
          <button key={id} type="button" aria-pressed={type === id} onClick={() => changeType(id)}
            className={cx('flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition', type === id ? active : 'text-neutral-400 hover:text-neutral-100')}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <Card className="mb-4 !p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="relative col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <input className="field pl-10" placeholder="Buscar por descrição" aria-label="Buscar por descrição" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field col-span-2 lg:col-span-1" aria-label="Categoria" value={categoryId} onChange={(e) => changeCategory(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.type === 'income' ? 'entrada' : 'saída'})</option>
            ))}
            <option value="none">Sem categoria</option>
          </select>
          {/* No celular o campo de data vazio aparece em branco, então cada um leva o nome em cima. */}
          <label className="block min-w-0">
            <span className="field-label lg:sr-only">A partir de</span>
            <input type="date" className="field min-w-0" title="A partir de" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="field-label lg:sr-only">Até</span>
            <input type="date" className="field min-w-0" title="Até" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        {hasFilters && (
          <div className="mt-3 text-right text-xs">
            <button type="button" className="text-accent hover:underline" onClick={clearFilters}>Limpar filtros</button>
          </div>
        )}
      </Card>

      {transactions.length === 0 ? (
        <Card className="!p-0">
          <EmptyState icon={<Receipt className="h-5 w-5" />} title="Nenhuma transação ainda"
            text="Registre sua primeira entrada ou saída para começar a acompanhar seu dinheiro."
            action={<Button icon={<Plus className="h-4 w-4" />} onClick={openNew}>Nova transação</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <div className={cx(type !== 'income' && 'max-lg:hidden')}>
            <TransactionColumn type="income" items={incomes} total={sum.income} filtered={hasFilters} categoryById={categoryById} onEdit={openEdit} onDelete={setToDelete} />
          </div>
          <div className={cx(type !== 'expense' && 'max-lg:hidden')}>
            <TransactionColumn type="expense" items={expenses} total={sum.expense} filtered={hasFilters} categoryById={categoryById} onEdit={openEdit} onDelete={setToDelete} />
          </div>
        </div>
      )}

      <TransactionForm open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onDelete={setToDelete} />
      <Modal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} eyebrow="Organização" title="Categorias">
        <CategoryManager />
      </Modal>
      <Modal open={recurringOpen} onClose={() => setRecurringOpen(false)} eyebrow="Todo mês" title="Recorrentes">
        <RecurringManager />
      </Modal>
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Excluir transação?"
        text={toDelete ? `${toDelete.description || 'Transação'} de ${formatBRL(toDelete.amount)} em ${formatDate(toDelete.date)} será excluída. Essa ação não pode ser desfeita.` : ''}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  )
}
