-- Período da meta: a pessoa escolhe guardar por dia, semana, quinzena ou mês.
-- Só acrescenta colunas; os dados existentes continuam como meta semanal.
alter table public.settings
  add column if not exists goal_period text not null default 'weekly'
  check (goal_period in ('daily', 'weekly', 'biweekly', 'monthly'));

alter table public.savings_deposits
  add column if not exists goal_period_snapshot text
  check (goal_period_snapshot in ('daily', 'weekly', 'biweekly', 'monthly'));
