alter table if exists public.posts
add column if not exists priority_level text not null default 'normal',
add column if not exists urgent_until timestamptz,
add column if not exists urgent_activated_at timestamptz;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'posts_priority_level_check'
    ) then
        alter table public.posts
        add constraint posts_priority_level_check
        check (priority_level in ('normal', 'urgent'));
    end if;
end $$;

create index if not exists posts_priority_active_idx
on public.posts (priority_level, urgent_until, is_closed, created_at desc);

create index if not exists posts_author_priority_created_idx
on public.posts (author_id, priority_level, created_at desc);