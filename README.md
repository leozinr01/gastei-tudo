# Gastei Tudo

Sistema web de finanças pessoais: entradas e saídas, gráficos e meta semanal de poupança.

**Stack:** React + Vite + TypeScript + Tailwind CSS, gráficos com Recharts e banco/autenticação no Supabase (sem servidor próprio).

## Passo a passo

### 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), entre na sua conta e clique em **New project**.
2. Escolha um nome, uma senha para o banco e a região **South America (São Paulo)**.
3. Aguarde o projeto terminar de ser criado.

### 2. Rodar o schema.sql

1. No painel do projeto, abra **SQL Editor** > **New query**.
2. Cole todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

Isso cria as tabelas, os índices, as políticas de segurança (RLS) e o gatilho que gera as configurações e as categorias padrão de cada conta nova. O arquivo pode ser rodado mais de uma vez sem problema.

### 3. Preencher o .env

1. No Supabase, abra **Project Settings** > **API** (ou o botão **Connect**) e copie a **Project URL** e a chave **anon / publishable**.
2. Na pasta do projeto, copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

A chave *anon* pode ficar no front-end: quem protege os dados é o Row Level Security. **Nunca** use a chave `service_role` aqui.

### 4. Rodar localmente

Requer Node.js 18 ou superior.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`, crie sua conta e pronto.

> Por padrão o Supabase pede confirmação por e-mail no cadastro. Para uso pessoal, você pode desligar em **Authentication** > **Sign In / Providers** > **Email** > *Confirm email*.

### 5. Publicar na Vercel

1. Suba o projeto para um repositório no GitHub (o `.env` já está no `.gitignore`).
2. Em [vercel.com](https://vercel.com), clique em **Add New** > **Project** e importe o repositório. A Vercel detecta o Vite sozinha (build `npm run build`, saída `dist`).
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env`.
4. Clique em **Deploy**.
5. De volta ao Supabase, em **Authentication** > **URL Configuration**:
   - **Site URL:** o endereço da Vercel (ex.: `https://meu-app.vercel.app`)
   - **Redirect URLs:** adicione `https://meu-app.vercel.app/**` e `http://localhost:5173/**`

O passo 5 é necessário para os links de confirmação de conta e de recuperação de senha abrirem o seu app. O arquivo `vercel.json` já cuida das rotas (atualizar a página em `/meta`, por exemplo, não dá erro 404).

## Como os números funcionam

- **Saldo atual** = saldo inicial + entradas − saídas − tudo o que foi para a Reserva.
- **Reserva** = soma de todos os valores marcados na Meta semanal. Não é uma transação e não entra como gasto nos gráficos de categoria.
- **Semana** vai de domingo a sábado. A sugestão diária é o que falta dividido pelos dias de hoje até sábado ainda não marcados.
- **Histórico da meta:** cada depósito guarda a meta que valia no dia (coluna `goal_snapshot`), então mudar a meta em Configurações não altera o resultado das semanas já concluídas.

## Estrutura

```
supabase/schema.sql      SQL completo do banco
src/
  types/                 Tipos: Transaction, Category, SavingsDeposit, Settings
  services/              Único lugar que conversa com o Supabase
  contexts/              Sessão (AuthContext) e dados do usuário (DataContext)
  lib/                   Formatação, datas e cálculos financeiros
  components/            Layout, formulários e componentes de interface
  pages/                 Dashboard, Transações, Meta semanal, Configurações, login
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o app em modo de desenvolvimento |
| `npm run build` | Checa os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente a versão de produção |
