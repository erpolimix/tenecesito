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
    <div className="bg-[var(--tn-bg)] text-[var(--tn-text)] animate-in fade-in duration-300 min-h-[calc(100vh-5rem)]">
      <main className="max-w-6xl mx-auto px-4 py-12 md:py-16 min-h-[calc(100vh-5rem)] flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center w-full">
          <section className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold mb-3">Acceso</p>
            <h2 className="font-editorial text-5xl md:text-7xl text-[#5d3d2e] leading-[1.02] tracking-tight">
              Entra en tu espacio para pedir ayuda con calma.
            </h2>
            <p className="mt-6 text-lg text-[var(--tn-muted)] leading-[1.7] max-w-xl">
              Accede con Google para entrar de forma segura. Tu correo no se muestra públicamente y limitamos la exposición de tus datos dentro de la app.
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="bg-white rounded-2xl border border-[#efe2d8] p-5 tn-card-shadow">
                <Lock size={20} className="text-[var(--tn-primary)]" />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--tn-muted)]">Acceso seguro</p>
                <p className="mt-2 text-sm text-[var(--tn-muted)] leading-[1.6]">El acceso se gestiona mediante autenticación estándar con Google.</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#efe2d8] p-5 tn-card-shadow">
                <EyeOff size={20} className="text-[var(--tn-primary)]" />
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--tn-muted)]">Perfil discreto</p>
                <p className="mt-2 text-sm text-[var(--tn-muted)] leading-[1.6]">Tu email no se publica y el perfil visible queda limitado dentro de la plataforma.</p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[32px] border border-[#efe2d8] p-6 md:p-8 tn-card-shadow-strong">
            <div className="space-y-8">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone-400 font-bold">Continuar</p>
                <h3 className="font-editorial text-4xl md:text-5xl text-[var(--tn-text)] mt-3 leading-[1.05]">Accede para publicar o responder necesidades</h3>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-4 bg-[#fcf8f4] hover:bg-[#f7efe9] active:scale-[0.98] transition-all py-5 px-6 rounded-2xl group border border-[#efe2d8]"
              >
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="font-semibold text-lg">Continuar con Google</span>
              </button>

              <div className="rounded-2xl bg-[#fcf8f4] border border-[#efe2d8] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--tn-muted)] font-bold">Qué ocurre al acceder</p>
                <ul className="mt-4 space-y-3 text-sm text-[var(--tn-muted)] leading-[1.6]">
                  <li>Se crea o actualiza tu sesión con Google.</li>
                  <li>Tu correo no se muestra públicamente en la app.</li>
                  <li>El perfil visible puede incluir tu nombre y avatar de Google.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
