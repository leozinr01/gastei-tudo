-- Limite mensal por categoria e transações que se repetem todo mês.
-- Só acrescenta colunas e uma tabela; os dados existentes não mudam.

-- Quanto a pessoa quer gastar por mês na categoria (vazio = sem limite).
alter table public.categories
  add column if not exists monthly_limit numeric(12,2) check (monthly_limit > 0);

-- Modelo de uma transação que se repete todo mês, no dia escolhido.
-- last_date é o último vencimento já lançado; o app lança os seguintes ao abrir.
create table if not exists public.recurring_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type         text not null check (type in ('income', 'expense')),
  amount       numeric(12,2) not null check (amount > 0),
  description  text not null default '',
  category_id  uuid,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  last_date    date,
  created_at   timestamptz not null default now(),
  constraint recurring_category_owner_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id)
);

create index if not exists recurring_transactions_user_id_idx on public.recurring_transactions (user_id);

-- A transação lançada aponta para o modelo de origem. O índice único impede que
-- o mesmo vencimento seja lançado duas vezes (dois aparelhos abertos ao mesmo tempo).
alter table public.transactions
  add column if not exists recurring_id uuid references public.recurring_transactions (id) on delete set null;

create unique index if not exists transactions_recurring_once_idx
  on public.transactions (recurring_id, date);

alter table public.recurring_transactions enable row level security;

drop policy if exists "recurring_transactions_select_own" on public.recurring_transactions;
drop policy if exists "recurring_transactions_insert_own" on public.recurring_transactions;
drop policy if exists "recurring_transactions_update_own" on public.recurring_transactions;
drop policy if exists "recurring_transactions_delete_own" on public.recurring_transactions;

create policy "recurring_transactions_select_own" on public.recurring_transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "recurring_transactions_insert_own" on public.recurring_transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "recurring_transactions_update_own" on public.recurring_transactions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "recurring_transactions_delete_own" on public.recurring_transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

-- "Apagar todos os meus dados" passa a apagar também as transações recorrentes.
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

  delete from public.transactions           where user_id = uid;
  delete from public.recurring_transactions where user_id = uid;
  delete from public.savings_deposits       where user_id = uid;
  delete from public.categories             where user_id = uid;
  delete from public.settings               where user_id = uid;

  perform public.seed_user_defaults(uid);
end;
$$;

revoke all on function public.reset_user_data() from public, anon;
grant execute on function public.reset_user_data() to authenticated;
