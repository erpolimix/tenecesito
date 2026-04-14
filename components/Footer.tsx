import BrandLogo from './BrandLogo';

export default function Footer() {
    return (
        <footer className="mt-40 pb-20 text-center">
            <BrandLogo iconOnly subdued iconSize={60} className="mx-auto mb-8 w-fit text-[var(--tn-primary)]/20" />
            <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-stone-400">
                TENECESITO • {new Date().getFullYear()}
            </p>
        </footer>
    );
}