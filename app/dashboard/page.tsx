import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Inbox, MessageSquare, ArrowRight } from 'lucide-react'
import { markPostResponsesAsRead, markAllAsRead } from './actions'
import { CATEGORIES } from '@/lib/constants'
import PendingSubmitButton from '@/components/PendingSubmitButton'

type DashboardResponse = {
    id: string;
    content: string;
    is_read: boolean;
};

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

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: posts } = await supabase
        .from('posts')
        .select(`
            *,
            responses (*)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

    const myPosts = posts || []
    const params = await searchParams
    const selectedStatus = params.status === 'closed' ? 'closed' : 'active'
    const visiblePosts = myPosts.filter((post) => selectedStatus === 'closed' ? post.is_closed : !post.is_closed)

    const totalUnread = myPosts.reduce((acc, post) => 
        acc + (post.responses?.filter((r: DashboardResponse) => !r.is_read).length || 0)
    , 0)

    return (
        <div className="max-w-5xl mx-auto px-5 md:px-6 py-10 md:py-12 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 gap-3">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors">
                    <ArrowLeft size={16} strokeWidth={2.5} /> Volver al inicio
                </Link>
                
                {totalUnread > 0 && (
                    <form action={markAllAsRead}>
                        <PendingSubmitButton
                            pendingText="Marcando..."
                            className="text-xs border border-[var(--tn-outline)]/35 bg-white px-4 py-2 rounded-full font-semibold uppercase hover:bg-[var(--tn-surface)] transition-colors"
                        >
                            Marcar todo como leído
                        </PendingSubmitButton>
                    </form>
                )}
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
                <div className="bg-[var(--tn-surface)] rounded-2xl border border-[var(--tn-outline)]/25 p-7 md:p-8 relative overflow-hidden">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold mb-2">Total de publicaciones</p>
                    <h2 className="font-editorial text-6xl leading-none text-[var(--tn-primary)]">{myPosts.length}</h2>
                    <p className="text-sm text-[var(--tn-muted)] mt-3">Has compartido tus necesidades con la comunidad.</p>
                </div>
                <div className="bg-[#dff0e2] rounded-2xl border border-[#c7dfcc] p-7 md:p-8 relative overflow-hidden">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold mb-2">Respuestas nuevas</p>
                    <h2 className="font-editorial text-6xl leading-none text-[var(--tn-primary)]">{String(totalUnread).padStart(2, '0')}</h2>
                    <p className="text-sm text-[var(--tn-muted)] mt-3">Pendientes de revisión en tus publicaciones.</p>
                </div>
            </section>

            <div className="flex gap-3 mb-8">
                <Link
                    href="/dashboard?status=active"
                    className={`px-6 py-3 rounded-full text-sm font-semibold transition-colors ${selectedStatus === 'active' ? 'bg-[var(--tn-muted)] text-white' : 'bg-[var(--tn-surface-strong)] text-[var(--tn-muted)] hover:bg-[var(--tn-surface)]'}`}
                >
                    Activas
                </Link>
                <Link
                    href="/dashboard?status=closed"
                    className={`px-6 py-3 rounded-full text-sm font-semibold transition-colors ${selectedStatus === 'closed' ? 'bg-[var(--tn-muted)] text-white' : 'bg-[var(--tn-surface-strong)] text-[var(--tn-muted)] hover:bg-[var(--tn-surface)]'}`}
                >
                    Cerradas
                </Link>
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
                        const responseCountLabel = unreadResponses.length > 0
                            ? `${unreadResponses.length} respuesta${unreadResponses.length === 1 ? '' : 's'} nueva${unreadResponses.length === 1 ? '' : 's'}`
                            : 'Sin respuestas nuevas'
                        
                        return (
                            <div key={post.id} className="bg-[var(--tn-surface)] rounded-2xl border border-[var(--tn-outline)]/25 p-6 md:p-8 hover:bg-[var(--tn-surface-strong)] transition-colors group">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-[var(--tn-muted)] font-medium">
                                            <span>{getTimeAgoEs(post.created_at)}</span>
                                            <span className="w-1 h-1 bg-[var(--tn-outline)]/60 rounded-full" />
                                            <span className={`${cat?.softText || 'text-[var(--tn-primary)]'} font-semibold`}>{cat?.name}</span>
                                        </div>
                                        <h3 className="font-editorial text-3xl md:text-4xl leading-tight text-[var(--tn-text)]">
                                            <Link href={`/post/${post.id}`} className="hover:text-[var(--tn-primary)] transition-colors">
                                                {post.title}
                                            </Link>
                                        </h3>
                                        <p className="text-[var(--tn-muted)] leading-[1.6] max-w-2xl">
                                            {excerpt(post.content)}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-start md:items-end gap-3">
                                        {unreadResponses.length > 0 ? (
                                            <form action={markPostResponsesAsRead}>
                                                <input type="hidden" name="postId" value={post.id} />
                                                <PendingSubmitButton
                                                    pendingText="Marcando..."
                                                    className="bg-[#ffe4dc] text-[#7a3a2a] px-4 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2"
                                                >
                                                    <MessageSquare size={14} />
                                                    {responseCountLabel}
                                                </PendingSubmitButton>
                                            </form>
                                        ) : (
                                            <div className="text-[var(--tn-outline)] font-medium text-sm px-4 py-2">
                                                {responseCountLabel}
                                            </div>
                                        )}

                                        <Link href={`/post/${post.id}`} className="text-[var(--tn-outline)] group-hover:text-[var(--tn-primary)] transition-colors mt-1">
                                            <ArrowRight size={18} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
