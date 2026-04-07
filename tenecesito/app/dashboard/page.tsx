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
        <div className="max-w-5xl mx-auto px-6 py-12 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase hover:underline">
                    <ArrowLeft size={16} strokeWidth={3} /> Volver al Inicio
                </Link>
                
                {totalUnread > 0 && (
                    <form action={markAllAsRead}>
                        <button className="text-xs border-2 border-black bg-white px-4 py-2 font-black uppercase hover:bg-[#FFD93D] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            Marcar todo como leído
                        </button>
                    </form>
                )}
            </div>

            <div className="mb-12">
                <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tighter leading-tight mb-4 flex items-center gap-4">
                    Mis Necesidades
                </h1>
                <p className="text-xl font-bold uppercase text-neutral-500">
                    Aquí encontrarás todas tus publicaciones y las respuestas recibidas en un solo lugar.
                </p>
            </div>

            {myPosts.length === 0 ? (
                <div className="border-4 border-black border-dashed bg-neutral-50 p-12 text-center">
                    <Inbox size={48} className="mx-auto mb-4 text-neutral-400" />
                    <p className="text-2xl font-black uppercase text-neutral-400">No has publicado nada todavía.</p>
                    <Link href="/create" className="inline-block mt-8 bg-[#FFD93D] border-4 border-black px-6 py-3 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-black">
                        Crear Necesidad
                    </Link>
                </div>
            ) : (
                <div className="space-y-16">
                    {myPosts.map((post) => {
                        const unreadResponses = post.responses?.filter((r: any) => !r.is_read) || []
                        const allReadResponses = post.responses?.filter((r: any) => r.is_read) || []
                        const readResponses = allReadResponses.slice(0, 3)
                        const hiddenCount = allReadResponses.length - 3
                        const cat = CATEGORIES.find(c => c.id === post.category_id)
                        
                        return (
                            <div key={post.id} className="border-4 border-black p-6 md:p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                                
                                <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 border-b-4 border-black pb-6 mb-6">
                                   <div>
                                    <span className={`inline-block text-xs font-black uppercase px-3 py-1 border-2 border-black mb-3 ${cat?.bg}`}>
                                        {cat?.name}
                                    </span>
                                    <h2 className="text-3xl font-black uppercase tracking-tight">
                                        <Link href={`/post/${post.id}`} className="hover:underline hover:text-[#4D96FF] transition-colors">{post.title}</Link>
                                    </h2>
                                   </div>
                                   {unreadResponses.length > 0 && (
                                       <form action={markPostResponsesAsRead}>
                                           <input type="hidden" name="postId" value={post.id} />
                                           <button className="bg-red-500 text-white border-2 border-black text-xs font-black uppercase px-4 py-2 hover:opacity-80 transition-opacity whitespace-nowrap flex items-center gap-2">
                                                <Check size={14} strokeWidth={3} /> {unreadResponses.length} Nuevas, Marcar
                                           </button>
                                       </form>
                                   )}
                                </div>

                                <div className="space-y-6">
                                    {(unreadResponses.length === 0 && readResponses.length === 0) && (
                                        <div className="bg-neutral-100 p-6 border-2 border-dashed border-neutral-300 text-center">
                                            <p className="font-bold uppercase text-neutral-500">Sin perspectivas aún</p>
                                        </div>
                                    )}

                                    {/* Unread Responses first */}
                                    {unreadResponses.map((r: any) => (
                                        <div key={r.id} className="relative bg-[#FFD93D]/20 border-l-8 border-[#FFD93D] border-y-2 border-r-2 border-black p-6">
                                            <span className="absolute -top-3 -right-2 bg-red-500 text-white text-[10px] uppercase font-black px-2 py-1 border-2 border-black rotate-3">Nuevo</span>
                                            <p className="text-lg font-medium">{r.content}</p>
                                        </div>
                                    ))}

                                    {/* Read Responses */}
                                    {readResponses.map((r: any) => (
                                        <div key={r.id} className="bg-neutral-50 border-2 border-black p-6">
                                            <p className="text-lg font-medium text-neutral-700">{r.content}</p>
                                        </div>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <div className="text-center pt-2">
                                            <Link href={`/post/${post.id}`} className="text-sm font-bold uppercase underline hover:text-[#4D96FF] transition-colors">
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
