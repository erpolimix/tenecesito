import { Heart, Users, Map, Lightbulb } from 'lucide-react';

export const CURRENT_USER_ID = 'u1'; // Simulamos que estamos logueados como el usuario 1

export const CATEGORIES = [
    { id: 'apoyo', name: 'Apoyo', desc: 'Emocional y personal', icon: Heart, bg: 'bg-[#FF6B6B]', text: 'text-black' },
    { id: 'relaciones', name: 'Vínculos', desc: 'Pareja, familia, amigos', icon: Users, bg: 'bg-[#4D96FF]', text: 'text-black' },
    { id: 'decisiones', name: 'Caminos', desc: 'Laboral, vida, futuro', icon: Map, bg: 'bg-[#6BCB77]', text: 'text-black' },
    { id: 'creatividad', name: 'Ideas', desc: 'Proyectos, bloqueos', icon: Lightbulb, bg: 'bg-[#FFD93D]', text: 'text-black' },
];

export const MOCK_POSTS = [
    {
        id: 'p1',
        authorId: 'u2',
        categoryId: 'decisiones',
        title: '¿Debería dejar mi trabajo estable por una startup?',
        content: 'Tengo 30 años y un trabajo muy seguro, pero me han ofrecido un puesto en una startup con mucho potencial pero alto riesgo. No sé qué hacer.',
        isClosed: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'p2',
        authorId: 'u1',
        categoryId: 'apoyo',
        title: 'Me siento estancado creativamente',
        content: 'Últimamente no encuentro motivación para seguir pintando. Todo lo que hago me parece repetitivo.',
        isClosed: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
];

export const MOCK_RESPONSES = [
    {
        id: 'r1',
        postId: 'p1',
        authorId: 'u1',
        content: 'A los 30 estás en el momento perfecto para tomar riesgos. Si no lo haces ahora, puede que te arrepientas más adelante. Evalúa tus ahorros como colchón.',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
    }
];