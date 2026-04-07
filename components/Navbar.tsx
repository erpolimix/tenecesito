import Link from 'next/link';
import { Plus, User, LogOut, Bell } from 'lucide-react';
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                <Link href="/" className="text-xl sm:text-3xl font-black tracking-tighter hover:scale-105 transition-transform flex-shrink-0">
                    TENECESITO
                </Link>
                <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
                    {user ? (
                        <>
                            <Link href="/dashboard" className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border-2 border-black rounded-full hover:bg-neutral-100 transition-colors">
                                <Bell size={20} strokeWidth={3} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 border-2 border-black text-[10px] font-black text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>

                            <Link
                                href="/create"
                                className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold uppercase bg-[#FFD93D] border-2 border-black px-2 py-1.5 sm:px-4 sm:py-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                            >
                                <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Publicar</span>
                            </Link>

                            <div className="flex items-center gap-2 sm:gap-3 sm:border-l-2 border-black sm:pl-4">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-black object-cover" />
                                ) : (
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border-2 border-black bg-[#4D96FF] text-white font-black uppercase text-lg sm:text-xl">
                                        {initialName}
                                    </div>
                                )}

                                <form action={signout}>
                                    <button title="Cerrar sesión" className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-black text-white rounded-full hover:bg-red-600 transition-colors">
                                        <LogOut size={16} strokeWidth={3} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <Link
                            href="/login"
                            className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm font-bold uppercase bg-[#FFD93D] border-2 border-black px-2 py-1.5 sm:px-4 sm:py-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                        >
                            <span className="hidden sm:inline">Acceder</span> <User size={18} strokeWidth={3} />
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}