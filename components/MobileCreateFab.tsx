'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MobileCreateFab({ href, label }: { href: string; label: string }) {
    const pathname = usePathname();

    if (pathname === '/create') {
        return null;
    }

    return (
        <Link
            href={href}
            aria-label={label}
            className="tn-mobile-fab md:hidden"
        >
            <Plus size={28} strokeWidth={2.5} />
        </Link>
    );
}