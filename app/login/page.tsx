'use client';

import { createBrowserClient } from '@supabase/ssr'
import { Lock, EyeOff } from 'lucide-react'

export default function LoginPage() {
    
  const handleGoogleLogin = async () => {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth/callback`,
        },
    })
  }

  return (
    <div className="bg-[var(--tn-bg)] text-[var(--tn-text)] animate-in fade-in duration-300">
      <main className="flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full">
        <div className="space-y-12">
          <div className="space-y-6">
            <h2 className="font-editorial text-5xl md:text-6xl text-[var(--tn-primary)] leading-[1.1] tracking-tight -ml-1">
              Bienvenido a tu espacio seguro
            </h2>
            <div className="w-12 h-1 bg-[var(--tn-primary-soft)] rounded-full opacity-30" />
            <p className="text-lg text-[var(--tn-muted)] leading-[1.6]">
              Accede con Google para entrar de forma segura. Tu correo no se muestra públicamente y limitamos la exposición de tus datos dentro de la app.
            </p>
          </div>

          <div className="space-y-8">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-4 bg-[var(--tn-surface-strong)] hover:bg-[var(--tn-surface)] active:scale-[0.98] transition-all py-5 px-6 rounded-xl group shadow-[0_12px_40px_rgba(27,28,27,0.06)]"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-lg">Continuar con Google</span>
            </button>

            <div className="flex items-center gap-4 opacity-20">
              <div className="flex-grow h-px bg-[var(--tn-outline)]" />
              <span className="text-xs tracking-widest uppercase">Seguridad</span>
              <div className="flex-grow h-px bg-[var(--tn-outline)]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--tn-surface)] p-4 rounded-lg flex flex-col gap-2">
                <Lock size={20} className="text-[var(--tn-muted)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--tn-muted)]">Acceso seguro</span>
              </div>
              <div className="bg-[#dff0e2] p-4 rounded-lg flex flex-col gap-2">
                <EyeOff size={20} className="text-[#3f6b49]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#3f6b49]">Perfil discreto</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
