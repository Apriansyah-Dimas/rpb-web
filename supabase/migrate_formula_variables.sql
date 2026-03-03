-- One-time migration for formula variable settings used by admin configuration.
-- Run this in Supabase SQL Editor after the IDR migration.

create table if not exists public.rpb_formula_variables (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('profile', 'konstruksi')),
  key text not null,
  label text not null,
  default_value numeric(18, 4) not null default 0,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section, key)
);

drop trigger if exists trg_rpb_formula_variables_updated_at on public.rpb_formula_variables;
create trigger trg_rpb_formula_variables_updated_at
before update on public.rpb_formula_variables
for each row execute function public.set_updated_at();

alter table public.rpb_formula_variables enable row level security;

drop policy if exists "rpb_formula_variables_select" on public.rpb_formula_variables;
create policy "rpb_formula_variables_select"
on public.rpb_formula_variables for select
to authenticated
using (true);

drop policy if exists "rpb_formula_variables_admin_write" on public.rpb_formula_variables;
create policy "rpb_formula_variables_admin_write"
on public.rpb_formula_variables for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.rpb_formula_variables
  (section, key, label, default_value, is_default, sort_order)
values
  ('profile', 'width', 'Width', 0, true, 1),
  ('profile', 'length', 'Length', 0, true, 2),
  ('profile', 'height', 'Height', 0, true, 3),
  ('konstruksi', 'width', 'Width', 0, true, 1),
  ('konstruksi', 'length', 'Length', 0, true, 2),
  ('konstruksi', 'height', 'Height', 0, true, 3)
on conflict (section, key) do nothing;
