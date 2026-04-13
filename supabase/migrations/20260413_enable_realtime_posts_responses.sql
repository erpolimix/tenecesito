-- Habilita realtime para eventos de posts y responses en Supabase.
-- Replica identity FULL mejora payloads de UPDATE/DELETE para sincronizaciones cliente.
alter table if exists public.posts replica identity full;
alter table if exists public.responses replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.responses;
exception
  when duplicate_object then null;
end
$$;
