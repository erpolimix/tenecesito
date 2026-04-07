import { Heart, Users, Map, Lightbulb } from 'lucide-react';

export const CATEGORIES = [
    { id: 'apoyo', name: 'Apoyo', desc: 'Emocional y personal', icon: Heart, bg: 'bg-[#FF6B6B]', text: 'text-black' },
    { id: 'relaciones', name: 'Vínculos', desc: 'Pareja, familia, amigos', icon: Users, bg: 'bg-[#4D96FF]', text: 'text-black' },
    { id: 'decisiones', name: 'Caminos', desc: 'Laboral, vida, futuro', icon: Map, bg: 'bg-[#6BCB77]', text: 'text-black' },
    { id: 'creatividad', name: 'Ideas', desc: 'Proyectos, bloqueos', icon: Lightbulb, bg: 'bg-[#FFD93D]', text: 'text-black' },
];