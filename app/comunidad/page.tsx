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

type WeeklyCounselorRankingRow = {
    user_id: string;
    weekly_points: number;
    feedback_count: number;
    reveladora_count: number;
};

type CategorySpecialistRow = {
    category_id: string;
    user_id: string;
    reveladora_count: number;
    total_feedback_count: number;
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
        { data: weeklyCounselorRanking, error: weeklyRankingError },
        { data: categorySpecialistsRaw, error: specialistsError },
    ] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_closed', true),
        supabase
            .from('posts')
            .select('id, title, content, category_id, is_closed, author_id, created_at, responses(count)')
            .order('created_at', { ascending: false })
            .limit(120),
        supabase
            .from('weekly_counselor_ranking')
            .select('user_id, weekly_points, feedback_count, reveladora_count')
            .limit(8),
        supabase
            .from('category_specialists')
            .select('category_id, user_id, reveladora_count, total_feedback_count'),
    ]);

    if (postsError) {
        console.error('Error fetching community highlighted posts', postsError);
    }
    if (weeklyRankingError) {
        console.error('Error fetching weekly counselor ranking', weeklyRankingError);
    }
    if (specialistsError) {
        console.error('Error fetching category specialists', specialistsError);
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

    const topUsers = ((weeklyCounselorRanking || []) as WeeklyCounselorRankingRow[])
        .sort((a, b) => {
            if (b.weekly_points !== a.weekly_points) return b.weekly_points - a.weekly_points;
            if (b.reveladora_count !== a.reveladora_count) return b.reveladora_count - a.reveladora_count;
            return b.feedback_count - a.feedback_count;
        })
        .slice(0, 6)
        .map((row) => ({
            id: row.user_id,
            weeklyPoints: row.weekly_points,
            feedbackCount: row.feedback_count,
            reveladoraCount: row.reveladora_count,
        }));

    const categorySpecialists = (categorySpecialistsRaw || []) as CategorySpecialistRow[];

    const profileIds = [
        ...topUsers.map((u) => u.id),
        ...categorySpecialists.map((s) => s.user_id),
    ].filter((id, idx, arr) => arr.indexOf(id) === idx);
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
                <h1 className="font-editorial text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-[var(--tn-primary)] mt-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
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
                <div className="flex items-end justify-between gap-4 mb-8">
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)]">Lo mas destacado</h2>
                    <Link href="/feed" className="text-sm font-semibold text-[var(--tn-primary)] hover:opacity-80 transition-opacity">Ver feed completo</Link>
                </div>

                <div className="-mx-5 overflow-x-auto px-5 pb-2 hide-scrollbar md:mx-0 md:px-0 md:overflow-visible md:pb-0">
                    <div className="flex gap-4 md:grid md:grid-cols-3 md:gap-6">
                    {featuredPosts.length > 0 ? featuredPosts.map((post) => (
                        <Link key={post.id} href={`/post/${post.id}`} className="min-w-[82vw] snap-start bg-white/80 border border-[var(--tn-outline)]/25 rounded-2xl p-5 md:p-6 hover:-translate-y-1 transition-transform flex flex-col h-full md:min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <p className="text-xs uppercase tracking-[0.14em] font-semibold text-[var(--tn-muted)]">{categoryName(post.category_id)}</p>
                                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${post.is_closed ? 'bg-[#e7e6eb] text-[#5f627a]' : 'bg-[#e7ece8] text-[#4f6353]'}`}>
                                    {post.is_closed ? 'Cerrada' : 'Abierta'}
                                </span>
                            </div>
                            <h3 className="font-editorial text-2xl md:text-[2rem] leading-[1.02] text-[var(--tn-text)]">{post.title}</h3>
                            <p className="text-sm md:text-base text-[var(--tn-muted)] mt-4 leading-[1.65] flex-grow">{excerpt(post.content, 120)}</p>
                            <div className="mt-6 pt-5 border-t border-[var(--tn-outline)]/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    {post.author_avatar_url ? (
                                        <img src={post.author_avatar_url} alt={`Avatar de ${post.author_name}`} className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold shrink-0">
                                            {post.author_name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tn-muted)] font-semibold">Publicado por</p>
                                        <p className="text-sm font-medium text-[var(--tn-text)] truncate">{post.author_name}</p>
                                    </div>
                                </div>
                                <p className="text-sm font-semibold text-[var(--tn-primary)]">{post.interactionCount} interacciones</p>
                            </div>
                        </Link>
                    )) : (
                        <div className="w-full md:col-span-3 bg-white/75 border border-[var(--tn-outline)]/25 rounded-2xl p-8 text-center text-[var(--tn-muted)]">Todavia no hay suficientes datos para destacados.</div>
                    )}
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)] mb-6">Ranking semanal de consejeros</h2>
                    <div className="-mx-5 overflow-x-auto px-5 pb-2 hide-scrollbar lg:mx-0 lg:px-0 lg:overflow-visible lg:pb-0">
                    <div className="flex gap-4 lg:block lg:space-y-4">
                        {topUsers.length > 0 ? topUsers.map((user) => {
                            const profile = profilesById.get(user.id);
                            const name = safeAuthorName(profile, user.id);
                            const avatarUrl = profile?.avatar_url;
                            return (
                                <Link key={user.id} href={`/perfil/${user.id}`} className="min-w-[74vw] bg-[#f5f3f1] border border-[var(--tn-outline)]/20 rounded-xl p-4 flex items-center gap-3 lg:min-w-0 hover:bg-white transition-colors">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={`Avatar de ${name}`} className="w-11 h-11 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold">
                                            {name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-[var(--tn-text)] truncate">{name}</p>
                                        <p className="text-xs text-[var(--tn-muted)]">
                                            {user.weeklyPoints} pts · {user.feedbackCount} valoraciones · {user.reveladoraCount} reveladoras
                                        </p>
                                    </div>
                                </Link>
                            );
                        }) : (
                            <div className="bg-white/75 border border-[var(--tn-outline)]/25 rounded-xl p-5 text-sm text-[var(--tn-muted)]">Sin valoraciones semanales suficientes todavia.</div>
                        )}
                    </div>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)] mb-6">Necesidades con mas interaccion</h2>
                    <div className="space-y-4">
                        {topInteractedNeeds.length > 0 ? topInteractedNeeds.map((post) => (
                            <Link key={post.id} href={`/post/${post.id}`} className="block bg-white/80 border border-[var(--tn-outline)]/25 rounded-xl p-5 md:p-6 hover:bg-white transition-colors">
                                <div className="flex flex-col gap-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs uppercase tracking-[0.14em] text-[var(--tn-muted)] font-semibold">
                                                {categoryName(post.category_id)}
                                            </p>
                                            <h3 className="font-editorial text-2xl md:text-[2.2rem] leading-[1.02] text-[var(--tn-text)] mt-2">{post.title}</h3>
                                            <p className="text-sm md:text-base text-[var(--tn-muted)] mt-4 leading-[1.65]">{excerpt(post.content, 130)}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${post.is_closed ? 'bg-[#e7e6eb] text-[#5f627a]' : 'bg-[#e7ece8] text-[#4f6353]'}`}>
                                            {post.is_closed ? 'Cerrada' : 'Abierta'}
                                        </span>
                                    </div>

                                    <div className="pt-4 border-t border-[var(--tn-outline)]/20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {post.author_avatar_url ? (
                                                <img src={post.author_avatar_url} alt={`Avatar de ${post.author_name}`} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold shrink-0">
                                                    {post.author_name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--tn-muted)] font-semibold">Publicado por</p>
                                                <p className="text-sm font-medium text-[var(--tn-text)] truncate">{post.author_name}</p>
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-[var(--tn-primary)]">
                                            {post.interactionCount} respuestas registradas
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            <div className="bg-white/75 border border-[var(--tn-outline)]/25 rounded-xl p-5 text-sm text-[var(--tn-muted)]">Sin interacciones suficientes para mostrar ranking.</div>
                        )}
                    </div>
                </div>
            </section>

            {categorySpecialists.length > 0 && (
                <section>
                    <h2 className="font-editorial text-4xl text-[var(--tn-text)] mb-2">Especialistas por area</h2>
                    <p className="text-[var(--tn-muted)] mb-8">Quienes mas perspectivas reveladoras han aportado en cada categoria.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {CATEGORIES.map((cat) => {
                            const specialist = categorySpecialists.find((s) => s.category_id === cat.id);
                            if (!specialist) {
                                return (
                                    <div key={cat.id} className="rounded-xl border border-[var(--tn-outline)]/20 p-5 bg-[#f5f3f1] opacity-50">
                                        <p className={`text-xs uppercase tracking-[0.15em] font-semibold mb-3 ${cat.softText}`}>{cat.name}</p>
                                        <p className="text-sm text-[var(--tn-muted)] italic">Sin especialista todavia</p>
                                    </div>
                                );
                            }
                            const profile = profilesById.get(specialist.user_id);
                            const name = safeAuthorName(profile, specialist.user_id);
                            const avatarUrl = profile?.avatar_url;
                            return (
                                <Link key={cat.id} href={`/perfil/${specialist.user_id}`} className={`rounded-xl border p-5 ${cat.softBg} border-[var(--tn-outline)]/20 hover:-translate-y-1 transition-transform`}>
                                    <p className={`text-xs uppercase tracking-[0.15em] font-semibold mb-4 ${cat.softText}`}>{cat.name}</p>
                                    <div className="flex items-center gap-3">
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt={`Avatar de ${name}`} className="w-10 h-10 rounded-full object-cover shrink-0" />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-full ${cat.bg} flex items-center justify-center font-bold shrink-0`}>
                                                {name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-semibold text-[var(--tn-text)] truncate text-sm">{name}</p>
                                            <p className={`text-xs mt-0.5 ${cat.softText}`}>
                                                {specialist.reveladora_count} reveladoras · {specialist.total_feedback_count} valoraciones
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </main>
    );
}
