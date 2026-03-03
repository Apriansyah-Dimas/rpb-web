-- Allow dynamic categories on rpb_other_items (not limited to Blower/Motor/Rotor).
-- Run once in Supabase SQL Editor.

do $$
declare
  category_check_name text;
begin
  -- Drop old category check constraints (for example: category in ('Blower','Motor','Rotor')).
  for category_check_name in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.rpb_other_items'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%category%'
  loop
    execute format('alter table public.rpb_other_items drop constraint %I', category_check_name);
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.rpb_other_items'::regclass
      and conname = 'rpb_other_items_category_not_blank'
  ) then
    alter table public.rpb_other_items
      add constraint rpb_other_items_category_not_blank
      check (length(btrim(category)) > 0);
  end if;
end $$;
