import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox, MessageSquare, ArrowRight, FileText, MessageCircleMore, Trophy, Flame, Sparkles, Target } from 'lucide-react'
import { markPostResponsesAsRead, markAllAsRead } from './actions'
import { CATEGORIES } from '@/lib/constants'
import { isUrgentActive } from '@/lib/urgency'
import PendingSubmitButton from '@/components/PendingSubmitButton'
import UrgencyBadge from '@/components/UrgencyBadge'
import DashboardRealtimeBridge from '@/components/DashboardRealtimeBridge'

type DashboardResponse = {
    id: string;
    content: string;
    is_read: boolean;
};

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

const LEVEL_MILESTONES = [
    { label: 'Guia', min: 10 },
    { label: 'Referente', min: 30 },
    { label: 'Sabio', min: 60 },
    { label: 'Faro', min: 120 },
];

function getTimeAgoEs(dateString?: string) {
    if (!dateString) return 'Hace un momento'

    const created = new Date(dateString).getTime()
    const now = Date.now()
    const diffMs = Math.max(0, now - created)
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Hace un momento'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
    if (days < 30) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`

    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`

    const months = Math.floor(days / 30)
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`
}

function excerpt(text: string | null | undefined, max = 160) {
    if (!text) return ''
    if (text.length <= max) return text
    return `${text.slice(0, max).trim()}...`
}

function nextMilestone(totalPoints: number) {
    const next = LEVEL_MILESTONES.find((milestone) => totalPoints < milestone.min);
    if (!next) {
        return { label: 'Maestria', remaining: 0, target: totalPoints };
    }
    return {
        label: next.label,
        remaining: Math.max(0, next.min - totalPoints),
        target: next.min,
    };
}

export default async function DashboardPage({
    searchParams,
}: Readonly<{
    searchParams: Promise<{ status?: string }>
}>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const [
        { data: posts },
        { data: myGamificationStats, error: gamificationStatsError },
        { data: recentGamificationEvents, error: recentEventsError },
    ] = await Promise.all([
        supabase
            .from('posts')
            .select(`
                *,
                responses (*)
            `)
            .eq('author_id', user.id)
            .order('created_at', { ascending: false }),
        supabase
            .from('user_gamification_stats')
            .select('total_points, current_level, current_streak_days, useful_count, revealing_count')
            .eq('user_id', user.id)
            .maybeSingle(),
        supabase
            .from('user_gamification_events')
            .select('id, feedback_type, points, occurred_at, post_id')
            .eq('user_id', user.id)
            .order('occurred_at', { ascending: false })
            .limit(5),
    ])

    if (gamificationStatsError) {
        console.error('Error fetching dashboard gamification stats', gamificationStatsError)
    }
    if (recentEventsError) {
        console.error('Error fetching dashboard recent gamification events', recentEventsError)
    }

    const myPosts = posts || []
    const stats = (myGamificationStats as GamificationStatsRow | null) || null
    const totalPoints = stats?.total_points || 0
    const currentLevel = stats?.current_level || 'Semilla'
    const currentStreakDays = stats?.current_streak_days || 0
    const usefulCount = stats?.useful_count || 0
    const revealingCount = stats?.revealing_count || 0
    const milestone = nextMilestone(totalPoints)

    const recentEvents = (recentGamificationEvents as GamificationEventRow[] | null) || []
    const recentEventPostIds = Array.from(new Set(recentEvents.map((event) => event.post_id)))

    let recentEventPostById = new Map<string, { id: string; title: string; category_id: string | null }>()
    if (recentEventPostIds.length > 0) {
        const { data: recentEventPosts, error: recentEventPostsError } = await supabase
            .from('posts')
            .select('id, title, category_id')
            .in('id', recentEventPostIds)

        if (recentEventPostsError) {
            console.error('Error fetching dashboard recent event posts', recentEventPostsError)
        } else {
            recentEventPostById = new Map((recentEventPosts || []).map((post) => [post.id, post]))
        }
    }

    const myPostIds = myPosts.map((post) => post.id)
    const params = await searchParams
    const selectedStatus = params.status === 'closed' ? 'closed' : 'active'
    const visiblePosts = [...myPosts]
        .filter((post) => selectedStatus === 'closed' ? post.is_closed : !post.is_closed)
        .sort((leftPost, rightPost) => {
            const leftUnreadCount = leftPost.responses?.filter((response: DashboardResponse) => !response.is_read).length || 0
            const rightUnreadCount = rightPost.responses?.filter((response: DashboardResponse) => !response.is_read).length || 0

            if (leftUnreadCount !== rightUnreadCount) {
                return rightUnreadCount - leftUnreadCount
            }

            const leftUrgent = isUrgentActive(leftPost) ? 1 : 0
            const rightUrgent = isUrgentActive(rightPost) ? 1 : 0

            if (leftUrgent !== rightUrgent) {
                return rightUrgent - leftUrgent
            }

            return new Date(rightPost.created_at).getTime() - new Date(leftPost.created_at).getTime()
        })
    const totalUrgentActive = myPosts.filter((post) => isUrgentActive(post)).length

    const totalUnread = myPosts.reduce((acc, post) => 
        acc + (post.responses?.filter((r: DashboardResponse) => !r.is_read).length || 0)
    , 0)

    return (
        <>
        <DashboardRealtimeBridge userId={user.id} postIds={myPostIds} />
        <main className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-32 animate-in fade-in duration-300">
            <section className="max-w-3xl mb-10 md:mb-12">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold">Tu panel</p>
                <h1 className="font-editorial text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[0.95] text-[var(--tn-primary)] mt-3">
                    Dashboard
                </h1>
                <p className="mt-5 text-base md:text-lg text-[var(--tn-muted)] leading-relaxed">
                    Revisa respuestas nuevas, prioriza tus necesidades activas y gestiona el estado de cada publicación.
                </p>
            </section>

            <section className="mb-12 rounded-[24px] border border-[#ecd8cf] bg-[#fffaf6] p-6 md:p-8">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--tn-muted)] font-semibold">Tu impacto</p>
                        <h2 className="font-editorial text-3xl md:text-4xl text-[var(--tn-primary)] mt-1">Progreso como consejero</h2>
                    </div>
                    <div className="text-sm text-[#6d5a52] font-medium">
                        {milestone.remaining > 0
                            ? `Te faltan ${milestone.remaining} puntos para ${milestone.label}`
                            : 'Has alcanzado el nivel maximo actual'}
                    </div>
                </div>

                <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-white border border-[#f0e2d8] p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold flex items-center gap-2"><Trophy size={14} /> Puntos</p>
                        <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{totalPoints}</p>
                        <p className="text-xs text-[#8a766c] mt-2">Utiles: {usefulCount} · Reveladoras: {revealingCount}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-[#f0e2d8] p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold flex items-center gap-2"><Sparkles size={14} /> Nivel</p>
                        <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{currentLevel}</p>
                        <p className="text-xs text-[#8a766c] mt-2">Siguiente hito: {milestone.label}</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-[#f0e2d8] p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold flex items-center gap-2"><Flame size={14} /> Racha</p>
                        <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{currentStreakDays}d</p>
                        <p className="text-xs text-[#8a766c] mt-2">Mantiene constancia de ayuda</p>
                    </div>

                    <div className="rounded-2xl bg-white border border-[#f0e2d8] p-4">
                        <p className="text-xs uppercase tracking-[0.12em] text-[#8a766c] font-semibold flex items-center gap-2"><Target size={14} /> Hito</p>
                        <p className="font-editorial text-4xl text-[#8f4e36] mt-2">{milestone.target}</p>
                        <p className="text-xs text-[#8a766c] mt-2">Meta del nivel {milestone.label}</p>
                    </div>
                </div>

                <div className="mt-7 rounded-2xl bg-white border border-[#f0e2d8] p-4 md:p-5">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[#8a766c]">Logros recientes</h3>
                    {recentEvents.length === 0 ? (
                        <p className="mt-3 text-sm text-[#7d6a62]">Aun no hay valoraciones recibidas. Cuando te marquen como util o reveladora, apareceran aqui.</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {recentEvents.map((event) => {
                                const eventPost = recentEventPostById.get(event.post_id)
                                const eventCategory = CATEGORIES.find((category) => category.id === eventPost?.category_id)
                                return (
                                    <li key={event.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                                        <div className="text-[#4b3a33]">
                                            <span className="font-semibold">+{event.points} pts</span>{' '}
                                            por valoracion{' '}
                                            <span className="font-semibold">{event.feedback_type === 'util' ? 'util' : 'reveladora'}</span>
                                            {eventCategory ? ` en ${eventCategory.name}` : ''}
                                            {eventPost?.title ? ` · ${excerpt(eventPost.title, 55)}` : ''}
                                        </div>
                                        <span className="text-xs text-[#8a766c]">{getTimeAgoEs(event.occurred_at)}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </section>

            <section className="-mx-4 overflow-x-auto px-4 pb-2 hide-scrollbar md:mx-0 md:px-0 md:overflow-visible md:pb-0 mb-12">
                <div className="flex gap-4 md:grid md:grid-cols-2 md:gap-6">
                <div className="min-w-[84vw] bg-[#f5f3f1] p-8 rounded-[24px] relative overflow-hidden group md:min-w-0">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <FileText size={128} strokeWidth={1.6} />
                    </div>
                    <p className="text-[#546258] font-medium tracking-wide text-xs uppercase mb-2">Total de publicaciones</p>
                    <h2 className="font-editorial text-5xl font-bold text-[#91462e]">{myPosts.length}</h2>
                    <p className="text-[#54433e] text-sm mt-4 leading-relaxed">Has compartido {myPosts.length} necesidades con la comunidad.</p>
                    <p className="text-[#91462e] text-sm mt-2 font-medium">{totalUrgentActive} urgentes activas en este momento.</p>
                </div>
                <div className="min-w-[84vw] bg-[#d5e3d7] p-8 rounded-[24px] relative overflow-hidden group md:min-w-0">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <MessageCircleMore size={128} strokeWidth={1.6} />
                    </div>
                    <p className="text-[#58665c] font-medium tracking-wide text-xs uppercase mb-2">Respuestas nuevas</p>
                    <h2 className="font-editorial text-5xl font-bold text-[#58665c]">{String(totalUnread).padStart(1, '0')}</h2>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#91462e] rounded-full animate-pulse" />
                        <p className="text-[#58665c] text-sm font-medium">Pendientes de revisión</p>
                    </div>
                </div>
                </div>
            </section>

            <div className="-mx-4 overflow-x-auto px-4 pb-2 hide-scrollbar md:mx-0 md:px-0 md:overflow-visible md:pb-0 mb-8">
                <div className="flex w-max min-w-full items-stretch gap-3 md:min-w-0 md:w-auto md:flex-wrap">
                    <Link
                        href="/dashboard?status=active"
                        className={`inline-flex shrink-0 items-center justify-center min-w-[120px] text-center px-6 py-3 rounded-full text-sm font-bold tracking-tight shadow-sm transition-transform active:scale-95 ${selectedStatus === 'active' ? 'bg-[#546258] text-white' : 'bg-[#e3e2e0] text-[#54433e] hover:bg-[#dbdad8]'}`}
                    >
                        Activas
                    </Link>
                    <Link
                        href="/dashboard?status=closed"
                        className={`inline-flex shrink-0 items-center justify-center min-w-[120px] text-center px-6 py-3 rounded-full text-sm font-bold tracking-tight shadow-sm transition-transform active:scale-95 ${selectedStatus === 'closed' ? 'bg-[#546258] text-white' : 'bg-[#e3e2e0] text-[#54433e] hover:bg-[#dbdad8]'}`}
                    >
                        Cerradas
                    </Link>

                    {totalUnread > 0 && (
                    <form action={markAllAsRead} className="shrink-0 md:ml-auto">
                        <PendingSubmitButton
                            pendingText="Marcando..."
                            className="w-full px-5 py-3 rounded-full text-sm font-semibold border border-[#dac1ba] text-[#54433e] bg-white hover:bg-[#efeeec] transition-colors"
                        >
                            Marcar todo como leído
                        </PendingSubmitButton>
                    </form>
                    )}
                </div>
            </div>

            {visiblePosts.length === 0 ? (
                <div className="border border-[var(--tn-outline)]/35 bg-white/70 rounded-3xl p-12 text-center">
                    <Inbox size={42} className="mx-auto mb-4 text-[var(--tn-muted)]" />
                    <p className="font-editorial text-4xl text-[var(--tn-primary)]">
                        {selectedStatus === 'closed' ? 'No tienes necesidades cerradas.' : 'No tienes necesidades activas.'}
                    </p>
                    <Link href="/create" className="inline-block mt-8 bg-[var(--tn-primary)] text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
                        Crear Necesidad
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {visiblePosts.map((post) => {
                        const unreadResponses = post.responses?.filter((r: DashboardResponse) => !r.is_read) || []
                        const cat = CATEGORIES.find(c => c.id === post.category_id)
                        const pluralSuffix = unreadResponses.length === 1 ? '' : 's'
                        const responseCountLabel = unreadResponses.length > 0
                            ? `${unreadResponses.length} respuesta${pluralSuffix} nueva${pluralSuffix}`
                            : 'Sin respuestas nuevas'
                        
                        return (
                            <div key={post.id} className={`bg-[#f5f3f1] p-5 md:p-7 rounded-[24px] hover:bg-[#efeeec] transition-all duration-300 group ${unreadResponses.length === 0 ? 'opacity-80' : ''}`}>
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                                    <div className="flex flex-wrap items-center gap-2.5 text-sm text-[#546258] font-medium">
                                        <span className="px-3 py-1.5 rounded-md bg-white/60 text-[#af5e44] font-semibold">{cat?.name}</span>
                                        <span>{getTimeAgoEs(post.created_at)}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <UrgencyBadge
                                            priorityLevel={post.priority_level}
                                            urgentUntil={post.urgent_until}
                                            isClosed={post.is_closed}
                                        />
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.12em] flex items-center gap-1.5 ${post.is_closed ? 'bg-[#e7dfd5] text-[#6d5a52]' : 'bg-[#d5e3d7] text-[#425649]'}`}>
                                            <span className={`w-2 h-2 rounded-full ${post.is_closed ? 'bg-[#6d5a52]' : 'bg-[#5f7a67]'}`} />
                                            {post.is_closed ? 'Cerrada' : 'Abierta'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-editorial text-[2rem] md:text-[2.4rem] leading-[0.98] text-[#1b1c1b]">
                                        <Link href={`/post/${post.id}`} className="hover:text-[var(--tn-primary)] transition-colors">
                                            {post.title}
                                        </Link>
                                    </h3>
                                    <p className="text-[#54433e] text-[1.02rem] md:text-[1.08rem] leading-[1.65] max-w-2xl">
                                        {excerpt(post.content)}
                                    </p>
                                </div>

                                <div className="mt-8 pt-5 border-t border-[var(--tn-outline)]/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-full bg-[#e8ddd7] flex items-center justify-center text-[#91462e] font-bold shrink-0">
                                            T
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-[#87736d] font-semibold">Tu necesidad</p>
                                            <p className="text-[#1b1c1b] font-semibold truncate">Gestiona respuestas y estado</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center md:justify-end">
                                        {unreadResponses.length > 0 ? (
                                            <form action={markPostResponsesAsRead}>
                                                <input type="hidden" name="postId" value={post.id} />
                                                <PendingSubmitButton
                                                    pendingText="Marcando..."
                                                    className="bg-[#ffdbd0] px-4 py-2.5 rounded-full flex items-center gap-2 shadow-sm"
                                                >
                                                    <MessageSquare size={16} className="text-[#91462e]" />
                                                    <span className="text-[#76321c] font-bold text-sm">{responseCountLabel}</span>
                                                </PendingSubmitButton>
                                            </form>
                                        ) : (
                                            <div className="text-[#87736d] font-medium text-sm px-4 py-2.5 bg-white/45 rounded-full">
                                                {responseCountLabel}
                                            </div>
                                        )}

                                        <Link href={`/post/${post.id}`} className="inline-flex items-center gap-2 text-[#91462e] font-semibold group-hover:translate-x-1 transition-all">
                                            <span>Ver detalle</span>
                                            <ArrowRight size={18} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </main>
        </>
    )
}
