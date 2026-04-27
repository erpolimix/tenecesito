create table if not exists public.security_rate_limit_buckets (
    bucket_key text primary key,
    action_name text not null,
    subject_scope text not null check (subject_scope in ('ip', 'user')),
    subject_hash text not null,
    bucket_start timestamptz not null,
    hits integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists security_rate_limit_action_subject_bucket_idx
on public.security_rate_limit_buckets (action_name, subject_scope, subject_hash, bucket_start desc);

alter table public.security_rate_limit_buckets enable row level security;

create or replace function public.enforce_rate_limit(
    p_action_name text,
    p_subject_scope text,
    p_subject_hash text,
    p_window_seconds integer,
    p_max_hits integer
)
returns table (
    allowed boolean,
    hit_count integer,
    retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_bucket_start timestamptz;
    v_bucket_key text;
    v_hit_count integer;
    v_retry_after integer := 0;
begin
    if coalesce(trim(p_action_name), '') = '' then
        raise exception 'invalid_action_name';
    end if;

    if p_subject_scope not in ('ip', 'user') then
        raise exception 'invalid_subject_scope';
    end if;

    if coalesce(trim(p_subject_hash), '') = '' then
        raise exception 'invalid_subject_hash';
    end if;

    if p_window_seconds is null or p_window_seconds < 1 then
        raise exception 'invalid_window_seconds';
    end if;

    if p_max_hits is null or p_max_hits < 1 then
        raise exception 'invalid_max_hits';
    end if;

    v_bucket_start := to_timestamp(floor(extract(epoch from timezone('utc', now())) / p_window_seconds) * p_window_seconds);
    v_bucket_key := concat(
        p_action_name,
        ':',
        p_subject_scope,
        ':',
        p_subject_hash,
        ':',
        floor(extract(epoch from v_bucket_start))::bigint
    );

    insert into public.security_rate_limit_buckets (
        bucket_key,
        action_name,
        subject_scope,
        subject_hash,
        bucket_start,
        hits,
        created_at,
        updated_at
    )
    values (
        v_bucket_key,
        p_action_name,
        p_subject_scope,
        p_subject_hash,
        v_bucket_start,
        1,
        now(),
        now()
    )
    on conflict (bucket_key)
    do update set
        hits = public.security_rate_limit_buckets.hits + 1,
        updated_at = now()
    returning public.security_rate_limit_buckets.hits
    into v_hit_count;

    delete from public.security_rate_limit_buckets
    where updated_at < now() - interval '2 days';

    if v_hit_count > p_max_hits then
        v_retry_after := greatest(
            1,
            ceil(extract(epoch from ((v_bucket_start + make_interval(secs => p_window_seconds)) - now())))::integer
        );
    end if;

    allowed := v_hit_count <= p_max_hits;
    hit_count := v_hit_count;
    retry_after_seconds := case when allowed then 0 else v_retry_after end;
    return next;
end;
$$;

grant execute on function public.enforce_rate_limit(text, text, text, integer, integer) to anon, authenticated;
