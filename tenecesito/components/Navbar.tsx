import Link from 'next/link';
import { Plus, LogIn, LogOut, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { signout } from '@/app/login/actions';

export default async function Navbar() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let unreadCount = 0;
    if (user) {
        const { data: unreadResponses } = await supabase
            .from('responses')
            .select('id, posts!inner(author_id)')
            .eq('posts.author_id', user.id)
            .eq('is_read', false);
        
        if (unreadResponses) {
            unreadCount = unreadResponses.length;
        }
    }

    const avatarUrl = user?.user_metadata?.avatar_url;
    const initialName = user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?';

    return (
        <nav className="w-full bg-white border-b-4 border-black z-40 sticky top-0">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="text-3xl font-black tracking-tighter hover:scale-105 transition-transform">
                    PERSPECTIVA
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Link href="/dashboard" className="relative flex items-center justify-center w-10 h-10 border-2 border-black rounded-full hover:bg-neutral-100 transition-colors mr-2">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 border-2 border-black text-[10px] font-black text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href="/create"
                                className="flex items-center gap-2 text-sm font-bold uppercase bg-[#FFD93D] border-2 border-black px-4 py-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                            >
                                <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Publicar</span>
                            </Link>

                            <div className="flex items-center gap-3 border-l-2 border-black pl-4 ml-2">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-black object-cover" />
                                ) : (
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-black bg-[#4D96FF] text-white font-black uppercase text-xl">
                                        {initialName}
                                    </div>
                                )}

                                <form action={signout}>
                                    <button title="Cerrar sesión" className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-full hover:bg-neutral-800 transition-colors">
                                        <LogOut size={16} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center gap-2 text-sm font-bold uppercase bg-[#FFD93D] border-2 border-black px-4 py-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                        >
                            <span className="hidden sm:inline">Acceder</span> <LogIn size={18} strokeWidth={3} />
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}