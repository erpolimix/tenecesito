export default function BrandLogo({
    className,
    withSubtitle = false,
    subtle = false,
}: {
    className?: string;
    withSubtitle?: boolean;
    subtle?: boolean;
}) {
    return (
        <svg
            viewBox="0 0 640 132"
            aria-label="TENECESITO"
            role="img"
            className={['tn-brand-logo', subtle ? 'tn-brand-logo-subtle' : '', className || ''].filter(Boolean).join(' ')}
        >
            <text x="6" y="82" className="tn-brand-logo-text">
                TENECESITO
            </text>
            {withSubtitle && (
                <g className="tn-brand-logo-subtitle">
                    <path d="M64 101h78" className="tn-brand-logo-line" />
                    <text x="154" y="110" className="tn-brand-logo-caption">
                        COMUNIDAD DE APOYO
                    </text>
                </g>
            )}
        </svg>
    );
}