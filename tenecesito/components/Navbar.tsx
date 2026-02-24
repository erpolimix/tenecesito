import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="w-full bg-white border-b-4 border-black z-40 sticky top-0">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                <Link href="/" className="text-3xl font-black tracking-tighter hover:scale-105 transition-transform">
                    PERSPECTIVA
                </Link>
                <Link
                    href="/create"
                    className="flex items-center gap-2 text-sm font-bold uppercase bg-[#FFD93D] border-2 border-black px-4 py-2 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
                >
                    <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Publicar necesidad</span>
                </Link>
            </div>
        </nav>
    );
}