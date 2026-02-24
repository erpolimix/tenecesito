import Link from 'next/link';
import { CATEGORIES } from '@/lib/constants';

export default function LandingPage() {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)] w-full relative overflow-hidden bg-black">
      {CATEGORIES.map(cat => {
        const Icon = cat.icon;
        return (
          <Link
            key={cat.id}
            href={`/feed?category=${cat.id}`}
            className={`group relative flex-1 flex flex-col items-center justify-center p-8 transition-all duration-500 md:hover:flex-[1.3] border-b-4 md:border-b-0 md:border-r-4 border-black last:border-0 ${cat.bg} ${cat.text}`}
          >
            <Icon size={80} strokeWidth={1.5} className="mb-8 opacity-90 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300" />
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-center">
              {cat.name}
            </h2>
            <p className="mt-6 font-bold uppercase tracking-widest text-sm border-2 border-black px-4 py-2 bg-white/20 backdrop-blur-sm">
              {cat.desc}
            </p>
          </Link>
        );
      })}
    </div>
  );
}