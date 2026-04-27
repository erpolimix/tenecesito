-- Vista de especialistas destacados por categoria.
-- Para cada categoria devuelve el usuario con mas valoraciones "reveladora".
-- Se usa en el panel comunitario.

create or replace view public.category_specialists as
select distinct on (p.category_id)
    p.category_id,
    e.user_id,
    count(*) filter (where e.feedback_type = 'reveladora')::integer as reveladora_count,
    count(*)::integer as total_feedback_count,
    sum(e.points)::integer as total_points_in_category
from public.user_gamification_events e
join public.responses r on r.id = e.response_id
join public.posts p on p.id = r.post_id
where p.category_id is not null
group by p.category_id, e.user_id
order by p.category_id, reveladora_count desc, total_feedback_count desc;

grant select on public.category_specialists to authenticated, anon;
