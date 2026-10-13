import { useEffect, useState, type FormEvent } from 'react'
import { Download, LogOut, Trash2 } from 'lucide-react'
import CategoryManager from '../components/CategoryManager'
import { Button, Card, CardTitle, Modal, MoneyInput, PageHeader, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import { GOAL_PERIOD_ORDER, GOAL_PERIODS } from '../lib/goal'
import { downloadExport } from '../services/account'
import { displayName, signOut, updateName } from '../services/auth'
import type { GoalPeriod } from '../types'

const CONFIRM_WORD = 'APAGAR'

export default function SettingsPage() {
  const { user } = useAuth()
  const { settings, categories, transactions, deposits, saveSettings, resetAll } = useData()
  const toast = useToast()
  const [goal, setGoal] = useState(settings.weekly_goal)
  const [goalPeriod, setGoalPeriod] = useState(settings.goal_period)
  const [initial, setInitial] = useState(Math.abs(settings.initial_balance))
  const [negative, setNegative] = useState(settings.initial_balance < 0)
  const [saving, setSaving] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const savedName = displayName(user)
  const [name, setName] = useState(savedName)
  const [savingName, setSavingName] = useState(false)

  useEffect(() => setName(savedName), [savedName])

  useEffect(() => {
    setGoal(settings.weekly_goal)
    setGoalPeriod(settings.goal_period)
    setInitial(Math.abs(settings.initial_balance))
    setNegative(settings.initial_balance < 0)
  }, [settings])

  const initialValue = negative ? -initial : initial
  const dirty = goal !== settings.weekly_goal || goalPeriod !== settings.goal_period || initialValue !== settings.initial_balance

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await saveSettings({ weekly_goal: goal, goal_period: goalPeriod, initial_balance: initialValue })
      toast.success('Configurações salvas.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar as configurações.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveName(e: FormEvent) {
    e.preventDefault()
    setSavingName(true)
    try {
      await updateName(name.trim())
      toast.success('Nome salvo.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar o nome.'))
    } finally {
      setSavingName(false)
    }
  }

  function handleExport() {
    try {
      downloadExport({ settings, categories, transactions, savings_deposits: deposits })
      toast.success('Arquivo JSON gerado.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível exportar os dados.'))
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await resetAll()
      toast.success('Todos os seus dados foram apagados.')
      setResetOpen(false)
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível apagar os dados.'))
    } finally {
      setResetting(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível sair.'))
    }
  }

  return (
    <>
      <PageHeader eyebrow="Preferências" title="Configurações" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle eyebrow="Valores" title="Meta e saldo inicial" />
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="goal-period">De quanto em quanto tempo você quer guardar</label>
              <select id="goal-period" className="field" value={goalPeriod} onChange={(e) => setGoalPeriod(e.target.value as GoalPeriod)}>
                {GOAL_PERIOD_ORDER.map((p) => <option key={p} value={p}>{GOAL_PERIODS[p].label} · {GOAL_PERIODS[p].range.toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="goal">Meta (quanto guardar {GOAL_PERIODS[goalPeriod].per})</label>
              <MoneyInput id="goal" value={goal} onChange={setGoal} />
              <p className="mt-1.5 text-xs text-neutral-600">Vale a partir do período atual. Os períodos já concluídos mantêm a meta que tinham.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="initial">Saldo inicial</label>
              <MoneyInput id="initial" value={initial} onChange={setInitial} />
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
                <input type="checkbox" className="h-4 w-4 accent-red-500" checked={negative} onChange={(e) => setNegative(e.target.checked)} />
                Comecei com saldo negativo
              </label>
              <p className="mt-1.5 text-xs text-neutral-600">Quanto você tinha antes da primeira transação registrada aqui.</p>
            </div>
            <Button type="submit" loading={saving} disabled={!dirty}>Salvar</Button>
          </form>
        </Card>

        <Card>
          <CardTitle eyebrow="Conta" title="Seus dados" />
          <p className="text-sm text-neutral-400">Você entrou como<span className="break-all text-neutral-100">{user?.email}</span></p>
          <form onSubmit={handleSaveName} className="mt-5">
            <label className="field-label" htmlFor="name">Seu nome</label>
            <div className="flex gap-2">
              <input id="name" type="text" autoComplete="name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" variant="secondary" loading={savingName} disabled={!name.trim() || name.trim() === savedName}>Salvar</Button>
            </div>
          </form>
          <div className="mt-5 space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-100">Exportar dados</p>
                <p className="text-xs text-neutral-500">Baixa transações, categorias, depósitos e configurações em um arquivo JSON.</p>
              </div>
              <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={handleExport}>Exportar JSON</Button>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-danger/25 bg-danger/[0.04] p-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-100">Apagar todos os meus dados</p>
                <p className="text-xs text-neutral-500">Remove tudo e volta às categorias e configurações padrão. Sua conta continua existindo.</p>
              </div>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => { setConfirmText(''); setResetOpen(true) }}>Apagar tudo</Button>
            </div>
            <Button variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>Sair da conta</Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle eyebrow="Organização" title="Categorias" />
          <CategoryManager />
        </Card>
      </div>

      <Modal open={resetOpen} onClose={() => !resetting && setResetOpen(false)} eyebrow="Atenção" title="Apagar todos os dados?">
        <p className="text-sm leading-relaxed text-neutral-400">
          Isso apaga <b className="text-neutral-200">{transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}</b>,{' '}
          <b className="text-neutral-200">{deposits.length} {deposits.length === 1 ? 'depósito' : 'depósitos'}</b> da Reserva, suas categorias
          e configurações. Não dá para desfazer. Se quiser guardar uma cópia, exporte o JSON antes.
        </p>
        <label className="field-label mt-5" htmlFor="confirm-reset">Digite {CONFIRM_WORD} para confirmar</label>
        <input id="confirm-reset" className="field" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={resetting}>Cancelar</Button>
          <Button variant="danger" loading={resetting} disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD} onClick={handleReset}>Apagar tudo</Button>
        </div>
      </Modal>
    </>
  )
}
