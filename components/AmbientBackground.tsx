'use client';

import { useEffect, useRef } from 'react';

// Proyección en perspectiva idéntica a Three.js PerspectiveCamera(75)
const FOV_RAD = 75 * (Math.PI / 180);
const TAN_HALF_FOV = Math.tan(FOV_RAD / 2);
const CAM_Z = 5;

function setupThreeJs(canvas: HTMLCanvasElement): (() => void) | null {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const THREE = require('three');

    let renderer: { setSize: (w: number, h: number) => void; setPixelRatio: (r: number) => void; setClearColor: (c: number, a: number) => void; render: (s: unknown, c: unknown) => void; dispose: () => void; };
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
        return null;
    }

    const isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xfdfaf7, 1);

    const count = isMobile ? 800 : 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
        positions[i]     = (Math.random() - 0.5) * 15;
        positions[i + 1] = (Math.random() - 0.5) * 15;
        positions[i + 2] = (Math.random() - 0.5) * 15;
        colors[i]     = 0.92 + Math.random() * 0.05;
        colors[i + 1] = 0.85 + Math.random() * 0.05;
        colors[i + 2] = 0.80 + Math.random() * 0.05;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.18, blending: THREE.NormalBlending });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = CAM_Z;

    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, frameId = 0;
    const updateCoords = (x: number, y: number) => {
        targetX = (x / window.innerWidth - 0.5) * 1.2;
        targetY = (y / window.innerHeight - 0.5) * 1.2;
    };
    const onMouseMove = (e: MouseEvent) => updateCoords(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) updateCoords(t.clientX, t.clientY); };
    const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        particles.rotation.y += 0.0004;
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;
        particles.position.x = currentX;
        particles.position.y = -currentY;
        renderer.render(scene, camera);
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
        geometry.dispose();
        material.dispose();
        renderer.dispose();
    };
}

function setupCanvas2D(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d')!;
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 800 : 2000;

    // Partículas en espacio 3D idéntico al de Three.js
    const px = new Float32Array(count);
    const py = new Float32Array(count);
    const pz = new Float32Array(count);
    const pr = new Float32Array(count);
    const pg = new Float32Array(count);
    const pb = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        px[i] = (Math.random() - 0.5) * 15;
        py[i] = (Math.random() - 0.5) * 15;
        pz[i] = (Math.random() - 0.5) * 15;
        pr[i] = 0.92 + Math.random() * 0.05;
        pg[i] = 0.85 + Math.random() * 0.05;
        pb[i] = 0.80 + Math.random() * 0.05;
    }

    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    let rotY = 0;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, frameId = 0;

    const updateCoords = (x: number, y: number) => {
        targetX = (x / W - 0.5) * 1.2;
        targetY = (y / H - 0.5) * 1.2;
    };
    const onMouseMove = (e: MouseEvent) => updateCoords(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (t) updateCoords(t.clientX, t.clientY); };
    const onResize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; };

    const animate = () => {
        frameId = requestAnimationFrame(animate);
        rotY += 0.0004;
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;

        // Fondo arena idéntico al setClearColor del renderer
        ctx.fillStyle = '#fdfaf7';
        ctx.fillRect(0, 0, W, H);

        // Longitud focal: igual a Three.js PerspectiveCamera(75)
        const focalLength = (H / 2) / TAN_HALF_FOV;
        const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
        const halfW = W / 2, halfH = H / 2;

        // Ordenar por profundidad para pintar de atrás hacia adelante
        const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => {
            const za = -px[a] * sinR + pz[a] * cosR;
            const zb = -px[b] * sinR + pz[b] * cosR;
            return za - zb; // más lejos primero
        });

        for (const i of order) {
            // Rotación Y igual a particles.rotation.y de Three.js
            const rx = px[i] * cosR + pz[i] * sinR;
            const rz = -px[i] * sinR + pz[i] * cosR;

            const depth = CAM_Z - rz;
            if (depth <= 0) continue;

            const scale = focalLength / depth;
            // Proyección + parallax (Three.js: particles.position.x/y)
            const sx = rx * scale + halfW + currentX * scale;
            const sy = -py[i] * scale + halfH + currentY * scale;

            // Tamaño en píxeles: material.size * focalLength / depth
            const size = Math.max(0.5, 0.05 * focalLength / depth);

            const r = Math.round(pr[i] * 255);
            const g = Math.round(pg[i] * 255);
            const b = Math.round(pb[i] * 255);

            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},0.18)`;
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
}

export default function AmbientBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Probar WebGL en canvas temporal para no contaminar el principal
        const probe = document.createElement('canvas');
        const webglAvailable = !!(probe.getContext('webgl2') ?? probe.getContext('webgl'));

        let cleanup: (() => void) | null = null;

        if (webglAvailable) {
            cleanup = setupThreeJs(canvas);
        }

        // Si Three.js falló o no hay WebGL, usar Canvas 2D con proyección perspectiva
        if (!cleanup) {
            cleanup = setupCanvas2D(canvas);
        }

        return () => cleanup?.();
    }, []);

    return <canvas ref={canvasRef} id="tn-bg-canvas" aria-hidden="true" />;
}
