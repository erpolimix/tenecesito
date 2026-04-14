export default function BrandLogo({
    className,
    iconOnly = false,
    subdued = false,
    iconSize = 40,
}: {
    className?: string;
    iconOnly?: boolean;
    subdued?: boolean;
    iconSize?: number;
}) {
    return (
        <span
            className={[
                'tn-brand-logo group inline-flex items-center gap-3',
                subdued ? 'tn-brand-logo-subdued' : '',
                className || '',
            ].filter(Boolean).join(' ')}
        >
            <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible shrink-0">
                <path
                    className="tn-brand-logo-path tn-brand-logo-path-1"
                    d="M30 70C30 70 20 50 40 30C60 10 90 30 70 50C50 70 30 70 30 70Z"
                    stroke="#8C5A44"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    className="tn-brand-logo-path tn-brand-logo-path-2"
                    d="M70 30C70 30 80 50 60 70C40 90 10 70 30 50C50 30 70 30 70 30Z"
                    stroke="#5D3D2E"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle cx="50" cy="50" r="4" fill="#8C5A44" className="tn-brand-logo-node" />
            </svg>
            {!iconOnly && (
                <span className="tn-brand-logo-wordmark text-2xl md:text-3xl tracking-tighter text-[var(--tn-primary)]">
                    TENECESITO
                </span>
            )}
        </span>
    );
}