-- Índices para as chaves compostas que amarram a categoria ao dono
-- (apontados pelo relatório de desempenho do Supabase).
create index if not exists transactions_category_owner_idx on public.transactions (category_id, user_id);
create index if not exists recurring_transactions_category_owner_idx on public.recurring_transactions (category_id, user_id);
