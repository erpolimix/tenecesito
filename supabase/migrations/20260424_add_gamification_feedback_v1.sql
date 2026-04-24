-- V1 gamificacion: feedback de autor sobre responses + eventos + stats + badges.
-- Enfoque inicial: calidad de ayuda con etiquetas mutuamente excluyentes.

alter table if exists public.responses
add column if not exists feedback_type text,
add column if not exists feedback_at timestamptz,
add column if not exists feedback_by uuid references public.profiles(id);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'responses_feedback_type_check'
    ) then
        alter table public.responses
        add constraint responses_feedback_type_check
        check (feedback_type in ('util', 'reveladora') or feedback_type is null);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'responses_feedback_fields_consistency_check'
    ) then
        alter table public.responses
        add constraint responses_feedback_fields_consistency_check
        check (
            (feedback_type is null and feedback_at is null and feedback_by is null)
            or
            (feedback_type is not null and feedback_at is not null and feedback_by is not null)
        );
    end if;
end $$;

create index if not exists responses_post_feedback_idx
on public.responses (post_id, feedback_type, feedback_at desc);

create table if not exists public.user_gamification_stats (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    total_points integer not null default 0,
    useful_count integer not null default 0,
    revealing_count integer not null default 0,
    current_level text not null default 'Semilla',
    current_streak_days integer not null default 0,
    last_feedback_at timestamptz,
    updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    badge_key text not null,
    status text not null default 'active',
    earned_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb,
    unique (user_id, badge_key)
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'user_badges_status_check'
    ) then
        alter table public.user_badges
        add constraint user_badges_status_check
        check (status in ('active', 'inactive'));
    end if;
end $$;

create index if not exists user_badges_user_status_earned_idx
on public.user_badges (user_id, status, earned_at desc);

create table if not exists public.user_gamification_events (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    actor_user_id uuid not null references public.profiles(id) on delete cascade,
    post_id uuid not null references public.posts(id) on delete cascade,
    response_id uuid not null references public.responses(id) on delete cascade,
    feedback_type text not null,
    points integer not null,
    occurred_at timestamptz not null default now()
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'user_gamification_events_feedback_type_check'
    ) then
        alter table public.user_gamification_events
        add constraint user_gamification_events_feedback_type_check
        check (feedback_type in ('util', 'reveladora'));
    end if;
end $$;

create index if not exists user_gamification_events_user_occurred_idx
on public.user_gamification_events (user_id, occurred_at desc);

create index if not exists user_gamification_events_week_idx
on public.user_gamification_events (occurred_at desc, points);

create unique index if not exists user_gamification_events_unique_response_feedback_idx
on public.user_gamification_events (response_id);

create or replace view public.weekly_counselor_ranking as
select
    e.user_id,
    sum(e.points)::integer as weekly_points,
    count(*)::integer as feedback_count,
    count(*) filter (where e.feedback_type = 'reveladora')::integer as reveladora_count
from public.user_gamification_events e
where e.occurred_at >= date_trunc('week', timezone('utc', now()))
  and e.occurred_at < date_trunc('week', timezone('utc', now())) + interval '1 week'
group by e.user_id
order by weekly_points desc, reveladora_count desc, feedback_count desc;

alter table public.user_gamification_stats enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_gamification_events enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_gamification_stats'
          and policyname = 'Authenticated users can read gamification stats'
    ) then
        create policy "Authenticated users can read gamification stats"
        on public.user_gamification_stats
        for select
        using (auth.role() = 'authenticated');
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_badges'
          and policyname = 'Authenticated users can read badges'
    ) then
        create policy "Authenticated users can read badges"
        on public.user_badges
        for select
        using (auth.role() = 'authenticated');
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'user_gamification_events'
          and policyname = 'Authenticated users can read gamification events'
    ) then
        create policy "Authenticated users can read gamification events"
        on public.user_gamification_events
        for select
        using (auth.role() = 'authenticated');
    end if;
end $$;

create or replace function public.gamification_level_for_points(p_points integer)
returns text
language sql
immutable
as $$
    select case
        when coalesce(p_points, 0) >= 120 then 'Faro'
        when coalesce(p_points, 0) >= 60 then 'Sabio'
        when coalesce(p_points, 0) >= 30 then 'Referente'
        when coalesce(p_points, 0) >= 10 then 'Guia'
        else 'Semilla'
    end;
$$;

create or replace function public.apply_response_feedback(
    p_response_id uuid,
    p_feedback_type text
)
returns table (
    response_id uuid,
    post_id uuid,
    response_author_id uuid,
    feedback_type text,
    points_awarded integer,
    total_points integer,
    current_level text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_actor uuid := auth.uid();
    v_response record;
    v_points integer;
    v_total integer;
    v_level text;
begin
    if v_actor is null then
        raise exception 'not_authenticated';
    end if;

    if p_feedback_type not in ('util', 'reveladora') then
        raise exception 'invalid_feedback_type';
    end if;

    select r.id, r.post_id, r.author_id, r.feedback_type
    into v_response
    from public.responses r
    where r.id = p_response_id
    for update;

    if not found then
        raise exception 'response_not_found';
    end if;

    if v_response.feedback_type is not null then
        raise exception 'already_feedbacked';
    end if;

    if not exists (
        select 1
        from public.posts p
        where p.id = v_response.post_id
          and p.author_id = v_actor
    ) then
        raise exception 'forbidden';
    end if;

    v_points := case when p_feedback_type = 'reveladora' then 3 else 1 end;

    update public.responses
    set feedback_type = p_feedback_type,
        feedback_at = now(),
        feedback_by = v_actor
    where id = v_response.id;

    insert into public.user_gamification_events (
        user_id,
        actor_user_id,
        post_id,
        response_id,
        feedback_type,
        points,
        occurred_at
    )
    values (
        v_response.author_id,
        v_actor,
        v_response.post_id,
        v_response.id,
        p_feedback_type,
        v_points,
        now()
    );

    insert into public.user_gamification_stats (
        user_id,
        total_points,
        useful_count,
        revealing_count,
        last_feedback_at,
        updated_at
    )
    values (
        v_response.author_id,
        v_points,
        case when p_feedback_type = 'util' then 1 else 0 end,
        case when p_feedback_type = 'reveladora' then 1 else 0 end,
        now(),
        now()
    )
    on conflict (user_id)
    do update set
        total_points = public.user_gamification_stats.total_points + excluded.total_points,
        useful_count = public.user_gamification_stats.useful_count + excluded.useful_count,
        revealing_count = public.user_gamification_stats.revealing_count + excluded.revealing_count,
        last_feedback_at = excluded.last_feedback_at,
        updated_at = now();

    update public.user_gamification_stats
    set current_level = public.gamification_level_for_points(total_points),
        updated_at = now()
    where user_id = v_response.author_id
    returning user_gamification_stats.total_points, user_gamification_stats.current_level
    into v_total, v_level;

    response_id := v_response.id;
    post_id := v_response.post_id;
    response_author_id := v_response.author_id;
    feedback_type := p_feedback_type;
    points_awarded := v_points;
    total_points := coalesce(v_total, v_points);
    current_level := coalesce(v_level, public.gamification_level_for_points(total_points));

    return next;
end;
$$;

grant execute on function public.apply_response_feedback(uuid, text) to authenticated;
