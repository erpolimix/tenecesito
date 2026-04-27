import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/constants';
import GamificationBadgeIcon from '@/components/GamificationBadgeIcon';
import { Trophy, Flame, Sparkles, Star } from 'lucide-react';

type GamificationStatsRow = {
    total_points: number;
    current_level: string;
    current_streak_days: number;
    useful_count: number;
    revealing_count: number;
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
    user_id: string;
};

function getTimeAgoEs(dateString: string) {
    const created = new Date(dateString).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - created);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    if (days < 30) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

function categoryName(categoryId?: string) {
    return CATEGORIES.find((c) => c.id === categoryId)?.name || 'Comunidad';
}

function levelProgressPercent(totalPoints: number, level: string) {
    const thresholds: Record<string, [number, number]> = {
        'Semilla': [0, 10],
        'Guia': [10, 30],
        'Referente': [30, 60],
        'Sabio': [60, 120],
        'Faro': [120, 120],
    };
    const [min, max] = thresholds[level] ?? [0, 10];
    if (max === min) return 100;
    return Math.min(100, Math.round(((totalPoints - min) / (max - min)) * 100));
}

export default async function PerfilPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
    const { id } = await params;
    const supabase = await createClient();

    const [
        { data: profile },
        { data: statsRaw },
        { data: eventsRaw },
        { data: specialistsRaw },
    ] = await Promise.all([
        supabase.from('profiles').select('id, display_name, avatar_url').eq('id', id).single(),
        supabase.from('user_gamification_stats').select('total_points, current_level, current_streak_days, useful_count, revealing_count').eq('user_id', id).single(),
        supabase
            .from('user_gamification_events')
            .select('id, feedback_type, points, occurred_at, post_id')
            .eq('user_id', id)
            .order('occurred_at', { ascending: false })
            .limit(8),
        supabase
            .from('category_specialists')
            .select('category_id, user_id')
            .eq('user_id', id),
    ]);

    if (!profile) {
        notFound();
    }

    const displayName = (profile.display_name && profile.display_name.trim().length > 0)
        ? profile.display_name
        : `Usuario ${id.slice(0, 6)}`;

    const stats = statsRaw as GamificationStatsRow | null;
    const events = (eventsRaw || []) as GamificationEventRow[];
    const specialists = (specialistsRaw || []) as CategorySpecialistRow[];

    const specialistCategoryIds = new Set(specialists.map((s) => s.category_id));

    const postIds = [...new Set(events.map((e) => e.post_id))];
    let postsById = new Map<string, { title: string; category_id: string }>();
    if (postIds.length > 0) {
        const { data: posts } = await supabase
            .from('posts')
            .select('id, title, category_id')
            .in('id', postIds);
        postsById = new Map((posts || []).map((p) => [p.id, p]));
    }

    const progress = stats ? levelProgressPercent(stats.total_points, stats.current_level) : 0;

    return (
        <main className="max-w-2xl mx-auto px-5 md:px-6 pt-10 pb-24 animate-in fade-in duration-300">

            {/* Hero */}
            <section className="flex flex-col items-center text-center mb-12">
                <div className="relative mb-6">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={`Avatar de ${displayName}`}
                            className="w-28 h-28 rounded-full object-cover border-4 border-[var(--tn-surface)]"
                        />
                    ) : (
                        <div className="w-28 h-28 rounded-full bg-[#e8ddd7] border-4 border-[var(--tn-surface)] flex items-center justify-center text-4xl font-bold text-[#91462e]">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    {stats && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#91462e] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap">
                            {stats.current_level}
                        </span>
                    )}
                </div>

                <h1 className="font-editorial text-4xl font-bold text-[var(--tn-primary)] mt-4">{displayName}</h1>

                {stats && (
                    <div className="mt-4 w-full max-w-xs">
                        <div className="flex justify-between text-[11px] font-semibold text-[var(--tn-muted)] uppercase tracking-wider mb-1.5">
                            <span>{stats.current_level}</span>
                            <span>{stats.total_points} pts</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#e8ddd7] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[#91462e] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </section>

            {/* Stats bento */}
            {stats && (
                <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
                    <div className="bg-[#f5f3f1] border border-[var(--tn-outline)]/20 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                        <Trophy className="w-5 h-5 text-[#91462e] mb-2" strokeWidth={2} />
                        <p className="font-editorial text-3xl text-[var(--tn-primary)]">{stats.total_points}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold mt-1">Puntos</p>
                    </div>
                    <div className="bg-[#f5f3f1] border border-[var(--tn-outline)]/20 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                        <Flame className="w-5 h-5 text-[#d96451] mb-2" strokeWidth={2} />
                        <p className="font-editorial text-3xl text-[var(--tn-primary)]">{stats.current_streak_days}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tn-muted)] font-semibold mt-1">Racha</p>
                    </div>
                    <div className="bg-[#fff3cf] border border-[#f2de97]/60 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                        <Sparkles className="w-5 h-5 text-[#d2a91a] mb-2" strokeWidth={2} />
                        <p className="font-editorial text-3xl text-[#7d6423]">{stats.revealing_count}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#7d6423] font-semibold mt-1">Reveladoras</p>
                    </div>
                    <div className="bg-[#e4eeff] border border-[#b8cefa]/60 rounded-xl p-5 flex flex-col items-center justify-center text-center">
                        <Star className="w-5 h-5 text-[#4d7ed9] mb-2" strokeWidth={2} />
                        <p className="font-editorial text-3xl text-[#243a62]">{stats.useful_count}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-[#3f5f93] font-semibold mt-1">Útiles</p>
                    </div>
                </section>
            )}

            {/* Especialidades */}
            {specialistCategoryIds.size > 0 && (
                <section className="mb-12">
                    <h2 className="font-editorial text-3xl text-[var(--tn-text)] mb-5">Especialidades</h2>
                    <div className="flex flex-wrap gap-3">
                        {CATEGORIES.filter((c) => specialistCategoryIds.has(c.id)).map((cat) => (
                            <span
                                key={cat.id}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${cat.softBg} ${cat.softText} border border-[var(--tn-outline)]/20`}
                            >
                                <GamificationBadgeIcon variant="especialista" tone={cat.id as 'apoyo' | 'relaciones' | 'decisiones' | 'creatividad'} size={20} />
                                {cat.name}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Actividad reciente */}
            {events.length > 0 && (
                <section>
                    <h2 className="font-editorial text-3xl text-[var(--tn-text)] mb-5">Actividad reciente</h2>
                    <div className="space-y-3">
                        {events.map((event) => {
                            const post = postsById.get(event.post_id);
                            const isReveladora = event.feedback_type === 'reveladora';
                            return (
                                <Link
                                    key={event.id}
                                    href={`/post/${event.post_id}`}
                                    className="block bg-white/80 border border-[var(--tn-outline)]/25 rounded-xl p-4 hover:bg-white transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            {post && (
                                                <p className="text-[11px] uppercase tracking-[0.13em] text-[var(--tn-muted)] font-semibold mb-1">
                                                    {categoryName(post.category_id)}
                                                </p>
                                            )}
                                            <p className="text-sm font-medium text-[var(--tn-text)] truncate">
                                                {post?.title ?? 'Necesidad'}
                                            </p>
                                            <p className="text-xs text-[var(--tn-muted)] mt-1">{getTimeAgoEs(event.occurred_at)}</p>
                                        </div>
                                        <span
                                            className={`shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${isReveladora ? 'bg-[#fff3cf] text-[#7d6423]' : 'bg-[#e4eeff] text-[#3f5f93]'}`}
                                        >
                                            {isReveladora ? `+${event.points} reveladora` : `+${event.points} útil`}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {!stats && events.length === 0 && (
                <p className="text-center text-[var(--tn-muted)] mt-16">Este usuario todavía no tiene actividad de consejero.</p>
            )}

            <div className="mt-10 text-center">
                <Link href="/comunidad" className="text-sm font-semibold text-[var(--tn-primary)] hover:opacity-80 transition-opacity">
                    ← Volver a la comunidad
                </Link>
            </div>
        </main>
    );
}
