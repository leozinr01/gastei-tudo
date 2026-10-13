import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner, ToastProvider } from './components/ui'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { isSupabaseConfigured } from './lib/supabase'

// Cada página vira um arquivo à parte, baixado só quando é aberta. Assim quem chega
// na página inicial ou no login não baixa os gráficos do Dashboard.
const auth = () => import('./pages/Auth')
const LoginPage = lazy(() => auth().then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => auth().then((m) => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => auth().then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => auth().then((m) => ({ default: m.ResetPasswordPage })))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const LandingPage = lazy(() => import('./pages/Landing'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const TransactionsPage = lazy(() => import('./pages/Transactions'))
const GoalPage = lazy(() => import('./pages/Goal'))

/** Área logada: sem sessão, mostra a página inicial em "/" e manda as outras rotas para o login. */
function ProtectedArea() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  if (loading) return <Spinner />
  if (!user) return pathname === '/' ? <LandingPage /> : <Navigate to="/login" replace />
  return (
    <DataProvider key={user.id} userId={user.id}>
      <Layout />
    </DataProvider>
  )
}

/** Telas de login e cadastro: com sessão, manda para o dashboard. */
function PublicOnly() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-line bg-card p-6">
        <p className="eyebrow mb-1.5">Configuração</p>
        <h1 className="font-display text-2xl text-neutral-50">Falta conectar o Supabase</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          Copie o arquivo <code className="text-neutral-200">.env.example</code> para{' '}
          <code className="text-neutral-200">.env</code>, preencha{' '}
          <code className="text-neutral-200">VITE_SUPABASE_URL</code> e{' '}
          <code className="text-neutral-200">VITE_SUPABASE_ANON_KEY</code> e reinicie o{' '}
          <code className="text-neutral-200">npm run dev</code>. O passo a passo está no README.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />
  return (
    <ToastProvider>
      <AuthProvider>
        <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
          </Route>
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route element={<ProtectedArea />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transacoes" element={<TransactionsPage />} />
            <Route path="/meta" element={<GoalPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </ToastProvider>
  )
}
