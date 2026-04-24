import React from 'react';

type BadgeVariant = 'nivel' | 'racha' | 'especialista' | 'reveladora';

type BadgeTone = 'apoyo' | 'relaciones' | 'decisiones' | 'creatividad' | 'neutral';

const tonePalette: Record<BadgeTone, { bg: string; ring: string; accent: string; ink: string }> = {
    apoyo: { bg: '#FFE7E2', ring: '#F3B6AB', accent: '#D96451', ink: '#5D2E27' },
    relaciones: { bg: '#E4EEFF', ring: '#B8CEFA', accent: '#4D7ED9', ink: '#243A62' },
    decisiones: { bg: '#E4F7E8', ring: '#B8E1C1', accent: '#49A55D', ink: '#24462A' },
    creatividad: { bg: '#FFF6D9', ring: '#F2DE97', accent: '#D2A91A', ink: '#5F4C0F' },
    neutral: { bg: '#F2EBE5', ring: '#DCCFC5', accent: '#8C5A44', ink: '#4B352B' },
};

function SparkShape({ color }: Readonly<{ color: string }>) {
    return (
        <path
            d="M16 5L17.9 11.1L24 13L17.9 14.9L16 21L14.1 14.9L8 13L14.1 11.1L16 5Z"
            fill={color}
        />
    );
}

function PathForVariant({ variant, ink }: Readonly<{ variant: BadgeVariant; ink: string }>) {
    if (variant === 'nivel') {
        return (
            <>
                <path d="M9 18L16 8L23 18" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 18H20" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
            </>
        );
    }

    if (variant === 'racha') {
        return (
            <>
                <path d="M12 7C12 7 9 11 9 14C9 17.3 11.7 20 15 20C18.3 20 21 17.3 21 14C21 10.5 18 8 16.8 5.6" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15.2 9.4C15.2 9.4 13.4 11.4 13.4 13.4C13.4 15.1 14.7 16.4 16.4 16.4" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
            </>
        );
    }

    if (variant === 'especialista') {
        return (
            <>
                <path d="M16 7L19.2 13.2L26 14.3L21 19L22.2 25.7L16 22.4L9.8 25.7L11 19L6 14.3L12.8 13.2L16 7Z" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <circle cx="16" cy="16" r="2.2" fill={ink} />
            </>
        );
    }

    return (
        <>
            <SparkShape color={ink} />
            <circle cx="16" cy="16" r="12.5" stroke={ink} strokeOpacity="0.3" strokeWidth="1.2" fill="none" />
        </>
    );
}

export default function GamificationBadgeIcon({
    variant,
    tone = 'neutral',
    size = 28,
    inactive = false,
    title,
}: Readonly<{
    variant: BadgeVariant;
    tone?: BadgeTone;
    size?: number;
    inactive?: boolean;
    title?: string;
}>) {
    const palette = tonePalette[tone];

    return (
        <span
            className="inline-flex items-center justify-center rounded-full border"
            style={{
                width: size,
                height: size,
                backgroundColor: inactive ? '#ECE6E1' : palette.bg,
                borderColor: inactive ? '#D8CCC2' : palette.ring,
                boxShadow: inactive ? 'none' : '0 4px 12px rgba(60, 33, 20, 0.12)',
                opacity: inactive ? 0.6 : 1,
            }}
            title={title}
            aria-label={title}
        >
            <svg width={Math.round(size * 0.78)} height={Math.round(size * 0.78)} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                    <radialGradient id="tnBadgeGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 8) rotate(135) scale(18)">
                        <stop stopColor={inactive ? '#FFFFFF' : palette.accent} stopOpacity={inactive ? 0.2 : 0.38} />
                        <stop offset="1" stopColor={inactive ? '#FFFFFF' : palette.accent} stopOpacity="0" />
                    </radialGradient>
                </defs>
                <circle cx="16" cy="16" r="14" fill={inactive ? '#E5DDD7' : palette.bg} />
                <circle cx="16" cy="16" r="14" fill="url(#tnBadgeGlow)" />
                <circle cx="16" cy="16" r="13.2" stroke={inactive ? '#D0C4BA' : palette.ring} strokeWidth="1.6" />
                <PathForVariant variant={variant} ink={inactive ? '#8A796B' : palette.ink} />
            </svg>
        </span>
    );
}

export type { BadgeVariant, BadgeTone };
