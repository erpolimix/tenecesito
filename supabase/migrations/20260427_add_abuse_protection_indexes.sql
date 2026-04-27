-- Indices para consultas de antiflood y actividad reciente.

create index if not exists posts_author_created_at_idx
on public.posts (author_id, created_at desc);

create index if not exists responses_author_created_at_idx
on public.responses (author_id, created_at desc);

create index if not exists user_gamification_events_actor_occurred_at_idx
on public.user_gamification_events (actor_user_id, occurred_at desc);
