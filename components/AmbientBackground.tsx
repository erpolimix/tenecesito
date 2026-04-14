'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CAM_Z = 5;
const FOV_RAD = 75 * (Math.PI / 180);
const TAN_HALF_FOV = Math.tan(FOV_RAD / 2);
const OPACITY = 0.15;

// ─── Three.js / WebGL ─────────────────────────────────────────────────────────
function startThree(canvas: HTMLCanvasElement): (() => void) | null {
    let renderer: THREE.WebGLRenderer | null = null;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
        return null;
    }
    if (!renderer) return null;

    const isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Fondo transparente — el gradiente del body queda visible detrás del canvas
    renderer.setClearColor(0x000000, 0);

    const count = isMobile ? 800 : 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
        positions[i]     = (Math.random() - 0.5) * 15;
        positions[i + 1] = (Math.random() - 0.5) * 15;
        positions[i + 2] = (Math.random() - 0.5) * 15;
        // Tonos tierra/cacao — contrastan con el fondo crema del body
        colors[i]     = 0.55 + Math.random() * 0.20; // R
        colors[i + 1] = 0.35 + Math.random() * 0.20; // G
        colors[i + 2] = 0.25 + Math.random() * 0.15; // B
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: OPACITY,
        blending: THREE.NormalBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = CAM_Z;

    let targetX = 0, targetY = 0, currentX = 0, currentY = 0, frameId = 0;

    const updateCoords = (x: number, y: number) => {
        targetX = (x / window.innerWidth  - 0.5) * 1.5;
        targetY = (y / window.innerHeight - 0.5) * 1.5;
    };
    const onMouseMove = (e: MouseEvent) => updateCoords(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (t) updateCoords(t.clientX, t.clientY);
    };
    const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer!.setSize(window.innerWidth, window.innerHeight);
    };
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        particles.rotation.y += 0.0004;
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;
        particles.position.x =  currentX;
        particles.position.y = -currentY;
        renderer!.render(scene, camera);
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
        renderer!.dispose();
    };
}

// ─── Canvas 2D — proyección perspectiva idéntica a Three.js ──────────────────
function startCanvas2D(canvas: HTMLCanvasElement): () => void {
    const ctx = canvas.getContext('2d')!;
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 800 : 2000;

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
        pr[i] = 0.55 + Math.random() * 0.20;
        pg[i] = 0.35 + Math.random() * 0.20;
        pb[i] = 0.25 + Math.random() * 0.15;
    }

    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    let rotY = 0, targetX = 0, targetY = 0, currentX = 0, currentY = 0, frameId = 0;

    const updateCoords = (x: number, y: number) => {
        targetX = (x / W - 0.5) * 1.5;
        targetY = (y / H - 0.5) * 1.5;
    };
    const onMouseMove = (e: MouseEvent) => updateCoords(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (t) updateCoords(t.clientX, t.clientY);
    };
    const onResize = () => {
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W; canvas.height = H;
    };

    const animate = () => {
        frameId = requestAnimationFrame(animate);
        rotY += 0.0004;
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;

        // Fondo transparente — el gradiente del body queda visible detrás
        ctx.clearRect(0, 0, W, H);

        // Focal length equivalente a PerspectiveCamera(75)
        const focalLength = (H / 2) / TAN_HALF_FOV;
        const cosR = Math.cos(rotY), sinR = Math.sin(rotY);

        for (let i = 0; i < count; i++) {
            // Rotación Y equivalente a particles.rotation.y
            const rx =  px[i] * cosR + pz[i] * sinR;
            const rz = -px[i] * sinR + pz[i] * cosR;
            const depth = CAM_Z - rz;
            if (depth <= 0) continue;

            const scale = focalLength / depth;
            const sx = rx * scale + W / 2 + currentX * scale;
            const sy = -py[i] * scale + H / 2 + currentY * scale;
            const size = Math.max(0.3, 0.012 * focalLength / depth);

            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${Math.round(pr[i]*255)},${Math.round(pg[i]*255)},${Math.round(pb[i]*255)},${OPACITY})`;
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

// ─── Componente ───────────────────────────────────────────────────────────────
export default function AmbientBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const cleanup = startThree(canvas) ?? startCanvas2D(canvas);
        return cleanup;
    }, []);

    return <canvas ref={canvasRef} id="tn-bg-canvas" aria-hidden="true" />;
}
