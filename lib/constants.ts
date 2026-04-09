import { Heart, Users, Map, Lightbulb } from 'lucide-react';

export const CATEGORIES = [
    {
        id: 'apoyo',
        name: 'Apoyo',
        desc: 'Emocional y personal',
        icon: Heart,
        bg: 'bg-[#FF6B6B]',
        text: 'text-black',
        softBg: 'bg-[#ffe2e0]',
        softText: 'text-[#8b4b42]'
    },
    {
        id: 'relaciones',
        name: 'Vínculos',
        desc: 'Pareja, familia, amigos',
        icon: Users,
        bg: 'bg-[#4D96FF]',
        text: 'text-black',
        softBg: 'bg-[#e1ecff]',
        softText: 'text-[#3f5f93]'
    },
    {
        id: 'decisiones',
        name: 'Caminos',
        desc: 'Laboral, vida, futuro',
        icon: Map,
        bg: 'bg-[#6BCB77]',
        text: 'text-black',
        softBg: 'bg-[#e0f4e3]',
        softText: 'text-[#3f6b49]'
    },
    {
        id: 'creatividad',
        name: 'Ideas',
        desc: 'Proyectos, bloqueos',
        icon: Lightbulb,
        bg: 'bg-[#FFD93D]',
        text: 'text-black',
        softBg: 'bg-[#fff3cf]',
        softText: 'text-[#7d6423]'
    },
];