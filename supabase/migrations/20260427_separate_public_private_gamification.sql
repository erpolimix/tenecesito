-- Separa la superficie publica de gamificacion de la privada.
-- - Stats, badges y agregados publicos viven en tablas/vistas dedicadas.
-- - Los eventos detallados y las tablas internas quedan restringidos al propio usuario.

create table if not exists public.public_gamification_profiles (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    total_points integer not null default 0,
    useful_count integer not null default 0,
    revealing_count integer not null default 0,
    current_level text not null default 'Semilla',
    current_streak_days integer not null default 0,
    updated_at timestamptz not null default now()
);

create table if not exists public.public_user_badges (
    id bigint generated always as identity primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    badge_key text not null,
    status text not null default 'active',
    earned_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb,
    unique (user_id, badge_key)
);

create table if not exists public.public_weekly_counselor_stats (
    week_start timestamptz not null,
    user_id uuid not null references public.profiles(id) on delete cascade,
    weekly_points integer not null default 0,
    feedback_count integer not null default 0,
    reveladora_count integer not null default 0,
    updated_at timestamptz not null default now(),
    primary key (week_start, user_id)
);

create table if not exists public.public_category_feedback_stats (
    category_id text not null,
    user_id uuid not null references public.profiles(id) on delete cascade,
    reveladora_count integer not null default 0,
    total_feedback_count integer not null default 0,
    total_points_in_category integer not null default 0,
    updated_at timestamptz not null default now(),
    primary key (category_id, user_id)
);

create index if not exists public_user_badges_user_status_earned_idx
on public.public_user_badges (user_id, status, earned_at desc);

create index if not exists public_weekly_counselor_stats_week_points_idx
on public.public_weekly_counselor_stats (week_start, weekly_points desc, reveladora_count desc);

create index if not exists public_category_feedback_stats_category_points_idx
on public.public_category_feedback_stats (category_id, reveladora_count desc, total_feedback_count desc);

insert into public.public_gamification_profiles (
    user_id,
    total_points,
    useful_count,
    revealing_count,
    current_level,
    current_streak_days,
    updated_at
)
select
    user_id,
    total_points,
    useful_count,
    revealing_count,
    current_level,
    current_streak_days,
    updated_at
from public.user_gamification_stats
on conflict (user_id) do update set
    total_points = excluded.total_points,
    useful_count = excluded.useful_count,
    revealing_count = excluded.revealing_count,
    current_level = excluded.current_level,
    current_streak_days = excluded.current_streak_days,
    updated_at = excluded.updated_at;

insert into public.public_user_badges (
    user_id,
    badge_key,
    status,
    earned_at,
    metadata
)
select
    user_id,
    badge_key,
    status,
    earned_at,
    metadata
from public.user_badges
on conflict (user_id, badge_key) do update set
    status = excluded.status,
    earned_at = excluded.earned_at,
    metadata = excluded.metadata;

insert into public.public_weekly_counselor_stats (
    week_start,
    user_id,
    weekly_points,
    feedback_count,
    reveladora_count,
    updated_at
)
select
    date_trunc('week', timezone('utc', e.occurred_at)) as week_start,
    e.user_id,
    sum(e.points)::integer as weekly_points,
    count(*)::integer as feedback_count,
    count(*) filter (where e.feedback_type = 'reveladora')::integer as reveladora_count,
    now()
from public.user_gamification_events e
group by 1, 2
on conflict (week_start, user_id) do update set
    weekly_points = excluded.weekly_points,
    feedback_count = excluded.feedback_count,
    reveladora_count = excluded.reveladora_count,
    updated_at = excluded.updated_at;

insert into public.public_category_feedback_stats (
    category_id,
    user_id,
    reveladora_count,
    total_feedback_count,
    total_points_in_category,
    updated_at
)
select
    p.category_id,
    e.user_id,
    count(*) filter (where e.feedback_type = 'reveladora')::integer as reveladora_count,
    count(*)::integer as total_feedback_count,
    sum(e.points)::integer as total_points_in_category,
    now()
from public.user_gamification_events e
join public.responses r on r.id = e.response_id
join public.posts p on p.id = r.post_id
where p.category_id is not null
group by p.category_id, e.user_id
on conflict (category_id, user_id) do update set
    reveladora_count = excluded.reveladora_count,
    total_feedback_count = excluded.total_feedback_count,
    total_points_in_category = excluded.total_points_in_category,
    updated_at = excluded.updated_at;

drop policy if exists "Authenticated users can read gamification stats" on public.user_gamification_stats;
drop policy if exists "Authenticated users can read badges" on public.user_badges;
drop policy if exists "Authenticated users can read gamification events" on public.user_gamification_events;

create policy "Users can read own gamification stats"
on public.user_gamification_stats
for select
using (auth.uid() = user_id);

create policy "Users can read own badges"
on public.user_badges
for select
using (auth.uid() = user_id);

create policy "Users can read own gamification events"
on public.user_gamification_events
for select
using (auth.uid() = user_id);

alter table public.public_gamification_profiles enable row level security;
alter table public.public_user_badges enable row level security;
alter table public.public_weekly_counselor_stats enable row level security;
alter table public.public_category_feedback_stats enable row level security;

create policy "Public can read public gamification profiles"
on public.public_gamification_profiles
for select
using (true);

create policy "Public can read public user badges"
on public.public_user_badges
for select
using (true);

create policy "Public can read public weekly counselor stats"
on public.public_weekly_counselor_stats
for select
using (true);

create policy "Public can read public category feedback stats"
on public.public_category_feedback_stats
for select
using (true);

create or replace view public.weekly_counselor_ranking as
select
    user_id,
    weekly_points,
    feedback_count,
    reveladora_count
from public.public_weekly_counselor_stats
where week_start = date_trunc('week', timezone('utc', now()))
order by weekly_points desc, reveladora_count desc, feedback_count desc;

alter view public.weekly_counselor_ranking set (security_invoker = true);
grant select on public.weekly_counselor_ranking to authenticated, anon;

create or replace view public.category_specialists as
select distinct on (category_id)
    category_id,
    user_id,
    reveladora_count,
    total_feedback_count,
    total_points_in_category
from public.public_category_feedback_stats
order by category_id, reveladora_count desc, total_feedback_count desc, total_points_in_category desc;

alter view public.category_specialists set (security_invoker = true);
grant select on public.category_specialists to authenticated, anon;

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
    v_week_start timestamptz := date_trunc('week', timezone('utc', now()));
begin
    if v_actor is null then
        raise exception 'not_authenticated';
    end if;

    if p_feedback_type not in ('util', 'reveladora') then
        raise exception 'invalid_feedback_type';
    end if;

    select r.id, r.post_id, r.author_id, r.feedback_type, p.category_id
    into v_response
    from public.responses r
    join public.posts p on p.id = r.post_id
    where r.id = p_response_id
    for update of r;

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

    insert into public.profiles (id)
    values (v_actor), (v_response.author_id)
    on conflict (id) do nothing;

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

    update public.user_gamification_stats as s
    set current_level = public.gamification_level_for_points(s.total_points),
        updated_at = now()
    where s.user_id = v_response.author_id
    returning s.total_points, s.current_level
    into v_total, v_level;

    insert into public.public_gamification_profiles (
        user_id,
        total_points,
        useful_count,
        revealing_count,
        current_level,
        current_streak_days,
        updated_at
    )
    select
        s.user_id,
        s.total_points,
        s.useful_count,
        s.revealing_count,
        s.current_level,
        s.current_streak_days,
        now()
    from public.user_gamification_stats s
    where s.user_id = v_response.author_id
    on conflict (user_id)
    do update set
        total_points = excluded.total_points,
        useful_count = excluded.useful_count,
        revealing_count = excluded.revealing_count,
        current_level = excluded.current_level,
        current_streak_days = excluded.current_streak_days,
        updated_at = excluded.updated_at;

    insert into public.public_weekly_counselor_stats (
        week_start,
        user_id,
        weekly_points,
        feedback_count,
        reveladora_count,
        updated_at
    )
    values (
        v_week_start,
        v_response.author_id,
        v_points,
        1,
        case when p_feedback_type = 'reveladora' then 1 else 0 end,
        now()
    )
    on conflict (week_start, user_id)
    do update set
        weekly_points = public.public_weekly_counselor_stats.weekly_points + excluded.weekly_points,
        feedback_count = public.public_weekly_counselor_stats.feedback_count + excluded.feedback_count,
        reveladora_count = public.public_weekly_counselor_stats.reveladora_count + excluded.reveladora_count,
        updated_at = now();

    if v_response.category_id is not null then
        insert into public.public_category_feedback_stats (
            category_id,
            user_id,
            reveladora_count,
            total_feedback_count,
            total_points_in_category,
            updated_at
        )
        values (
            v_response.category_id,
            v_response.author_id,
            case when p_feedback_type = 'reveladora' then 1 else 0 end,
            1,
            v_points,
            now()
        )
        on conflict (category_id, user_id)
        do update set
            reveladora_count = public.public_category_feedback_stats.reveladora_count + excluded.reveladora_count,
            total_feedback_count = public.public_category_feedback_stats.total_feedback_count + excluded.total_feedback_count,
            total_points_in_category = public.public_category_feedback_stats.total_points_in_category + excluded.total_points_in_category,
            updated_at = now();
    end if;

    response_id := v_response.id;
    post_id := v_response.post_id;
    response_author_id := v_response.author_id;
    feedback_type := p_feedback_type;
    points_awarded := v_points;
    total_points := coalesce(v_total, v_points);
    current_level := coalesce(v_level, public.gamification_level_for_points(coalesce(v_total, v_points)));

    return next;
end;
$$;

grant execute on function public.apply_response_feedback(uuid, text) to authenticated;
