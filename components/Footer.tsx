import Link from 'next/link';
import BrandLogo from './BrandLogo';

export default function Footer() {
    return (
        <footer className="px-4 pb-8 pt-6 md:px-6 md:pb-10">
            <div className="max-w-7xl mx-auto rounded-[32px] border border-white/55 bg-white/70 px-5 py-7 backdrop-blur-xl shadow-[0_10px_35px_rgba(140,90,68,0.08)] md:px-8 md:py-8">
                <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                    <div className="max-w-xl">
                        <BrandLogo className="w-[240px] md:w-[320px]" withSubtitle subtle />
                        <p className="mt-4 text-sm leading-relaxed text-[var(--tn-muted)] md:text-base">
                            Un espacio para pedir ayuda con claridad, recibir perspectivas de la comunidad y avanzar sin exponerte de más.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-5 text-sm text-[var(--tn-muted)] md:flex md:items-center md:gap-8">
                        <Link href="/feed" className="font-semibold transition-colors hover:text-[var(--tn-primary)]">
                            Explorar
                        </Link>
                        <Link href="/comunidad" className="font-semibold transition-colors hover:text-[var(--tn-primary)]">
                            Comunidad
                        </Link>
                        <Link href="/create" className="font-semibold transition-colors hover:text-[var(--tn-primary)]">
                            Crear necesidad
                        </Link>
                        <Link href="/login" className="font-semibold transition-colors hover:text-[var(--tn-primary)]">
                            Entrar
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}