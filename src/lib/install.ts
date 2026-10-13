/** Evento do Chrome que permite abrir o aviso nativo de instalação do app. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
}

let deferred: BeforeInstallPromptEvent | null = null

/* O navegador dispara o evento uma vez, logo no carregamento: guarda para usar no clique do botão. */
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferred = event as BeforeInstallPromptEvent
})
window.addEventListener('appinstalled', () => {
  deferred = null
})

/** Abre o aviso nativo de instalação no Android. Devolve false quando o navegador não oferece. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred || !/android/i.test(navigator.userAgent)) return false
  const event = deferred
  deferred = null
  await event.prompt()
  return true
}

/** Verdadeiro quando o site já está aberto como app, pela tela inicial. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
