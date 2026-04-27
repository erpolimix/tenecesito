import { createClient } from '@/lib/supabase/server';
import { CATEGORIES } from '@/lib/constants';
import { isUrgentActive } from '@/lib/urgency';
import Link from 'next/link';
import { ArrowLeft, Lock, Edit3 } from 'lucide-react';
import { respondToPost, closePost } from './actions';
import LoadMoreResponses from '@/components/LoadMoreResponses';
import PendingSubmitButton from '@/components/PendingSubmitButton';
import UrgencyBadge from '@/components/UrgencyBadge';
import PostRealtimeBridge from '@/components/PostRealtimeBridge';
import UnreadResponsesNotifier from '@/components/UnreadResponsesNotifier';
import { attachAuthorProfiles } from '@/lib/post-authors';

type ResponseRow = {
    id: string;
    post_id: string;
    author_id: string;
    created_at: string;
    content: string;
    is_read: boolean;
};

type ResponseProfileRow = {
    id: string;
    display_name?: string | null;
    avatar_url?: string | null;
};

type PublicGamificationProfileRow = {
    user_id: string;
    total_points: number;
    current_level: string;
    current_streak_days: number;
};

type PublicBadgeRow = {
    user_id: string;
    badge_key: string;
};

const FEEDBACK_MESSAGE_BY_CODE: Record<string, string> = {
    ok: 'Valoracion guardada correctamente.',
    'sin-permiso': 'Solo el autor de la necesidad puede valorar respuestas.',
    'ya-valorada': 'Esta respuesta ya fue valorada previamente.',
    'datos-invalidos': 'No se pudo procesar la valoracion por datos incompletos.',
    'tipo-invalido': 'El tipo de valoracion recibido no es valido.',
    'migracion-pendiente': 'Falta aplicar la migracion de gamificacion en la base de datos.',
    'perfil-faltante': 'Falta sincronizar el perfil de uno de los usuarios implicados.',
    'error-servidor': 'No se pudo guardar la valoracion por un error interno.',
};

function getTimeAgoEs(dateInput: string) {
    const now = new Date();
    const date = new Date(dateInput);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMins < 60) return `Publicado hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Publicado hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Publicado hace ${diffDays} d`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 5) return `Publicado hace ${diffWeeks} sem`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `Publicado hace ${diffMonths} mes${diffMonths === 1 ? '' : 'es'}`;
    const diffYears = Math.floor(diffDays / 365);
    return `Publicado hace ${diffYears} año${diffYears === 1 ? '' : 's'}`;
}

function getTagsToDisplay(tags: unknown, fallbackCategoryName?: string) {
    const realTags = Array.isArray(tags)
        ? tags
            .map((tag: unknown) => String(tag).trim().replace(/^#+/, '').replaceAll(/\s+/g, ''))
            .filter((tag: string) => tag.length > 0)
            .slice(0, 8)
        : [];

    if (realTags.length > 0) {
        return realTags;
    }

    return [fallbackCategoryName?.replaceAll(/\s+/g, '') || 'comunidad'];
}

async function markResponsesAsReadIfAuthor(
    supabase: Awaited<ReturnType<typeof createClient>>,
    isAuthor: boolean,
    postId: string,
) {
    if (!isAuthor) return;

    const { error: markReadError } = await supabase
        .from('responses')
        .update({ is_read: true })
        .eq('post_id', postId)
        .eq('is_read', false);

    if (markReadError) {
        console.error('Error marking responses as read on post detail', markReadError);
    }
}

async function hasUserResponded(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string | undefined,
    isAuthor: boolean,
    postId: string,
) {
    if (!userId || isAuthor) return false;

    const { data: myResp } = await supabase
        .from('responses')
        .select('id')
        .eq('post_id', postId)
        .eq('author_id', userId)
        .maybeSingle();

    return Boolean(myResp);
}

function getFeedbackState(searchParams: { feedback?: string; detalle?: string }) {
    const feedbackCode = searchParams.feedback || null;
    const feedbackDetail = searchParams.detalle || null;
    return {
        feedbackCode,
        feedbackDetail,
        feedbackMessage: feedbackCode ? FEEDBACK_MESSAGE_BY_CODE[feedbackCode] : null,
        feedbackIsError: Boolean(feedbackCode && feedbackCode !== 'ok'),
    };
}

async function loadInitialResponses(
    supabase: Awaited<ReturnType<typeof createClient>>,
    postId: string,
) {
    const { count } = await supabase.from('responses').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    const totalResponsesCount = count || 0;

    const { data: resps } = await supabase
        .from('responses')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(10);

    const safeResponses = (resps || []) as ResponseRow[];
    const authorIds = Array.from(new Set(safeResponses.map((response) => response.author_id).filter(Boolean)));

    if (authorIds.length === 0) {
        return { totalResponsesCount, initialResponses: safeResponses };
    }

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds);

    const { data: stats, error: statsError } = await supabase
        .from('public_gamification_profiles')
        .select('user_id, total_points, current_level, current_streak_days')
        .in('user_id', authorIds);

    if (statsError) {
        console.error('Error fetching initial response author stats', statsError);
    }

    const { data: badges, error: badgesError } = await supabase
        .from('public_user_badges')
        .select('user_id, badge_key')
        .in('user_id', authorIds)
        .eq('status', 'active')
        .order('earned_at', { ascending: false });

    if (badgesError) {
        console.error('Error fetching initial response author badges', badgesError);
    }

    if (profilesError) {
        console.error('Error fetching initial response authors', profilesError);
        return { totalResponsesCount, initialResponses: safeResponses };
    }

    const profilesById = new Map(((profiles || []) as ResponseProfileRow[]).map((profile) => [profile.id, profile]));
    const statsById = new Map(((stats || []) as PublicGamificationProfileRow[]).map((item) => [item.user_id, item]));
    const badgesById = new Map<string, string[]>();

    for (const badge of (badges || []) as PublicBadgeRow[]) {
        const current = badgesById.get(badge.user_id) || [];
        if (current.length < 3) current.push(badge.badge_key);
        badgesById.set(badge.user_id, current);
    }

    const initialResponses = safeResponses.map((response) => {
        const profile = profilesById.get(response.author_id);
        const statsForAuthor = statsById.get(response.author_id);
        return {
            ...response,
            author_name: profile?.display_name || null,
            author_avatar_url: profile?.avatar_url || null,
            author_total_points: statsForAuthor?.total_points || 0,
            author_current_level: statsForAuthor?.current_level || 'Semilla',
            author_streak_days: statsForAuthor?.current_streak_days || 0,
            author_active_badges: badgesById.get(response.author_id) || [],
        };
    });

    return { totalResponsesCount, initialResponses };
}

export default async function PostDetailPage({
    params,
    searchParams,
}: Readonly<{
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ feedback?: string; detalle?: string }>;
}>) {
    const supabase = await createClient();
    const { id: postId } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const { data: { user } } = await supabase.auth.getUser();

    const { data: post } = await supabase.from('posts').select('*').eq('id', postId).single();

    if (!post) {
        return <div className="p-12 text-center font-black text-2xl uppercase">Publicación no encontrada</div>;
    }

    const [postWithAuthor] = await attachAuthorProfiles(supabase, [post]);

    const cat = CATEGORIES.find(c => c.id === postWithAuthor.category_id);
    const isAuthor = user && postWithAuthor.author_id === user.id;
    const showUrgentBadge = isUrgentActive(postWithAuthor);
    const tagsToDisplay = getTagsToDisplay(postWithAuthor.tags, cat?.name);

    await markResponsesAsReadIfAuthor(supabase, Boolean(isAuthor), postId);

    let initialResponses = [];
    let totalResponsesCount = 0;
    if (isAuthor) {
        const loadedResponses = await loadInitialResponses(supabase, postId);
        initialResponses = loadedResponses.initialResponses;
        totalResponsesCount = loadedResponses.totalResponsesCount;
    }

    const hasResponded = await hasUserResponded(supabase, user?.id, Boolean(isAuthor), postId);

    const canRespond = user && !isAuthor && !hasResponded && !postWithAuthor.is_closed;
    const { feedbackDetail, feedbackMessage, feedbackIsError } = getFeedbackState(resolvedSearchParams);

    return (
        <>
        <PostRealtimeBridge postId={postId} />
        {isAuthor && <UnreadResponsesNotifier />}
        <main className="max-w-6xl mx-auto px-4 py-10 pb-32 animate-in fade-in duration-300">
            <Link href="/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors mb-8">
                <ArrowLeft size={16} strokeWidth={2.5} /> Volver
            </Link>

            {feedbackMessage && (
                <div className={`mb-8 rounded-2xl border px-4 py-3 text-sm font-semibold ${feedbackIsError ? 'border-[#f3ccc1] bg-[#fff3ef] text-[#7c3f2f]' : 'border-[#cfe5d2] bg-[#eef8ef] text-[#2f5e3b]'}`}>
                    <p>{feedbackMessage}</p>
                    {feedbackIsError && feedbackDetail && (
                        <p className="mt-1 text-xs font-mono opacity-75">detalle: {feedbackDetail}</p>
                    )}
                </div>
            )}

            <section className="space-y-6">
                <div className="bg-white rounded-[32px] p-6 md:p-10 border border-[#efe2d8] tn-card-shadow relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[color:rgba(165,107,82,0.08)] rounded-full -mr-20 -mt-20 blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="px-3 py-1 rounded-md bg-[#f8e0da] text-[#8c5a44] text-[10px] font-bold uppercase tracking-[0.18em]">
                                    {cat?.name || 'Comunidad'}
                                </span>
                                <UrgencyBadge
                                    priorityLevel={postWithAuthor.priority_level}
                                    urgentUntil={postWithAuthor.urgent_until}
                                    isClosed={postWithAuthor.is_closed}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 md:justify-end">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.14em] flex items-center gap-1.5 ${postWithAuthor.is_closed ? 'bg-[#ece5df] text-[#6d5a52]' : 'bg-[#eef3ee] text-[#526454]'}`}>
                                    <span className={`w-2 h-2 rounded-full ${postWithAuthor.is_closed ? 'bg-[#6d5a52]' : 'bg-[#627663]'}`} />
                                    {postWithAuthor.is_closed ? 'Cerrada' : 'Abierta'}
                                </span>
                                <span className="text-sm text-stone-400 font-medium">{getTimeAgoEs(postWithAuthor.created_at)}</span>
                            </div>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-bold text-[var(--tn-text)] leading-[1.04] tracking-tight mb-6 font-editorial break-words max-w-5xl">
                            {postWithAuthor.title}
                        </h2>
                        <p className="text-xl md:text-[2rem] text-[var(--tn-muted)] leading-[1.6] max-w-4xl whitespace-pre-wrap break-words">
                            {postWithAuthor.content}
                        </p>

                        <div className="mt-10 pt-6 border-t border-[#f3e7de] flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            {postWithAuthor.author_avatar_url ? (
                                <img
                                    src={postWithAuthor.author_avatar_url}
                                    alt={`Avatar de ${postWithAuthor.author_name}`}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-[#f4e7de] flex items-center justify-center text-[var(--tn-primary)] font-bold shadow-sm">
                                    {postWithAuthor.author_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <p className="text-xs uppercase tracking-[0.16em] text-stone-400 font-bold">Publicado por</p>
                                <p className="text-lg font-semibold text-[var(--tn-text)]">{postWithAuthor.author_name}</p>
                            </div>
                          </div>
                        </div>

                        {showUrgentBadge && (
                            <p className="mt-6 max-w-2xl rounded-2xl border border-[#f1c7bb] bg-[#fff5f0] px-4 py-3 text-sm text-[#8f5a4e]">
                                Esta necesidad aparece destacada como urgente durante 24 horas para facilitar respuestas mas rapidas de la comunidad.
                            </p>
                        )}
                        <div className="mt-10 flex flex-wrap gap-2">
                            {tagsToDisplay.map((tag: string) => (
                                <span key={tag} className="bg-[#e3e2e0] px-4 py-2 rounded-lg text-sm text-[#54433e] font-medium">#{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {isAuthor && (
                <LoadMoreResponses
                    postId={postId}
                    initialResponses={initialResponses}
                    totalCount={totalResponsesCount}
                />
            )}

            {canRespond && (
                <div className="bg-white p-6 md:p-10 border border-[#efe2d8] rounded-[28px] mt-16 tn-card-shadow">
                    <h4 className="font-editorial text-4xl text-[var(--tn-primary)] mb-2">Aporta tu perspectiva</h4>
                    <p className="font-semibold text-[var(--tn-muted)] text-sm mb-8">Solo tienes una oportunidad. Sé claro y útil.</p>

                    <form action={respondToPost}>
                        <input type="hidden" name="postId" value={postId} />
                        <textarea
                            name="content"
                            required
                            minLength={10}
                            placeholder="Escribe directamente lo que piensas..."
                            className="w-full p-6 bg-[#fcf8f4] border border-[#efe2d8] rounded-2xl min-h-[160px] resize-y text-lg focus:outline-none focus:border-[var(--tn-primary)] transition-colors mb-6"
                        />

                        <div className="flex justify-end">
                            <PendingSubmitButton
                                pendingText="Enviando..."
                                className="tn-button-primary px-8 py-4 text-base font-semibold rounded-full disabled:opacity-50"
                            >
                                Enviar Respuesta
                            </PendingSubmitButton>
                        </div>
                    </form>
                </div>
            )}

            {!isAuthor && postWithAuthor.is_closed && (
                <div className="bg-white border border-[#efe2d8] rounded-3xl p-12 text-center tn-card-shadow">
                    <h4 className="font-editorial text-4xl tracking-tight mb-4 text-[var(--tn-primary)]">Cerrada</h4>
                    <p className="text-lg text-[var(--tn-muted)]">El autor ha decidido no recibir más perspectivas.</p>
                </div>
            )}

            {!user && !isAuthor && !postWithAuthor.is_closed && (
                <div className="bg-white border border-[#efe2d8] rounded-3xl p-12 text-center tn-card-shadow">
                    <h4 className="font-editorial text-4xl text-[var(--tn-primary)] tracking-tight mb-4">Inicia Sesión</h4>
                    <p className="text-lg text-[var(--tn-muted)]">Debes iniciar sesión para dar tu perspectiva.</p>
                </div>
            )}

            {!isAuthor && hasResponded && !postWithAuthor.is_closed && (
                <div className="bg-white border border-[#efe2d8] rounded-3xl p-12 text-center tn-card-shadow">
                    <h4 className="font-editorial text-4xl tracking-tight mb-4 text-[#2a4f87]">Gracias</h4>
                    <p className="text-lg text-[#375783]">Ya has aportado tu perspectiva a esta necesidad.</p>
                </div>
            )}
        </main>

        {isAuthor && !postWithAuthor.is_closed && (
            <div className="fixed bottom-0 left-0 w-full p-6 flex justify-center pointer-events-none z-50">
                <div className="bg-[color:rgba(255,255,255,0.8)] backdrop-blur-2xl px-6 py-4 rounded-full shadow-[0_-12px_40px_rgba(27,28,27,0.08)] flex items-center gap-4 pointer-events-auto border border-[var(--tn-outline)]/10">
                    <form action={closePost}>
                        <input type="hidden" name="postId" value={postId} />
                        <PendingSubmitButton
                            pendingText="Cerrando..."
                            className="flex items-center gap-2 bg-[#f4d6d3] text-[#8e332c] hover:bg-[#eaa39b] hover:text-white transition-all px-8 py-3 rounded-full active:scale-95 duration-200 font-bold text-sm tracking-tight"
                        >
                            <Lock size={16} />
                            Cerrar publicación
                        </PendingSubmitButton>
                    </form>

                    <div className="h-6 w-px bg-[var(--tn-outline)]/30" />

                    <Link
                        href={`/post/${postId}/edit`}
                        className="p-3 bg-[#e3e2e0] text-[#54433e] rounded-full hover:bg-[var(--tn-primary)] hover:text-white transition-all"
                        aria-label="Editar publicación"
                    >
                        <Edit3 size={18} />
                    </Link>
                </div>
            </div>
        )}
        </>
    );
}