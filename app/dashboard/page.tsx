import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Inbox } from 'lucide-react'
import { markPostResponsesAsRead, markAllAsRead } from './actions'
import { CATEGORIES } from '@/lib/constants'

export default async function DashboardPage() {
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

    const totalUnread = myPosts.reduce((acc, post) => 
        acc + (post.responses?.filter((r: any) => !r.is_read).length || 0)
    , 0)

    return (
        <div className="max-w-5xl mx-auto px-5 md:px-6 py-10 md:py-12 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 gap-3">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tn-muted)] hover:text-[var(--tn-primary)] transition-colors">
                    <ArrowLeft size={16} strokeWidth={2.5} /> Volver al inicio
                </Link>
                
                {totalUnread > 0 && (
                    <form action={markAllAsRead}>
                        <button className="text-xs border border-[var(--tn-outline)]/35 bg-white px-4 py-2 rounded-full font-semibold uppercase hover:bg-[var(--tn-surface)] transition-colors">
                            Marcar todo como leído
                        </button>
                    </form>
                )}
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
                <div className="bg-white/85 rounded-3xl border border-[var(--tn-outline)]/35 p-7 md:p-8 shadow-[0_12px_34px_rgba(27,28,27,0.08)]">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold mb-2">Total de publicaciones</p>
                    <h2 className="font-editorial text-6xl leading-none text-[var(--tn-primary)]">{myPosts.length}</h2>
                    <p className="text-sm text-[var(--tn-muted)] mt-3">Has compartido tus necesidades con la comunidad.</p>
                </div>
                <div className="bg-[var(--tn-surface)] rounded-3xl border border-[var(--tn-outline)]/25 p-7 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--tn-muted)] font-semibold mb-2">Respuestas nuevas</p>
                    <h2 className="font-editorial text-6xl leading-none text-[var(--tn-primary)]">{String(totalUnread).padStart(2, '0')}</h2>
                    <p className="text-sm text-[var(--tn-muted)] mt-3">Pendientes de revisión en tus publicaciones.</p>
                </div>
            </section>

            {myPosts.length === 0 ? (
                <div className="border border-[var(--tn-outline)]/35 bg-white/70 rounded-3xl p-12 text-center">
                    <Inbox size={42} className="mx-auto mb-4 text-[var(--tn-muted)]" />
                    <p className="font-editorial text-4xl text-[var(--tn-primary)]">No has publicado nada todavía.</p>
                    <Link href="/create" className="inline-block mt-8 bg-[var(--tn-primary)] text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity">
                        Crear Necesidad
                    </Link>
                </div>
            ) : (
                <div className="space-y-7">
                    {myPosts.map((post) => {
                        const unreadResponses = post.responses?.filter((r: any) => !r.is_read) || []
                        const allReadResponses = post.responses?.filter((r: any) => r.is_read) || []
                        const readResponses = allReadResponses.slice(0, 3)
                        const hiddenCount = allReadResponses.length - 3
                        const cat = CATEGORIES.find(c => c.id === post.category_id)
                        
                        return (
                            <div key={post.id} className="bg-white/80 rounded-3xl border border-[var(--tn-outline)]/35 p-6 md:p-8 shadow-[0_12px_30px_rgba(27,28,27,0.08)]">
                                
                                <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 border-b border-[var(--tn-outline)]/25 pb-6 mb-6">
                                   <div>
                                    <span className={`inline-block text-xs font-semibold uppercase tracking-[0.14em] px-3 py-1 rounded-full mb-3 border border-black/10 ${cat?.softBg || 'bg-[#ece7e2]'} ${cat?.softText || 'text-[#5c524d]'}`}>
                                        {cat?.name}
                                    </span>
                                    <h2 className="font-editorial text-4xl font-bold tracking-tight leading-tight">
                                        <Link href={`/post/${post.id}`} className="hover:text-[var(--tn-primary)] transition-colors">{post.title}</Link>
                                    </h2>
                                   </div>
                                   {unreadResponses.length > 0 && (
                                       <form action={markPostResponsesAsRead}>
                                           <input type="hidden" name="postId" value={post.id} />
                                           <button className="bg-[var(--tn-primary)] text-white text-xs font-semibold uppercase tracking-[0.12em] px-4 py-2 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-2">
                                                <Check size={14} strokeWidth={2.8} /> {unreadResponses.length} nuevas, marcar
                                           </button>
                                       </form>
                                   )}
                                </div>

                                <div className="space-y-6">
                                    {(unreadResponses.length === 0 && readResponses.length === 0) && (
                                        <div className="bg-[var(--tn-surface)] p-6 border border-[var(--tn-outline)]/25 rounded-2xl text-center">
                                            <p className="font-semibold text-[var(--tn-muted)]">Sin perspectivas aún</p>
                                        </div>
                                    )}

                                    {/* Unread Responses first */}
                                    {unreadResponses.map((r: any) => (
                                        <div key={r.id} className="relative bg-[#fff4d6] border border-[#f2ddb3] rounded-2xl p-6">
                                            <span className="absolute -top-3 -right-1 bg-[var(--tn-primary)] text-white text-[10px] uppercase font-semibold px-2 py-1 rounded-full">Nuevo</span>
                                            <p className="text-base md:text-lg">{r.content}</p>
                                        </div>
                                    ))}

                                    {/* Read Responses */}
                                    {readResponses.map((r: any) => (
                                        <div key={r.id} className="bg-white border border-[var(--tn-outline)]/25 rounded-2xl p-6">
                                            <p className="text-base md:text-lg text-[#3f3f3f]">{r.content}</p>
                                        </div>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <div className="text-center pt-2">
                                            <Link href={`/post/${post.id}`} className="text-sm font-semibold underline hover:text-[var(--tn-primary)] transition-colors">
                                                ...y {hiddenCount} perspectivas antiguas más. Ver todas.
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
