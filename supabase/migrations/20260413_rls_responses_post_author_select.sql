-- Permite al autor de un post leer las respuestas recibidas en sus posts.
-- Sin esta política, Supabase Realtime no entrega los eventos INSERT de responses
-- al autor del post porque la fila pertenece al autor de la respuesta (otro usuario).
create policy "Post authors can read responses to their posts"
on public.responses
for select
using (
    post_id in (
        select id
        from public.posts
        where author_id = auth.uid()
    )
);
