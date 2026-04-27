-- Ajuste de negocio: permitir valorar cada respuesta individual.
-- Se elimina el bloqueo global de una sola valoracion por post.

drop index if exists public.responses_one_feedback_per_post_idx;

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
