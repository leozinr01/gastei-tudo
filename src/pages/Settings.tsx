import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Camera, FileSpreadsheet, FileText, Loader2, LogOut, Trash2 } from 'lucide-react'
import CategoryManager from '../components/CategoryManager'
import { Button, Card, CardTitle, Modal, PageHeader, useToast } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { errorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'
import { fileToAvatar } from '../lib/image'
import { downloadCsv, downloadPdf } from '../services/account'
import { displayName, signOut, updateName } from '../services/auth'

const CONFIRM_WORD = 'APAGAR'

export default function SettingsPage() {
  const { user } = useAuth()
  const { settings, categories, transactions, deposits, saveSettings, resetAll } = useData()
  const toast = useToast()
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const savedName = displayName(user)
  const [name, setName] = useState(savedName)
  const [savingName, setSavingName] = useState(false)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  useEffect(() => setName(savedName), [savedName])

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

  async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Limpa o campo para a mesma foto poder ser escolhida de novo.
    e.target.value = ''
    if (!file) return
    setSavingPhoto(true)
    try {
      await saveSettings({ avatar: await fileToAvatar(file) })
      toast.success('Foto atualizada.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar a foto.'))
    } finally {
      setSavingPhoto(false)
    }
  }

  async function removePhoto() {
    setSavingPhoto(true)
    try {
      await saveSettings({ avatar: null })
      toast.success('Foto removida.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível remover a foto.'))
    } finally {
      setSavingPhoto(false)
    }
  }

  async function handleExport(format: 'csv' | 'pdf') {
    const data = { settings, categories, transactions, deposits }
    setExporting(format)
    try {
      if (format === 'csv') downloadCsv(data)
      else await downloadPdf(data)
      toast.success(format === 'csv' ? 'Planilha gerada.' : 'PDF gerado.')
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível exportar os dados.'))
    } finally {
      setExporting(null)
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

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle eyebrow="Organização" title="Categorias" />
          <CategoryManager />
        </Card>

        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-1">
        <Card>
          <CardTitle eyebrow="Conta" title="Seu perfil" />
          <div className="flex items-center gap-3.5 rounded-xl border border-line bg-bg p-3.5">
            <button type="button" onClick={() => photoInput.current?.click()} disabled={savingPhoto}
              aria-label={settings.avatar ? 'Trocar foto de perfil' : 'Escolher foto de perfil'}
              className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-brand/15 font-display text-xl text-brand disabled:cursor-wait">
              {settings.avatar
                ? <img src={settings.avatar} alt="" className="h-full w-full object-cover" />
                : (savedName || user?.email || '?').charAt(0).toUpperCase()}
              <span className={`absolute inset-0 grid place-items-center bg-black/55 text-white transition-opacity ${savingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
                {savingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </span>
            </button>
            <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-100">{savedName || 'Sem nome'}</p>
              <p className="truncate text-xs text-neutral-500">{user?.email}</p>
              <p className="mt-1.5 flex gap-3 text-xs font-medium">
                <button type="button" className="text-accent hover:underline disabled:opacity-50" onClick={() => photoInput.current?.click()} disabled={savingPhoto}>
                  {settings.avatar ? 'Trocar foto' : 'Colocar foto'}
                </button>
                {settings.avatar && (
                  <button type="button" className="text-neutral-500 hover:text-danger disabled:opacity-50" onClick={removePhoto} disabled={savingPhoto}>Remover</button>
                )}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveName} className="mt-4">
            <label className="field-label" htmlFor="name">Como quer ser chamado</label>
            <div className="flex gap-2">
              <input id="name" type="text" autoComplete="name" className="field" value={name} onChange={(e) => setName(e.target.value)} />
              <Button type="submit" variant="secondary" loading={savingName} disabled={!name.trim() || name.trim() === savedName}>Salvar</Button>
            </div>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <p className="min-w-0 text-xs text-neutral-500">
              {user?.created_at ? `Conta criada em ${formatDate(user.created_at.slice(0, 10))}` : ''}
            </p>
            <Button variant="secondary" className="h-9 shrink-0 !text-danger" icon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>Sair da conta</Button>
          </div>
        </Card>
        </div>

        <Card className="xl:col-span-3">
          <CardTitle eyebrow="Seus dados" title="Exportar e apagar" />
          <div className="divide-y divide-line">
            <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-100">Exportar dados</p>
                <p className="text-xs text-neutral-500">Baixa suas transações e o que você guardou na meta.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" icon={<FileSpreadsheet className="h-4 w-4" />} loading={exporting === 'csv'} disabled={exporting !== null} onClick={() => handleExport('csv')}>Planilha</Button>
                <Button variant="secondary" className="flex-1" icon={<FileText className="h-4 w-4" />} loading={exporting === 'pdf'} disabled={exporting !== null} onClick={() => handleExport('pdf')}>PDF</Button>
              </div>
            </div>
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-100">Apagar todos os meus dados</p>
                <p className="text-xs text-neutral-500">Remove tudo e volta ao padrão. Sua conta continua existindo.</p>
              </div>
              <Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => { setConfirmText(''); setResetOpen(true) }}>Apagar tudo</Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={resetOpen} onClose={() => !resetting && setResetOpen(false)} eyebrow="Atenção" title="Apagar todos os dados?">
        <p className="text-sm leading-relaxed text-neutral-400">
          Isso apaga <b className="text-neutral-200">{transactions.length} {transactions.length === 1 ? 'transação' : 'transações'}</b>,{' '}
          <b className="text-neutral-200">{deposits.length} {deposits.length === 1 ? 'depósito' : 'depósitos'}</b> da Reserva, suas categorias
          e configurações. Não dá para desfazer. Se quiser guardar uma cópia, exporte a planilha ou o PDF antes.
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
