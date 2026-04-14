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
    <div className="max-w-6xl mx-auto px-4 pb-12 pt-8 md:pb-14 md:pt-10">
      <section className="mb-12 text-center md:text-left">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold mb-2">Comunidad</p>
        <h1 className="font-editorial text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-[#5d3d2e] mt-4 md:mt-5">
          ¿Qué necesitas
          <span className="italic text-[var(--tn-primary-soft)]"> hoy?</span>
        </h1>
        <p className="mt-5 max-w-2xl mx-auto md:mx-0 text-[var(--tn-muted)] text-lg leading-[1.65]">
          Elige un espacio para publicar tu necesidad y recibir perspectivas de la comunidad.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3">
          <Link
            href="/feed"
            className="tn-button-primary inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold shadow-sm"
          >
            Explorar necesidades
          </Link>
          <Link
            href="/comunidad"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-[#eadfd6] text-sm font-semibold text-[var(--tn-text)] hover:border-[#d4b7a7] transition-colors"
          >
            Ver panel de Comunidad
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {CATEGORIES.map((cat, index) => {
          const Icon = cat.icon;
          const large = index === 0;
          const openCount = totalByCategory.get(cat.id) || 0;
          const pendingCount = user?.id ? (pendingByCategory.get(cat.id) || 0) : null;

          return (
            <Link
              key={cat.id}
              href={`/feed?category=${cat.id}`}
              className={`group relative overflow-hidden rounded-[28px] border border-[#efe2d8] bg-white p-6 md:p-8 tn-card-shadow hover:border-[#e5c9b7] transition-all ${large ? 'md:col-span-2' : ''}`}
            >
              <div className={`absolute -right-12 -top-12 w-36 h-36 rounded-full blur-3xl opacity-80 ${cat.softBg}`} />

              <div className="relative flex items-start justify-between gap-6">
                <div>
                  <span className={`inline-flex px-3 py-1 rounded-md text-[10px] uppercase tracking-[0.18em] font-bold ${cat.softBg} ${cat.softText}`}>{cat.name}</span>
                  <h2 className="font-editorial text-4xl md:text-5xl font-bold leading-[1.02] mt-4 text-[var(--tn-text)]">{cat.name}</h2>
                  <p className="mt-4 text-sm md:text-base font-medium text-[var(--tn-muted)] leading-[1.65] max-w-xl">{cat.desc}</p>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[#fcf8f4] border border-[#f0e6de] px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold">Abiertas ahora</p>
                      <p className="text-2xl font-editorial font-bold text-[var(--tn-text)] leading-none mt-2">{openCount}</p>
                    </div>
                    <div className="rounded-2xl bg-[#fcf8f4] border border-[#f0e6de] px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold">Sin tu interacción</p>
                      <p className="text-2xl font-editorial font-bold text-[var(--tn-primary)] leading-none mt-2">
                        {pendingCount !== null ? pendingCount : '—'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#fcf2eb] border border-[#f0e1d5] flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform text-[var(--tn-primary)]">
                  <Icon size={24} strokeWidth={2} />
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}