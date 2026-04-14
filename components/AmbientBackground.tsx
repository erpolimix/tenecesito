'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function AmbientBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const isMobileViewport = window.innerWidth < 768;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        const geometry = new THREE.BufferGeometry();
        const particleCount = isMobileViewport ? 800 : 1500;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let index = 0; index < particleCount * 3; index += 3) {
            positions[index] = (Math.random() - 0.5) * 15;
            positions[index + 1] = (Math.random() - 0.5) * 15;
            positions[index + 2] = (Math.random() - 0.5) * 15;

            colors[index] = 0.93 + Math.random() * 0.05;
            colors[index + 1] = 0.83 + Math.random() * 0.08;
            colors[index + 2] = 0.74 + Math.random() * 0.1;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: isMobileViewport ? 0.06 : 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.34,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);
        camera.position.z = 5;

        let mouseX = 0;
        let mouseY = 0;
        let frameId = 0;

        const updateCoords = (clientX: number, clientY: number) => {
            mouseX = (clientX / window.innerWidth - 0.5) * 0.8;
            mouseY = (clientY / window.innerHeight - 0.5) * 0.8;
        };

        const onMouseMove = (event: MouseEvent) => {
            updateCoords(event.clientX, event.clientY);
        };

        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            if (!touch) return;
            updateCoords(touch.clientX, touch.clientY);
        };

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        };

        const animate = () => {
            frameId = window.requestAnimationFrame(animate);

            particles.rotation.y += 0.0009;
            particles.rotation.x += 0.00035;
            particles.position.x += (mouseX - particles.position.x) * 0.035;
            particles.position.y += (-mouseY - particles.position.y) * 0.035;

            renderer.render(scene, camera);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('resize', onResize);
        animate();

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('resize', onResize);
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        };
    }, []);

    return <canvas ref={canvasRef} id="tn-bg-canvas" aria-hidden="true" />;
}