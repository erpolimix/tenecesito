import Link from 'next/link';
import { CATEGORIES } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

type PostSummary = {
  id: string;
  category_id: string;
  author_id: string;
};

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: openPosts, error: openPostsError } = await supabase
    .from('posts')
    .select('id, category_id, author_id')
    .eq('is_closed', false);

  if (openPostsError) {
    console.error('Error fetching open posts summary for home', openPostsError);
  }

  const safeOpenPosts = (openPosts || []) as PostSummary[];
  const totalByCategory = new Map<string, number>();

  for (const post of safeOpenPosts) {
    totalByCategory.set(post.category_id, (totalByCategory.get(post.category_id) || 0) + 1);
  }

  const pendingByCategory = new Map<string, number>();
  if (user?.id) {
    const { data: myResponses, error: myResponsesError } = await supabase
      .from('responses')
      .select('post_id')
      .eq('author_id', user.id);

    if (myResponsesError) {
      console.error('Error fetching user interactions for home summary', myResponsesError);
    }

    const interactedPostIds = new Set<string>((myResponses || []).map((r) => r.post_id));

    for (const post of safeOpenPosts) {
      if (post.author_id === user.id) {
        interactedPostIds.add(post.id);
      }
    }

    for (const post of safeOpenPosts) {
      if (!interactedPostIds.has(post.id)) {
        pendingByCategory.set(post.category_id, (pendingByCategory.get(post.category_id) || 0) + 1);
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-5 py-10 md:py-14">
      <section className="mb-10 md:mb-12">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold">Comunidad</p>
        <h1 className="font-editorial text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-[var(--tn-primary)] mt-3">
          ¿Qué necesitas
          <span className="italic text-[var(--tn-primary-soft)]"> hoy?</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[var(--tn-muted)] text-lg">
          Elige un espacio para publicar tu necesidad y recibir perspectivas de la comunidad.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map((cat, index) => {
          const Icon = cat.icon;
          const large = index === 0;
          const openCount = totalByCategory.get(cat.id) || 0;
          const pendingCount = user?.id ? (pendingByCategory.get(cat.id) || 0) : null;

          return (
            <Link
              key={cat.id}
              href={`/feed?category=${cat.id}`}
              className={`group relative overflow-hidden rounded-[28px] border border-[var(--tn-outline)]/35 p-6 md:p-8 shadow-[0_12px_40px_rgba(27,28,27,0.08)] hover:-translate-y-1 transition-transform ${large ? 'md:col-span-2' : ''} ${cat.softBg}`}
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/25 blur-xl" />

              <div className="relative flex items-start justify-between gap-6">
                <div>
                  <p className={`text-xs uppercase tracking-[0.18em] font-semibold ${cat.softText}`}>Categoría</p>
                  <h2 className="font-editorial text-4xl md:text-5xl font-bold leading-tight mt-3 text-[var(--tn-text)]">{cat.name}</h2>
                  <p className="mt-4 text-sm md:text-base font-medium text-[var(--tn-muted)]">{cat.desc}</p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="rounded-xl bg-white/55 border border-black/10 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold">Abiertas ahora</p>
                      <p className="text-2xl font-editorial font-bold text-[var(--tn-text)] leading-none mt-2">{openCount}</p>
                    </div>
                    <div className="rounded-xl bg-white/55 border border-black/10 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold">Sin tu interacción</p>
                      <p className="text-2xl font-editorial font-bold text-[var(--tn-primary)] leading-none mt-2">
                        {pendingCount !== null ? pendingCount : '—'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-white/45 border border-black/10 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                  <Icon size={26} strokeWidth={2} />
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}