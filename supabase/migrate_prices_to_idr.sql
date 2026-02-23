-- One-time migration for existing database that already uses *_usd columns.
-- Run this in Supabase SQL Editor before using the updated IDR-only app code.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rpb_profile_items'
      and column_name = 'price_usd_30'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rpb_profile_items'
      and column_name = 'price_idr_30'
  ) then
    alter table public.rpb_profile_items rename column price_usd_30 to price_idr_30;
    alter table public.rpb_profile_items rename column price_usd_45 to price_idr_45;
    update public.rpb_profile_items
    set price_idr_30 = round((price_idr_30 * 16900)::numeric, 2),
        price_idr_45 = round((price_idr_45 * 16900)::numeric, 2);
    alter table public.rpb_profile_items
      alter column price_idr_30 type numeric(18, 2) using round(price_idr_30::numeric, 2),
      alter column price_idr_45 type numeric(18, 2) using round(price_idr_45::numeric, 2);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rpb_konstruksi_items'
      and column_name = 'unit_price_usd'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rpb_konstruksi_items'
      and column_name = 'unit_price_idr'
  ) then
    alter table public.rpb_konstruksi_items rename column unit_price_usd to unit_price_idr;
    update public.rpb_konstruksi_items
    set unit_price_idr = round((unit_price_idr * 16900)::numeric, 2);
    alter table public.rpb_konstruksi_items
      alter column unit_price_idr type numeric(18, 2) using round(unit_price_idr::numeric, 2);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rpb_other_items'
      and column_name = 'price_usd'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rpb_other_items'
      and column_name = 'price_idr'
  ) then
    alter table public.rpb_other_items rename column price_usd to price_idr;
    update public.rpb_other_items
    set price_idr = round((price_idr * 16900)::numeric, 2);
    alter table public.rpb_other_items
      alter column price_idr type numeric(18, 2) using round(price_idr::numeric, 2);
  end if;
end $$;

-- Convert old saved snapshots custom items from hargaUsd -> hargaIdr (if any)
update public.rpb_saved_summaries s
set snapshot_json = jsonb_set(
  s.snapshot_json,
  '{customOtherItems}',
  coalesce(
    (
      select jsonb_agg(
        case
          when item ? 'hargaUsd' and not (item ? 'hargaIdr') then
            (item - 'hargaUsd')
            || jsonb_build_object(
              'hargaIdr',
              round(((item->>'hargaUsd')::numeric * 16900)::numeric, 2)
            )
          else item
        end
      )
      from jsonb_array_elements(coalesce(s.snapshot_json->'customOtherItems', '[]'::jsonb)) item
    ),
    '[]'::jsonb
  ),
  true
)
where s.snapshot_json ? 'customOtherItems';

-- Optional cleanup (legacy, no longer used by app):
-- drop table if exists public.rpb_settings;
