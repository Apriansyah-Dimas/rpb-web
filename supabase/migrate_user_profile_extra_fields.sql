alter table public.user_profiles
  add column if not exists username text;

alter table public.user_profiles
  add column if not exists full_name text;

alter table public.user_profiles
  add column if not exists phone_number text;

update public.user_profiles
set
  username = coalesce(username, ''),
  full_name = coalesce(full_name, ''),
  phone_number = coalesce(phone_number, '')
where username is null or full_name is null or phone_number is null;

alter table public.user_profiles
  alter column username set default '',
  alter column full_name set default '',
  alter column phone_number set default '';

alter table public.user_profiles
  alter column username set not null,
  alter column full_name set not null,
  alter column phone_number set not null;
