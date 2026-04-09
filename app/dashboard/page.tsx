import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Inbox, MessageSquare, ArrowRight, FileText, MessageCircleMore } from 'lucide-react'
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
        <main className="max-w-4xl mx-auto px-6 pt-10 pb-32 animate-in fade-in duration-300">
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-[#f5f3f1] p-8 rounded-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <FileText size={128} strokeWidth={1.6} />
                    </div>
                    <p className="text-[#546258] font-medium tracking-wide text-xs uppercase mb-2">Total de publicaciones</p>
                    <h2 className="font-editorial text-5xl font-bold text-[#91462e]">{myPosts.length}</h2>
                    <p className="text-[#54433e] text-sm mt-4 leading-relaxed">Has compartido {myPosts.length} necesidades con la comunidad.</p>
                </div>
                <div className="bg-[#d5e3d7] p-8 rounded-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <MessageCircleMore size={128} strokeWidth={1.6} />
                    </div>
                    <p className="text-[#58665c] font-medium tracking-wide text-xs uppercase mb-2">Respuestas nuevas</p>
                    <h2 className="font-editorial text-5xl font-bold text-[#58665c]">{String(totalUnread).padStart(2, '0')}</h2>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#91462e] rounded-full animate-pulse" />
                        <p className="text-[#58665c] text-sm font-medium">Pendientes de revisión</p>
                    </div>
                </div>
            </section>

            <div className="flex gap-3 mb-8">
                <Link
                    href="/dashboard?status=active"
                    className={`px-8 py-3 rounded-full text-sm font-bold tracking-tight shadow-sm transition-transform active:scale-95 ${selectedStatus === 'active' ? 'bg-[#546258] text-white' : 'bg-[#e3e2e0] text-[#54433e] hover:bg-[#dbdad8]'}`}
                >
                    Activas
                </Link>
                <Link
                    href="/dashboard?status=closed"
                    className={`px-8 py-3 rounded-full text-sm font-bold tracking-tight shadow-sm transition-transform active:scale-95 ${selectedStatus === 'closed' ? 'bg-[#546258] text-white' : 'bg-[#e3e2e0] text-[#54433e] hover:bg-[#dbdad8]'}`}
                >
                    Cerradas
                </Link>

                {totalUnread > 0 && (
                    <form action={markAllAsRead} className="ml-auto">
                        <PendingSubmitButton
                            pendingText="Marcando..."
                            className="px-5 py-3 rounded-full text-xs font-semibold uppercase border border-[#dac1ba] text-[#54433e] bg-white hover:bg-[#efeeec] transition-colors"
                        >
                            Marcar todo como leído
                        </PendingSubmitButton>
                    </form>
                )}
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
                            <div key={post.id} className={`bg-[#f5f3f1] p-6 md:p-8 rounded-lg hover:bg-[#efeeec] transition-all duration-300 group cursor-pointer ${unreadResponses.length === 0 ? 'opacity-80' : ''}`}>
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-[#546258] font-medium">
                                            <span>{getTimeAgoEs(post.created_at)}</span>
                                            <span className="w-1 h-1 bg-[#dac1ba] rounded-full" />
                                            <span className="text-[#af5e44] font-semibold">{cat?.name}</span>
                                        </div>
                                        <h3 className="font-editorial text-2xl md:text-[2rem] leading-tight text-[#1b1c1b]">
                                            <Link href={`/post/${post.id}`} className="hover:text-[var(--tn-primary)] transition-colors">
                                                {post.title}
                                            </Link>
                                        </h3>
                                        <p className="text-[#54433e] leading-[1.6] max-w-2xl">
                                            {excerpt(post.content)}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-start md:items-end gap-3">
                                        {unreadResponses.length > 0 ? (
                                            <form action={markPostResponsesAsRead}>
                                                <input type="hidden" name="postId" value={post.id} />
                                                <PendingSubmitButton
                                                    pendingText="Marcando..."
                                                    className="bg-[#ffdbd0] px-4 py-2 rounded-full flex items-center gap-2 shadow-sm"
                                                >
                                                    <MessageSquare size={16} className="text-[#91462e]" />
                                                    <span className="text-[#76321c] font-bold text-sm">{responseCountLabel}</span>
                                                </PendingSubmitButton>
                                            </form>
                                        ) : (
                                            <div className="text-[#87736d] font-medium text-sm px-4 py-2">
                                                {responseCountLabel}
                                            </div>
                                        )}

                                        <Link href={`/post/${post.id}`} className="text-[#dac1ba] group-hover:text-[#91462e] transition-colors mt-1">
                                            <ArrowRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </main>
    )
}
