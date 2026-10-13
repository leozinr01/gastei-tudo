-- =====================================================================
-- Finanças Pessoais — schema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode ser executado mais de uma vez sem causar erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name     text not null check (char_length(trim(name)) > 0),
  color    text not null default '#22c55e',
  type     text not null check (type in ('income', 'expense'))
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12,2) not null check (amount > 0),
  description text not null default '',
  category_id uuid references public.categories (id) on delete set null,
  date        date not null,
  created_at  timestamptz not null default now()
);

-- Um registro por dia em que o usuário guardou dinheiro.
-- goal_snapshot e goal_period_snapshot guardam a meta e o período (dia, semana,
-- quinzena ou mês) vigentes no momento do depósito, para que o histórico não mude
-- quando a meta for alterada depois.
create table if not exists public.savings_deposits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null,
  amount        numeric(12,2) not null check (amount > 0),
  goal_snapshot numeric(12,2),
  goal_period_snapshot text check (goal_period_snapshot in ('daily', 'weekly', 'biweekly', 'monthly')),
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Valor da meta por período (o nome da coluna vem de quando a meta era só semanal).
  weekly_goal     numeric(12,2) not null default 300 check (weekly_goal >= 0),
  goal_period     text not null default 'weekly' check (goal_period in ('daily', 'weekly', 'biweekly', 'monthly')),
  initial_balance numeric(12,2) not null default 0
);

-- Uma transação só pode usar categoria do mesmo usuário. A chave composta
-- vale mesmo para quem tenta apontar para o id de uma categoria alheia.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'categories_id_user_id_key') then
    alter table public.categories
      add constraint categories_id_user_id_key unique (id, user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_category_owner_fkey') then
    alter table public.transactions
      add constraint transactions_category_owner_fkey
      foreign key (category_id, user_id) references public.categories (id, user_id)
      on delete set null (category_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index if not exists categories_user_id_idx        on public.categories (user_id);
create index if not exists transactions_user_id_idx      on public.transactions (user_id);
create index if not exists transactions_date_idx         on public.transactions (date);
create index if not exists transactions_user_date_idx    on public.transactions (user_id, date desc);
create index if not exists transactions_category_id_idx  on public.transactions (category_id);
create index if not exists savings_deposits_user_id_idx  on public.savings_deposits (user_id);
create index if not exists savings_deposits_date_idx     on public.savings_deposits (date);

-- ---------------------------------------------------------------------
-- Row Level Security: cada usuário só enxerga e altera os próprios dados
-- ---------------------------------------------------------------------
alter table public.categories       enable row level security;
alter table public.transactions     enable row level security;
alter table public.savings_deposits enable row level security;
alter table public.settings         enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'transactions', 'savings_deposits', 'settings'] loop
    execute format('drop policy if exists "%1$s_select_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$I', t);

    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Dados padrão de cada usuário (configurações + categorias)
-- ---------------------------------------------------------------------
create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.categories where user_id = p_user_id) then
    insert into public.categories (user_id, name, color, type) values
      (p_user_id, 'Salário',     '#22c55e', 'income'),
      (p_user_id, 'Freelance',   '#14b8a6', 'income'),
      (p_user_id, 'Outros',      '#a3a3a3', 'income'),
      (p_user_id, 'Mercado',     '#eab308', 'expense'),
      (p_user_id, 'Alimentação', '#f97316', 'expense'),
      (p_user_id, 'Transporte',  '#3b82f6', 'expense'),
      (p_user_id, 'Moradia',     '#8b5cf6', 'expense'),
      (p_user_id, 'Lazer',       '#ec4899', 'expense'),
      (p_user_id, 'Outros',      '#737373', 'expense');
  end if;
end;
$$;

-- Função interna: ninguém a chama diretamente pela API.
revoke all on function public.seed_user_defaults(uuid) from public, anon, authenticated;

-- Trigger: ao criar a conta, gera settings e categorias padrão.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- "Apagar todos os meus dados": remove tudo do usuário logado e
-- recria as configurações e categorias padrão, em uma única transação.
-- ---------------------------------------------------------------------
create or replace function public.reset_user_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Usuário não autenticado';
  end if;

  delete from public.transactions     where user_id = uid;
  delete from public.savings_deposits where user_id = uid;
  delete from public.categories       where user_id = uid;
  delete from public.settings         where user_id = uid;

  perform public.seed_user_defaults(uid);
end;
$$;

revoke all on function public.reset_user_data() from public, anon;
grant execute on function public.reset_user_data() to authenticated;

-- ---------------------------------------------------------------------
-- Contas criadas ANTES de rodar este arquivo também recebem os padrões
-- ---------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.seed_user_defaults(u.id);
  end loop;
end $$;
