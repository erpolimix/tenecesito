import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell, Flame, Sparkles, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import { markAllAsRead } from '@/app/dashboard/actions';
import PendingSubmitButton from '@/components/PendingSubmitButton';

type UnreadResponseRow = {
    id: string;
    post_id: string;
    author_id: string;
    content: string;
    created_at: string;
};

type ProfileRow = {
    id: string;
    display_name?: string | null;
    avatar_url?: string | null;
};

type GamificationStatsRow = {
    total_points: number;
    current_level: string;
    current_streak_days: number;
};

type GamificationEventRow = {
    id: number;
    feedback_type: 'util' | 'reveladora';
    points: number;
    occurred_at: string;
    post_id: string;
};

type CategorySpecialistRow = {
    category_id: string;
};

function logSupabaseError(context: string, error: unknown) {
    if (error) {
        console.error(context, error);
    }
}

function getTimeAgoEs(dateString?: string) {
    if (!dateString) return 'Hace un momento';

    const created = new Date(dateString).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - created);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 30) return `Hace ${days} ${days === 1 ? 'dia' : 'dias'}`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;

    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

function excerpt(text?: string, max = 120) {
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
}

function categoryName(categoryId?: string | null) {
    return CATEGORIES.find((category) => category.id === categoryId)?.name || 'Comunidad';
}

function safeName(profile: ProfileRow | undefined, userId: string) {
    if (profile?.display_name && profile.display_name.trim().length > 0) {
        return profile.display_name;
    }
    return `Usuario ${userId.slice(0, 6)}`;
}

export default async function NotificacionesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const [
        { data: unreadResponsesRaw, error: unreadResponsesError },
        { data: statsRaw, error: statsError },
        { data: eventsRaw, error: eventsError },
        { data: specialistCategoriesRaw, error: specialistsError },
    ] = await Promise.all([
        supabase
            .from('responses')
            .select('id, post_id, author_id, content, created_at, posts!inner(id, title, author_id)')
            .eq('posts.author_id', user.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(40),
        supabase
            .from('user_gamification_stats')
            .select('total_points, current_level, current_streak_days')
            .eq('user_id', user.id)
            .maybeSingle(),
        supabase
            .from('user_gamification_events')
            .select('id, feedback_type, points, occurred_at, post_id')
            .eq('user_id', user.id)
            .order('occurred_at', { ascending: false })
            .limit(15),
        supabase
            .from('category_specialists')
            .select('category_id')
            .eq('user_id', user.id),
    ]);

    logSupabaseError('Error fetching unread responses notifications', unreadResponsesError);
    logSupabaseError('Error fetching notifications gamification stats', statsError);
    logSupabaseError('Error fetching notifications gamification events', eventsError);
    logSupabaseError('Error fetching notifications specialist categories', specialistsError);

    const unreadResponses = (unreadResponsesRaw || []) as (UnreadResponseRow & {
        posts?: { id: string; title: string; author_id: string } | { id: string; title: string; author_id: string }[];
    })[];
    const stats = (statsRaw as GamificationStatsRow | null) || null;
    const events = (eventsRaw as GamificationEventRow[] | null) || [];
    const specialistCategories = (specialistCategoriesRaw as CategorySpecialistRow[] | null) || [];

    const authorIds = Array.from(new Set(unreadResponses.map((item) => item.author_id).filter(Boolean)));
    let profilesById = new Map<string, ProfileRow>();

    if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', authorIds);

        if (profilesError) {
            console.error('Error fetching unread response authors for notifications', profilesError);
        } else {
            profilesById = new Map(((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
        }
    }

    const eventPostIds = Array.from(new Set(events.map((event) => event.post_id)));
    let eventPostsById = new Map<string, { id: string; title: string; category_id: string | null }>();

    if (eventPostIds.length > 0) {
        const { data: eventPosts, error: eventPostsError } = await supabase
            .from('posts')
            .select('id, title, category_id')
            .in('id', eventPostIds);

        if (eventPostsError) {
            console.error('Error fetching event posts for notifications', eventPostsError);
        } else {
            eventPostsById = new Map((eventPosts || []).map((post) => [post.id, post]));
        }
    }

    return (
        <main className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-32 animate-in fade-in duration-300">
            <section className="max-w-3xl mb-10 md:mb-12">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold">Centro de actividad</p>
                <h1 className="font-editorial text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-[var(--tn-primary)] mt-3">
                    Notificaciones
                </h1>
                <p className="mt-5 text-base md:text-lg text-[var(--tn-muted)] leading-relaxed">
                    Respuestas nuevas en tus necesidades y logros recientes de tu impacto en la comunidad.
                </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="rounded-2xl bg-white border border-[#f0e2d8] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold">Sin leer</p>
                    <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{unreadResponses.length}</p>
                    <p className="text-xs text-[#8a766c] mt-2">Respuestas pendientes</p>
                </div>
                <div className="rounded-2xl bg-white border border-[#f0e2d8] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold flex items-center gap-1.5"><Trophy size={14} /> Nivel</p>
                    <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{stats?.current_level || 'Semilla'}</p>
                    <p className="text-xs text-[#8a766c] mt-2">{stats?.total_points || 0} puntos</p>
                </div>
                <div className="rounded-2xl bg-white border border-[#f0e2d8] p-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold flex items-center gap-1.5"><Flame size={14} /> Racha</p>
                    <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{stats?.current_streak_days || 0}d</p>
                    <p className="text-xs text-[#8a766c] mt-2">Constancia actual</p>
                </div>
            </section>

            <section className="mb-12 rounded-[24px] border border-[#ecd8cf] bg-[#fffaf6] p-5 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-editorial text-3xl md:text-4xl text-[var(--tn-primary)]">Respuestas nuevas</h2>
                        <p className="text-sm text-[#7d6a62] mt-1">Comentarios recientes en las necesidades que publicaste.</p>
                    </div>
                    {unreadResponses.length > 0 && (
                        <form action={markAllAsRead}>
                            <PendingSubmitButton
                                pendingText="Marcando..."
                                className="w-full px-5 py-3 rounded-full text-sm font-semibold border border-[#dac1ba] text-[#54433e] bg-white hover:bg-[#efeeec] transition-colors"
                            >
                                Marcar todo como leido
                            </PendingSubmitButton>
                        </form>
                    )}
                </div>

                {unreadResponses.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-[#f0e2d8] bg-white p-6 text-sm text-[#7d6a62]">
                        No tienes respuestas nuevas por ahora.
                    </div>
                ) : (
                    <div className="mt-5 space-y-3">
                        {unreadResponses.map((response) => {
                            const responseAuthor = profilesById.get(response.author_id);
                            const authorName = safeName(responseAuthor, response.author_id);
                            const postRef = Array.isArray(response.posts) ? response.posts[0] : response.posts;
                            return (
                                <Link
                                    key={response.id}
                                    href={`/post/${response.post_id}`}
                                    className="block rounded-2xl border border-[#f0e2d8] bg-white p-4 hover:bg-[#fcf8f5] transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[11px] uppercase tracking-[0.12em] text-[#8a766c] font-semibold">Nueva respuesta</p>
                                            <p className="text-sm font-semibold text-[var(--tn-text)] mt-1 truncate">{authorName} en {postRef?.title || 'tu necesidad'}</p>
                                            <p className="text-sm text-[#6f5b52] mt-2 leading-relaxed">{excerpt(response.content)}</p>
                                        </div>
                                        <span className="shrink-0 text-xs text-[#8a766c]">{getTimeAgoEs(response.created_at)}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="rounded-[24px] border border-[#ecd8cf] bg-[#fffaf6] p-5 md:p-6">
                <h2 className="font-editorial text-3xl md:text-4xl text-[var(--tn-primary)]">Logros y progreso</h2>
                <p className="text-sm text-[#7d6a62] mt-1">Valoraciones recibidas, categorias donde destacas y avance semanal.</p>

                <div className="mt-5 mb-4 flex flex-wrap gap-2">
                    {specialistCategories.length > 0 ? specialistCategories.map((item) => (
                        <span key={item.category_id} className="inline-flex items-center gap-2 rounded-full bg-[#fff3cf] px-3 py-1.5 text-xs font-semibold text-[#7d6423] border border-[#f2de97]">
                            <Sparkles size={13} /> Especialista en {categoryName(item.category_id)}
                        </span>
                    )) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#eef3ee] px-3 py-1.5 text-xs font-semibold text-[#526454] border border-[#d5e3d7]">
                            <Bell size={13} /> Aun sin insignias de especialista
                        </span>
                    )}
                </div>

                {events.length === 0 ? (
                    <div className="rounded-2xl border border-[#f0e2d8] bg-white p-6 text-sm text-[#7d6a62]">
                        Aun no tienes valoraciones registradas en esta etapa.
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {events.map((event) => {
                            const eventPost = eventPostsById.get(event.post_id);
                            const isReveladora = event.feedback_type === 'reveladora';
                            return (
                                <li key={event.id} className="rounded-2xl border border-[#f0e2d8] bg-white p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--tn-text)]">
                                                +{event.points} puntos por valoracion {isReveladora ? 'reveladora' : 'util'}
                                            </p>
                                            <p className="text-sm text-[#6f5b52] mt-1">
                                                {eventPost?.title ? `En ${eventPost.title}` : 'En una de tus respuestas'}
                                                {eventPost?.category_id ? ` · ${categoryName(eventPost.category_id)}` : ''}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs text-[#8a766c]">{getTimeAgoEs(event.occurred_at)}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </main>
    );
}
