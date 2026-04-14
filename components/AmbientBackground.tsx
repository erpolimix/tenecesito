'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    z: number; // depth 0..1 for size/opacity scaling
    vx: number;
    vy: number;
}

export default function AmbientBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const isMobile = window.innerWidth < 768;
        const COUNT = isMobile ? 600 : 1500;

        let W = window.innerWidth;
        let H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;

        // Spawn particles spread across full viewport
        const particles: Particle[] = Array.from({ length: COUNT }, () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            z: Math.random(), // depth
            vx: (Math.random() - 0.5) * 0.15,
            vy: (Math.random() - 0.5) * 0.15,
        }));

        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let frameId = 0;

        const updateCoords = (clientX: number, clientY: number) => {
            targetX = (clientX / W - 0.5) * 40;
            targetY = (clientY / H - 0.5) * 40;
        };

        const onMouseMove = (e: MouseEvent) => updateCoords(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (t) updateCoords(t.clientX, t.clientY);
        };

        const onResize = () => {
            W = window.innerWidth;
            H = window.innerHeight;
            canvas.width = W;
            canvas.height = H;
        };

        const animate = () => {
            frameId = requestAnimationFrame(animate);

            ctx.clearRect(0, 0, W, H);

            currentX += (targetX - currentX) * 0.05;
            currentY += (targetY - currentY) * 0.05;

            for (const p of particles) {
                // Drift
                p.x += p.vx + currentX * p.z * 0.012;
                p.y += p.vy + currentY * p.z * 0.012;

                // Wrap
                if (p.x < 0) p.x += W;
                if (p.x > W) p.x -= W;
                if (p.y < 0) p.y += H;
                if (p.y > H) p.y -= H;

                // Size and opacity by depth
                const size = 0.8 + p.z * 2.2;
                const opacity = 0.12 + p.z * 0.22;

                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                // Warm sand palette matching brand
                ctx.fillStyle = `rgba(${Math.round(238 + p.z * 12)}, ${Math.round(212 + p.z * 8)}, ${Math.round(188 + p.z * 10)}, ${opacity})`;
                ctx.fill();
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('resize', onResize);
        animate();

        return () => {
            cancelAnimationFrame(frameId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return <canvas ref={canvasRef} id="tn-bg-canvas" aria-hidden="true" />;
}