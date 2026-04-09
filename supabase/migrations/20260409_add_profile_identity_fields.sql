alter table if exists public.profiles
add column if not exists display_name text,
add column if not exists avatar_url text;
