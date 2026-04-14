import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import { attachAuthorProfiles } from '@/lib/post-authors';

type PostRow = {
    id: string;
    title: string;
    content: string;
    category_id: string;
    is_closed: boolean;
    author_id: string;
    created_at: string;
    responses?: { count: number }[];
};

type ProfileRow = {
    id: string;
    display_name?: string | null;
    avatar_url?: string | null;
};

function excerpt(text?: string, max = 150) {
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
}

function categoryName(categoryId?: string) {
    return CATEGORIES.find((c) => c.id === categoryId)?.name || 'Comunidad';
}

function formatCount(value: number) {
    return new Intl.NumberFormat('es-ES').format(value);
}

function safeAuthorName(profile: ProfileRow | undefined, userId: string) {
    if (profile?.display_name && profile.display_name.trim().length > 0) {
        return profile.display_name;
    }
    return `Usuario ${userId.slice(0, 6)}`;
}

export default async function ComunidadPage() {
    const supabase = await createClient();

    const [
        { count: totalShared },
        { count: totalAttended },
        { data: postsWithInteraction, error: postsError },
        { data: postAuthors, error: postAuthorsError },
        { data: responseAuthors, error: responseAuthorsError },
    ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_closed', true),
        supabase
            .from('posts')
            .select('id, title, content, category_id, is_closed, author_id, created_at, responses(count)')
            .order('created_at', { ascending: false })
            .limit(120),
        supabase.from('posts').select('author_id').limit(1500),
        supabase.from('responses').select('author_id').limit(3000),
    ]);

    if (postsError) {
        console.error('Error fetching community highlighted posts', postsError);
    }
    if (postAuthorsError) {
        console.error('Error fetching community post authors', postAuthorsError);
    }
    if (responseAuthorsError) {
        console.error('Error fetching community response authors', responseAuthorsError);
    }

    const safePosts = await attachAuthorProfiles(supabase, (postsWithInteraction || []) as PostRow[]);
    const postInteractions = safePosts.map((post) => ({
        ...post,
        interactionCount: post.responses?.[0]?.count || 0,
    }));

    const featuredPosts = [...postInteractions]
        .sort((a, b) => b.interactionCount - a.interactionCount)
        .slice(0, 3);

    const topInteractedNeeds = [...postInteractions]
        .sort((a, b) => b.interactionCount - a.interactionCount)
        .slice(0, 6);

    const activityByUser = new Map<string, number>();
    for (const row of postAuthors || []) {
        if (!row.author_id) continue;
        activityByUser.set(row.author_id, (activityByUser.get(row.author_id) || 0) + 1);
    }
    for (const row of responseAuthors || []) {
        if (!row.author_id) continue;
        activityByUser.set(row.author_id, (activityByUser.get(row.author_id) || 0) + 1);
    }

    const topUsers = Array.from(activityByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id, score]) => ({ id, score }));

    const profileIds = topUsers.map((u) => u.id);
    let profilesById = new Map<string, ProfileRow>();

    if (profileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', profileIds);

        if (profilesError) {
            console.error('Error fetching community profiles', profilesError);
            const fallback = await supabase
                .from('profiles')
                .select('id')
                .in('id', profileIds);
            profilesById = new Map((fallback.data || []).map((p: { id: string }) => [p.id, p]));
        } else {
            profilesById = new Map(((profiles || []) as ProfileRow[]).map((p) => [p.id, p]));
        }
    }

    return (
        <main className="max-w-6xl mx-auto px-5 md:px-6 pt-10 pb-24 space-y-14 animate-in fade-in duration-300">
            <section className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold">Comunidad</p>
                <h1 className="font-editorial text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-[var(--tn-primary)] mt-3">
                    Panel Comunitario
                </h1>
                <p className="mt-5 text-lg md:text-xl text-[var(--tn-muted)] leading-relaxed">
                    Lo mas destacado de la comunidad: impacto, voces activas y necesidades con mayor movimiento.
                </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-[#f5f3f1] rounded-lg p-8 md:p-10 border border-[var(--tn-outline)]/20">
                    <h2 className="font-editorial text-3xl text-[var(--tn-primary)] mb-1">Impacto comunitario</h2>
                    <p className="text-[var(--tn-muted)] italic">El pulso actual de la red de apoyo.</p>

                    <div className="grid grid-cols-2 gap-6 mt-10">
                        <div>
                            <p className="font-editorial text-5xl text-[var(--tn-primary)]">{formatCount(totalShared || 0)}</p>
                            <p className="text-xs uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold mt-2">necesidades compartidas</p>
                        </div>
                        <div>
                            <p className="font-editorial text-5xl text-[var(--tn-primary)]">{formatCount(totalAttended || 0)}</p>
                            <p className="text-xs uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold mt-2">necesidades atendidas</p>
                        </div>
                    </div>
                </div>

                <div className="relative bg-[#d5e3d7] rounded-lg overflow-hidden p-7 border border-[#c7dfcc] min-h-[220px]">
                    <div className="absolute -right-12 -bottom-12 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
                    <div className="relative z-10">
                        <p className="text-xs uppercase tracking-[0.15em] font-semibold text-[#4f6353]">Destacado</p>
                        <h3 className="font-editorial text-3xl leading-tight text-[#425649] mt-3">Comunidad en movimiento</h3>
                        <p className="text-sm text-[#4f6353] mt-4">
                            Las necesidades con mas respuestas muestran donde hay mayor escucha activa hoy.
                        </p>
                    </div>
                </div>
            </section>

            <section>
                <div className="flex items-end justify-between mb-8">
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)]">Lo mas destacado</h2>
                    <Link href="/feed" className="text-sm font-semibold text-[var(--tn-primary)] hover:opacity-80 transition-opacity">Ver feed completo</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {featuredPosts.length > 0 ? featuredPosts.map((post) => (
                        <Link key={post.id} href={`/post/${post.id}`} className="bg-white/80 border border-[var(--tn-outline)]/25 rounded-2xl p-6 hover:-translate-y-1 transition-transform">
                            <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[var(--tn-muted)]">{categoryName(post.category_id)}</p>
                            <h3 className="font-editorial text-2xl leading-tight mt-3 text-[var(--tn-text)]">{post.title}</h3>
                            <p className="text-sm text-[var(--tn-muted)] mt-4 line-height-editorial">{excerpt(post.content, 120)}</p>
                            <div className="mt-5 flex items-center gap-3">
                                {post.author_avatar_url ? (
                                    <img src={post.author_avatar_url} alt={`Avatar de ${post.author_name}`} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold">
                                        {post.author_name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <p className="text-sm font-medium text-[var(--tn-text)] truncate">Publicado por {post.author_name}</p>
                            </div>
                            <p className="mt-5 text-sm font-semibold text-[var(--tn-primary)]">{post.interactionCount} interacciones</p>
                        </Link>
                    )) : (
                        <div className="md:col-span-3 bg-white/75 border border-[var(--tn-outline)]/25 rounded-2xl p-8 text-center text-[var(--tn-muted)]">Todavia no hay suficientes datos para destacados.</div>
                    )}
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)] mb-6">Usuarios con mas actividad</h2>
                    <div className="space-y-4">
                        {topUsers.length > 0 ? topUsers.map((user) => {
                            const profile = profilesById.get(user.id);
                            const name = safeAuthorName(profile, user.id);
                            const avatarUrl = profile?.avatar_url;
                            return (
                                <div key={user.id} className="bg-[#f5f3f1] border border-[var(--tn-outline)]/20 rounded-xl p-4 flex items-center gap-3">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={`Avatar de ${name}`} className="w-11 h-11 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-[var(--tn-text)] truncate">{name}</p>
                                        <p className="text-xs text-[var(--tn-muted)]">{user.score} aportes totales</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="bg-white/75 border border-[var(--tn-outline)]/25 rounded-xl p-5 text-sm text-[var(--tn-muted)]">Sin actividad suficiente todavia.</div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)] mb-6">Necesidades con mas interaccion</h2>
                    <div className="space-y-4">
                        {topInteractedNeeds.length > 0 ? topInteractedNeeds.map((post) => (
                            <Link key={post.id} href={`/post/${post.id}`} className="block bg-white/80 border border-[var(--tn-outline)]/25 rounded-xl p-5 hover:bg-white transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.14em] text-[var(--tn-muted)] font-semibold">
                                            {categoryName(post.category_id)}
                                        </p>
                                        <h3 className="font-editorial text-2xl leading-tight text-[var(--tn-text)] mt-2">{post.title}</h3>
                                        <p className="text-sm text-[var(--tn-muted)] mt-3 line-height-editorial">{excerpt(post.content, 130)}</p>
                                        <div className="mt-4 flex items-center gap-3">
                                            {post.author_avatar_url ? (
                                                <img src={post.author_avatar_url} alt={`Avatar de ${post.author_name}`} className="w-9 h-9 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold">
                                                    {post.author_name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <p className="text-sm font-medium text-[var(--tn-text)] truncate">{post.author_name}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${post.is_closed ? 'bg-[#e7e6eb] text-[#5f627a]' : 'bg-[#e7ece8] text-[#4f6353]'}`}>
                                        {post.is_closed ? 'Cerrada' : 'Abierta'}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-[var(--tn-outline)]/20 text-sm font-semibold text-[var(--tn-primary)]">
                                    {post.interactionCount} respuestas registradas
                                </div>
                            </Link>
                        )) : (
                            <div className="bg-white/75 border border-[var(--tn-outline)]/25 rounded-xl p-5 text-sm text-[var(--tn-muted)]">Sin interacciones suficientes para mostrar ranking.</div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
